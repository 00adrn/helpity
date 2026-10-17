import type { LogLevel, RunError, WorkerMessage, WorkerRequest } from "../types";

/** The slice of the worker global scope we use, typed without pulling in the "webworker" lib. */
type WorkerScope = {
  postMessage(message: WorkerMessage): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerRequest>) => void): void;
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
  addEventListener(type: "unhandledrejection", listener: (event: PromiseRejectionEvent) => void): void;
};

const scope = self as unknown as WorkerScope;

function post(message: WorkerMessage) {
  scope.postMessage(message);
}

/** Turns any value into display text. Never throws, since console.log(anything) must be safe. */
function format(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
  if (typeof value === "symbol" || typeof value === "bigint") return value.toString();
  if (value === undefined) return "undefined";
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(
      value,
      (_key, v) => {
        if (typeof v === "bigint") return v.toString();
        if (typeof v === "object" && v !== null) {
          if (seen.has(v)) return "[Circular]";
          seen.add(v);
        }
        return v;
      },
      2,
    );
  } catch {
    return String(value);
  }
}

function toRunError(reason: unknown): RunError {
  if (reason instanceof Error) {
    return { name: reason.name, message: reason.message, stack: reason.stack };
  }
  return { name: "Error", message: format(reason) };
}

// HARDENING: Caps so `while (true) console.log(...)` can't flood the page with messages before the timeout fires.
const MAX_LINES = 500;
const MAX_TOTAL_CHARS = 100_000;
const MAX_LINE_CHARS = 2_000;

function patchConsole() {
  let lines = 0;
  let totalChars = 0;
  let capped = false;

  const levels: LogLevel[] = ["log", "info", "warn", "error"];
  for (const level of levels) {
    console[level] = (...args: unknown[]) => {
      if (capped) return;
      if (lines >= MAX_LINES || totalChars >= MAX_TOTAL_CHARS) {
        capped = true;
        post({ type: "log", line: { level: "warn", text: "[Output limit reached. Further output is hidden.]" } });
        return;
      }
      let text = args.map(format).join(" ");
      if (text.length > MAX_LINE_CHARS) text = `${text.slice(0, MAX_LINE_CHARS)}… [line truncated]`;
      lines += 1;
      totalChars += text.length;
      post({ type: "log", line: { level, text } });
    };
  }
}

// Errors thrown later (setTimeout callbacks, rejected promises) don't pass through the try/catch below.
scope.addEventListener("error", (event) => {
  event.preventDefault();
  post({ type: "error", error: toRunError(event.error ?? event.message) });
});
scope.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  post({ type: "error", error: toRunError(event.reason) });
});

scope.addEventListener("message", (event) => {
  if (event.data.type !== "run") return;
  patchConsole();
  try {
    new Function(event.data.code)();
    post({ type: "done" });
  } catch (err) {
    post({ type: "error", error: toRunError(err) });
  }
});
