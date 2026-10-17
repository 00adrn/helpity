# Sockets

`sock.ts` is the realtime layer for a classroom session. `connectToSession(code, participant, token)` opens the session's Yjs room through Hocuspocus and returns the shared `text`, the `meta` map, and the provider's awareness. It also returns `bindSharedEditor(editor)` (syncs a Monaco editor and sets read-only from `meta.writerId`), `setRaisedHand`, `setWriter` (teacher only) and `close()`.

Call it from a client component after Monaco mounts, and call `close()` on cleanup. Set `NEXT_PUBLIC_COLLAB_URL` to test against `npm run dev:collab`; otherwise it connects to `/collab` on the page's origin.
