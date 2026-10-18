import type { BeforeMount, EditorProps } from "@monaco-editor/react";

import { codeSizeOptions, getCodeSize, subscribeCodeSize } from "./codeSize";

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

// Monaco is one global instance shared by every editor, so this runs once.
let wired = false;

/**
 * Settings that apply to every editor and every document, set up once through Monaco:
 * - Line endings are always "\n". Monaco otherwise uses the computer's own ending ("\r\n" on
 *   Windows), and the live sync turns positions into character offsets, so a Windows user and a
 *   Mac user would count each line break differently and see cursors and edits drift apart.
 * - The user's code size (see codeSize.ts), now and whenever it changes. This goes through Monaco
 *   rather than the `options` prop, because SharedEditor needs its options object to never change
 *   (changing it would reset read-only).
 */
function wireEditors(monaco: Parameters<BeforeMount>[0]) {
  if (wired) return;
  wired = true;
  // Every document, as soon as it exists (before any live sync binds to it). Pasted "\r\n" text
  // is converted to the document's "\n" too.
  monaco.editor.getModels().forEach((model) => model.setEOL(monaco.editor.EndOfLineSequence.LF));
  monaco.editor.onDidCreateModel((model) => model.setEOL(monaco.editor.EndOfLineSequence.LF));

  const apply = (editor: { updateOptions(options: object): void }) =>
    editor.updateOptions(codeSizeOptions(getCodeSize()));
  monaco.editor.onDidCreateEditor((editor) => {
    // An editor can be thrown away right after it's made (e.g. when a page resets), and touching
    // a disposed one throws, so remember if that happened.
    let disposed = false;
    editor.onDidDispose(() => (disposed = true));
    // Wait a tick so the editor's own options are in place first.
    queueMicrotask(() => {
      if (disposed) return;
      apply(editor);
      // Drop the floating keyboard button Monaco adds on touch screens; tapping the code
      // already opens the keyboard, so it's just clutter in the corner.
      if ("getContribution" in editor) editor.getContribution("editor.contrib.iPadShowKeyboard")?.dispose();
    });
  });
  subscribeCodeSize(() => monaco.editor.getEditors().forEach(apply));
}

/** Register the Helpity editor colors (Figma "editor/*" tokens) before Monaco mounts. */
export const defineEditorTheme: BeforeMount = (monaco) => {
  wireEditors(monaco);
  monaco.editor.defineTheme(EDITOR_THEME, {
    base: "vs",
    inherit: true,
    rules: [
      // Brighter than the Figma tokens so kids can spot keywords and comments at a glance.
      { token: "comment", foreground: "2f7a8f", fontStyle: "italic" },
      { token: "keyword", foreground: "b0277f", fontStyle: "bold" },
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
