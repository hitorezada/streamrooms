import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RoomView } from "./RoomView";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export function DirectRoomPage() {
  const { roomId: encodedRoomId } = useParams();
  const { user } = useAuth();
  const [peerName, setPeerName] = useState<string>("");

  const roomId = encodedRoomId ? decodeURIComponent(encodedRoomId) : undefined;

  useEffect(() => {
    if (!roomId || !user) return;
    const [, a, b] = roomId.split(":");
    const friendId = a === user.id ? b : a;
    api
      .get<{ username: string }>(`/users/${friendId}`)
      .then((peer) => setPeerName(peer.username))
      .catch(() => setPeerName("Amigo"));
  }, [roomId, user]);

  if (!roomId) return null;

  return (
    <RoomView
      roomId={roomId}
      title={peerName ? `Conexão com ${peerName}` : "Conexão direta"}
      subtitle="Compartilhamento de tela privado"
      backTo="/app"
    />
  );
}
