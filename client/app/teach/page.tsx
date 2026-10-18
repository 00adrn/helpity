"use client";

import { useState, type FormEvent } from "react";

import { randomAvatar } from "@/components/Avatar";
import { button } from "@/components/button";
import { FreshOnNavigate, useResetBusyOnReturn } from "@/components/FreshOnNavigate";
import { HelpityLogo } from "@/components/HelpityLogo";
import { ProblemPicker } from "@/components/ProblemPicker";
import type { PresetId } from "@/lib/problems/presets";
import { saveParticipant } from "@/lib/sockets/participant_storage";

/** Teacher setup: choose a problem, then enter a name, then create the session and enter it. */
export default function TeachPage() {
  return (
    <FreshOnNavigate>
      <TeachSetup />
    </FreshOnNavigate>
  );
}

function TeachSetup() {
  // Set once a problem is chosen; the name step shows while it is.
  const [presetId, setPresetId] = useState<PresetId>();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  // Browser back from the session restores this page; don't come back stuck on "Starting…".
  useResetBusyOnReturn(setBusy);

  async function createSession(event: FormEvent) {
    event.preventDefault();
    const teacherName = name.trim();
    if (busy || !presetId || !teacherName) return;
    setError(undefined);
    setBusy(true);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId }),
      });
      if (!response.ok) {
        setError("Could not start a session");
        setBusy(false);
        return;
      }

      const { code } = (await response.json()) as { code: string };
      // No sign-in yet (Auth0 comes later), so whoever starts a session is its teacher.
      saveParticipant(code, {
        id: crypto.randomUUID(),
        name: teacherName,
        color: "#f97316",
        role: "teacher",
        avatar: randomAvatar(),
      });
      // A full page load, so the session always starts fresh (see app/session/[code]/page.tsx).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate
      window.location.assign(`/session/${code}`);
    } catch {
      setError("Could not start a session");
      setBusy(false);
    }
  }

  return (
    <>
      {/* Kept mounted while naming, so Back returns to the same level and problem. */}
      <div className={presetId ? "hidden" : "contents"}>
        <ProblemPicker onCreate={setPresetId} actionLabel="Next" />
      </div>

      {presetId && (
        <main className="flex flex-1 items-center justify-center bg-bg px-6">
          <form onSubmit={createSession} className="flex w-full max-w-sm flex-col gap-4">
            <div className="mb-2 flex flex-col items-center gap-3 text-center">
              <HelpityLogo />
              <h1 className="text-xl font-bold text-fg">What should students call you?</h1>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted">Your name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ms. Rivera"
                maxLength={30}
                autoComplete="off"
                autoFocus
                className="rounded-lg border border-border bg-surface px-4 py-3 text-lg text-fg placeholder:text-muted/60 focus:outline-2 focus:outline-accent"
              />
            </label>

            <button
              type="submit"
              disabled={busy || !name.trim()}
              className={`${button.primary} py-3 text-base`}
            >
              {busy ? "Starting…" : "Start session"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(undefined);
                setPresetId(undefined);
              }}
              className="text-sm font-semibold text-muted hover:underline"
            >
              Back
            </button>

            {error && <p className="text-center text-sm text-red-600">{error}</p>}
          </form>
        </main>
      )}
    </>
  );
}
