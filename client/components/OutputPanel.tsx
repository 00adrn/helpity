"use client";

import type { LogLevel, RunResult } from "@/lib/editor/runner";

export const TIMEOUT_MS = 5000;

const levelStyles: Record<LogLevel, string> = {
  log: "",
  info: "text-blue-600 dark:text-blue-400",
  warn: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
};

type OutputPanelProps = {
  running: boolean;
  result?: RunResult;
  /** Run/Stop controls only show when these are given, so a read-only viewer passes neither. */
  onRun?: () => void;
  onStop?: () => void;
  /** Shown when there is nothing to display yet. */
  emptyText?: string;
};

/** Console output of a run, with optional Run/Stop controls. It only displays; it never runs code itself. */
export function OutputPanel({
  running,
  result,
  onRun,
  onStop,
  emptyText = "Press Run to see output here.",
}: OutputPanelProps) {
  return (
    <section className="flex min-h-0 flex-15 flex-col border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3 border-b border-zinc-200 p-2 dark:border-zinc-800">
        {running && onStop && (
          <button onClick={onStop} className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white">
            Stop
          </button>
        )}
        {!running && onRun && (
          <button onClick={onRun} className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white">
            Run
          </button>
        )}
        <span className="text-sm text-zinc-500">{statusText(running, result)}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-sm">
        {result?.logs.map((line, i) => (
          <pre key={i} className={`whitespace-pre-wrap ${levelStyles[line.level]}`}>
            {line.text}
          </pre>
        ))}
        {result?.error && (
          <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400">
            {result.error.stack ?? `${result.error.name}: ${result.error.message}`}
          </pre>
        )}
        {!running && !result && <p className="text-zinc-500">{emptyText}</p>}
      </div>
    </section>
  );
}

function statusText(running: boolean, result: RunResult | undefined) {
  if (running) return "Running…";
  if (!result) return "";
  if (result.timedOut) return `Stopped: took longer than ${TIMEOUT_MS / 1000} seconds`;
  if (result.stopped) return "Stopped";
  if (result.error) return "Finished with an error";
  return "Finished";
}
