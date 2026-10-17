"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { randomAvatar, type AvatarId } from "@/components/Avatar";
import { AvatarPicker } from "@/components/AvatarPicker";
import { button } from "@/components/button";
import { HelpityLogo } from "@/components/HelpityLogo";
import {
  concepts,
  isPresetId,
  presets,
  type PresetId,
  type PresetLevel,
} from "@/lib/problems/presets";
import { saveParticipant } from "@/lib/sockets/participant_storage";
import type { SessionParticipant } from "@/lib/sockets/sock";

type Joined = { code: string; participant: SessionParticipant };

type Step = { name: "choose" } | { name: "join" } | { name: "avatar"; joined: Joined };

const levelLabels: Record<PresetLevel, string> = {
  blank: "Blank",
  elementary: "Elementary",
  middle: "Middle school",
  high: "High school",
};

/** Show the landing page, question picker, student join form, or avatar picker. */
export default function Home() {
  const router = useRouter();
  const questionDialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>({ name: "choose" });
  const [presetId, setPresetId] = useState<PresetId | "">("");
  const [teacherError, setTeacherError] = useState<string>();
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  /** Open the teacher's problem picker before creating a session. */
  function openQuestionPicker() {
    setTeacherError(undefined);
    questionDialog.current?.showModal();
  }

  /** Dismiss the question picker without creating a session. */
  function closeQuestionPicker() {
    questionDialog.current?.close();
  }

  /** Create a session with the selected teacher example and student exercise. */
  async function startSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!isPresetId(presetId)) {
      setTeacherError("Choose a problem first");
      return;
    }

    setTeacherError(undefined);
    setBusy(true);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId }),
      });

      if (!response.ok) {
        setTeacherError("Could not start a session");
        return;
      }

      const { code } = (await response.json()) as { code: string };
      // No sign-in yet (Auth0 comes later), so whoever starts a session is its teacher.
      saveParticipant(code, {
        id: crypto.randomUUID(),
        name: "Teacher",
        color: "#f97316",
        role: "teacher",
        avatar: randomAvatar(),
      });
      closeQuestionPicker();
      router.push(`/session/${code}`);
    } catch {
      setTeacherError("Could not start a session");
    } finally {
      setBusy(false);
    }
  }

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
    <main className="flex flex-1 items-center justify-center bg-bg px-6">
      <div className="flex flex-col items-center">
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
            onClick={openQuestionPicker}
            disabled={busy}
            className="flex w-70 flex-col items-center gap-1 rounded-xl border border-border bg-surface p-6 shadow-sm transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
          >
            <span className="text-xl font-bold text-fg">I&apos;m a teacher</span>
            <span className="text-sm font-medium text-muted">Start a session</span>
          </button>
        </div>

      </div>

      <dialog
        ref={questionDialog}
        aria-labelledby="question-dialog-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        className="m-auto w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-fg backdrop:bg-black/40"
      >
        <form onSubmit={startSession} className="flex flex-col gap-4">
          <h2 id="question-dialog-title" className="text-xl font-bold">
            Choose a problem
          </h2>
          <label htmlFor="preset" className="text-sm font-semibold text-muted">
            Problem
          </label>
          <select
            id="preset"
            value={presetId}
            onChange={(event) => setPresetId(event.target.value as PresetId | "")}
            required
            className="rounded-lg border border-border bg-surface px-3 py-2 text-fg"
          >
            <option value="" disabled>
              Select a problem
            </option>
            <option value="blank">Blank file · no tests</option>
            {concepts.map((concept) => (
              <optgroup key={concept} label={concept}>
                {Object.entries(presets)
                  .filter(([, preset]) => preset.concept === concept)
                  .map(([id, preset]) => (
                    <option key={id} value={id}>
                      {preset.teacherTitle} → {preset.title} · {levelLabels[preset.level]}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          {isPresetId(presetId) && (
            <div className="rounded-lg bg-surface-sunken px-3 py-2 text-sm text-muted">
              {presetId === "blank" ? (
                <p>Both code windows start empty. There are no tests.</p>
              ) : (
                <>
                  <p>Class example: {presets[presetId].teacherTitle}</p>
                  <p>Student practice: {presets[presetId].title} · {presets[presetId].tests.length} tests</p>
                </>
              )}
            </div>
          )}
          {teacherError && <p role="alert" className="text-sm text-red-600">{teacherError}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeQuestionPicker} disabled={busy} className={button.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={button.primary}>
              {busy ? "Starting…" : "Start session"}
            </button>
          </div>
        </form>
      </dialog>
    </main>
  );
}
