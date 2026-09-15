import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";
import { api } from "../api/client";

interface SearchResult {
  id: string;
  username: string;
  avatarUrl: string | null;
  status: "online" | "offline";
}

export function AddFriendModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      api
        .get<SearchResult[]>(`/users/search?q=${encodeURIComponent(query.trim())}`)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  async function sendRequest(userId: string) {
    setError(null);
    try {
      await api.post("/friends/requests", { targetUserId: userId });
      setSentTo((prev) => new Set(prev).add(userId));
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar solicitação.");
    }
  }

  return (
    <Modal title="Adicionar amigo" onClose={onClose}>
      <input
        className="input"
        placeholder="Buscar por nome de usuário"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {error && <div style={{ color: "var(--live-red)", fontSize: 13, marginTop: 8 }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, maxHeight: 280, overflowY: "auto" }}>
        {results.map((u) => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar username={u.username} avatarUrl={u.avatarUrl} status={u.status} size={32} />
            <span style={{ flex: 1, fontSize: 14 }}>{u.username}</span>
            <button
              className="btn btn-ghost"
              disabled={sentTo.has(u.id)}
              onClick={() => sendRequest(u.id)}
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              {sentTo.has(u.id) ? "Enviado" : "Adicionar"}
            </button>
          </div>
        ))}
        {query.trim().length >= 2 && results.length === 0 && (
          <span style={{ color: "var(--text-2)", fontSize: 13 }}>Nenhum usuário encontrado.</span>
        )}
      </div>
    </Modal>
  );
}
