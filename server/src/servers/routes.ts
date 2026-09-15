import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

export const serversRouter = Router();

serversRouter.use(requireAuth);

const FIXED_ROOM_COUNT = 5;

function generateInviteCode(): string {
  return crypto.randomBytes(5).toString("hex");
}

serversRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const memberships = await prisma.serverMember.findMany({
    where: { userId },
    include: { server: { include: { rooms: { orderBy: { position: "asc" } } } } },
  });

  return res.json(
    memberships.map((m) => ({
      id: m.server.id,
      name: m.server.name,
      imageUrl: m.server.imageUrl,
      ownerId: m.server.ownerId,
      inviteCode: m.server.inviteCode,
      rooms: m.server.rooms.map((r) => ({ id: r.id, name: r.name, position: r.position })),
    }))
  );
});

const createServerSchema = z.object({
  name: z.string().min(2).max(40),
});

serversRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createServerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Nome de servidor inválido." });
  }
  const userId = req.userId!;

  const server = await prisma.server.create({
    data: {
      name: parsed.data.name,
      ownerId: userId,
      inviteCode: generateInviteCode(),
      members: { create: { userId } },
      rooms: {
        create: Array.from({ length: FIXED_ROOM_COUNT }, (_, i) => ({
          name: `Sala ${i + 1}`,
          position: i + 1,
        })),
      },
    },
    include: { rooms: { orderBy: { position: "asc" } } },
  });

  return res.status(201).json({
    id: server.id,
    name: server.name,
    imageUrl: server.imageUrl,
    ownerId: server.ownerId,
    inviteCode: server.inviteCode,
    rooms: server.rooms.map((r) => ({ id: r.id, name: r.name, position: r.position })),
  });
});

const joinServerSchema = z.object({ inviteCode: z.string().min(1) });

serversRouter.post("/join", async (req: AuthedRequest, res) => {
  const parsed = joinServerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Código de convite inválido." });
  }
  const userId = req.userId!;

  const server = await prisma.server.findUnique({
    where: { inviteCode: parsed.data.inviteCode },
    include: { rooms: { orderBy: { position: "asc" } } },
  });
  if (!server) {
    return res.status(404).json({ error: "Servidor não encontrado para esse código." });
  }

  await prisma.serverMember.upsert({
    where: { serverId_userId: { serverId: server.id, userId } },
    create: { serverId: server.id, userId },
    update: {},
  });

  return res.json({
    id: server.id,
    name: server.name,
    imageUrl: server.imageUrl,
    ownerId: server.ownerId,
    inviteCode: server.inviteCode,
    rooms: server.rooms.map((r) => ({ id: r.id, name: r.name, position: r.position })),
  });
});

const updateServerSchema = z.object({
  name: z.string().min(2).max(40).optional(),
  imageUrl: z.string().url().max(2048).nullable().optional(),
});

serversRouter.patch("/:serverId", async (req: AuthedRequest, res) => {
  const parsed = updateServerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos." });
  }

  const server = await prisma.server.findUnique({ where: { id: req.params.serverId } });
  if (!server) {
    return res.status(404).json({ error: "Servidor não encontrado." });
  }
  if (server.ownerId !== req.userId) {
    return res.status(403).json({ error: "Apenas o dono pode editar o servidor." });
  }

  const updated = await prisma.server.update({
    where: { id: server.id },
    data: parsed.data,
  });

  return res.json({ id: updated.id, name: updated.name, imageUrl: updated.imageUrl });
});

// Confirms the requesting user belongs to the server — used by the rooms
// and WebRTC signaling layers to authorize access before joining a room.
serversRouter.get("/:serverId/membership", async (req: AuthedRequest, res) => {
  const membership = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId: req.params.serverId, userId: req.userId! } },
  });
  return res.json({ isMember: Boolean(membership) });
});
