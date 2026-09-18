export interface User {
  id: string;
  username: string;
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

export interface Attachment {
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
}

export interface ServerMessage extends Attachment {
  id: string;
  serverId: string;
  authorId: string;
  content: string | null;
  createdAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
}

export interface DirectMessage extends Attachment {
  id: string;
  senderId: string;
  receiverId: string;
  content: string | null;
  createdAt: string;
}

export interface ServerMember {
  id: string;
  username: string;
  avatarUrl: string | null;
  status: "online" | "offline";
}

export interface DmInboxEntry {
  peer: ServerMember;
  lastMessage: { content: string | null; createdAt: string; fromMe: boolean };
}

export interface UploadResult {
  url: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
}
