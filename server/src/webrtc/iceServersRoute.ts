import { Router } from "express";
import { env } from "../config/env";
import { requireAuth } from "../middleware/requireAuth";

export const iceServersRouter = Router();

iceServersRouter.get("/ice-servers", requireAuth, (_req, res) => {
  res.json({ iceServers: env.iceServers });
});
