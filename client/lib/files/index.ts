/** Map a stable file ID to the Liveblocks room that stores its text. */
export function roomIdForFile(fileId: string): string {
  const id = fileId.trim();

  if (!id) {
    throw new Error("A file ID is required");
  }

  return `file:${encodeURIComponent(id)}`;
}
