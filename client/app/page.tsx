"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { saveParticipant } from "@/lib/sockets/participant_storage";
import type { SessionParticipant } from "@/lib/sockets/sock";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  async function startSession() {
    setError(undefined);
    const response = await fetch("/api/sessions", { method: "POST" });

    if (!response.ok) {
      setError("Could not start a session");
      return;
    }

    const { code } = (await response.json()) as { code: string };
    // No sign-in yet (Auth0 comes later), so whoever starts a session is its teacher.
    saveParticipant(code, {
      id: crypto.randomUUID(),
      name: "Teacher",
      color: "#f97316",
      role: "teacher",
    });
    router.push(`/s/${code}`);
  }

  async function joinSession(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);

    const response = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode, name }),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? "Could not join that session");
      return;
    }

    const { code, participant } = result as { code: string; participant: SessionParticipant };
    saveParticipant(code, participant);
    router.push(`/s/${code}`);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col gap-8 p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Helpity</h1>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Teacher</h2>
          <button
            onClick={startSession}
            className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Start a session
          </button>
        </section>

        <form onSubmit={joinSession} className="flex flex-col gap-3">
          <h2 className="font-medium">Student</h2>
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="Join code"
            className="rounded border border-zinc-300 bg-transparent px-3 py-2 font-mono uppercase dark:border-zinc-700"
          />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nickname"
            className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
          <button
            type="submit"
            className="rounded border border-zinc-300 px-4 py-2 dark:border-zinc-700"
          >
            Join
          </button>
        </form>

        {error && <p className="text-red-600">{error}</p>}
      </main>
    </div>
  );
}
