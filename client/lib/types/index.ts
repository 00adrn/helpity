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
  /** 1-based first and last line of the highlighted text. */
  selectionLines?: { start: number; end: number };
  /** Console output of the user's last run (logs and any error), when they want it explained. */
  output?: string;
  /** Helpity has been asked about Verity and answers in a temper for the rest of the session. */
  angry?: boolean;
};

/** Timing and token details for one Gemini call, so slow answers can be diagnosed from the browser console. */
export type AssistantDebug = {
  /** Which request since the server started; the first in `next dev` also compiles the route. */
  callNumber: number;
  /** The model we asked for, and the exact version Google says answered. */
  model: string;
  modelVersion?: string;
  /** Set only when the main model failed and the fallback answered (or every model failed). */
  answeredBy?: string;
  failedAttempts?: { model: string; error: string }[];
  /** Time spent waiting on `generateContent`, in ms. Undefined if the call never started. */
  geminiMs?: number;
  /** Time the whole route took, in ms. */
  routeMs: number;
  promptChars: number;
  /** From Gemini's usageMetadata. `thoughtsTokens` are hidden "thinking" tokens that add latency. */
  usage?: {
    promptTokens?: number;
    answerTokens?: number;
    thoughtsTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
  /** Set when the call failed or returned nothing usable. */
  error?: string;
};

export type AssistantResponse = {
  answer: string;
  emotion: Emotion;
};
