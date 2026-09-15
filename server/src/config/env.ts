import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  // Render (and similar PaaS) inject the public URL as RENDER_EXTERNAL_URL,
  // so CLIENT_ORIGIN doesn't need to be hardcoded per-deploy there.
  clientOrigin: required("CLIENT_ORIGIN", process.env.RENDER_EXTERNAL_URL ?? "http://localhost:5173"),

  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresInDays: Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? 30),

  discordClientId: required("DISCORD_CLIENT_ID"),
  discordClientSecret: required("DISCORD_CLIENT_SECRET"),
  // The backend's own callback URL (not the frontend). Defaults to
  // RENDER_EXTERNAL_URL + the callback path so Render deploys don't need it set.
  discordRedirectUri: required(
    "DISCORD_REDIRECT_URI",
    process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL}/api/auth/discord/callback`
      : "http://localhost:4000/api/auth/discord/callback"
  ),

  iceServers: buildIceServers(),
};

function buildIceServers() {
  const stunUrls = (process.env.STUN_URLS ?? "stun:stun.l.google.com:19302")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const servers: RTCIceServerLike[] = stunUrls.map((urls) => ({ urls }));

  const turnUrl = process.env.TURN_URL?.trim();
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.TURN_USERNAME ?? "",
      credential: process.env.TURN_CREDENTIAL ?? "",
    });
  }

  return servers;
}

interface RTCIceServerLike {
  urls: string;
  username?: string;
  credential?: string;
}
