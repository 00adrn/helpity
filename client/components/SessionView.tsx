"use client";

import Link from "next/link";
import { useState } from "react";

import { ParticipantsPanel } from "@/components/ParticipantsPanel";
import { SessionOutput } from "@/components/SessionOutput";
import { SharedEditor, type MonacoEditor } from "@/components/SharedEditor";
import { useStoredParticipant } from "@/lib/sockets/participant_storage";
import type { SessionConnection } from "@/lib/sockets/sock";

/** The live session screen: join code, shared editor, and who is connected. */
export function SessionView({ code }: { code: string }) {
  const participant = useStoredParticipant(code);
  const [session, setSession] = useState<SessionConnection>();
  const [editor, setEditor] = useState<MonacoEditor>();

  if (!participant) {
    return (
      <p className="p-6">
        You haven&apos;t joined this session in this tab.{" "}
        <Link href="/" className="underline">
          Go back and join with the code.
        </Link>
      </p>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-200 p-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500">Join code</span>
        <span className="font-mono text-2xl font-bold tracking-widest">{code}</span>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-85">
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
            isTeacher={participant.role === "teacher"}
            getCode={() => editor?.getValue()}
          />
        </div>
        <ParticipantsPanel awareness={session?.awareness} selfId={participant.id} />
      </div>
    </div>
  );
}
