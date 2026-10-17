import { randomInt } from "node:crypto";

import { presets, type PresetId } from "@/lib/problems/presets";

// THIS FILE IS THE SESSION DATA STORE FOR OUR APPLICATION
// ON THE SERVER. IT PROVIDES FUNCTIONS RELATED TO THE MOVEMENT
// OF SESSION DATA.

export type Session = {
  code: string;
  createdAt: number;
  presetId: PresetId;
  initialText: string;
  documentState?: Uint8Array;
};

// Kept on globalThis so hot reloads in dev don't create a fresh, empty Map.
const globalStore = globalThis as { __sessions?: Map<string, Session> };
const sessions = (globalStore.__sessions ??= new Map<string, Session>());

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

// Generate random alphabetic code
export function createRoomCode(): string {
  let code = "";

  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }

  return code;
};

/** Make a new session with an unused code, remember it, and return it. */
export function createSession(presetId: PresetId): Session {
  while (true) {
    const code = createRoomCode();
    if (!sessions.has(code)) {
      const session: Session = {
        code,
        createdAt: Date.now(),
        presetId,
        initialText: presets[presetId].sharedText,
      };
      sessions.set(code, session);
      return session;
    }
  }
}

/** Look up a live session by its code (any casing). */
export function getSession(code: string): Session | undefined {
  const standardCode = code.trim().toUpperCase();
  return sessions.get(standardCode);
}
