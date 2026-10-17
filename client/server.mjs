// One Node process, one port: Next.js serves pages and /api, Hocuspocus serves
// the Yjs rooms on /collab. Sharing a process lets /collab read the same
// in-memory session store (globalThis.__sessions) that the API routes write.
import { createServer } from "node:http";
import next from "next";
import crossws from "crossws/adapters/node";
import { Hocuspocus } from "@hocuspocus/server";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);

// Create the store up front so it is the same Map whichever side touches it first.
// lib/sessions/data_store.ts reuses it through `??=`.
const sessions = (globalThis.__sessions ??= new Map());

const app = next({ dev, hostname: "localhost", port });
const handleRequest = app.getRequestHandler();

const hocuspocus = new Hocuspocus({
  quiet: true,
  // Rooms are named `session:CODE` (see lib/sockets/sock.ts).
  async onAuthenticate({ documentName }) {
    const code = documentName.startsWith("session:") ? documentName.slice("session:".length) : "";

    if (!sessions.has(code)) {
      throw new Error("No live session has that code");
    }
  },
});

// Same wiring Hocuspocus's own Server class uses, on our HTTP server instead of its own.
const collab = crossws({
  hooks: {
    open(peer) {
      const connection = hocuspocus.handleConnection(peer.websocket, peer.request);
      peer._hocuspocus = connection;
      peer.websocket.on?.("pong", () => connection.touch());
    },
    message(peer, message) {
      peer._hocuspocus?.handleMessage(message.uint8Array());
    },
    close(peer, event) {
      peer._hocuspocus?.handleClose({ code: event.code, reason: event.reason });
    },
    error(peer, error) {
      console.error("Collab socket error for peer", peer.id, error);
    },
  },
});

await app.prepare();
const handleNextUpgrade = app.getUpgradeHandler();

const server = createServer((req, res) => {
  handleRequest(req, res);
});

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (pathname === "/collab") {
    collab.handleUpgrade(req, socket, head);
  } else {
    // Everything else, such as Next's hot-reload socket, belongs to Next.
    handleNextUpgrade(req, socket, head);
  }
});

server.listen(port, () => {
  console.log(`> Ready on http://localhost:${port} (${dev ? "development" : "production"})`);
  console.log(`> Collab sockets on ws://localhost:${port}/collab`);
});
