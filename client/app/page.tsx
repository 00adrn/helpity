"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  isPresetId,
  presets,
  type PresetId,
  type PresetLevel,
} from "@/lib/problems/presets";
import { saveParticipant } from "@/lib/sockets/participant_storage";
import type { SessionParticipant } from "@/lib/sockets/sock";

const levels: { value: PresetLevel; label: string }[] = [
  { value: "elementary", label: "Elementary" },
  { value: "middle", label: "Middle school" },
  { value: "high", label: "High school" },
];

/** Let a teacher choose a question before creating a session. */
export default function Home() {
  const router = useRouter();
  const questionDialog = useRef<HTMLDialogElement>(null);
  const [presetId, setPresetId] = useState<PresetId | "">("");
  const [starting, setStarting] = useState(false);
  const [teacherError, setTeacherError] = useState<string>();
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  /** Open the teacher's question picker before creating a session. */
  function openQuestionPicker() {
    setTeacherError(undefined);
    questionDialog.current?.showModal();
  }

  /** Dismiss the picker without creating a session. */
  function closeQuestionPicker() {
    questionDialog.current?.close();
  }

  /** Create a session with the selected starter code and enter as its teacher. */
  async function startSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (starting) return;
    if (!isPresetId(presetId)) {
      setTeacherError("Choose a question first");
      return;
    }

    setTeacherError(undefined);
    setStarting(true);

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
      });
      closeQuestionPicker();
      router.push(`/session/${code}`);
    } catch {
      setTeacherError("Could not start a session");
    } finally {
      setStarting(false);
    }
  }

  /** Check a student's join code and remember their participant identity. */
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
    router.push(`/session/${code}`);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col gap-8 p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Helpity</h1>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Teacher</h2>
          <button
            type="button"
            onClick={openQuestionPicker}
            className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Start a session
          </button>
        </section>

        <dialog
          ref={questionDialog}
          aria-labelledby="question-dialog-title"
          onCancel={(event) => {
            if (starting) event.preventDefault();
          }}
          className="m-auto w-full max-w-sm rounded border border-zinc-300 bg-white p-6 text-black backdrop:bg-black/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          <form onSubmit={startSession} className="flex flex-col gap-4">
            <h2 id="question-dialog-title" className="text-lg font-medium">
              Choose a question
            </h2>
            <label htmlFor="preset">Question</label>
            <select
              id="preset"
              value={presetId}
              onChange={(event) => setPresetId(event.target.value as PresetId | "")}
              required
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            >
              <option value="" disabled>
                Select a question
              </option>
              {levels.map((level) => (
                <optgroup key={level.value} label={level.label}>
                  {Object.entries(presets)
                    .filter(([, preset]) => preset.level === level.value)
                    .map(([id, preset]) => (
                      <option key={id} value={id}>
                        {preset.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            {teacherError && <p role="alert">{teacherError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeQuestionPicker} disabled={starting}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={starting}
                className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
              >
                {starting ? "Starting…" : "Start session"}
              </button>
            </div>
          </form>
        </dialog>

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
