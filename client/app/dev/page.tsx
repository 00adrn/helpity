"use client";

import { useState } from "react";

import type { SessionParticipant } from "@/lib/sockets/sock";

import { SharedEditor } from "@/components/SharedEditor";

/** Throwaway page for testing the shared editor. Delete once real pages exist. */
export default function DevEditorPage() {
  const [code, setCode] = useState("test");
  const [role, setRole] = useState<SessionParticipant["role"]>("teacher");
  const [participantId] = useState(() => crypto.randomUUID());

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center gap-4 border-b border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <label className="flex items-center gap-2">
          Session code
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </label>
        <label className="flex items-center gap-2">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as SessionParticipant["role"])}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          >
            <option value="teacher">teacher (can write)</option>
            <option value="student">student (read-only until granted)</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        {/* An empty code makes connectToSession throw, so wait for one. */}
        {code.trim() ? (
          <SharedEditor
            code={code.trim()}
            participant={{
              id: participantId,
              name: role,
              color: role === "teacher" ? "#f97316" : "#3b82f6",
              role,
            }}
            token="dev-token"
          />
        ) : (
          <p className="p-4 text-sm text-zinc-500">Enter a session code.</p>
        )}
      </div>
    </div>
  );
}
