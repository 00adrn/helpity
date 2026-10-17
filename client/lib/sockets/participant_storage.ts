import { useMemo, useSyncExternalStore } from "react";

import type { SessionParticipant } from "./sock";

// sessionStorage is per tab, so each incognito tab is its own participant,
// and a refresh keeps the same one.
const keyFor = (code: string) => `helpity:participant:${code.trim().toUpperCase()}`;

/** Remember who this tab is in a session. */
export function saveParticipant(code: string, participant: SessionParticipant) {
  try {
    sessionStorage.setItem(keyFor(code), JSON.stringify(participant));
  } catch {
    // Storage can be blocked; the session page will then ask the user to join again.
  }
}

function readRaw(code: string): string | null {
  try {
    return sessionStorage.getItem(keyFor(code));
  } catch {
    return null;
  }
}

/** The participant this tab saved for the session, or undefined (also on the server). */
export function useStoredParticipant(code: string): SessionParticipant | undefined {
  const raw = useSyncExternalStore(
    () => () => {}, // nothing else changes this tab's storage
    () => readRaw(code),
    () => null,
  );

  return useMemo(() => {
    if (!raw) return undefined;

    try {
      return JSON.parse(raw) as SessionParticipant;
    } catch {
      return undefined;
    }
  }, [raw]);
}
