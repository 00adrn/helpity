import type { AssistantRequest, AssistantResponse } from "../types";

/** The server says too many questions were asked recently. */
export class RateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("The AI assistant is rate limited");
  }
}

/** Ask the server-side AI endpoint about the current code. Pass a signal to cancel. */
export async function askAssistant(
  input: AssistantRequest,
  signal?: AbortSignal,
): Promise<AssistantResponse> {
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

  if (!response.ok) {
    throw new Error("The AI assistant could not answer");
  }

  return (await response.json()) as AssistantResponse;
}
