import { useState } from "react";

interface ShareControlsProps {
  isSharing: boolean;
  onStart: (opts: { withAudio: boolean; frameRate: number }) => void;
  onStop: () => void;
}

export function ShareControls({ isSharing, onStart, onStop }: ShareControlsProps) {
  const [withAudio, setWithAudio] = useState(true);
  const [frameRate, setFrameRate] = useState(30);

  if (isSharing) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid var(--live-red)",
          borderRadius: "var(--radius-md)",
          padding: "10px 16px",
        }}
      >
        <span style={{ fontWeight: 700, color: "var(--live-red)", letterSpacing: 0.03 }}>
          VOCÊ ESTÁ AO VIVO
        </span>
        <button className="btn btn-danger" style={{ padding: "6px 14px", fontSize: 13 }} onClick={onStop}>
          Parar transmissão
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button
        className="btn btn-primary"
        onClick={() => onStart({ withAudio, frameRate })}
        style={{ fontSize: 14 }}
      >
        Compartilhar tela
      </button>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-1)" }}>
        <input type="checkbox" checked={withAudio} onChange={(e) => setWithAudio(e.target.checked)} />
        Compartilhar áudio da tela
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-1)" }}>
        FPS
        <select
          className="input"
          style={{ width: "auto", padding: "4px 8px" }}
          value={frameRate}
          onChange={(e) => setFrameRate(Number(e.target.value))}
        >
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={60}>60</option>
        </select>
      </label>
    </div>
  );
}
