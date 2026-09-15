import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "../api/client";

// One shared socket per mounted room view. Auth token is passed fresh on
// every (re)connect attempt via the `auth` callback so a token refresh
// mid-session doesn't require tearing the socket down manually.
export function useSocket(enabled: boolean) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const socket = io("/", {
      path: "/socket.io",
      auth: (cb) => cb({ token: getAccessToken() }),
      reconnection: true,
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
