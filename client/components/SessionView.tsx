"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";

import { Helpity } from "@/components/Helpity";
import { ParticipantsPanel, useParticipants } from "@/components/ParticipantsPanel";
import { RemoteCursors } from "@/components/RemoteCursors";
import { SessionOutput } from "@/components/SessionOutput";
import { SharedEditor, type MonacoEditor } from "@/components/SharedEditor";
import { TopBar } from "@/components/TopBar";
import { useStoredParticipant } from "@/lib/sockets/participant_storage";
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

/** The live session screen: navbar, participants sidebar, and the class code window. */
export function SessionView({ code }: { code: string }) {
  const participant = useStoredParticipant(code);
  const [session, setSession] = useState<SessionConnection>();
  const [editor, setEditor] = useState<MonacoEditor>();
  const participants = useParticipants(session?.awareness);
  const writerId = useWriterId(session?.meta);

  if (!participant) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 bg-bg p-6 text-center">
        <p className="text-lg font-semibold text-fg">You haven&apos;t joined this session in this tab.</p>
        <Link href="/" className="font-semibold text-accent underline">
          Go back and join with the code.
        </Link>
      </main>
    );
  }

  const isTeacher = participant.role === "teacher";
  const me = participants.find((person) => person.id === participant.id);
  const writer = participants.find((person) => person.id === writerId);
  const canWrite = isTeacher || writerId === participant.id;
  const status = canWrite
    ? "You can type here ✏️"
    : writer
      ? `${writer.name} is typing`
      : "Watching the teacher";

  return (
    <div className="flex h-screen flex-col bg-bg">
      <TopBar
        code={code}
        isTeacher={isTeacher}
        raisedHand={me?.raisedHand ?? false}
        onToggleHand={session && (() => session.setRaisedHand(!me?.raisedHand))}
      />
      <div className="flex min-h-0 flex-1">
        <ParticipantsPanel
          participants={participants}
          selfId={participant.id}
          isTeacher={isTeacher}
          writerId={writerId}
          onGrant={(studentId) => session?.setWriter(studentId)}
          onRevoke={() => session?.setWriter(null)}
        />
        <main className="flex min-w-0 flex-1 p-3">
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h2 className="font-bold text-fg">Class code</h2>
              <span className="text-xs text-muted">{status}</span>
            </div>
            <div className="min-h-0 flex-1">
              <SharedEditor
                code={code}
                participant={participant}
                token="dev-token"
                onSession={setSession}
                onEditor={setEditor}
              />
            </div>
            <SessionOutput
              session={session}
              isTeacher={isTeacher}
              getCode={() => editor?.getValue()}
            />
          </section>
        </main>
        <RemoteCursors session={session} />
      </div>
      <Helpity editor={editor} />
    </div>
  );
}
