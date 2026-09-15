import { useState } from "react";
import { Modal } from "./Modal";
import { api } from "../api/client";
import type { ServerSummary } from "../types";

export function JoinServerModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (server: ServerSummary) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const server = await api.post<ServerSummary>("/servers/join", { inviteCode: code.trim() });
      onJoined(server);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar no servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Entrar com código" onClose={onClose}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          className="input"
          placeholder="Código de convite"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          required
        />
        {error && <span style={{ color: "var(--live-red)", fontSize: 13 }}>{error}</span>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </Modal>
  );
}
