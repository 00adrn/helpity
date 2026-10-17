export type LogLevel = "log" | "info" | "warn" | "error";

export type LogLine = {
  level: LogLevel;
  text: string;
};

export type RunError = {
  name: string;
  message: string;
  stack?: string;
  /** 1-based line in the student's code where it was thrown, when the engine reports it. */
  line?: number;
};

export type RunOptions = {
  timeoutMs: number;
};

/** What the runner resolves with once a run ends, however it ended. */
export type RunResult = {
  logs: LogLine[];
  error?: RunError;
  timedOut: boolean;
  /** True when the run was ended early by `stop()`. */
  stopped: boolean;
};

/** Main thread -> worker. */
export type WorkerRequest = {
  type: "run";
  code: string;
};

/** Worker -> main thread. */
export type WorkerMessage =
  | { type: "log"; line: LogLine }
  | { type: "done" }
  | { type: "error"; error: RunError };
