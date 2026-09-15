import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "./AppLayout";
import { api } from "../api/client";
import type { ServerSummary } from "../types";

export function ServerPage() {
  const { serverId } = useParams();
  const { servers, refreshServers } = useAppContext();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const server = servers.find((s) => s.id === serverId);

  if (!server) {
    return <div style={{ padding: 24, color: "var(--text-2)" }}>Carregando servidor...</div>;
  }

  async function saveName() {
    await api.patch<ServerSummary>(`/servers/${server!.id}`, { name });
    await refreshServers();
    setEditing(false);
  }

  return (
    <div style={{ padding: 24, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        {editing ? (
          <>
            <input className="input" style={{ width: 260 }} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 13 }} onClick={saveName}>
              Salvar
            </button>
            <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, margin: 0 }}>{server.name}</h1>
            <button
              className="btn-link"
              style={{ fontSize: 13 }}
              onClick={() => {
                setName(server.name);
                setEditing(true);
              }}
            >
              Editar
            </button>
          </>
        )}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 13, marginTop: 0 }}>
        Código de convite: <code style={{ color: "var(--blue-400)" }}>{server.inviteCode}</code>
      </p>

      <h2 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-2)", marginTop: 24 }}>
        Salas de transmissão
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 10 }}>
        {server.rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => navigate(`/app/servers/${server.id}/rooms/${room.id}`)}
            className="btn-ghost"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
              padding: 16,
              borderRadius: "var(--radius-md)",
              textAlign: "left",
            }}
          >
            <span style={{ fontWeight: 600 }}>{room.name}</span>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>Entrar na sala</span>
          </button>
        ))}
      </div>
    </div>
  );
}
