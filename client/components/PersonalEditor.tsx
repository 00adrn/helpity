"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";

import { OutputPanel, outputToText, TIMEOUT_MS } from "@/components/OutputPanel";
import { baseEditorOptions, defineEditorTheme, EDITOR_THEME } from "@/lib/editor";
import { runCode, type RunHandle, type RunResult } from "@/lib/editor/runner";
import type { MonacoEditor } from "@/components/SharedEditor";

// Stable reference so the Editor doesn't re-apply options on every render.
const options = { ...baseEditorOptions };

/**
 * A private scratch editor for one student. Nothing is synced: the code lives only in this tab,
 * and the student can run it whenever they like, with the output shown only to them.
 */
export function PersonalEditor({
  onEditor,
  onExplain,
}: {
  onEditor?: (editor: MonacoEditor) => void;
  /** A run ended in an error; Helpity should explain the output. */
  onExplain?: (output: string) => void;
}) {
  const [editor, setEditor] = useState<MonacoEditor>();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult>();
  const handle = useRef<RunHandle>(undefined);

  // Don't leave a worker running if the student leaves mid-run.
  useEffect(() => () => handle.current?.stop(), []);

  async function run() {
    const code = editor?.getValue();
    if (code === undefined) return;
    const current = runCode(code, { timeoutMs: TIMEOUT_MS });
    handle.current = current;
    setRunning(true);
    const outcome = await current.promise;
    if (handle.current !== current) return;
    handle.current = undefined;
    setResult(outcome);
    setRunning(false);
    // A crash gets explained automatically.
    if (outcome.error) onExplain?.(outputToText(outcome));
  }

  function stop() {
    handle.current?.stop();
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="font-bold text-fg">My code</h2>
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="javascript"
          theme={EDITOR_THEME}
          beforeMount={defineEditorTheme}
          onMount={(mounted) => {
            setEditor(mounted);
            onEditor?.(mounted);
          }}
          options={options}
        />
      </div>
      <OutputPanel
        running={running}
        result={result}
        onRun={editor ? run : undefined}
        onStop={stop}
        emptyText="Press Run to see output here."
      />
    </section>
  );
}
