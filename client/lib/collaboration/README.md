# Collaboration

`index.ts` creates the Liveblocks client, enters a room for a file, and gets the shared Yjs text named `content`. Liveblocks handles the connection and synchronizes Yjs changes between users.

Call `connectToFile(file.id)` from a client-side editor component. Pass its `text` and `provider` to the editor binding, and call `leave()` when the component closes or changes files. Later, add collaborator names, presence, connection status, and permissions here.

The starter uses `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` for a prototype. Before allowing private files, use a Liveblocks authentication endpoint and check each user's access to the requested file. See the [Liveblocks client docs](https://liveblocks.io/docs/api-reference/liveblocks-client) and [Yjs provider docs](https://liveblocks.io/docs/api-reference/liveblocks-yjs).
