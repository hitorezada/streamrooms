import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { env } from "./config/env";
import { authRouter } from "./auth/routes";
import { usersRouter } from "./users/routes";
import { friendsRouter } from "./friends/routes";
import { serversRouter } from "./servers/routes";
import { roomsRouter } from "./rooms/routes";
import { iceServersRouter } from "./webrtc/iceServersRoute";
import { registerSignaling } from "./webrtc/signaling";

const app = express();
const httpServer = http.createServer(app);

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/servers", serversRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/webrtc", iceServersRouter);

// In production a single service serves the built React app alongside the API,
// which keeps test hosting (and the later VPS move) to one deployable process.
if (env.nodeEnv === "production") {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const io = new Server(httpServer, {
  cors: { origin: env.clientOrigin, credentials: true },
});
registerSignaling(io);

httpServer.listen(env.port, () => {
  console.log(`[server] listening on port ${env.port} (${env.nodeEnv})`);
});
