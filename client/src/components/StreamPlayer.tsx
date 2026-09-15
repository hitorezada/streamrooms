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

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.3;

export function StreamPlayer({ stream, sharer, quality, onChangeQuality, onStop }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [size, setSize] = useState<Size>("Grande");

  // Zoom is scroll-wheel driven (centered on the cursor, like Discord's
  // screen share viewer) and pan is drag-to-move once zoomed in. Both are
  // pure CSS transforms on the <video> — no renegotiation, no extra
  // bandwidth, it's just how the already-received frames are displayed.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  // React's onWheel is passive by default, so preventDefault() there is a
  // no-op — a native listener is the only reliable way to stop the page
  // from scrolling underneath while zooming.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      setOrigin({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
      setZoom((z) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
        if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
        return next;
      });
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setOrigin({ x: 50, y: 50 });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    setPan({
      x: dragStartRef.current.panX + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.panY + (e.clientY - dragStartRef.current.y),
    });
  }

  function onPointerUp() {
    setIsDragging(false);
  }

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
      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={resetZoom}
        style={{ position: "relative", flex: 1, background: "#000", overflow: "hidden" }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{
            width: "100%",
            display: "block",
            maxHeight: isFullscreen ? "100vh" : "70vh",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
            cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
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
        {zoom > 1 && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "rgba(0,0,0,0.55)",
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {Math.round(zoom * 100)}%
          </div>
        )}
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

        {zoom > 1 && (
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={resetZoom}>
            Resetar zoom
          </button>
        )}

        <button
          className="btn btn-ghost"
          style={{ padding: "6px 12px", fontSize: 13, marginLeft: zoom > 1 ? undefined : "auto" }}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        </button>
      </div>
    </div>
  );
}
