"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AvatarId } from "@/components/Avatar";
import { AvatarPicker } from "@/components/AvatarPicker";
import { button } from "@/components/button";
import { HelpityLogo } from "@/components/HelpityLogo";
import { saveParticipant } from "@/lib/sockets/participant_storage";
import type { SessionParticipant } from "@/lib/sockets/sock";

// three.js needs WebGL, so the bouncing ball only loads in the browser.
const BouncingHelpity = dynamic(() => import("@/components/BouncingHelpity"), { ssr: false });

type Joined = { code: string; participant: SessionParticipant };

type Step = { name: "choose" } | { name: "join" } | { name: "avatar"; joined: Joined };

/** Show the landing page, student join form, or avatar picker. Teachers go to /teach. */
export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "choose" });
  const [joinCode, setJoinCode] = useState("");
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

    setStep({ name: "avatar", joined: result as Joined });
  }

  /** Save the student's selected avatar and enter the session. */
  function joinWithAvatar({ code, participant }: Joined, avatar: AvatarId) {
    setBusy(true);
    saveParticipant(code, { ...participant, avatar });
    router.push(`/session/${code}`);
  }

  if (step.name === "avatar") {
    return <AvatarPicker busy={busy} onPick={(avatar) => joinWithAvatar(step.joined, avatar)} />;
  }

  if (step.name === "join") {
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
              autoFocus
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
            onClick={() => {
              setError(undefined);
              setStep({ name: "choose" });
            }}
            className="text-sm font-semibold text-muted hover:underline"
          >
            Back
          </button>

          {error && <p className="text-center text-sm text-red-600">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-bg px-6">
      <BouncingHelpity />
      <div className="relative z-10 flex flex-col items-center">
        <h1>
          <HelpityLogo size="lg" />
        </h1>
        <p className="mt-6 text-center text-lg text-muted">
          Code together, live, with a little helper who explains things.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setStep({ name: "join" })}
            className="flex w-70 flex-col items-center gap-1 rounded-xl bg-accent p-6 text-on-accent shadow-sm transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="text-xl font-bold">I&apos;m a student</span>
            <span className="text-sm font-medium">Join with a code</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/teach")}
            className="flex w-70 flex-col items-center gap-1 rounded-xl border border-border bg-surface p-6 shadow-sm transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="text-xl font-bold text-fg">I&apos;m a teacher</span>
            <span className="text-sm font-medium text-muted">Start a session</span>
          </button>
        </div>
      </div>
    </main>
  );
}
