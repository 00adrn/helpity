import type { AssistantDebug, AssistantRequest, AssistantResponse } from "../types";

/** The server says too many questions were asked recently. */
export class RateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("The AI assistant is rate limited");
  }
}

/** Anything slower than this gets a warning in the console (see logDebug). */
const SLOW_MS = 5000;

/**
 * Log how long an answer took and why, to the browser console. `clientMs` is the whole round trip;
 * the rest comes from the server (see `AssistantDebug`).
 */
function logDebug(clientMs: number, status: number, debug: AssistantDebug | undefined) {
  const label = `[Helpity AI] ${Math.round(clientMs)} ms (HTTP ${status})`;
  if (!debug) {
    console.warn(`${label}: the server sent no debug info`);
    return;
  }

  const { geminiMs, routeMs, usage } = debug;
  const notes: string[] = [];
  if (debug.error) notes.push(`Failed: ${debug.error}.`);
  if ((usage?.thoughtsTokens ?? 0) > 0) {
    notes.push(
      `The model used ${usage?.thoughtsTokens} hidden "thinking" tokens. Lower its thinking level to cut latency.`,
    );
  }
  if (geminiMs !== undefined && geminiMs > SLOW_MS && !(usage?.thoughtsTokens)) {
    notes.push("Gemini was slow with few tokens and no thinking: likely Google-side queueing or overload.");
  }
  if (debug.callNumber === 1) {
    notes.push("First request since the server started: `next dev` also compiles the route. Test the second call.");
  }
  if (geminiMs !== undefined && clientMs - geminiMs > 1500) {
    notes.push(`${Math.round(clientMs - geminiMs)} ms was outside the Gemini call (network, route, compile).`);
  }

  const slow = clientMs > SLOW_MS || debug.error;
  const log = slow ? console.warn : console.info;
  console.groupCollapsed(label);
  log(`Breakdown: total ${Math.round(clientMs)} ms | route ${routeMs} ms | Gemini ${geminiMs ?? "n/a"} ms`);
  console.table({
    "requested model": debug.model,
    "answering model": debug.modelVersion ?? "n/a",
    "request #": debug.callNumber,
    "prompt chars": debug.promptChars,
    "prompt tokens": usage?.promptTokens,
    "answer tokens": usage?.answerTokens,
    "thinking tokens": usage?.thoughtsTokens ?? 0,
    "total tokens": usage?.totalTokens,
    "finish reason": debug.finishReason,
  });
  for (const note of notes) log(note);
  console.groupEnd();
}

/** Ask the server-side AI endpoint about the current code. Pass a signal to cancel. */
export async function askAssistant(
  input: AssistantRequest,
  signal?: AbortSignal,
): Promise<AssistantResponse> {
  const start = performance.now();
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  if (response.status === 429) {
    const body = (await response.json().catch(() => undefined)) as
      | { retryAfterSeconds?: number }
      | undefined;
    throw new RateLimitError(body?.retryAfterSeconds ?? 30);
  }

  const body = (await response.json().catch(() => undefined)) as
    | (Partial<AssistantResponse> & { debug?: AssistantDebug })
    | undefined;
  logDebug(performance.now() - start, response.status, body?.debug);

  if (!response.ok || !body?.answer || !body.emotion) {
    throw new Error("The AI assistant could not answer");
  }

  return { answer: body.answer, emotion: body.emotion };
}
