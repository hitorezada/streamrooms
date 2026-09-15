import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4, 6, 10, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          width: 400,
          maxWidth: "90vw",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button className="btn-link" onClick={onClose} style={{ fontSize: 20, lineHeight: 1 }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
