import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { AddFriendModal } from "../components/AddFriendModal";
import { api } from "../api/client";
import type { FriendRequestSummary, FriendSummary } from "../types";

interface FriendsResponse {
  friends: FriendSummary[];
  incomingRequests: FriendRequestSummary[];
  outgoingRequests: FriendRequestSummary[];
}

export function HomePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<FriendsResponse>({ friends: [], incomingRequests: [], outgoingRequests: [] });
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<FriendsResponse>("/friends");
    setData(res);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function accept(id: string) {
    await api.post(`/friends/requests/${id}/accept`);
    load();
  }

  async function decline(id: string) {
    await api.post(`/friends/requests/${id}/decline`);
    load();
  }

  async function removeFriend(id: string) {
    await api.delete(`/friends/${id}`);
    load();
  }

  async function connect(friendId: string) {
    setError(null);
    try {
      const res = await api.get<{ roomId: string }>(`/rooms/direct/${friendId}`);
      navigate(`/app/direct/${encodeURIComponent(res.roomId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar conexão.");
    }
  }

  const online = data.friends.filter((f) => f.status === "online");
  const offline = data.friends.filter((f) => f.status === "offline");

  return (
    <div style={{ padding: 24, overflowY: "auto", maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Amigos</h1>
        <button className="btn btn-primary" onClick={() => setShowAddFriend(true)}>
          Adicionar amigo
        </button>
      </div>

      {error && <div style={{ color: "var(--live-red)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {data.incomingRequests.length > 0 && (
        <Section title="Solicitações pendentes">
          {data.incomingRequests.map((r) => (
            <div key={r.id} style={rowStyle}>
              <Avatar username={r.from!.username} avatarUrl={r.from!.avatarUrl} size={32} />
              <span style={{ flex: 1, fontSize: 14 }}>{r.from!.username}</span>
              <button className="btn btn-primary" style={smallBtn} onClick={() => accept(r.id)}>
                Aceitar
              </button>
              <button className="btn btn-ghost" style={smallBtn} onClick={() => decline(r.id)}>
                Recusar
              </button>
            </div>
          ))}
        </Section>
      )}

      <Section title={`Online — ${online.length}`}>
        {online.map((f) => (
          <FriendRow key={f.id} friend={f} onConnect={() => connect(f.id)} onRemove={() => removeFriend(f.id)} />
        ))}
        {online.length === 0 && <Empty text="Nenhum amigo online agora." />}
      </Section>

      <Section title={`Offline — ${offline.length}`}>
        {offline.map((f) => (
          <FriendRow key={f.id} friend={f} onConnect={() => connect(f.id)} onRemove={() => removeFriend(f.id)} />
        ))}
        {offline.length === 0 && <Empty text="Nenhum amigo offline." />}
      </Section>

      {showAddFriend && <AddFriendModal onClose={() => setShowAddFriend(false)} onSent={load} />}
    </div>
  );
}

function FriendRow({
  friend,
  onConnect,
  onRemove,
}: {
  friend: FriendSummary;
  onConnect: () => void;
  onRemove: () => void;
}) {
  return (
    <div style={rowStyle}>
      <Avatar username={friend.username} avatarUrl={friend.avatarUrl} status={friend.status} size={32} />
      <span style={{ flex: 1, fontSize: 14 }}>{friend.username}</span>
      <button
        className="btn btn-primary"
        style={smallBtn}
        disabled={friend.status !== "online"}
        onClick={onConnect}
        title={friend.status !== "online" ? "Disponível apenas quando o amigo estiver online" : "Iniciar conexão para compartilhar tela"}
      >
        Conectar
      </button>
      <button className="btn btn-ghost" style={smallBtn} onClick={onRemove}>
        Remover
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-2)", letterSpacing: 0.04 }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <span style={{ fontSize: 13, color: "var(--text-2)" }}>{text}</span>;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
};

const smallBtn: React.CSSProperties = { padding: "6px 12px", fontSize: 13 };
