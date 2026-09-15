import { useParams } from "react-router-dom";
import { useAppContext } from "./AppLayout";
import { RoomView } from "./RoomView";

export function RoomPage() {
  const { serverId, roomId } = useParams();
  const { servers } = useAppContext();
  const server = servers.find((s) => s.id === serverId);
  const room = server?.rooms.find((r) => r.id === roomId);

  if (!server || !room || !roomId) {
    return <div style={{ padding: 24, color: "var(--text-2)" }}>Carregando sala...</div>;
  }

  return (
    <RoomView
      roomId={room.id}
      title={room.name}
      subtitle={server.name}
      backTo={`/app/servers/${server.id}`}
    />
  );
}
