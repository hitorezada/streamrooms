import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

export const usersRouter = Router();

usersRouter.use(requireAuth);

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
  bio: z.string().max(200).nullable().optional(),
});

usersRouter.patch("/me", async (req: AuthedRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  if (parsed.data.username) {
    const taken = await prisma.user.findFirst({
      where: { username: parsed.data.username, NOT: { id: req.userId } },
    });
    if (taken) {
      return res.status(409).json({ error: "Nome de usuário já em uso." });
    }
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: parsed.data,
  });

  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    status: user.status,
  });
});

usersRouter.get("/search", async (req: AuthedRequest, res) => {
  const query = String(req.query.q ?? "").trim();
  if (query.length < 2) {
    return res.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      username: { contains: query },
      NOT: { id: req.userId },
    },
    select: { id: true, username: true, avatarUrl: true, status: true },
    take: 20,
  });

  return res.json(users);
});

usersRouter.get("/:id", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, username: true, avatarUrl: true, status: true },
  });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  return res.json(user);
});
