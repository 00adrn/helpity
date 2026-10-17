# Shared types

`index.ts` defines the data shapes used across the editor, file list, and AI helper.

- `CodeFile` describes a file in the user interface. Its `id` must be stable so every collaborator joins the same Liveblocks room.
- `AssistantRequest` is the question and code sent to the AI endpoint.
- `AssistantResponse` is the answer returned by that endpoint.

Add shared request, response, and file metadata types here as the app grows. Keep Monaco, Yjs, and server implementation details in their own folders.
