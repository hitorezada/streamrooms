import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from "./jwt";
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE } from "./cookies";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { env } from "../config/env";
import { buildAuthorizeUrl, exchangeCodeForToken, fetchDiscordUser, discordAvatarUrl } from "./discord";

export const authRouter = Router();

const STATE_COOKIE = "discord_oauth_state";

// GET /api/auth/discord — kicks off the OAuth flow. A random state value is
// stashed in a short-lived cookie and checked on callback to prevent CSRF.
authRouter.get("/discord", (_req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
    path: "/api/auth/discord",
  });
  res.redirect(buildAuthorizeUrl(state));
});

authRouter.get("/discord/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: "/api/auth/discord" });

  if (error) {
    return res.redirect(`${env.clientOrigin}/login?error=discord_denied`);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect(`${env.clientOrigin}/login?error=invalid_state`);
  }

  try {
    const discordAccessToken = await exchangeCodeForToken(code);
    const discordUser = await fetchDiscordUser(discordAccessToken);

    const user = await upsertUserFromDiscord(discordUser.id, discordUser.username, discordAvatarUrl(discordUser));

    const refreshToken = await issueRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);
    await prisma.user.update({ where: { id: user.id }, data: { status: "online" } });

    return res.redirect(`${env.clientOrigin}/app`);
  } catch (err) {
    console.error("[auth] discord callback failed:", err);
    return res.redirect(`${env.clientOrigin}/login?error=discord_failed`);
  }
});

async function upsertUserFromDiscord(discordId: string, discordUsername: string, avatarUrl: string | null) {
  const existing = await prisma.user.findUnique({ where: { discordId } });
  // Only seed the avatar from Discord on first login — later logins don't
  // clobber an avatar the person set manually in profile settings.
  if (existing) return existing;

  const username = await uniqueUsernameFrom(discordUsername);
  return prisma.user.create({ data: { discordId, username, avatarUrl } });
}

// Discord usernames aren't guaranteed unique in our system (different
// discriminators/IDs can share one), so collisions get a short random suffix.
async function uniqueUsernameFrom(base: string): Promise<string> {
  const cleaned = base.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "user";
  let candidate = cleaned;
  let attempt = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    attempt += 1;
    candidate = `${cleaned}${crypto.randomInt(1000, 9999)}`;
    if (attempt > 5) break;
  }
  return candidate;
}

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

function publicUser(user: {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  status: string;
}) {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    status: user.status,
  };
}
