# Editor

`index.ts` connects a mounted Monaco editor to the shared Yjs text through `y-monaco`. Changes made in Monaco update Yjs, and changes from other users update Monaco. The provider's awareness also supports remote selections.

Create the Monaco component in a client-side React component, then call `bindCollaborativeEditor(editor, connection)` after Monaco mounts. Destroy the returned binding when the editor unmounts or switches files. Add language settings, themes, keyboard shortcuts, and editor commands here as needed.

The binding owns text synchronization. Avoid separately calling `editor.setValue()` for remote updates, because that bypasses the shared editing flow. See the [y-monaco API](https://github.com/yjs/y-monaco#api).
