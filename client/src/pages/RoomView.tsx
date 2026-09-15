import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRoomConnection } from "../hooks/useRoomConnection";
import { ParticipantCard } from "../components/ParticipantCard";
import { ShareControls } from "../components/ShareControls";
import { StreamPlayer } from "../components/StreamPlayer";
import { Avatar } from "../components/Avatar";
import { LiveBadge } from "../components/LiveBadge";

interface RoomViewProps {
  roomId: string;
  title: string;
  subtitle?: string;
  backTo: string;
}

export function RoomView({ roomId, title, subtitle, backTo }: RoomViewProps) {
  const navigate = useNavigate();
  const {
    connected,
    participants,
    mySocketId,
    isSharing,
    localStream,
    startSharing,
    stopSharing,
    watchedStreams,
    watch,
    stopWatching,
    setQuality,
    currentQuality,
  } = useRoomConnection(roomId);

  // MVP focuses on watching one stream at a time; the hook already tracks a
  // Map so lifting this to multi-watch later is a UI-only change.
  const focusedSocketId = watchedStreams.keys().next().value as string | undefined;
  const focusedStream = focusedSocketId ? watchedStreams.get(focusedSocketId) : undefined;
  const focusedSharer = participants.find((p) => p.socketId === focusedSocketId);

  function handleWatch(socketId: string) {
    if (focusedSocketId && focusedSocketId !== socketId) {
      stopWatching(focusedSocketId);
    }
    watch(socketId);
  }

  function handleLeave() {
    if (isSharing) stopSharing();
    if (focusedSocketId) stopWatching(focusedSocketId);
    navigate(backTo);
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={handleLeave}>
            ← Sair da sala
          </button>
          <div>
            <div style={{ fontWeight: 700 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "var(--text-2)" }}>{subtitle}</div>}
          </div>
          {!connected && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-2)" }}>Conectando...</span>
          )}
        </header>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
          <ShareControls isSharing={isSharing} onStart={startSharing} onStop={stopSharing} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, position: "relative" }}>
          {isSharing && localStream && <SelfPreview stream={localStream} />}
          {focusedStream ? (
            <StreamPlayer
              stream={focusedStream}
              sharer={focusedSharer}
              quality={currentQuality.get(focusedSocketId!) ?? "auto"}
              onChangeQuality={(q) => setQuality(focusedSocketId!, q)}
              onStop={() => stopWatching(focusedSocketId!)}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 14,
              }}
            >
              {participants.map((p) => (
                <ParticipantCard
                  key={p.socketId}
                  participant={p}
                  isMe={p.socketId === mySocketId}
                  onWatch={() => handleWatch(p.socketId)}
                />
              ))}
              {participants.length === 0 && (
                <span style={{ color: "var(--text-2)", fontSize: 13 }}>
                  Ninguém mais está aqui ainda. Compartilhe o convite para chamar seus amigos.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <aside
        style={{
          width: 240,
          flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          padding: 16,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-2)", marginBottom: 10 }}>
          <span>NESTA SALA</span>
          <span>{participants.length}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {participants.map((p) => (
            <div key={p.socketId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar username={p.username} avatarUrl={p.avatarUrl} size={28} />
              <span style={{ fontSize: 13, flex: 1 }}>
                {p.username} {p.socketId === mySocketId && <span style={{ color: "var(--text-2)" }}>(você)</span>}
              </span>
              {p.isSharing && <LiveBadge />}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

// Small muted self-monitor so the person sharing can confirm what's actually
// going out — audio is always muted here since it's their own machine's
// output, playing it back would just echo.
function SelfPreview({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        width: 220,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "2px solid var(--live-red)",
        boxShadow: "var(--shadow-md)",
        zIndex: 10,
        background: "#000",
      }}
    >
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", display: "block" }} />
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          background: "rgba(0,0,0,0.6)",
          padding: "2px 8px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        Sua transmissão
      </div>
    </div>
  );
}
