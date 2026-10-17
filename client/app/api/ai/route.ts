import { GoogleGenAI } from "@google/genai";

import type { AssistantRequest, AssistantResponse } from "@/lib/types";

function isAssistantRequest(value: unknown): value is AssistantRequest {
  if (typeof value !== "object" || value === null) return false;

  const input = value as Record<string, unknown>;
  return (
    typeof input.question === "string" &&
    input.question.trim().length > 0 &&
    input.question.length <= 4_000 &&
    typeof input.code === "string" &&
    input.code.length <= 30_000 &&
    typeof input.language === "string" &&
    input.language.length <= 100
  );
}

export async function POST(request: Request) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAssistantRequest(input)) {
    return Response.json({ error: "Invalid assistant request" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!apiKey || !model) {
    return Response.json({ error: "AI assistant is not configured" }, { status: 503 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model,
      contents: `Question:\n${input.question}\n\nLanguage: ${input.language}\n\nCode:\n${input.code}`,
      config: {
        systemInstruction:
          "You are a helpful coding assistant. Explain code clearly and suggest focused changes.",
      },
    });

    if (!result.text) {
      return Response.json({ error: "AI assistant returned no text" }, { status: 502 });
    }

    const response: AssistantResponse = { answer: result.text };
    return Response.json(response);
  } catch {
    return Response.json({ error: "AI assistant request failed" }, { status: 502 });
  }
}
