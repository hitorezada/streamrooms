import { useLocation, useNavigate } from "react-router-dom";
import type { ServerSummary } from "../types";

interface ServerRailProps {
  servers: ServerSummary[];
  activeServerId?: string;
  onCreateClick: () => void;
  onJoinClick: () => void;
}

export function ServerRail({ servers, activeServerId, onCreateClick, onJoinClick }: ServerRailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const onDms = location.pathname.startsWith("/app/dms");

  return (
    <nav
      style={{
        width: 72,
        flexShrink: 0,
        background: "var(--bg-1)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "14px 0",
        overflowY: "auto",
      }}
    >
      <RailButton label="Início" active={!activeServerId && !onDms} onClick={() => navigate("/app")}>
        SR
      </RailButton>

      <RailButton label="Mensagens diretas" active={onDms} onClick={() => navigate("/app/dms")}>
        ✉
      </RailButton>

      <div style={{ width: 32, height: 1, background: "var(--border)" }} />

      {servers.map((s) => (
        <RailButton
          key={s.id}
          label={s.name}
          active={s.id === activeServerId}
          onClick={() => navigate(`/app/servers/${s.id}`)}
        >
          {s.imageUrl ? (
            <img src={s.imageUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials(s.name)
          )}
        </RailButton>
      ))}

      <RailButton label="Criar sala/servidor" onClick={onCreateClick} accent="blue">
        +
      </RailButton>
      <RailButton label="Entrar com código" onClick={onJoinClick} accent="pink">
        →
      </RailButton>
    </nav>
  );
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function RailButton({
  children,
  label,
  active,
  onClick,
  accent,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  accent?: "blue" | "pink";
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        width: 48,
        height: 48,
        borderRadius: active ? 16 : 24,
        background: accent === "blue" ? "var(--blue-500)" : accent === "pink" ? "var(--pink-500)" : "var(--bg-3)",
        color: "white",
        fontWeight: 700,
        fontSize: 15,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        outline: active ? "2px solid var(--blue-400)" : "none",
        outlineOffset: 2,
        transition: "border-radius 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}
