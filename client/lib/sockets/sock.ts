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
      process.env.NEXT_PUBLIC_COLLAB_URL ??
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
    awareness,
    provider,
    bindSharedEditor,
    /** Update this participant's raised-hand flag for everyone in the session. */
    setRaisedHand(value: boolean) {
      if (closed) throw new Error("The session connection is closed");
      raisedHand = value;
      publishPresence();
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

/** What each participant publishes to everyone else through awareness. */
export type ParticipantPresence = SessionParticipant & { raisedHand: boolean };
