import type { OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";

import type { SharedFileConnection } from "../collaboration";

type MonacoEditor = Parameters<OnMount>[0];

/** Keep a Monaco editor model and one shared Yjs text in sync. */
export function bindCollaborativeEditor(
  editor: MonacoEditor,
  connection: SharedFileConnection,
): MonacoBinding {
  const model = editor.getModel();

  if (!model) {
    throw new Error("The Monaco editor needs a model before binding");
  }

  return new MonacoBinding(
    connection.text,
    model,
    new Set([editor]),
    connection.provider.awareness,
  );
}
