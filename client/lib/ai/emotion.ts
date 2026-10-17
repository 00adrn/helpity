import { useCallback, useEffect, useRef, useState } from "react";

import type { Emotion } from "../types";

export type { Emotion };

export type Sprite = "flat" | "happy" | "think" | "open" | "angry";

/**
 * Which image each emotion shows. Happy is the default; `flat` and `open` only appear while
 * responding, when `talking` flaps between them.
 */
export const EMOTION_SPRITE: Record<Emotion, Sprite> = {
  idle: "happy",
  happy: "happy",
  thinking: "think",
  talking: "open",
  error: "think",
};

/**
 * Asking Helpity whether it is "Verity" makes it angry. This is not an `Emotion` the model can
 * pick: only the user's question triggers it, and it lasts until they ask something else.
 */
export function isVerityQuestion(text: string): boolean {
  return /\bverit(y|ie|ee)\b/i.test(text);
}

/** Survives Helpity remounting (e.g. switching files) but not a page reload. */
let enraged = false;

export function spriteUrl(sprite: Sprite): string {
  return `/helpity/helpity_${sprite}_rendered.png`;
}

/**
 * The assistant's current emotion. `set` holds an emotion until changed; `flash` shows one
 * briefly and then falls back to idle.
 */
export function useAssistantMood() {
  const [emotion, setEmotion] = useState<Emotion>("idle");
  const [angry, setAngry] = useState(enraged);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clear = () => clearTimeout(timer.current);
  useEffect(() => clear, []);

  const set = useCallback((next: Emotion) => {
    clear();
    setEmotion(next);
  }, []);

  const flash = useCallback((next: Emotion, ms = 2000) => {
    clear();
    setEmotion(next);
    timer.current = setTimeout(() => setEmotion("idle"), ms);
  }, []);

  /** Angry face overrides every other until `calm`. */
  const enrage = useCallback(() => {
    enraged = true;
    setAngry(true);
  }, []);

  const calm = useCallback(() => {
    enraged = false;
    setAngry(false);
  }, []);

  return { emotion, angry, enrage, calm, set, flash };
}
