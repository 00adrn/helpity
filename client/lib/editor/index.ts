import type { BeforeMount, EditorProps } from "@monaco-editor/react";

/** Options for every Monaco editor: autocomplete is off so it doesn't solve problems for kids. */
export const baseEditorOptions: EditorProps["options"] = {
  minimap: { enabled: false },
  fontSize: 16,
  lineHeight: 24,
  // Figma text style "Code/Editor".
  fontFamily: "var(--font-geist-mono), monospace",
  padding: { top: 12, bottom: 12 },
  // Plain look from the Figma "Class Code Window": no rainbow brackets or scrollbar ruler.
  bracketPairColorization: { enabled: false },
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  // No "·" dots for spaces inside a highlight.
  renderWhitespace: "none",
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
  hover: { enabled: false },
};

export const EDITOR_THEME = "helpity";

/** Register the Helpity editor colors (Figma "editor/*" tokens) before Monaco mounts. */
export const defineEditorTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(EDITOR_THEME, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6d5842" },
      { token: "keyword", foreground: "78516d" },
      { token: "number", foreground: "7d5b27" },
      { token: "string", foreground: "8f4738" },
    ],
    colors: {
      "editor.background": "#fdfbf7",
      "editor.foreground": "#3e332b",
      "editorLineNumber.foreground": "#6c5c4c",
      "editorLineNumber.activeForeground": "#3e332b",
      "editor.lineHighlightBackground": "#f5f1e9",
      "editor.lineHighlightBorder": "#f5f1e9",
      // Highlights are Helpity yellow (#ffed00), since highlighting is how you summon Helpity.
      // The inactive color keeps the highlight visible while the student clicks Helpity.
      "editor.selectionBackground": "#ffed0099",
      "editor.inactiveSelectionBackground": "#ffed0080",
      "editor.selectionHighlightBackground": "#ffed0040",
      // Brackets in the plain text color, even if bracket colorization is on.
      ...Object.fromEntries(
        [1, 2, 3, 4, 5, 6].map((n) => [`editorBracketHighlight.foreground${n}`, "#3e332b"]),
      ),
    },
  });
};
