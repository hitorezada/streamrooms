import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RoomStage } from "../components/RoomStage";
import { useRoomConnection } from "../hooks/useRoomConnection";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export function DirectRoomPage() {
  const { roomId: encodedRoomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [peerName, setPeerName] = useState<string>("");

  const roomId = encodedRoomId ? decodeURIComponent(encodedRoomId) : undefined;
  const conn = useRoomConnection(roomId);

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

  function handleLeave() {
    if (conn.isSharing) conn.stopSharing();
    navigate("/app");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
        <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={handleLeave}>
          ← Sair da sala
        </button>
        <div>
          <div style={{ fontWeight: 700 }}>{peerName ? `Conexão com ${peerName}` : "Conexão direta"}</div>
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>Compartilhamento de tela privado</div>
        </div>
        {!conn.connected && <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-2)" }}>Conectando...</span>}
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <RoomStage conn={conn} />
      </div>
    </div>
  );
}
