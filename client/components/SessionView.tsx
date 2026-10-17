"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { PencilIcon } from "@/components/Icons";
import { Helpity, type HelpityNotice } from "@/components/Helpity";
import { PersonalEditor } from "@/components/PersonalEditor";
import { ParticipantsPanel, useParticipants } from "@/components/ParticipantsPanel";
import { RemoteCursors } from "@/components/RemoteCursors";
import { SplitPane, useMinWidth } from "@/components/SplitPane";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SessionOutput } from "@/components/SessionOutput";
import { SharedEditor, type MonacoEditor } from "@/components/SharedEditor";
import { TopBar } from "@/components/TopBar";
import { isPresetId, presets, type PresetId } from "@/lib/problems/presets";
import { forgetParticipant, useStoredParticipant } from "@/lib/sockets/participant_storage";
import type { SessionConnection } from "@/lib/sockets/sock";

/** The student currently allowed to type, from the session's shared meta map. */
function useWriterId(meta: SessionConnection["meta"] | undefined): string | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!meta) return () => {};
      meta.observe(onChange);
      return () => meta.unobserve(onChange);
    },
    [meta],
  );
  const read = () => {
    const writerId = meta?.get("writerId");
    return typeof writerId === "string" ? writerId : null;
  };

  return useSyncExternalStore(subscribe, read, () => null);
}

/** The selected starter is stored in the same shared metadata as the writer. */
function usePresetId(meta: SessionConnection["meta"] | undefined): PresetId | undefined {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!meta) return () => {};
      meta.observe(onChange);
      return () => meta.unobserve(onChange);
    },
    [meta],
  );
  const read = () => {
    const value = meta?.get("presetId");
    return isPresetId(value) ? value : undefined;
  };

  return useSyncExternalStore(subscribe, read, () => undefined);
}

/**
 * True once the teacher has ended the session. It stays true: the "ended" screen unmounts the
 * editor, which closes the connection, and the flag must not flip back and reconnect.
 */
function useSessionEnded(meta: SessionConnection["meta"] | undefined): boolean {
  const [latched, setLatched] = useState(false);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!meta) return () => {};
      meta.observe(onChange);
      return () => meta.unobserve(onChange);
    },
    [meta],
  );

  const ended = useSyncExternalStore(subscribe, () => meta?.get("ended") === true, () => false);
  if (ended && !latched) setLatched(true);
  return ended || latched;
}

/** The live session screen: navbar, participants sidebar, and the class code window. */
export function SessionView({ code }: { code: string }) {
  const participant = useStoredParticipant(code);
  const [session, setSession] = useState<SessionConnection>();
  const [editor, setEditor] = useState<MonacoEditor>();
  const [personalEditor, setPersonalEditor] = useState<MonacoEditor>();
  // Helpity follows whichever code window the user touched last.
  const [lastFocused, setLastFocused] = useState<MonacoEditor>();
  // Output the student wants explained; the id makes asking twice in a row count as new.
  const [explain, setExplain] = useState<{ output: string; id: number }>();
  // Something Helpity should say right away (see NOTICES in Helpity.tsx).
  const [notice, setNotice] = useState<HelpityNotice>();
  const say = (kind: HelpityNotice["kind"]) => setNotice((prev) => ({ kind, id: (prev?.id ?? 0) + 1 }));
  const participants = useParticipants(session?.awareness);
  const writerId = useWriterId(session?.meta);
  const presetId = usePresetId(session?.meta);
  const ended = useSessionEnded(session?.meta);
  const router = useRouter();
  const wide = useMinWidth(768);
  const [sidebarWidth, setSidebarWidth] = useState(240);

  // Tell a student when the teacher gives them a turn in the class code, and when it ends.
  const [seenWriterId, setSeenWriterId] = useState(writerId);
  if (writerId !== seenWriterId) {
    setSeenWriterId(writerId);
    if (participant?.role === "student") {
      if (writerId === participant.id) say("canWrite");
      else if (seenWriterId === participant.id) say("turnOver");
    }
  }

  // Typing in the teacher's code: Helpity explains instead of Monaco's "Cannot edit" tooltip.
  useEffect(() => {
    if (!editor) return;
    editor.getContribution("editor.contrib.readOnlyMessageController")?.dispose();
    const sub = editor.onDidAttemptReadOnlyEdit(() => say("readOnly"));
    return () => sub.dispose();
  }, [editor]);

  useEffect(() => {
    const subs = [editor, personalEditor].flatMap((ed) =>
      ed ? [ed.onDidFocusEditorText(() => setLastFocused(ed))] : [],
    );
    return () => subs.forEach((sub) => sub.dispose());
  }, [editor, personalEditor]);

  if (!participant) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 bg-bg p-6 text-center">
        <p className="text-lg font-semibold text-fg">You haven&apos;t joined this session in this tab.</p>
        <Link href={`/join/${code}`} className="font-semibold text-accent underline">
          Join this session
        </Link>
      </main>
    );
  }

  const isTeacher = participant.role === "teacher";

  // TopBar asks "are you sure?" before calling this.
  async function exit() {
    if (isTeacher) await session?.endSession();
    forgetParticipant(code);
    router.replace("/");
  }

  if (ended && !isTeacher) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 bg-bg p-6 text-center">
        <p className="text-lg font-semibold text-fg">Your teacher ended this session.</p>
        <Link href="/" onClick={() => forgetParticipant(code)} className="font-semibold text-accent underline">
          Back to Helpity
        </Link>
      </main>
    );
  }

  const helpityEditor = lastFocused === personalEditor && personalEditor ? personalEditor : editor;
  const me = participants.find((person) => person.id === participant.id);
  const writer = participants.find((person) => person.id === writerId);
  // The teacher can always type, so they only need to know when a student is typing too.
  const status = isTeacher
    ? writer && `${writer.name} is typing`
    : writerId === participant.id
      ? (
          <>
            You can type here <PencilIcon />
          </>
        )
      : writer
        ? `${writer.name} is typing`
        : "Watching the teacher";

  const classCode = (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="min-w-0 truncate font-bold text-fg">
          {isTeacher ? "Class code" : "Teacher's code"}{presetId && <span className="ml-2 text-sm font-normal text-muted">· {presets[presetId].teacherTitle}</span>}
        </h2>
        <span className="truncate text-xs text-muted">{status}</span>
      </div>
      <SplitPane
        direction="vertical"
        initial={0.7}
        minA={120}
        minB={96}
        className="flex-1"
        a={
          <div className="min-h-0 flex-1">
            <SharedEditor
              code={code}
              participant={participant}
              token="dev-token"
              onSession={setSession}
              onEditor={setEditor}
            />
          </div>
        }
        b={
          <SessionOutput session={session} isTeacher={isTeacher} getCode={() => editor?.getValue()} />
        }
      />
    </section>
  );

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <TopBar
        code={code}
        isTeacher={isTeacher}
        raisedHand={me?.raisedHand ?? false}
        onToggleHand={session && (() => session.setRaisedHand(!me?.raisedHand))}
        onExit={session && exit}
      />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ParticipantsPanel
          participants={participants}
          selfId={participant.id}
          isTeacher={isTeacher}
          writerId={writerId}
          onGrant={(studentId) => session?.setWriter(studentId)}
          onRevoke={() => session?.setWriter(null)}
          width={wide ? sidebarWidth : undefined}
          onResize={setSidebarWidth}
        />
        <main className="flex min-h-0 min-w-0 flex-1 p-3">
          {isTeacher ? (
            <SplitPane
              direction={wide ? "horizontal" : "vertical"}
              minA={wide ? 240 : 160}
              minB={wide ? 240 : 160}
              className="flex-1"
              a={classCode}
              b={<ResultsPanel session={session} participants={participants} code={code} me={participant} />}
            />
          ) : (
            <SplitPane
              direction={wide ? "horizontal" : "vertical"}
              minA={wide ? 240 : 160}
              minB={wide ? 240 : 160}
              className="flex-1"
              a={classCode}
              b={
                <PersonalEditor
                  onEditor={setPersonalEditor}
                  presetId={presetId}
                  onSubmit={(submission) => session?.submitProgress(submission)}
                  code={code}
                  participant={participant}
                  onExplain={(output) => {
                    setLastFocused(personalEditor);
                    setExplain((prev) => ({ output, id: (prev?.id ?? 0) + 1 }));
                  }}
                />
              }
            />
          )}
        </main>
        <RemoteCursors session={session} />
      </div>
      {/* Helpity is for students; teachers don't get it. */}
      {!isTeacher && <Helpity editor={helpityEditor} explain={explain} notice={notice} />}
    </div>
  );
}
