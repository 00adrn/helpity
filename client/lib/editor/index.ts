import type { EditorProps } from "@monaco-editor/react";

/** Options for every Monaco editor: autocomplete is off so it doesn't solve problems for kids. */
export const baseEditorOptions: EditorProps["options"] = {
  minimap: { enabled: false },
  fontSize: 16,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: "off",
  parameterHints: { enabled: false },
  acceptSuggestionOnEnter: "off",
  tabCompletion: "off",
  snippetSuggestions: "none",
  inlineSuggest: { enabled: false },
  hover: { enabled: "off" },
};
