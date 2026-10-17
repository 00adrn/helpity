// One Node process, one port: Next.js serves pages and /api, Hocuspocus serves
// the Yjs rooms on /collab. Sharing a process lets /collab read the same
// in-memory session store (globalThis.__sessions) that the API routes write.
import { createServer } from "node:http";
import next from "next";
import crossws from "crossws/adapters/node";
import { Hocuspocus } from "@hocuspocus/server";
import * as Y from "yjs";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);

// Create the store up front so it is the same Map whichever side touches it first.
// lib/sessions/data_store.ts reuses it through `??=`.
const sessions = (globalThis.__sessions ??= new Map());

const app = next({ dev, hostname: "localhost", port });
const handleRequest = app.getRequestHandler();

/**
 * Rooms are `session:CODE` (the shared class room) or `session:CODE:student:ID` (one student's
 * private code window, which the teacher can also open to watch). Codes never contain ":".
 */
function parseDocumentName(documentName) {
  const [prefix, code, kind, studentId] = documentName.split(":");
  if (prefix !== "session" || !code) return {};
  return { session: sessions.get(code), studentId: kind === "student" ? studentId : undefined };
}

/** Find the in-memory session that owns a Hocuspocus document. */
function getDocumentSession(documentName) {
  return parseDocumentName(documentName).session;
}

const hocuspocus = new Hocuspocus({
  quiet: true,
  // Rooms are named `session:CODE` (see lib/sockets/sock.ts).
  async onAuthenticate({ documentName }) {
    if (!getDocumentSession(documentName)) {
      throw new Error("No live session has that code");
    }
  },
  // Load the teacher's example or the latest shared edits when a room opens.
  async onLoadDocument({ documentName }) {
    const session = getDocumentSession(documentName);
    if (!session) throw new Error("No live session has that code");

    const document = new Y.Doc();
    const { studentId } = parseDocumentName(documentName);
    if (studentId) {
      const state = session.studentStates?.get(studentId);
      if (state) Y.applyUpdate(document, state);
      return document;
    }
    if (session.documentState) {
      Y.applyUpdate(document, session.documentState);
    } else {
      document.getText("content").insert(0, session.initialText);
      document.getMap("meta").set("presetId", session.presetId);
    }
    return document;
  },
  // Keep edits in memory after the last participant disconnects.
  async onStoreDocument({ documentName, document }) {
    const session = getDocumentSession(documentName);
    if (!session) throw new Error("No live session has that code");
    const { studentId } = parseDocumentName(documentName);
    if (studentId) {
      (session.studentStates ??= new Map()).set(studentId, Y.encodeStateAsUpdate(document));
    } else {
      session.documentState = Y.encodeStateAsUpdate(document);
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
