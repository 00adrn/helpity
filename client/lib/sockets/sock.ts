import { presets, type PresetId } from "@/lib/problems/presets";
import type { StudentProgress } from "@/lib/sockets/progress";
import type { OnMount } from "@monaco-editor/react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type { MonacoBinding } from "y-monaco";
import * as Y from "yjs";

type MonacoEditor = Parameters<OnMount>[0];

export type SessionParticipant = {
  id: string;
  name: string;
  color: string;
  role: "teacher" | "student";
  /** Avatar id picked when joining (see components/Avatar.tsx). */
  avatar?: string;
};

/**
 * Open one Yjs document for a classroom session and connect it through Hocuspocus.
 * The returned helpers manage presence, the shared Monaco editor, and cleanup.
 */
export function connectToSession(
  sessionCode: string,
  participant: SessionParticipant,
  token: string,
) {
  const code = sessionCode.trim().toUpperCase();
  if (!code || !participant.id.trim() || !participant.name.trim() || !token) {
    throw new Error("A session code, participant, and token are required");
  }
  if (typeof window === "undefined") {
    throw new Error("Connect to a session from a client component");
  }

  const doc = new Y.Doc();
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const provider = new HocuspocusProvider({
    // NEXT_PUBLIC_COLLAB_URL points at a standalone dev server (see dev/collab-server.mjs).
    url:
      process.env.NEXT_PUBLIC_COLLAB_URL ||
      `${protocol}//${window.location.host}/collab`,
    name: `session:${code}`,
    document: doc,
    token,
  });
  const providerAwareness = provider.awareness;
  if (!providerAwareness) {
    provider.destroy();
    doc.destroy();
    throw new Error("The session provider needs awareness for participants");
  }
  const awareness: NonNullable<typeof providerAwareness> = providerAwareness;
  const text = doc.getText("content");
  const meta = doc.getMap<unknown>("meta");
  /** Holds the latest code run under key "state"; only the teacher writes it (see components/SessionOutput.tsx). */
  const run = doc.getMap<unknown>("run");
  /** Each student's last test submission, keyed by participant id (see lib/sockets/progress.ts). */
  const progress = doc.getMap<StudentProgress>("progress");
  const bindings = new Set<() => void>();
  let raisedHand = false;
  let closed = false;

  /** Publish this participant's current identity and hand state through awareness. */
  function publishPresence() {
    awareness.setLocalStateField("participant", {
      id: participant.id,
      name: participant.name,
      color: participant.color,
      role: participant.role,
      avatar: participant.avatar,
      raisedHand,
    });
  }

  publishPresence();

  /**
   * Sync a mounted Monaco editor with shared text and resolve to its cleanup function.
   * y-monaco is imported lazily because it loads Monaco itself, which needs a browser.
   */
  async function bindSharedEditor(editor: MonacoEditor) {
    if (closed) throw new Error("The session connection is closed");

    const model = editor.getModel();
    if (!model) throw new Error("The Monaco editor needs a model before binding");

    const { MonacoBinding } = await import("y-monaco");
    if (closed) throw new Error("The session connection is closed");

    const binding: MonacoBinding = new MonacoBinding(
      text,
      model,
      new Set([editor]),
      awareness,
    );
    /** Let the teacher or selected student write whenever the shared writer changes. */
    const updateReadOnly = () => {
      const writerId = meta.get("writerId");
      editor.updateOptions({
        readOnly: participant.role !== "teacher" && writerId !== participant.id,
      });
    };

    meta.observe(updateReadOnly);
    updateReadOnly();

    /** Stop watching writer changes and detach this editor from shared text. */
    const unbind = () => {
      meta.unobserve(updateReadOnly);
      binding.destroy();
      bindings.delete(unbind);
    };
    bindings.add(unbind);
    return unbind;
  }

  return {
    text,
    meta,
    run,
    progress,
    awareness,
    provider,
    bindSharedEditor,
    /** Update this participant's raised-hand flag for everyone in the session. */
    setRaisedHand(value: boolean) {
      if (closed) throw new Error("The session connection is closed");
      raisedHand = value;
      publishPresence();
    },
    /** Record a test submission for this student: the score, the code, each test's result, and one more attempt. */
    submitProgress(result: Omit<StudentProgress, "name" | "attempts">) {
      if (closed) throw new Error("The session connection is closed");
      const attempts = (progress.get(participant.id)?.attempts ?? 0) + 1;
      progress.set(participant.id, { name: participant.name, ...result, attempts });
    },
    /**
     * Store the one student allowed to edit, or null to revoke access.
     * This client check helps the UI; the server must enforce teacher authority.
     */
    setWriter(writerId: string | null) {
      if (closed) throw new Error("The session connection is closed");
      if (participant.role !== "teacher") {
        throw new Error("Only the teacher can choose a shared editor writer");
      }
      meta.set("writerId", writerId);
    },
    /**
     * Start a new lesson for everyone: the class code becomes the new example, and the old run
     * output, practice results and write access are cleared. `lessonId` counts up so students
     * notice the switch (countdown) and reset their own code, even for the same problem again.
     */
    switchLesson(presetId: PresetId) {
      if (closed) throw new Error("The session connection is closed");
      if (participant.role !== "teacher") throw new Error("Only the teacher can switch lessons");
      doc.transact(() => {
        text.delete(0, text.length);
        text.insert(0, presets[presetId].teacherCode);
        meta.set("presetId", presetId);
        meta.set("lessonId", lessonIdOf(meta) + 1);
        meta.set("writerId", null);
        run.clear();
        progress.clear();
      });
    },
    /**
     * Mark the session as over; every student's screen switches to "session ended".
     * Resolves once the server has the change (or after 3s), so it's safe to close afterwards.
     */
    endSession(): Promise<void> {
      if (closed) throw new Error("The session connection is closed");
      if (participant.role !== "teacher") throw new Error("Only the teacher can end the session");
      meta.set("ended", true);
      return new Promise((resolve) => {
        const done = () => {
          if (provider.hasUnsyncedChanges) return;
          provider.off("unsyncedChanges", done);
          clearTimeout(timeout);
          resolve();
        };
        const timeout = setTimeout(() => {
          provider.off("unsyncedChanges", done);
          resolve();
        }, 3000);
        provider.on("unsyncedChanges", done);
        done();
      });
    },
    /** Detach every editor, disconnect the provider, and destroy the Yjs document. */
    close() {
      if (closed) return;
      closed = true;
      for (const unbind of bindings) unbind();
      provider.destroy();
      doc.destroy();
    },
  };
}

export type SessionConnection = ReturnType<typeof connectToSession>;

/** Which lesson the session is on: 0 for the one it started with, then +1 per switch. */
export function lessonIdOf(meta: SessionConnection["meta"]): number {
  const value = meta.get("lessonId");
  return typeof value === "number" ? value : 0;
}

/** What each participant publishes to everyone else through awareness. */
export type ParticipantPresence = SessionParticipant & { raisedHand: boolean };
