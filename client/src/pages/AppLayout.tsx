import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useOutletContext, useParams } from "react-router-dom";
import { ServerRail } from "../components/ServerRail";
import { CreateServerModal } from "../components/CreateServerModal";
import { JoinServerModal } from "../components/JoinServerModal";
import { ProfileSettingsModal } from "../components/ProfileSettingsModal";
import { Avatar } from "../components/Avatar";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ServerSummary } from "../types";

interface AppContext {
  servers: ServerSummary[];
  refreshServers: () => Promise<void>;
}

export function useAppContext() {
  return useOutletContext<AppContext>();
}

export function AppLayout() {
  const { user, loading } = useAuth();
  const { serverId } = useParams();
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const refreshServers = useCallback(async () => {
    const list = await api.get<ServerSummary[]>("/servers");
    setServers(list);
  }, []);

  useEffect(() => {
    if (user) refreshServers();
  }, [user, refreshServers]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <ServerRail
        servers={servers}
        activeServerId={serverId}
        onCreateClick={() => setShowCreate(true)}
        onJoinClick={() => setShowJoin(true)}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Outlet context={{ servers, refreshServers } satisfies AppContext} />
      </div>

      <button
        onClick={() => setShowProfile(true)}
        title="Configurações de perfil"
        style={{
          position: "fixed",
          bottom: 16,
          left: 12,
          background: "transparent",
          padding: 0,
        }}
      >
        <Avatar username={user.username} avatarUrl={user.avatarUrl} status="online" size={40} />
      </button>

      {showCreate && (
        <CreateServerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => refreshServers()}
        />
      )}
      {showJoin && (
        <JoinServerModal onClose={() => setShowJoin(false)} onJoined={() => refreshServers()} />
      )}
      {showProfile && <ProfileSettingsModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}
