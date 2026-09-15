import { useEffect, useRef, useState } from "react";
import type { StreamQuality } from "../hooks/quality";
import type { Participant } from "../types";

interface StreamPlayerProps {
  stream: MediaStream;
  sharer: Participant | undefined;
  quality: StreamQuality;
  onChangeQuality: (q: StreamQuality) => void;
  onStop: () => void;
}

const SIZES = ["Pequeno", "Médio", "Grande"] as const;
type Size = (typeof SIZES)[number];

export function StreamPlayer({ stream, sharer, quality, onChangeQuality, onStop }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [size, setSize] = useState<Size>("Grande");

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  const maxWidth = size === "Pequeno" ? 480 : size === "Médio" ? 760 : undefined;

  return (
    <div
      ref={containerRef}
      style={{
        background: "#000",
        borderRadius: isFullscreen ? 0 : "var(--radius-lg)",
        overflow: "hidden",
        width: "100%",
        maxWidth,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "relative", flex: 1, background: "#000" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{ width: "100%", display: "block", maxHeight: isFullscreen ? "100vh" : "70vh" }}
        />
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            background: "rgba(0,0,0,0.55)",
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {sharer?.username ?? "Transmissão"}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 14px",
          background: "var(--bg-2)",
          flexWrap: "wrap",
        }}
      >
        <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onStop}>
          Parar de assistir
        </button>

        <button
          className="btn btn-ghost"
          style={{ padding: "6px 12px", fontSize: 13 }}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? "Desmutar" : "Mutar"}
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-1)" }}>
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-1)" }}>
          Qualidade
          <select
            className="input"
            style={{ width: "auto", padding: "4px 8px" }}
            value={quality}
            onChange={(e) => onChangeQuality(e.target.value as StreamQuality)}
          >
            <option value="auto">Automático</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
            <option value="max">Qualidade máxima</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-1)" }}>
          Tamanho
          <select
            className="input"
            style={{ width: "auto", padding: "4px 8px" }}
            value={size}
            onChange={(e) => setSize(e.target.value as Size)}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 13, marginLeft: "auto" }} onClick={toggleFullscreen}>
          {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        </button>
      </div>
    </div>
  );
}
