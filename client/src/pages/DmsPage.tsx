import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { ChatPanel, type ChatMessage } from "../components/ChatPanel";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { DmInboxEntry, FriendSummary } from "../types";

export function DmsPage() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inbox, setInbox] = useState<DmInboxEntry[]>([]);
  const [friends, setFriends] = useState<FriendSummary[]>([]);

  const loadInbox = useCallback(async () => {
    const [inboxRes, friendsRes] = await Promise.all([
      api.get<DmInboxEntry[]>("/dms"),
      api.get<{ friends: FriendSummary[] }>("/friends"),
    ]);
    setInbox(inboxRes);
    setFriends(friendsRes.friends);
  }, []);

  useEffect(() => {
    loadInbox();
    const interval = setInterval(loadInbox, 8_000);
    return () => clearInterval(interval);
  }, [loadInbox]);

  const fetchMessages = useCallback(
    () => api.get<ChatMessage[]>(`/dms/${friendId}/messages`),
    [friendId]
  );
  const sendMessage = useCallback(
    (payload: Parameters<typeof api.post>[1]) => api.post<ChatMessage>(`/dms/${friendId}/messages`, payload),
    [friendId]
  );

  if (!user) return null;

  const conversationPeerIds = new Set(inbox.map((i) => i.peer.id));
  const friendsWithoutConversation = friends.filter((f) => !conversationPeerIds.has(f.id));
  const selectedPeer = inbox.find((i) => i.peer.id === friendId)?.peer ?? friends.find((f) => f.id === friendId);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <nav
        style={{
          width: 260,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          padding: "16px 12px",
          overflowY: "auto",
        }}
      >
        <h1 style={{ fontSize: 16, margin: "0 0 12px", padding: "0 8px" }}>Mensagens diretas</h1>

        {inbox.map((entry) => (
          <ConversationRow
            key={entry.peer.id}
            avatarUrl={entry.peer.avatarUrl}
            username={entry.peer.username}
            status={entry.peer.status}
            preview={entry.lastMessage.fromMe ? `Você: ${entry.lastMessage.content ?? "Anexo"}` : entry.lastMessage.content ?? "Anexo"}
            active={entry.peer.id === friendId}
            onClick={() => navigate(`/app/dms/${entry.peer.id}`)}
          />
        ))}

        {friendsWithoutConversation.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", padding: "16px 8px 6px" }}>
              Iniciar conversa
            </div>
            {friendsWithoutConversation.map((f) => (
              <ConversationRow
                key={f.id}
                avatarUrl={f.avatarUrl}
                username={f.username}
                status={f.status}
                preview="Nenhuma mensagem ainda"
                active={f.id === friendId}
                onClick={() => navigate(`/app/dms/${f.id}`)}
              />
            ))}
          </>
        )}

        {inbox.length === 0 && friendsWithoutConversation.length === 0 && (
          <p style={{ color: "var(--text-2)", fontSize: 13, padding: "0 8px" }}>
            Adicione amigos para começar a conversar.
          </p>
        )}
      </nav>

      <div style={{ flex: 1, minWidth: 0 }}>
        {selectedPeer ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <Avatar username={selectedPeer.username} avatarUrl={selectedPeer.avatarUrl} status={selectedPeer.status} size={30} />
              <span style={{ fontWeight: 700 }}>{selectedPeer.username}</span>
            </header>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ChatPanel
                key={friendId}
                fetchMessages={fetchMessages}
                sendMessage={sendMessage}
                currentUserId={user.id}
                emptyHint="Diga oi 👋"
              />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-2)", fontSize: 14 }}>
            Selecione uma conversa
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationRow({
  avatarUrl,
  username,
  status,
  preview,
  active,
  onClick,
}: {
  avatarUrl: string | null;
  username: string;
  status: "online" | "offline";
  preview: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px",
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--bg-3)" : "transparent",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--bg-2)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <Avatar username={username} avatarUrl={avatarUrl} status={status} size={34} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{username}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {preview}
        </div>
      </div>
    </button>
  );
}
