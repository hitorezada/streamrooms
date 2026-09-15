import type { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../auth/jwt";
import { prisma } from "../db/prisma";
import {
  joinRoom,
  leaveSocket,
  setSharing,
  getRoomPresence,
  getParticipant,
} from "./presence";

interface SocketData {
  userId: string;
  username: string;
  avatarUrl: string | null;
}

export function registerSignaling(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = verifyAccessToken(token);
      (socket.data as SocketData).userId = payload.sub;
      (socket.data as SocketData).username = payload.username;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    socket.on("room:join", async (roomId: string, ack?: (res: unknown) => void) => {
      try {
        const currentUserId = (socket.data as SocketData).userId;
        const authorized = roomId.startsWith("dm:")
          ? await authorizeDirectRoom(roomId, currentUserId)
          : await authorizeServerRoom(roomId, currentUserId);

        if (!authorized) return ack?.({ error: "Você não tem acesso a esta sala." });

        const user = await prisma.user.findUnique({ where: { id: currentUserId } });
        if (!user) return ack?.({ error: "Usuário não encontrado." });

        const existing = getRoomPresence(roomId);

        socket.join(roomKey(roomId));
        joinRoom(roomId, {
          socketId: socket.id,
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          isSharing: false,
          hasAudio: false,
        });

        ack?.({ participants: existing });
        socket.to(roomKey(roomId)).emit("room:presence", getRoomPresence(roomId));
      } catch (err) {
        ack?.({ error: "Erro ao entrar na sala." });
      }
    });

    socket.on("room:leave", () => {
      handleLeave(io, socket);
    });

    socket.on("stream:start", ({ hasAudio }: { hasAudio: boolean }) => {
      const roomId = setSharing(socket.id, true, Boolean(hasAudio));
      if (!roomId) return;
      io.to(roomKey(roomId)).emit("room:presence", getRoomPresence(roomId));
      socket.to(roomKey(roomId)).emit("stream:started", { socketId: socket.id });
    });

    socket.on("stream:stop", () => {
      const roomId = setSharing(socket.id, false, false);
      if (!roomId) return;
      io.to(roomKey(roomId)).emit("room:presence", getRoomPresence(roomId));
      socket.to(roomKey(roomId)).emit("stream:stopped", { socketId: socket.id });
    });

    // Viewer asks a sharer to start a peer connection with them.
    socket.on("watch:request", ({ targetSocketId }: { targetSocketId: string }) => {
      const viewer = getParticipant(socket.id);
      if (!viewer) return;
      io.to(targetSocketId).emit("watch:requested", {
        viewerSocketId: socket.id,
        viewer,
      });
    });

    socket.on("watch:stop", ({ targetSocketId }: { targetSocketId: string }) => {
      io.to(targetSocketId).emit("watch:stopped", { viewerSocketId: socket.id });
    });

    // Viewer asks the sharer to adjust encoding just for their own connection
    // (mesh topology means each viewer has an independent RTCPeerConnection,
    // so this is a real per-viewer knob, not a room-wide cap).
    socket.on("quality:request", ({ targetSocketId, quality }: { targetSocketId: string; quality: string }) => {
      io.to(targetSocketId).emit("quality:request", { fromSocketId: socket.id, quality });
    });

    // Generic SDP/ICE relay — payloads are opaque to the server, it only routes them.
    socket.on("webrtc:offer", ({ targetSocketId, sdp }: { targetSocketId: string; sdp: unknown }) => {
      io.to(targetSocketId).emit("webrtc:offer", { fromSocketId: socket.id, sdp });
    });

    socket.on("webrtc:answer", ({ targetSocketId, sdp }: { targetSocketId: string; sdp: unknown }) => {
      io.to(targetSocketId).emit("webrtc:answer", { fromSocketId: socket.id, sdp });
    });

    socket.on(
      "webrtc:ice-candidate",
      ({ targetSocketId, candidate }: { targetSocketId: string; candidate: unknown }) => {
        io.to(targetSocketId).emit("webrtc:ice-candidate", { fromSocketId: socket.id, candidate });
      }
    );

    socket.on("disconnect", () => {
      handleLeave(io, socket);
    });
  });
}

function handleLeave(io: Server, socket: Socket) {
  const result = leaveSocket(socket.id);
  if (!result) return;
  socket.leave(roomKey(result.roomId));
  io.to(roomKey(result.roomId)).emit("room:presence", getRoomPresence(result.roomId));
  io.to(roomKey(result.roomId)).emit("peer:left", { socketId: socket.id });
}

function roomKey(roomId: string) {
  return `room:${roomId}`;
}

async function authorizeServerRoom(roomId: string, userId: string): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return false;
  const membership = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId: room.serverId, userId } },
  });
  return Boolean(membership);
}

// "dm:<userAId>:<userBId>" where a < b lexicographically — see rooms/routes.ts.
async function authorizeDirectRoom(roomId: string, userId: string): Promise<boolean> {
  const [, a, b] = roomId.split(":");
  if (!a || !b || (userId !== a && userId !== b)) return false;
  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
  });
  return Boolean(friendship);
}
