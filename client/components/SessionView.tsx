"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { PencilIcon, PresentationIcon, UsersIcon } from "@/components/Icons";
import { Helpity, type HelpityNotice } from "@/components/Helpity";
import { LessonCountdown } from "@/components/LessonCountdown";
import { MobileTabs } from "@/components/MobileTabs";
import { PersonalEditor } from "@/components/PersonalEditor";
import { ProblemPicker } from "@/components/ProblemPicker";
import { ParticipantsPanel, useParticipants } from "@/components/ParticipantsPanel";
import { RemoteCursors } from "@/components/RemoteCursors";
import { SplitPane, useMinWidth } from "@/components/SplitPane";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SessionOutput } from "@/components/SessionOutput";
import { SharedEditor, type MonacoEditor } from "@/components/SharedEditor";
import { Sheet } from "@/components/Sheet";
import { TopBar } from "@/components/TopBar";
import { button } from "@/components/button";
import { isPresetId, presets, type PresetId } from "@/lib/problems/presets";
import { fade } from "@/lib/motion";
import { forgetParticipant, useStoredParticipant } from "@/lib/sockets/participant_storage";
import { lessonIdOf, type SessionConnection } from "@/lib/sockets/sock";

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

/**
 * Which lesson the session is on (see lessonIdOf), or undefined until the room has loaded.
 * Every room is seeded with a presetId, so its arrival means the shared state is in.
 */
function useLessonId(meta: SessionConnection["meta"] | undefined): number | undefined {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!meta) return () => {};
      meta.observe(onChange);
      return () => meta.unobserve(onChange);
    },
    [meta],
  );
  const read = () => (meta && isPresetId(meta.get("presetId")) ? lessonIdOf(meta) : undefined);

  return useSyncExternalStore(subscribe, read, () => undefined);
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
  const wide = useMinWidth(768);
  // Phones: which code window fills the screen, and whether the participants sheet is open.
  const [tab, setTab] = useState<"class" | "side">("class");
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);

  // Tell a student when the teacher gives them a turn in the class code, and when it ends.
  // Switching lessons: the teacher picks a new one; students get a countdown when it changes.
  const lessonId = useLessonId(session?.meta);
  const [choosingLesson, setChoosingLesson] = useState(false);
  const [countdownFor, setCountdownFor] = useState<number>();
  const [seenLessonId, setSeenLessonId] = useState(lessonId);
  if (lessonId !== seenLessonId) {
    setSeenLessonId(lessonId);
    // Only a change while here counts; joining mid-lesson is not a switch.
    if (seenLessonId !== undefined && lessonId !== undefined && participant?.role === "student") {
      setCountdownFor(lessonId);
    }
  }
  const endCountdown = useCallback(() => setCountdownFor(undefined), []);

  const [seenWriterId, setSeenWriterId] = useState(writerId);
  if (writerId !== seenWriterId) {
    setSeenWriterId(writerId);
    if (participant?.role === "student") {
      if (writerId === participant.id) {
        say("canWrite");
        setTab("class"); // on a phone, jump to the code they can now type in
      }
      else if (seenWriterId === participant.id) say("turnOver");
    }
  }

  // Typing in the teacher's code: Helpity explains instead of Monaco's "Cannot edit" tooltip.
  useEffect(() => {
    // No model means Monaco already threw this editor away (React can mount it twice in
    // development); touching a disposed editor's parts throws.
    if (!editor?.getModel()) return;
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
    // A full page load: leaving resets the whole site, so the next join or session starts clean.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate
    window.location.assign("/");
  }

  if (ended && !isTeacher) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 bg-bg p-6 text-center">
        <p className="text-lg font-semibold text-fg">Your teacher ended this session.</p>
        {/* A full page load, so the next session starts with a clean site. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- deliberate */}
        <a href="/" onClick={() => forgetParticipant(code)} className="font-semibold text-accent underline">
          Back to Helpity
        </a>
      </main>
    );
  }

  // On a phone only one window shows, so Helpity follows that one.
  const helpityEditor = wide
    ? lastFocused === personalEditor && personalEditor
      ? personalEditor
      : editor
    : tab === "side" && personalEditor
      ? personalEditor
      : editor;
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

  // The second window: the teacher's results, or the student's own code.
  const sidePane = isTeacher ? (
    <ResultsPanel session={session} participants={participants} code={code} me={participant} />
  ) : (
    <PersonalEditor
      onEditor={setPersonalEditor}
      presetId={presetId}
      lessonId={lessonId}
      onSubmit={(submission) => session?.submitProgress(submission)}
      code={code}
      participant={participant}
      onExplain={(output) => {
        setLastFocused(personalEditor);
        setExplain((prev) => ({ output, id: (prev?.id ?? 0) + 1 }));
      }}
    />
  );
  const students = participants.filter((person) => person.role === "student").length;
  const hands = participants.filter((person) => person.role === "student" && person.raisedHand).length;

  return (
    // overscroll-none: no rubber-band bounce or pull-to-refresh while coding on a phone.
    <div className="flex h-dvh flex-col overscroll-none bg-bg">
      <TopBar
        code={code}
        isTeacher={isTeacher}
        raisedHand={me?.raisedHand ?? false}
        onToggleHand={session && (() => session.setRaisedHand(!me?.raisedHand))}
        onExit={session && exit}
        onSwitchLesson={session && (() => setChoosingLesson(true))}
        people={wide ? undefined : { students, hands, onOpen: () => setPeopleOpen(true) }}
      />
      {wide ? (
        <div className="flex min-h-0 flex-1 flex-row">
          <ParticipantsPanel
            participants={participants}
            selfId={participant.id}
            isTeacher={isTeacher}
            writerId={writerId}
            onGrant={(studentId) => session?.setWriter(studentId)}
            onRevoke={() => session?.setWriter(null)}
            width={sidebarWidth}
            onResize={setSidebarWidth}
          />
          <main className="flex min-h-0 min-w-0 flex-1 p-3">
            <SplitPane direction="horizontal" minA={240} minB={240} className="flex-1" a={classCode} b={sidePane} />
          </main>
          <RemoteCursors session={session} />
        </div>
      ) : (
        <>
          <MobileTabs<"class" | "side">
            active={tab}
            onChange={setTab}
            tabs={[
              {
                id: "class",
                label: isTeacher ? "Class code" : "Teacher's code",
                icon: <PresentationIcon />,
                content: classCode,
              },
              {
                id: "side",
                label: isTeacher ? "Students" : "Try it yourself!",
                icon: isTeacher ? <UsersIcon /> : <PencilIcon />,
                content: sidePane,
              },
            ]}
          />
          <RemoteCursors session={session} />
          <Sheet
            open={peopleOpen}
            onClose={() => setPeopleOpen(false)}
            title={`${isTeacher ? "Participants" : "Here now"} (${students} ${students === 1 ? "student" : "students"})`}
          >
            <ParticipantsPanel
              variant="sheet"
              participants={participants}
              selfId={participant.id}
              isTeacher={isTeacher}
              writerId={writerId}
              onGrant={(studentId) => {
                session?.setWriter(studentId);
                setPeopleOpen(false);
              }}
              onRevoke={() => session?.setWriter(null)}
            />
          </Sheet>
        </>
      )}
      {/* Helpity is for students; teachers don't get it. */}
      {!isTeacher && <Helpity editor={helpityEditor} explain={explain} notice={notice} />}

      {/* The teacher's lesson select screen, over the session so everyone stays connected. */}
      <AnimatePresence>
        {isTeacher && choosingLesson && session && (
          <motion.div {...fade} className="fixed inset-0 z-[90] flex flex-col bg-bg">
            <ProblemPicker
              actionLabel="Switch lesson"
              // Same education level as the current lesson; a blank file has none.
              initialLevel={presetId && presetId !== "blank" ? presets[presetId].level : null}
              onCreate={(next) => {
                session.switchLesson(next);
                setChoosingLesson(false);
              }}
            />
            <button
              type="button"
              onClick={() => setChoosingLesson(false)}
              className={`${button.secondary} absolute top-4 left-4`}
            >
              <span className="font-glyph">←</span> Back to class
            </button>
          </motion.div>
        )}
        {countdownFor !== undefined && <LessonCountdown key={countdownFor} onDone={endCountdown} />}
      </AnimatePresence>
    </div>
  );
}
