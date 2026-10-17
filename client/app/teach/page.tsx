"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { randomAvatar } from "@/components/Avatar";
import { ProblemPicker } from "@/components/ProblemPicker";
import type { PresetId } from "@/lib/problems/presets";
import { saveParticipant } from "@/lib/sockets/participant_storage";

/** Teacher setup: choose a problem, then create the session and enter it. */
export default function TeachPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function createSession(presetId: PresetId) {
    if (busy) return;
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
        name: "Teacher",
        color: "#f97316",
        role: "teacher",
        avatar: randomAvatar(),
      });
      router.push(`/session/${code}`);
    } catch {
      setError("Could not start a session");
      setBusy(false);
    }
  }

  return <ProblemPicker onCreate={createSession} busy={busy} error={error} />;
}
