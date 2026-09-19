import { useEffect, useRef, useState } from "react";
import type { UseRoomConnectionResult } from "../hooks/useRoomConnection";
import { ParticipantCard } from "./ParticipantCard";
import { ShareControls } from "./ShareControls";
import { StreamPlayer } from "./StreamPlayer";

// The actual screen-share "stage" — share controls, self preview, and either
// the participant grid or the focused stream player. Deliberately has no
// header or member list of its own: those come from whatever page embeds it
// (ServerPage's channel sidebar + the general member list, or a direct-room
// page's own simple header), matching Discord's "the call just replaces the
// main pane" feel instead of a separate full-screen room page.
export function RoomStage({ conn }: { conn: UseRoomConnectionResult }) {
  const {
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
  } = conn;

  const focusedSocketId = watchedStreams.keys().next().value as string | undefined;
  const focusedStream = focusedSocketId ? watchedStreams.get(focusedSocketId) : undefined;
  const focusedSharer = participants.find((p) => p.socketId === focusedSocketId);

  const [selfPreviewVisible, setSelfPreviewVisible] = useState(true);
  useEffect(() => {
    if (isSharing) setSelfPreviewVisible(true);
  }, [isSharing]);

  function handleWatch(socketId: string) {
    if (focusedSocketId && focusedSocketId !== socketId) {
      stopWatching(focusedSocketId);
    }
    watch(socketId);
  }

  async function handleStartSharing(opts: { withAudio: boolean; frameRate: number }) {
    if (focusedSocketId) stopWatching(focusedSocketId);
    await startSharing(opts);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
        <ShareControls isSharing={isSharing} onStart={handleStartSharing} onStop={stopSharing} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, position: "relative" }}>
        {isSharing && localStream && selfPreviewVisible && (
          <SelfPreview stream={localStream} onClose={() => setSelfPreviewVisible(false)} />
        )}
        {isSharing && localStream && !selfPreviewVisible && (
          <button
            className="btn btn-ghost"
            onClick={() => setSelfPreviewVisible(true)}
            style={{ position: "absolute", bottom: 20, right: 20, fontSize: 12, padding: "6px 12px", zIndex: 10 }}
          >
            Mostrar preview
          </button>
        )}
        {focusedStream ? (
          <StreamPlayer
            key={focusedSocketId}
            stream={focusedStream}
            sharer={focusedSharer}
            quality={currentQuality.get(focusedSocketId!) ?? "auto"}
            onChangeQuality={(q) => setQuality(focusedSocketId!, q)}
            onStop={() => stopWatching(focusedSocketId!)}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
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
  );
}

// Small muted self-monitor so the person sharing can confirm what's actually
// going out — audio is always muted here since it's their own machine's
// output, playing it back would just echo. Resizable via the native CSS
// resize handle (drag the bottom-right corner).
function SelfPreview({ stream, onClose }: { stream: MediaStream; onClose: () => void }) {
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
        width: 320,
        height: 190,
        minWidth: 160,
        minHeight: 100,
        maxWidth: "80vw",
        maxHeight: "80vh",
        resize: "both",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "2px solid var(--live-red)",
        boxShadow: "var(--shadow-md)",
        zIndex: 10,
        background: "#000",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
      />
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
      <button
        onClick={onClose}
        title="Ocultar preview"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          borderRadius: 6,
          background: "rgba(0,0,0,0.6)",
          color: "white",
          fontSize: 14,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ×
      </button>
    </div>
  );
}
