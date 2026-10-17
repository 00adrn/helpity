"use client";

import { useEffect, useState } from "react";

import type { ParticipantPresence, SessionConnection } from "@/lib/sockets/sock";

type Awareness = SessionConnection["awareness"] | NonNullable<import("@hocuspocus/provider").HocuspocusProvider["awareness"]>;

/**
 * y-monaco publishes every participant's cursor through awareness and marks it in the editor with
 * the classes `yRemoteSelection-<clientID>` and `yRemoteSelectionHead-<clientID>`, but ships no styles.
 * Without a rule a class draws nothing, so we only style the people allowed to edit: the teacher and
 * the current shared writer. Everyone else's cursor stays invisible.
 */
export function RemoteCursors({ session }: { session: SessionConnection | undefined }) {
  const [css, setCss] = useState("");

  useEffect(() => {
    if (!session) return;
    const { awareness, meta } = session;
    const update = () => setCss(buildCss(awareness, meta.get("writerId")));
    update();
    awareness.on("change", update);
    meta.observe(update);
    return () => {
      awareness.off("change", update);
      meta.unobserve(update);
    };
  }, [session]);

  return <style>{css}</style>;
}

/** Cursors for a student's private code room: only the student and the watching teacher are in it, so show everyone. */
export function PresenceCursors({ awareness }: { awareness: Awareness | undefined }) {
  const [css, setCss] = useState("");

  useEffect(() => {
    if (!awareness) return;
    const update = () => setCss(buildCss(awareness, undefined, true));
    update();
    awareness.on("change", update);
    return () => awareness.off("change", update);
  }, [awareness]);

  return <style>{css}</style>;
}

function buildCss(awareness: Awareness, writerId: unknown, everyone = false): string {
  let css = "";
  for (const [clientId, state] of awareness.getStates()) {
    const person = (state as { participant?: ParticipantPresence }).participant;
    if (!person) continue;
    const canEdit = everyone || person.role === "teacher" || person.id === writerId;
    // Colors and names come from other browsers and end up in a stylesheet, so only accept safe values.
    if (!canEdit || !/^#[0-9a-f]{6}$/i.test(person.color)) continue;

    const name = person.name.replace(/[^\p{L}\p{N} _.-]/gu, "").slice(0, 24);
    css += `
.yRemoteSelection-${clientId} { background-color: ${person.color}44; }
.yRemoteSelectionHead-${clientId} {
  position: absolute;
  box-sizing: border-box;
  height: 100%;
  border-left: 2px solid ${person.color};
}
.yRemoteSelectionHead-${clientId}::after {
  content: "${name}";
  position: absolute;
  top: -1.4em;
  left: -2px;
  padding: 0 4px;
  border-radius: 3px;
  background: ${person.color};
  color: white;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
}`;
  }
  return css;
}
