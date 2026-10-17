import { getSession } from "@/lib/sessions/data_store";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];

/** Join a live session as a student: check the code and hand back a participant. */
export async function POST(request: Request) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { code, name } = (input ?? {}) as { code?: unknown; name?: unknown };

  if (typeof code !== "string" || typeof name !== "string") {
    return Response.json({ error: "A code and a name are required" }, { status: 400 });
  }

  const nickname = name.trim();

  if (!nickname || nickname.length > 30) {
    return Response.json({ error: "Pick a nickname up to 30 characters" }, { status: 400 });
  }

  const session = getSession(code);

  if (!session) {
    return Response.json({ error: "No live session has that code" }, { status: 404 });
  }

  return Response.json({
    code: session.code,
    participant: {
      id: crypto.randomUUID(),
      name: nickname,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      role: "student",
    },
  });
}
