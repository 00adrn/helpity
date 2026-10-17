"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AvatarId } from "@/components/Avatar";
import { AvatarPicker } from "@/components/AvatarPicker";
import { button } from "@/components/button";
import { HelpityLogo } from "@/components/HelpityLogo";
import { saveParticipant } from "@/lib/sockets/participant_storage";
import type { SessionParticipant } from "@/lib/sockets/sock";

type Joined = { code: string; participant: SessionParticipant };

/**
 * The student lobby at /join and /join/CODE: join code and nickname, then the avatar picker.
 * A shared link fills in the code, so the student only types a nickname.
 */
export function JoinFlow({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [joined, setJoined] = useState<Joined>();
  const [joinCode, setJoinCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  /** Check the code before asking the student to choose an avatar. */
  async function checkJoinCode(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setBusy(true);

    const response = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode, name }),
    });
    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(result.error ?? "Could not join that session");
      return;
    }

    setJoined(result as Joined);
  }

  /** Save the student's selected avatar and enter the session. */
  function joinWithAvatar({ code, participant }: Joined, avatar: AvatarId) {
    setBusy(true);
    saveParticipant(code, { ...participant, avatar });
    router.push(`/session/${code}`);
  }

  if (joined) {
    return <AvatarPicker busy={busy} onPick={(avatar) => joinWithAvatar(joined, avatar)} />;
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-bg px-6">
      <form onSubmit={checkJoinCode} className="flex w-full max-w-sm flex-col gap-4">
        <div className="mb-2 flex flex-col items-center gap-3 text-center">
          <HelpityLogo />
          <h1 className="text-xl font-bold text-fg">Join with a code</h1>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">Join code</span>
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            autoComplete="off"
            spellCheck={false}
            autoFocus={!initialCode}
            className="rounded-lg border border-border bg-surface px-4 py-3 text-center text-2xl font-bold tracking-[2.4px] text-fg uppercase placeholder:text-border focus:outline-2 focus:outline-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">Your nickname</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Captain Code"
            maxLength={30}
            autoComplete="off"
            // A shared link already has the code, so start on the nickname.
            autoFocus={!!initialCode}
            className="rounded-lg border border-border bg-surface px-4 py-3 text-lg text-fg placeholder:text-muted/60 focus:outline-2 focus:outline-accent"
          />
        </label>

        <button
          type="submit"
          disabled={busy || !joinCode.trim() || !name.trim()}
          className={`${button.primary} py-3 text-base`}
        >
          {busy ? "Checking…" : "Next"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm font-semibold text-muted hover:underline"
        >
          Back
        </button>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
