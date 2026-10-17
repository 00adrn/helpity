"use client";

import { useEffect, useRef, useState } from "react";

import { OutputPanel, TIMEOUT_MS } from "@/components/OutputPanel";
import { runCode, type RunHandle, type RunResult } from "@/lib/editor/runner";
import type { SessionConnection } from "@/lib/sockets/sock";

/** What the teacher publishes in the session's shared `run` map, under the key "state". */
type SharedRun = { status: "running" } | { status: "done"; result: RunResult };

const STATE_KEY = "state";

/**
 * The session's output panel. Only the teacher's browser runs code; the outcome is written to the
 * shared Yjs document, so every participant sees the same output. Students get a read-only view.
 */
export function SessionOutput({
  session,
  isTeacher,
  getCode,
}: {
  session: SessionConnection | undefined;
  isTeacher: boolean;
  getCode: () => string | undefined;
}) {
  const [shared, setShared] = useState<SharedRun>();
  const handle = useRef<RunHandle>(undefined);

  // Mirror the shared run state into React.
  useEffect(() => {
    if (!session) return;
    const read = () => setShared(session.run.get(STATE_KEY) as SharedRun | undefined);
    read();
    session.run.observe(read);
    return () => session.run.unobserve(read);
  }, [session]);

  // Don't leave a worker running, or students stuck on "Running…", if the teacher leaves mid-run.
  useEffect(() => {
    return () => {
      if (!handle.current || !session) return;
      handle.current.stop();
      handle.current = undefined;
      try {
        session.run.set(STATE_KEY, finished({ logs: [], timedOut: false, stopped: true }));
      } catch {
        // The connection was already torn down.
      }
    };
  }, [session]);

  async function run() {
    const code = getCode();
    if (!session || code === undefined) return;
    const current = runCode(code, { timeoutMs: TIMEOUT_MS });
    handle.current = current;
    session.run.set(STATE_KEY, { status: "running" } satisfies SharedRun);
    const outcome = await current.promise;
    if (handle.current !== current) return;
    handle.current = undefined;
    session.run.set(STATE_KEY, finished(outcome));
  }

  function stop() {
    if (handle.current) {
      handle.current.stop();
      return;
    }
    // "Running" with no local worker means a previous teacher tab crashed or reloaded mid-run.
    session?.run.set(STATE_KEY, finished({ logs: [], timedOut: false, stopped: true }));
  }

  return (
    <OutputPanel
      running={shared?.status === "running"}
      result={shared?.status === "done" ? shared.result : undefined}
      onRun={isTeacher && session ? run : undefined}
      onStop={isTeacher && session ? stop : undefined}
      emptyText={isTeacher ? "Press Run to show output to everyone." : "The teacher hasn't run any code yet."}
    />
  );
}

/** Round-trips through JSON so the stored value has no `undefined` fields, which Yjs shouldn't carry. */
function finished(result: RunResult): SharedRun {
  return { status: "done", result: JSON.parse(JSON.stringify(result)) };
}
