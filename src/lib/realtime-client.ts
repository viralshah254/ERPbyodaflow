"use client";

import { io, type Socket } from "socket.io-client";
import { getApiBase, isApiConfigured } from "@/lib/api/client";
import { getCurrentFirebaseIdTokenForApi, isFirebaseConfigured } from "@/lib/firebase";

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
const listeners = new Set<(event: string, payload: Record<string, unknown>) => void>();

function dispatchEvent(event: string, payload: Record<string, unknown>) {
  for (const listener of listeners) listener(event, payload);
}

async function ensureRealtimeSocket(): Promise<Socket | null> {
  if (!isApiConfigured() || !isFirebaseConfigured()) return null;

  const token = await getCurrentFirebaseIdTokenForApi();
  if (!token) {
    sharedSocket?.disconnect();
    sharedSocket = null;
    sharedToken = null;
    return null;
  }

  if (sharedSocket && sharedToken === token && sharedSocket.connected) {
    return sharedSocket;
  }

  sharedSocket?.disconnect();
  sharedToken = token;

  const socket = io(getApiBase(), {
    path: "/socket.io/",
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 12,
    auth: { token },
  });

  socket.on("odaflow.sync-queue.changed", (payload: Record<string, unknown>) => {
    dispatchEvent("odaflow.sync-queue.changed", payload);
  });

  socket.on("approvals.inbox.changed", (payload: Record<string, unknown>) => {
    dispatchEvent("approvals.inbox.changed", payload);
  });

  socket.on("procurement.inbox.changed", (payload: Record<string, unknown>) => {
    dispatchEvent("procurement.inbox.changed", payload);
  });

  socket.connect();
  sharedSocket = socket;
  return socket;
}

/** Subscribe to org-scoped Socket.IO inbox events (nav badge refresh). */
export function subscribeRealtimeInbox(
  listener: (event: string, payload: Record<string, unknown>) => void
): () => void {
  listeners.add(listener);
  void ensureRealtimeSocket();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      sharedSocket?.disconnect();
      sharedSocket = null;
      sharedToken = null;
    }
  };
}

/** Reconnect after login/token refresh. */
export function refreshRealtimeConnection(): void {
  if (listeners.size === 0) return;
  sharedSocket?.disconnect();
  sharedSocket = null;
  sharedToken = null;
  void ensureRealtimeSocket();
}
