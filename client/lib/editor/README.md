# Editor

`index.ts` holds `baseEditorOptions`, the Monaco settings shared by every editor (autocomplete off, no minimap, font size). Pass them to `<Editor options={...}>`.

Syncing the shared editor with Yjs lives in `lib/sockets/sock.ts` (`bindSharedEditor`). The binding owns text synchronization, so avoid calling `editor.setValue()` for remote updates. See the [y-monaco API](https://github.com/yjs/y-monaco#api).
