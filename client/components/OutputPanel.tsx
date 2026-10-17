"use client";

import type { LogLevel, RunResult } from "@/lib/editor/runner";

export const TIMEOUT_MS = 5000;

const levelStyles: Record<LogLevel, string> = {
  log: "text-fg",
  info: "text-fg",
  warn: "text-amber-600",
  error: "text-red-700",
};

// Small header buttons, matching the Figma Output Pane "Stop button".
const headerButton =
  "rounded px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-on-accent transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

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
  const status = statusText(running, result);

  return (
    <section className="h-40 shrink-0 border-t border-border p-2">
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-sunken">
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs leading-4 font-semibold tracking-[0.3px] text-muted uppercase">
          <span>
            Output{status && <span className="normal-case"> · {status}</span>}
          </span>
          {running && onStop && (
            <button type="button" onClick={onStop} className={`${headerButton} bg-red-600`}>
              ■ Stop
            </button>
          )}
          {!running && onRun && (
            <button type="button" onClick={onRun} className={`${headerButton} bg-accent`}>
              ▶ Run
            </button>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-3 py-2 font-mono text-sm leading-6">
          {result?.logs.map((line, i) => (
            <pre key={i} className={`font-mono whitespace-pre-wrap ${levelStyles[line.level]}`}>
              {line.text}
            </pre>
          ))}
          {result?.error && (
            <pre className="rounded bg-red-50 px-2 py-1 font-mono whitespace-pre-wrap text-red-700">
              {`${result.error.name}: ${result.error.message}`}
              {result.error.line !== undefined && (
                <span className="font-sans font-semibold"> (line {result.error.line})</span>
              )}
            </pre>
          )}
          {!running && !result && (
            <p className="font-sans leading-5 text-muted">{emptyText}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function statusText(running: boolean, result: RunResult | undefined) {
  if (running) return "running…";
  if (!result) return "";
  if (result.timedOut) return `stopped after ${TIMEOUT_MS / 1000} seconds`;
  if (result.stopped) return "stopped";
  if (result.error) return "finished with an error";
  return "";
}
