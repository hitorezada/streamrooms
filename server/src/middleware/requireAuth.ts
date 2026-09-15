import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/jwt";

export interface AuthedRequest extends Request {
  userId?: string;
  username?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: "Sessão expirada ou inválida." });
  }
}
