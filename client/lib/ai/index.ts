import type { AssistantRequest, AssistantResponse } from "../types";

/** Ask the server-side AI endpoint about the current code. */
export async function askAssistant(input: AssistantRequest): Promise<string> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("The AI assistant could not answer");
  }

  const result = (await response.json()) as AssistantResponse;
  return result.answer;
}
