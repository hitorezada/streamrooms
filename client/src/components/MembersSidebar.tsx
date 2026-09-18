import { Avatar } from "./Avatar";
import type { ServerMember } from "../types";

export function MembersSidebar({ members }: { members: ServerMember[] }) {
  const online = members.filter((m) => m.status === "online");
  const offline = members.filter((m) => m.status === "offline");

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        borderLeft: "1px solid var(--border)",
        padding: 16,
        overflowY: "auto",
      }}
    >
      <MemberGroup label={`Online — ${online.length}`} members={online} />
      <MemberGroup label={`Offline — ${offline.length}`} members={offline} />
    </aside>
  );
}

function MemberGroup({ label, members }: { label: string; members: ServerMember[] }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {members.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, opacity: m.status === "offline" ? 0.5 : 1 }}>
            <Avatar username={m.username} avatarUrl={m.avatarUrl} status={m.status} size={26} />
            <span style={{ fontSize: 13 }}>{m.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
