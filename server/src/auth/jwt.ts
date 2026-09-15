import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { prisma } from "../db/prisma";

export interface AccessTokenPayload {
  sub: string; // userId
  username: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtAccessSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

// Refresh tokens are opaque random strings stored (hashed via lookup-by-value)
// in the DB so they can be revoked individually — simpler and safer than
// trying to invalidate signed JWTs before they expire.
export async function issueRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

export async function rotateRefreshToken(oldToken: string) {
  const record = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!record || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.refreshToken.delete({ where: { id: record.id } });
  const newToken = await issueRefreshToken(record.userId);
  return { userId: record.userId, token: newToken };
}

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}
