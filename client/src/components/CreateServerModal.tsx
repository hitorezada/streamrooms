import { useState } from "react";
import { Modal } from "./Modal";
import { api } from "../api/client";
import type { ServerSummary } from "../types";

export function CreateServerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (server: ServerSummary) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const server = await api.post<ServerSummary>("/servers", { name });
      onCreated(server);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Criar servidor" onClose={onClose}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "var(--text-2)", fontSize: 13, margin: 0 }}>
          Seu servidor já nasce com 5 salas de transmissão fixas.
        </p>
        <input
          className="input"
          placeholder="Nome do servidor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        {error && <span style={{ color: "var(--live-red)", fontSize: 13 }}>{error}</span>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Criando..." : "Criar servidor"}
        </button>
      </form>
    </Modal>
  );
}
