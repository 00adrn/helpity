import { createSession } from "@/lib/sessions/data_store";

/** Start a new session and return its join code. */
export async function POST() {
  const session = createSession();
  return Response.json({ code: session.code });
}
