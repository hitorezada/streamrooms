import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

export const dmsRouter = Router();

dmsRouter.use(requireAuth);

async function requireFriendship(userId: string, friendId: string) {
  const [a, b] = [userId, friendId].sort();
  return prisma.friendship.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
}

// GET /api/dms — one row per friend with a conversation, most recent first,
// for a DM inbox list (kept separate from the plain friends list since not
// every friend has messaged yet).
dmsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;

  const messages = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true, status: true } },
      receiver: { select: { id: true, username: true, avatarUrl: true, status: true } },
    },
  });

  const byPeer = new Map<string, (typeof messages)[number]>();
  for (const m of messages) {
    const peer = m.senderId === userId ? m.receiver : m.sender;
    if (!byPeer.has(peer.id)) byPeer.set(peer.id, m);
  }

  return res.json(
    Array.from(byPeer.values()).map((m) => {
      const peer = m.senderId === userId ? m.receiver : m.sender;
      return {
        peer,
        lastMessage: { content: m.content, createdAt: m.createdAt, fromMe: m.senderId === userId },
      };
    })
  );
});

dmsRouter.get("/:friendId/messages", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const friendId = req.params.friendId;

  const friendship = await requireFriendship(userId, friendId);
  if (!friendship) return res.status(403).json({ error: "Vocês precisam ser amigos para conversar." });

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return res.json(messages.reverse());
});

const createDmSchema = z.object({
  content: z.string().max(2000).trim().optional(),
  attachmentUrl: z.string().max(2048).optional(),
  attachmentType: z.string().max(100).optional(),
  attachmentName: z.string().max(255).optional(),
});

dmsRouter.post("/:friendId/messages", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const friendId = req.params.friendId;

  const friendship = await requireFriendship(userId, friendId);
  if (!friendship) return res.status(403).json({ error: "Vocês precisam ser amigos para conversar." });

  const parsed = createDmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Mensagem inválida." });
  }
  if (!parsed.data.content && !parsed.data.attachmentUrl) {
    return res.status(400).json({ error: "Mensagem vazia." });
  }

  const message = await prisma.directMessage.create({
    data: { senderId: userId, receiverId: friendId, ...parsed.data },
  });

  return res.status(201).json(message);
});
