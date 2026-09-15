import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { getRoomPresence } from "../webrtc/presence";

export const roomsRouter = Router();

roomsRouter.use(requireAuth);

// GET /api/rooms/:roomId — room metadata plus who's currently connected
// (live presence comes from the in-memory signaling state, not the DB,
// since streams are never persisted).
roomsRouter.get("/:roomId", async (req: AuthedRequest, res) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.roomId },
    include: { server: true },
  });
  if (!room) {
    return res.status(404).json({ error: "Sala não encontrada." });
  }

  const membership = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId: room.serverId, userId: req.userId! } },
  });
  if (!membership) {
    return res.status(403).json({ error: "Você não é membro deste servidor." });
  }

  return res.json({
    id: room.id,
    name: room.name,
    position: room.position,
    serverId: room.serverId,
    serverName: room.server.name,
    participants: getRoomPresence(room.id),
  });
});

// GET /api/rooms/direct/:friendId — returns (and implicitly authorizes) the
// ad-hoc direct room id for a friend pair. Direct rooms aren't stored: the id
// is deterministic (sorted user ids) and re-derived every time, same as the
// friendship check that gates access to it in the signaling layer.
roomsRouter.get("/direct/:friendId", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const friendId = req.params.friendId;

  const [a, b] = [userId, friendId].sort();
  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
  });
  if (!friendship) {
    return res.status(403).json({ error: "Vocês precisam ser amigos para iniciar uma conexão." });
  }

  const friend = await prisma.user.findUnique({ where: { id: friendId } });
  if (!friend) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  return res.json({
    roomId: `dm:${a}:${b}`,
    peer: { id: friend.id, username: friend.username, avatarUrl: friend.avatarUrl },
  });
});
