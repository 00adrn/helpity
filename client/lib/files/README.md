# Files

`index.ts` maps each file ID to a Liveblocks room ID. Two people opening the same file ID therefore connect to the same shared document.

Add file listing, creation, renaming, deletion, and metadata loading here when you add a database or file service. The current file's **text** lives in the room's Yjs document under `content`; this folder does not save a second copy of that text.

Use stable IDs from your backend. A display name can change, but the ID used for the room should remain the same.
