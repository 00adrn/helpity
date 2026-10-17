export type CodeFile = {
  id: string;
  name: string;
  language: string;
};

/** Moods the assistant can show. */
export const EMOTIONS = ["idle", "happy", "thinking", "talking", "error"] as const;
export type Emotion = (typeof EMOTIONS)[number];

/**
 * Moods the model picks for how it feels about the answer once it has finished speaking:
 * `happy` for good news, `thinking` when it spotted a problem or isn't sure.
 */
export const ANSWER_EMOTIONS = ["happy", "thinking"] as const satisfies readonly Emotion[];

export type AssistantRequest = {
  question: string;
  code: string;
  language: string;
  /** 1-based position of the user's text cursor. */
  cursor?: { line: number; column: number };
  /** The text the user has highlighted, if any. */
  selection?: string;
};

export type AssistantResponse = {
  answer: string;
  emotion: Emotion;
};
