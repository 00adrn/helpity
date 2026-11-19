import { DEFAULT_HELPITY_LEVEL, isHelpityLevel } from "@/lib/ai/levels";
import { isPresetId } from "@/lib/problems/presets";
import { createSession } from "@/lib/sessions/data_store";

/** Validate the selected problem pair and Helpity level, start a session, and return its join code. */
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

  const helpityLevel =
    typeof input === "object" && input !== null && "helpityLevel" in input
      ? input.helpityLevel
      : DEFAULT_HELPITY_LEVEL;
  if (!isHelpityLevel(helpityLevel)) {
    return Response.json({ error: "Choose a valid Helpity level" }, { status: 400 });
  }

  const session = createSession(presetId, helpityLevel);
  return Response.json({ code: session.code, presetId: session.presetId });
}
