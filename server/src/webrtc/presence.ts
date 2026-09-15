// In-memory presence/state for live rooms. Intentionally not persisted:
// the spec only wants durable storage for users/friends/servers/rooms,
// never for streams — those are pure real-time state tied to socket connections.

export interface Participant {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  isSharing: boolean;
  hasAudio: boolean;
}

const rooms = new Map<string, Map<string, Participant>>();
const socketToRoom = new Map<string, string>();

export function joinRoom(roomId: string, participant: Participant) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  rooms.get(roomId)!.set(participant.socketId, participant);
  socketToRoom.set(participant.socketId, roomId);
}

export function leaveSocket(socketId: string): { roomId: string } | null {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;

  const room = rooms.get(roomId);
  room?.delete(socketId);
  if (room && room.size === 0) {
    rooms.delete(roomId);
  }
  socketToRoom.delete(socketId);
  return { roomId };
}

export function setSharing(socketId: string, isSharing: boolean, hasAudio: boolean) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;
  const participant = rooms.get(roomId)?.get(socketId);
  if (!participant) return null;
  participant.isSharing = isSharing;
  participant.hasAudio = hasAudio;
  return roomId;
}

export function getRoomPresence(roomId: string): Participant[] {
  return Array.from(rooms.get(roomId)?.values() ?? []);
}

export function getParticipant(socketId: string): Participant | undefined {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return undefined;
  return rooms.get(roomId)?.get(socketId);
}

export function getRoomIdForSocket(socketId: string): string | undefined {
  return socketToRoom.get(socketId);
}
