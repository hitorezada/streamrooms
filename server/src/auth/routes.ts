import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "./password";
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from "./jwt";
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE } from "./cookies";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

export const authRouter = Router();

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Usuário deve ter ao menos 3 caracteres.")
    .max(24, "Usuário deve ter no máximo 24 caracteres.")
    .regex(/^[a-zA-Z0-9_]+$/, "Use apenas letras, números e underscore."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres."),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { username, email, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    return res.status(409).json({ error: "Usuário ou e-mail já cadastrado." });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, email, passwordHash },
  });

  const accessToken = await issueSession(res, user.id, user.username);
  return res.status(201).json({ accessToken, user: publicUser(user) });
});

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Informe usuário/e-mail e senha." });
  }
  const { usernameOrEmail, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }] },
  });
  if (!user) {
    return res.status(401).json({ error: "Credenciais inválidas." });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Credenciais inválidas." });
  }

  await prisma.user.update({ where: { id: user.id }, data: { status: "online" } });
  const accessToken = await issueSession(res, user.id, user.username);
  return res.json({ accessToken, user: publicUser(user) });
});

authRouter.post("/refresh", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    return res.status(401).json({ error: "Sem sessão ativa." });
  }

  const rotated = await rotateRefreshToken(token);
  if (!rotated) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Sessão expirada." });
  }

  const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Usuário não encontrado." });
  }

  setRefreshCookie(res, rotated.token);
  const accessToken = signAccessToken({ sub: user.id, username: user.username });
  return res.json({ accessToken, user: publicUser(user) });
});

authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await revokeRefreshToken(token);
  }
  clearRefreshCookie(res);

  const authedReq = req as AuthedRequest;
  if (authedReq.userId) {
    await prisma.user.update({ where: { id: authedReq.userId }, data: { status: "offline" } }).catch(() => {});
  }
  return res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }
  return res.json(publicUser(user));
});

async function issueSession(res: import("express").Response, userId: string, username: string) {
  const refreshToken = await issueRefreshToken(userId);
  setRefreshCookie(res, refreshToken);
  return signAccessToken({ sub: userId, username });
}

function publicUser(user: {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  status: string;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    status: user.status,
  };
}
