"use client";

import type { LogLevel, RunResult, TestRunResult } from "@/lib/editor/runner";

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
  testResult?: TestRunResult;
  /** Run/Stop controls only show when these are given, so a read-only viewer passes neither. */
  onRun?: () => void;
  onRunTests?: () => void;
  onStop?: () => void;
  /** Shown when there is nothing to display yet. */
  emptyText?: string;
};

/** Console output or preset test results, with controls supplied by the owning editor. */
export function OutputPanel({
  running,
  result,
  testResult,
  onRun,
  onRunTests,
  onStop,
  emptyText = "Press Run to see output here.",
}: OutputPanelProps) {
  const status = testResult ? testStatusText(testResult) : statusText(running, result);

  return (
    <section className="h-full min-h-0 border-t border-border p-2">
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-sunken">
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs leading-4 font-semibold tracking-[0.3px] text-muted uppercase">
          <span>
            Output{status && <span className="normal-case"> · {status}</span>}
          </span>
          <div className="flex items-center gap-2">
            {running && onStop && (
              <button type="button" onClick={onStop} className={`${headerButton} bg-red-600`}>
                <span className="font-glyph">■</span> Stop
              </button>
            )}
            {!running && onRun && (
              <button type="button" onClick={onRun} className={`${headerButton} bg-accent`}>
                <span className="font-glyph">▶</span> Run
              </button>
            )}
            {!running && onRunTests && (
              <button type="button" onClick={onRunTests} className={`${headerButton} bg-accent`}>
                <span className="font-glyph">✓</span> Run tests
              </button>
            )}
          </div>
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
          {testResult?.cases.map((test, i) => (
            <div key={i} className={test.passed ? "text-green-700" : "text-red-700"}>
              <span className="font-sans font-semibold"><span className="font-glyph">{test.passed ? "✓" : "✗"}</span> {test.name}</span>
              {!test.passed && (
                <pre className="font-mono whitespace-pre-wrap text-xs text-muted">
                  {`Expected: ${test.expected}\nGot: ${test.actual}`}
                </pre>
              )}
            </div>
          ))}
          {testResult?.error && (
            <pre className="font-mono whitespace-pre-wrap text-red-700">
              {`${testResult.error.name}: ${testResult.error.message}`}
            </pre>
          )}
          {!running && !result && !testResult && (
            <p className="font-sans leading-5 text-muted">{emptyText}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function testStatusText(result: TestRunResult) {
  if (result.timedOut) return `tests stopped after ${TIMEOUT_MS / 1000} seconds`;
  if (result.stopped) return "tests stopped";
  if (result.error) return "tests finished with an error";
  return `${result.cases.filter((test) => test.passed).length}/${result.cases.length} tests passed`;
}

/** The output as plain text, for sending to Helpity. */
export function outputToText(result: RunResult): string {
  const lines = result.logs.map((line) => `${line.level}: ${line.text}`);
  if (result.error) {
    const where = result.error.line !== undefined ? ` (line ${result.error.line})` : "";
    lines.push(`Uncaught ${result.error.name}: ${result.error.message}${where}`);
  }
  return lines.join("\n");
}

function statusText(running: boolean, result: RunResult | undefined) {
  if (running) return "running…";
  if (!result) return "";
  if (result.timedOut) return `stopped after ${TIMEOUT_MS / 1000} seconds`;
  if (result.stopped) return "stopped";
  if (result.error) return "finished with an error";
  return "";
}
