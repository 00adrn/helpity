import { createClient } from "@liveblocks/client";
import { getYjsProviderForRoom } from "@liveblocks/yjs";

import { roomIdForFile } from "../files";

let client: ReturnType<typeof createClient> | undefined;

function getLiveblocksClient() {
  if (!client) {
    const publicApiKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;

    if (!publicApiKey) {
      throw new Error("NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY is missing");
    }

    client = createClient({ publicApiKey });
  }

  return client;
}

/** Open the room and shared Yjs text for one file. Call leave() on cleanup. */
export function connectToFile(fileId: string) {
  const { room, leave } = getLiveblocksClient().enterRoom(roomIdForFile(fileId), {
    initialPresence: {},
  });
  const provider = getYjsProviderForRoom(room);
  const text = provider.getYDoc().getText("content");

  return { room, provider, text, leave };
}

export type SharedFileConnection = ReturnType<typeof connectToFile>;
