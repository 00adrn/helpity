import type { OnMount } from "@monaco-editor/react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type { MonacoBinding } from "y-monaco";
import * as Y from "yjs";

import type { SessionParticipant } from "@/lib/sockets/sock";

type MonacoEditor = Parameters<OnMount>[0];

/**
 * Open one student's private code window as its own Yjs room (`session:CODE:student:ID`).
 * The student binds their editor to it; the teacher opens the same room to watch. Each room has its
 * own awareness, so cursors here never mix with the class code window's cursors.
 */
export function connectToStudentCode(
  sessionCode: string,
  studentId: string,
  participant: SessionParticipant,
  token: string,
  /** A watcher (the teacher) only receives; it publishes no presence, so the student never sees it. */
  watchOnly = false,
) {
  const code = sessionCode.trim().toUpperCase();
  if (typeof window === "undefined") {
    throw new Error("Connect to a student's code from a client component");
  }

  const doc = new Y.Doc();
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const provider = new HocuspocusProvider({
    url: process.env.NEXT_PUBLIC_COLLAB_URL || `${protocol}//${window.location.host}/collab`,
    name: `session:${code}:student:${studentId}`,
    document: doc,
    token,
  });
  const awareness = provider.awareness;
  if (!awareness) {
    provider.destroy();
    doc.destroy();
    throw new Error("The student code room needs awareness for cursors");
  }

  if (watchOnly) {
    // With no local state, y-monaco has nothing to publish: setLocalStateField is a no-op on null.
    awareness.setLocalState(null);
  } else {
    awareness.setLocalStateField("participant", {
      id: participant.id,
      name: participant.name,
      color: participant.color,
      role: participant.role,
      avatar: participant.avatar,
      raisedHand: false,
    });
  }

  const text = doc.getText("content");
  /** Holds `lessonId`: which lesson this code was started for (see seedForLesson). */
  const meta = doc.getMap<unknown>("meta");
  let binding: MonacoBinding | undefined;
  let closed = false;

  /** Resolves once the room has loaded the server's copy of the code. */
  const synced = new Promise<void>((resolve) => {
    if (provider.isSynced) resolve();
    else provider.on("synced", () => resolve());
  });

  return {
    text,
    awareness,
    synced,
    /**
     * Make sure the room holds code for this lesson: on the first visit, or after the teacher
     * switched lessons, it is replaced with the starter. On a reload the student's code is kept.
     */
    seedForLesson(lessonId: number, starter: string) {
      if (meta.get("lessonId") === lessonId && text.length > 0) return;
      doc.transact(() => {
        text.delete(0, text.length);
        text.insert(0, starter);
        meta.set("lessonId", lessonId);
      });
    },
    /** Sync a mounted editor with this student's code, and show/publish cursors. */
    async bindEditor(editor: MonacoEditor) {
      await synced;
      if (closed) return;
      const model = editor.getModel();
      if (!model) return;
      const { MonacoBinding } = await import("y-monaco");
      if (closed) return;
      binding = new MonacoBinding(text, model, new Set([editor]), awareness);
    },
    close() {
      if (closed) return;
      closed = true;
      binding?.destroy();
      provider.destroy();
      doc.destroy();
    },
  };
}

export type StudentCodeConnection = ReturnType<typeof connectToStudentCode>;
