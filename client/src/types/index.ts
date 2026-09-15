export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  status: "online" | "offline";
}

export interface FriendSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
  status: "online" | "offline";
}

export interface FriendRequestSummary {
  id: string;
  from?: { id: string; username: string; avatarUrl: string | null };
  to?: { id: string; username: string; avatarUrl: string | null };
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  position: number;
}

export interface ServerSummary {
  id: string;
  name: string;
  imageUrl: string | null;
  ownerId: string;
  inviteCode: string;
  rooms: Room[];
}

export interface Participant {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  isSharing: boolean;
  hasAudio: boolean;
}

export interface IceServerConfig {
  urls: string;
  username?: string;
  credential?: string;
}
