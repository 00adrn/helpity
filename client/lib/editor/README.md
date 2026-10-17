# Editor

`index.ts` holds `baseEditorOptions`, the Monaco settings shared by every editor (autocomplete off, no minimap). Pass them to `<Editor options={...}>`, with `beforeMount={defineEditorTheme}`.

`codeSize.ts` is the user's code text size (the navbar "Aa" menu). `defineEditorTheme` applies it to every editor through Monaco, so editors don't pass it as a prop.

Syncing the shared editor with Yjs lives in `lib/sockets/sock.ts` (`bindSharedEditor`). The binding owns text synchronization, so avoid calling `editor.setValue()` for remote updates. See the [y-monaco API](https://github.com/yjs/y-monaco#api).
