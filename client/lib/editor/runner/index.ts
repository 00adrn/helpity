import type {
  LogLine,
  RunError,
  RunOptions,
  RunResult,
  WorkerMessage,
  WorkerRequest,
} from "./types";

export type * from "./types";

export type RunHandle = {
  promise: Promise<RunResult>;
  /** Ends the run early. Does nothing if the run already finished. */
  stop: () => void;
};

/**
 * Runs `code` in a fresh Web Worker. The promise resolves once, on whichever happens first:
 * the worker finishes, it throws, the timeout expires, `stop()` is called, or the worker fails to load.
 */
export function runCode(code: string, { timeoutMs }: RunOptions): RunHandle {
  const worker = new Worker(new URL("./worker/index.ts", import.meta.url));
  const logs: LogLine[] = [];

  let settle: (result: RunResult) => void = () => {};
  const promise = new Promise<RunResult>((resolve) => {
    settle = resolve;
  });

  let finished = false;
  function finish(outcome: { error?: RunError; timedOut?: boolean; stopped?: boolean }) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    worker.terminate();
    settle({
      logs,
      error: outcome.error,
      timedOut: outcome.timedOut ?? false,
      stopped: outcome.stopped ?? false,
    });
  }

  const timer = setTimeout(() => finish({ timedOut: true }), timeoutMs);

  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    if (message.type === "log") logs.push(message.line);
    else if (message.type === "done") finish({});
    else finish({ error: message.error });
  };

  // Fires if the worker file itself fails to load or start, not for errors in student code.
  worker.onerror = (event) => {
    finish({ error: { name: "WorkerError", message: event.message || "The code runner failed to start." } });
  };

  const request: WorkerRequest = { type: "run", code };
  worker.postMessage(request);

  return { promise, stop: () => finish({ stopped: true }) };
}
