import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "./AppLayout";
import { ChatPanel, type ChatMessage } from "../components/ChatPanel";
import { MembersSidebar } from "../components/MembersSidebar";
import { RoomStage } from "../components/RoomStage";
import { Avatar } from "../components/Avatar";
import { useRoomConnection } from "../hooks/useRoomConnection";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ServerMember, ServerSummary } from "../types";

export function ServerPage() {
  const { serverId, roomId: urlRoomId } = useParams();
  const { servers, refreshServers } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<ServerMember[]>([]);

  // The room connection lives at this level (not inside a child that
  // unmounts) so switching to #geral and back doesn't drop your screen
  // share — same as Discord keeping you in a voice call while you browse
  // other channels. It's null until you actually click a room.
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(urlRoomId ?? null);
  useEffect(() => {
    if (urlRoomId) setJoinedRoomId(urlRoomId);
  }, [urlRoomId]);

  const roomConn = useRoomConnection(joinedRoomId ?? undefined);

  const server = servers.find((s) => s.id === serverId);
  const viewingRoom = server?.rooms.find((r) => r.id === urlRoomId);
  const joinedRoom = server?.rooms.find((r) => r.id === joinedRoomId);

  const loadMembers = useCallback(async () => {
    if (!serverId) return;
    const list = await api.get<ServerMember[]>(`/servers/${serverId}/members`);
    setMembers(list);
  }, [serverId]);

  useEffect(() => {
    loadMembers();
    const interval = setInterval(loadMembers, 10_000);
    return () => clearInterval(interval);
  }, [loadMembers]);

  const fetchMessages = useCallback(() => api.get<ChatMessage[]>(`/servers/${serverId}/messages`), [serverId]);
  const sendMessage = useCallback(
    (payload: Parameters<typeof api.post>[1]) => api.post<ChatMessage>(`/servers/${serverId}/messages`, payload),
    [serverId]
  );
  const deleteMessage = useCallback(
    (messageId: string) => api.delete<void>(`/servers/${serverId}/messages/${messageId}`),
    [serverId]
  );
  const canDelete = useCallback(
    (m: ChatMessage) => m.author.id === user?.id || server?.ownerId === user?.id,
    [user?.id, server?.ownerId]
  );

  if (!server || !user) {
    return <div style={{ padding: 24, color: "var(--text-2)" }}>Carregando servidor...</div>;
  }

  async function saveName() {
    await api.patch<ServerSummary>(`/servers/${server!.id}`, { name });
    await refreshServers();
    setEditing(false);
  }

  function leaveRoom() {
    if (roomConn.isSharing) roomConn.stopSharing();
    setJoinedRoomId(null);
    navigate(`/app/servers/${serverId}`);
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <nav
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 12px 0",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "0 8px", marginBottom: 16 }}>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={{ fontSize: 13 }} />
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={saveName}>
                  Salvar
                </button>
                <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEditing(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h1 style={{ fontSize: 16, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {server.name}
              </h1>
              {server.ownerId === user.id && (
                <button
                  className="btn-link"
                  style={{ fontSize: 12, flexShrink: 0 }}
                  onClick={() => {
                    setName(server.name);
                    setEditing(true);
                  }}
                >
                  Editar
                </button>
              )}
            </div>
          )}
          <p style={{ color: "var(--text-2)", fontSize: 11, margin: "4px 0 0" }}>
            Convite: <code style={{ color: "var(--blue-400)" }}>{server.inviteCode}</code>
          </p>
        </div>

        <div style={{ flex: 1 }}>
          <SectionLabel>Texto</SectionLabel>
          <ChannelButton icon="#" label="geral" active={!urlRoomId} onClick={() => navigate(`/app/servers/${server.id}`)} />

          <SectionLabel>Salas de transmissão</SectionLabel>
          {server.rooms.map((room) => (
            <div key={room.id}>
              <ChannelButton
                icon="🖥"
                label={room.name}
                active={room.id === urlRoomId}
                onClick={() => navigate(`/app/servers/${server.id}/rooms/${room.id}`)}
              />
              {room.id === joinedRoomId && roomConn.participants.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "2px 8px 6px 30px" }}>
                  {roomConn.participants.map((p) => (
                    <div key={p.socketId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Avatar username={p.username} avatarUrl={p.avatarUrl} size={18} />
                      <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                        {p.username}
                        {p.isSharing ? " 🔴" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {joinedRoom && (
          <div
            style={{
              margin: "8px -12px 0",
              padding: "10px 12px",
              background: "var(--bg-2)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--online-green)", flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--online-green)" }}>Conectado por voz</div>
              <div
                style={{ fontSize: 12, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                onClick={() => navigate(`/app/servers/${server.id}/rooms/${joinedRoom.id}`)}
              >
                {joinedRoom.name}
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }} onClick={leaveRoom}>
              Sair
            </button>
          </div>
        )}
      </nav>

      <div style={{ flex: 1, minWidth: 0 }}>
        {viewingRoom ? (
          <RoomStage conn={roomConn} />
        ) : (
          <ChatPanel
            fetchMessages={fetchMessages}
            sendMessage={sendMessage}
            deleteMessage={deleteMessage}
            canDelete={canDelete}
            currentUserId={user.id}
            emptyHint="Ainda não tem nenhuma mensagem por aqui. Manda um alô."
          />
        )}
      </div>

      <MembersSidebar members={members} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-2)",
        textTransform: "uppercase",
        padding: "12px 8px 6px",
      }}
    >
      {children}
    </div>
  );
}

function ChannelButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "8px 10px",
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--bg-3)" : "transparent",
        color: active ? "var(--text-0)" : "var(--text-1)",
        fontSize: 14,
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--bg-2)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ opacity: 0.7, fontSize: 13 }}>{icon}</span>
      {label}
    </button>
  );
}
