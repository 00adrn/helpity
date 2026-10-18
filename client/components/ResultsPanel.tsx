"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";

import { baseEditorOptions, defineEditorTheme, EDITOR_THEME } from "@/lib/editor";
import type { StudentProgress } from "@/lib/sockets/progress";
import { OutputPanel } from "@/components/OutputPanel";
import { PresenceCursors } from "@/components/RemoteCursors";
import { SplitPane } from "@/components/SplitPane";
import type { MonacoEditor } from "@/components/SharedEditor";
import { connectToStudentCode, type StudentCodeConnection } from "@/lib/sockets/personal";
import type { ParticipantPresence, SessionConnection, SessionParticipant } from "@/lib/sockets/sock";

// Stable reference so the Editor doesn't re-apply options on every render.
const viewerOptions = { ...baseEditorOptions, readOnly: true, domReadOnly: true };

/** Re-render whenever a shared Yjs map changes, returning a plain copy of its entries. */
function useMapEntries<T>(map: { observe(f: () => void): void; unobserve(f: () => void): void; entries(): IterableIterator<[string, T]> } | undefined) {
  const [entries, setEntries] = useState<Record<string, T>>({});
  useEffect(() => {
    if (!map) return;
    const read = () => setEntries(Object.fromEntries(map.entries()));
    read();
    map.observe(read);
    return () => map.unobserve(read);
  }, [map]);
  return entries;
}

/** A student's code window, live: their edits and cursor arrive through their own Yjs room. */
function LiveCode({ code, studentId, me }: { code: string; studentId: string; me: SessionParticipant }) {
  const [editor, setEditor] = useState<MonacoEditor>();
  const [awareness, setAwareness] = useState<StudentCodeConnection["awareness"]>();
  const { id, name, color, role, avatar } = me;

  useEffect(() => {
    if (!editor) return;
    const connection = connectToStudentCode(code, studentId, { id, name, color, role, avatar }, "dev-token", true);
    connection.bindEditor(editor).then(() => setAwareness(connection.awareness));
    return () => {
      setAwareness(undefined);
      connection.close();
    };
  }, [editor, code, studentId, id, name, color, role, avatar]);

  return (
    <>
      <PresenceCursors awareness={awareness} />
      <Editor
        height="100%"
        language="javascript"
        theme={EDITOR_THEME}
        beforeMount={defineEditorTheme}
        onMount={setEditor}
        options={viewerOptions}
      />
    </>
  );
}

type Row = { id: string; name: string; progress?: StudentProgress };

/** Teacher pane: each student's last test submission, with a way to open their code. */
export function ResultsPanel({
  session,
  participants,
  code: sessionCode,
  me,
}: {
  session: SessionConnection | undefined;
  participants: ParticipantPresence[];
  code: string;
  me: SessionParticipant;
}) {
  const progress = useMapEntries<StudentProgress>(session?.progress);
  const [watching, setWatching] = useState<string>();
  const [mode, setMode] = useState<"live" | "submitted">("live");

  // Everyone who is here, plus students who submitted and then left.
  const rows: Row[] = participants
    .filter((person) => person.role === "student")
    .map((person) => ({ id: person.id, name: person.name, progress: progress[person.id] }));
  for (const [id, entry] of Object.entries(progress)) {
    if (!rows.some((row) => row.id === id)) rows.push({ id, name: entry.name, progress: entry });
  }
  // Surface who needs help: not done first, most attempts to least; students who passed every
  // test go to the bottom.
  const isDone = (row: Row) => !!row.progress && row.progress.total > 0 && row.progress.passed === row.progress.total;
  rows.sort(
    (a, b) =>
      Number(isDone(a)) - Number(isDone(b)) ||
      (b.progress?.attempts ?? 0) - (a.progress?.attempts ?? 0) ||
      a.name.localeCompare(b.name),
  );

  const watched = rows.find((row) => row.id === watching);

  if (watched) {
    const submitted = watched.progress?.code;
    return (
      // A green focus ring and header: this is a student's code, not the class code.
      <section className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-accent bg-surface">
        {/* Drawn inside the panel (the split pane would clip an outer ring) and above the editor. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] ring-4 ring-accent/30 ring-inset" />
        {/* 4px more on top, left and right for the ring, so the buttons look centered. */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent/40 bg-accent-subtle/40 px-5 pt-3.5 pb-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setWatching(undefined)}
              className="rounded-lg border border-border px-2 py-0.5 text-sm font-semibold text-fg transition hover:bg-surface-sunken"
            >
              <span className="font-glyph">←</span> Back
            </button>
            <h2 className="min-w-0 truncate font-bold text-fg">Watching {watched.name}</h2>
          </div>
          <div role="group" aria-label="Which code to show" className="flex overflow-hidden rounded-lg border border-border text-sm font-semibold">
            {(["live", "submitted"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => setMode(option)}
                className={`px-3 py-0.5 transition ${mode === option ? "bg-accent text-on-accent" : "text-fg hover:bg-surface-sunken"}`}
              >
                {option === "live" ? "Live" : "Last submission"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {mode === "live" ? (
            <LiveCode key={watched.id} code={sessionCode} studentId={watched.id} me={me} />
          ) : submitted === undefined ? (
            <p className="p-4 text-sm text-muted">Nothing to show yet.</p>
          ) : (
            // The submitted code, and below it which tests passed or failed (read-only, no Run).
            <SplitPane
              direction="vertical"
              initial={0.6}
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
                    value={submitted}
                    options={viewerOptions}
                  />
                </div>
              }
              b={
                <OutputPanel
                  running={false}
                  testResult={watched.progress?.result}
                  emptyText="Test details weren't saved for this submission."
                />
              }
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-2.5 text-lg font-bold text-fg">Student practice results</h2>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto_auto] items-center gap-x-3 md:min-w-[420px] md:gap-x-4 border-b border-border px-4 py-2 text-xs font-semibold tracking-[0.3px] text-muted uppercase">
          <span>Student</span>
          {/* Phones get short headings so all four columns fit without scrolling sideways. */}
          <span>
            <span className="md:hidden">Passed</span>
            <span className="max-md:hidden">Tests passed</span>
          </span>
          <span className="w-10 text-center md:w-16">
            <span className="md:hidden">Tries</span>
            <span className="max-md:hidden">Attempts</span>
          </span>
          <span className="w-10 text-right whitespace-nowrap md:w-16">
            <span className="md:hidden">Code</span>
            <span className="max-md:hidden">View code</span>
          </span>
        </div>
        {rows.map((row) => {
          const entry = row.progress;
          const ratio = entry && entry.total > 0 ? entry.passed / entry.total : 0;
          return (
            <div
              key={row.id}
              className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto_auto] items-center gap-x-3 md:min-w-[420px] md:gap-x-4 border-b border-border px-4 py-3 text-fg"
            >
              <span className="truncate">{row.name}</span>
              {entry ? (
                <span className="flex items-center gap-3">
                  <span className="h-2.5 min-w-0 max-w-[200px] flex-1 overflow-hidden rounded-full bg-surface-sunken">
                    <span
                      className={`block h-full rounded-full ${ratio === 1 ? "bg-emerald-500" : "bg-amber-400"}`}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {entry.passed}/{entry.total}
                  </span>
                </span>
              ) : (
                <span className="text-muted">not submitted</span>
              )}
              <span className="w-10 text-center tabular-nums md:w-16">{entry?.attempts ?? 0}</span>
              <span className="flex w-10 justify-end md:w-16">
                <button
                  type="button"
                  aria-label={`View ${row.name}'s code`}
                  title={`View ${row.name}'s code`}
                  onClick={() => setWatching(row.id)}
                  className="flex size-10 items-center justify-center rounded-full bg-accent md:size-8 text-on-accent transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="font-glyph">→</span>
                </button>
              </span>
            </div>
          );
        })}
        {rows.length === 0 && <p className="px-4 py-3 text-sm text-muted">No students yet.</p>}
      </div>
    </section>
  );
}
