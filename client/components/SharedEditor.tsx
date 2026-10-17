"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useState } from "react";

import { baseEditorOptions, defineEditorTheme, EDITOR_THEME } from "@/lib/editor";
import {
  connectToSession,
  type SessionConnection,
  type SessionParticipant,
} from "@/lib/sockets/sock";

type SharedEditorProps = {
  /** Session code; also names the Yjs room. */
  code: string;
  participant: SessionParticipant;
  token: string;
  /** Called with the live connection once opened, and with undefined when it closes. */
  onSession?: (session: SessionConnection | undefined) => void;
  /** Called with the Monaco editor once it has mounted, so other UI (output panel, Helpity) can read its text. */
  onEditor?: (editor: MonacoEditor) => void;
};

export type MonacoEditor = Parameters<OnMount>[0];

// Stable reference: the Editor re-applies options whenever this object changes,
// which would undo the read-only state that bindSharedEditor manages.
// Read-only until the binding says this participant may write.
const options = { ...baseEditorOptions, readOnly: true };

/** The shared code window, synced live through the session's Yjs room. */
export function SharedEditor({ code, participant, token, onSession, onEditor }: SharedEditorProps) {
  const [editor, setEditor] = useState<MonacoEditor>();
  const { id, name, color, role, avatar } = participant;

  const handleMount: OnMount = (mounted) => {
    setEditor(mounted);
    onEditor?.(mounted);
  };

  // Connect and bind once Monaco has mounted; close() tears everything down.
  useEffect(() => {
    if (!editor) return;

    const session = connectToSession(code, { id, name, color, role, avatar }, token);
    onSession?.(session);
    session.bindSharedEditor(editor).catch(() => {
      // The session was closed before Monaco finished loading y-monaco.
    });

    return () => {
      onSession?.(undefined);
      session.close();
    };
  }, [editor, code, id, name, color, role, avatar, token, onSession]);

  return (
    <Editor
      height="100%"
      language="javascript"
      theme={EDITOR_THEME}
      beforeMount={defineEditorTheme}
      onMount={handleMount}
      options={options}
    />
  );
}
