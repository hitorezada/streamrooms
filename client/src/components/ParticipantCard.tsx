import { Avatar } from "./Avatar";
import { LiveBadge } from "./LiveBadge";
import type { Participant } from "../types";

interface ParticipantCardProps {
  participant: Participant;
  isMe: boolean;
  onWatch: () => void;
}

export function ParticipantCard({ participant, isMe, onWatch }: ParticipantCardProps) {
  return (
    <div
      onClick={participant.isSharing && !isMe ? onWatch : undefined}
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        aspectRatio: "16 / 10",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        position: "relative",
        cursor: participant.isSharing && !isMe ? "pointer" : "default",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (participant.isSharing && !isMe) e.currentTarget.style.borderColor = "var(--blue-500)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {participant.isSharing && (
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <LiveBadge />
        </div>
      )}
      <Avatar username={participant.username} avatarUrl={participant.avatarUrl} size={56} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {participant.username} {isMe && <span style={{ color: "var(--text-2)" }}>(você)</span>}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
          {participant.isSharing ? "Transmitindo" : "Assistindo"}
        </div>
      </div>
      {participant.isSharing && !isMe && (
        <span style={{ fontSize: 12, color: "var(--blue-400)", fontWeight: 600 }}>Assistir transmissão</span>
      )}
    </div>
  );
}
