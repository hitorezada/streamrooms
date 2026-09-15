import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

export const friendsRouter = Router();

friendsRouter.use(requireAuth);

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// GET /api/friends — accepted friends, plus incoming/outgoing pending requests.
friendsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: true, userB: true },
  });

  const friends = friendships.map((f) => {
    const other = f.userAId === userId ? f.userB : f.userA;
    return {
      id: other.id,
      username: other.username,
      avatarUrl: other.avatarUrl,
      status: other.status,
    };
  });

  const incoming = await prisma.friendRequest.findMany({
    where: { receiverId: userId, status: "PENDING" },
    include: { sender: true },
  });

  const outgoing = await prisma.friendRequest.findMany({
    where: { senderId: userId, status: "PENDING" },
    include: { receiver: true },
  });

  return res.json({
    friends,
    incomingRequests: incoming.map((r) => ({
      id: r.id,
      from: { id: r.sender.id, username: r.sender.username, avatarUrl: r.sender.avatarUrl },
      createdAt: r.createdAt,
    })),
    outgoingRequests: outgoing.map((r) => ({
      id: r.id,
      to: { id: r.receiver.id, username: r.receiver.username, avatarUrl: r.receiver.avatarUrl },
      createdAt: r.createdAt,
    })),
  });
});

const sendRequestSchema = z.object({ targetUserId: z.string().min(1) });

friendsRouter.post("/requests", async (req: AuthedRequest, res) => {
  const parsed = sendRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Usuário inválido." });
  }
  const userId = req.userId!;
  const { targetUserId } = parsed.data;

  if (targetUserId === userId) {
    return res.status(400).json({ error: "Você não pode adicionar a si mesmo." });
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  const [a, b] = pairKey(userId, targetUserId);
  const alreadyFriends = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
  });
  if (alreadyFriends) {
    return res.status(409).json({ error: "Vocês já são amigos." });
  }

  // If the target already sent us a request, accept it instead of duplicating.
  const reciprocal = await prisma.friendRequest.findUnique({
    where: { senderId_receiverId: { senderId: targetUserId, receiverId: userId } },
  });
  if (reciprocal && reciprocal.status === "PENDING") {
    await acceptRequest(reciprocal.id, userId);
    return res.status(200).json({ status: "accepted" });
  }

  try {
    const request = await prisma.friendRequest.create({
      data: { senderId: userId, receiverId: targetUserId },
    });
    return res.status(201).json({ id: request.id, status: "pending" });
  } catch {
    return res.status(409).json({ error: "Solicitação já enviada." });
  }
});

friendsRouter.post("/requests/:id/accept", async (req: AuthedRequest, res) => {
  const result = await acceptRequest(req.params.id, req.userId!);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.json({ status: "accepted" });
});

friendsRouter.post("/requests/:id/decline", async (req: AuthedRequest, res) => {
  const request = await prisma.friendRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.receiverId !== req.userId) {
    return res.status(404).json({ error: "Solicitação não encontrada." });
  }
  await prisma.friendRequest.update({ where: { id: request.id }, data: { status: "DECLINED" } });
  return res.json({ status: "declined" });
});

friendsRouter.delete("/:friendId", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const [a, b] = pairKey(userId, req.params.friendId);
  await prisma.friendship.deleteMany({ where: { userAId: a, userBId: b } });
  return res.status(204).send();
});

async function acceptRequest(requestId: string, actingUserId: string) {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!request || request.receiverId !== actingUserId || request.status !== "PENDING") {
    return { ok: false as const, status: 404, error: "Solicitação não encontrada." };
  }

  const [a, b] = pairKey(request.senderId, request.receiverId);
  await prisma.$transaction([
    prisma.friendRequest.update({ where: { id: request.id }, data: { status: "ACCEPTED" } }),
    prisma.friendship.upsert({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      create: { userAId: a, userBId: b },
      update: {},
    }),
  ]);

  return { ok: true as const };
}
