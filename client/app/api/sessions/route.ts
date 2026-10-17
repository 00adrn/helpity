import { isPresetId } from "@/lib/problems/presets";
import { createSession } from "@/lib/sessions/data_store";

/** Validate the selected problem pair, start a session, and return its join code. */
export async function POST(request: Request) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const presetId =
    typeof input === "object" && input !== null && "presetId" in input
      ? input.presetId
      : undefined;

  if (!isPresetId(presetId)) {
    return Response.json({ error: "Choose a valid problem" }, { status: 400 });
  }

  const session = createSession(presetId);
  return Response.json({ code: session.code, presetId: session.presetId });
}
