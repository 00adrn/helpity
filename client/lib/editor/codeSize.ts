import { useSyncExternalStore } from "react";

/** The code text sizes a user can pick in the navbar. Medium matches baseEditorOptions. */
export const CODE_SIZES = [
  { value: 14, label: "Small" },
  { value: 16, label: "Medium" },
  { value: 20, label: "Big" },
] as const;

export type CodeSize = (typeof CODE_SIZES)[number]["value"];

const DEFAULT_SIZE: CodeSize = 16;
// localStorage, so the choice follows the user into every session on this device.
const STORAGE_KEY = "helpity:code-size";
const listeners = new Set<() => void>();

function isCodeSize(value: number): value is CodeSize {
  return CODE_SIZES.some((size) => size.value === value);
}

let current: CodeSize | undefined;

/** The user's code size, read from storage the first time. */
export function getCodeSize(): CodeSize {
  if (current === undefined) {
    let stored = NaN;
    try {
      stored = Number(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Storage can be blocked; fall back to the default.
    }
    current = isCodeSize(stored) ? stored : DEFAULT_SIZE;
  }
  return current;
}

export function setCodeSize(size: CodeSize) {
  current = size;
  try {
    localStorage.setItem(STORAGE_KEY, String(size));
  } catch {
    // Still applies for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeCodeSize(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Monaco options for a code size; lines stay 1.5× the text so code doesn't feel cramped. */
export function codeSizeOptions(size: CodeSize) {
  return { fontSize: size, lineHeight: Math.round(size * 1.5) };
}

export function useCodeSize(): CodeSize {
  return useSyncExternalStore(subscribeCodeSize, getCodeSize, () => DEFAULT_SIZE);
}
