import type { Response } from "express";
import { env } from "../config/env";

const REFRESH_COOKIE = "refresh_token";

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

export { REFRESH_COOKIE };
