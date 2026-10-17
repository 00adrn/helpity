"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";

import { SplitPane } from "@/components/SplitPane";
import { OutputPanel, outputToText, TIMEOUT_MS } from "@/components/OutputPanel";
import { baseEditorOptions, defineEditorTheme, EDITOR_THEME } from "@/lib/editor";
import {
  runCode,
  runTests,
  type RunHandle,
  type RunResult,
  type TestRunHandle,
  type TestRunResult,
} from "@/lib/editor/runner";
import { presets, type PresetId } from "@/lib/problems/presets";
import type { MonacoEditor } from "@/components/SharedEditor";

// Stable reference so the Editor doesn't re-apply options on every render.
const options = { ...baseEditorOptions };

/**
 * A private scratch editor for one student. Nothing is synced: the code lives only in this tab,
 * and the student can run it whenever they like, with the output shown only to them.
 */
export function PersonalEditor({
  onEditor,
  presetId,
  onExplain,
}: {
  onEditor?: (editor: MonacoEditor) => void;
  presetId?: PresetId;
  /** A run ended in an error; Helpity should explain the output. */
  onExplain?: (output: string) => void;
}) {
  const [editor, setEditor] = useState<MonacoEditor>();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult>();
  const [testResult, setTestResult] = useState<TestRunResult>();
  const handle = useRef<RunHandle | TestRunHandle>(undefined);
  const loadedPreset = useRef<PresetId | undefined>(undefined);
  const tests = presetId ? presets[presetId].tests : [];

  // Don't leave a worker running if the student leaves mid-run.
  useEffect(() => () => handle.current?.stop(), []);

  // Load the student's practice starter once the selected problem arrives from the shared room.
  useEffect(() => {
    if (!editor || !presetId || loadedPreset.current === presetId) return;
    loadedPreset.current = presetId;
    if (!editor.getValue()) editor.setValue(presets[presetId].studentCode);
  }, [editor, presetId]);

  useEffect(() => {
    if (!editor) return;
    const subscription = editor.onDidChangeModelContent(() => {
      setResult(undefined);
      setTestResult(undefined);
    });
    return () => subscription.dispose();
  }, [editor]);

  async function run() {
    const code = editor?.getValue();
    if (code === undefined) return;
    const current = runCode(code, { timeoutMs: TIMEOUT_MS });
    handle.current = current;
    setResult(undefined);
    setTestResult(undefined);
    setRunning(true);
    const outcome = await current.promise;
    if (handle.current !== current) return;
    handle.current = undefined;
    setResult(outcome);
    setRunning(false);
    // A crash gets explained automatically.
    if (outcome.error) onExplain?.(outputToText(outcome));
  }

  async function test() {
    const code = editor?.getValue();
    if (code === undefined || tests.length === 0) return;
    const version = editor?.getModel()?.getVersionId();
    const current = runTests(code, tests, { timeoutMs: TIMEOUT_MS });
    handle.current = current;
    setResult(undefined);
    setTestResult(undefined);
    setRunning(true);
    const outcome = await current.promise;
    if (handle.current !== current) return;
    handle.current = undefined;
    if (editor?.getModel()?.getVersionId() === version) setTestResult(outcome);
    setRunning(false);
  }

  function stop() {
    handle.current?.stop();
  }

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="font-bold text-fg">
          My code{presetId && (
            <span className="ml-2 text-sm font-normal text-muted">
              · {presetId === "blank" ? "Blank file" : `${presets[presetId].concept}: ${presets[presetId].title}`}
            </span>
          )}
        </h2>
      </div>
      <SplitPane
        direction="vertical"
        initial={0.7}
        minA={120}
        minB={96}
        className="flex-1"
        a={
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
        }
        b={
          <OutputPanel
            running={running}
            result={result}
            testResult={testResult}
            onRun={editor ? run : undefined}
            onRunTests={editor && tests.length > 0 ? test : undefined}
            onStop={stop}
            emptyText={tests.length > 0 ? "Press Run or Run tests to check your code." : "Press Run to see output here."}
          />
        }
      />
    </section>
  );
}
