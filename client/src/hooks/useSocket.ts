import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken, refreshSession } from "../api/client";

// One shared socket per mounted room view. The access token lives 15
// minutes; if the room sits idle longer than that (no HTTP call around to
// trigger the normal 401-triggered refresh), the in-memory token goes stale.
// Reconnects — including the one after a Render free-tier cold start — would
// then keep failing auth forever, which is why people were getting stuck
// disconnected after leaving a room open for a while. Refreshing right
// before every (re)connect attempt guarantees a valid token each time.
export function useSocket(enabled: boolean) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const socket = io("/", {
      path: "/socket.io",
      auth: async (cb) => {
        await refreshSession().catch(() => {});
        cb({ token: getAccessToken() });
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  return { socket: socketRef, connected };
}
