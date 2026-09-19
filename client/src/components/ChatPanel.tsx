import { useEffect, useRef, useState } from "react";
import { uploadFile, ApiError } from "../api/client";
import { Avatar } from "./Avatar";
import type { Attachment } from "../types";

export interface ChatMessage extends Attachment {
  id: string;
  content: string | null;
  createdAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
}

interface ChatPanelProps {
  fetchMessages: () => Promise<ChatMessage[]>;
  sendMessage: (payload: { content?: string; attachmentUrl?: string; attachmentType?: string; attachmentName?: string }) => Promise<ChatMessage>;
  deleteMessage: (messageId: string) => Promise<void>;
  canDelete: (message: ChatMessage) => boolean;
  currentUserId: string;
  emptyHint: string;
}

const POLL_INTERVAL_MS = 4000;
const MAX_ATTACHMENT_MB = 25;
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export function ChatPanel({ fetchMessages, sendMessage, deleteMessage, canDelete, currentUserId, emptyHint }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const msgs = await fetchMessages();
        if (!cancelled) setMessages(msgs);
      } catch {
        // Transient poll failures aren't worth surfacing as an error banner.
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMessages]);

  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      lastCountRef.current = messages.length;
    }
  }, [messages]);

  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await sendMessage({ content: trimmed });
      setMessages((prev) => [...prev, message]);
      setText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      setError(`Arquivo maior que ${MAX_ATTACHMENT_MB}MB.`);
      return;
    }

    setSending(true);
    setError(null);
    try {
      const uploaded = await uploadFile<{ url: string; mimeType: string; fileName: string }>("/uploads", file);
      const message = await sendMessage({
        attachmentUrl: uploaded.url,
        attachmentType: uploaded.mimeType,
        attachmentName: uploaded.fileName,
      });
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar arquivo.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteMessage(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao excluir mensagem.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
        {messages.length === 0 && (
          <span style={{ color: "var(--text-2)", fontSize: 13, margin: "auto" }}>{emptyHint}</span>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped =
            prev &&
            prev.author.id === m.author.id &&
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              isMine={m.author.id === currentUserId}
              grouped={Boolean(grouped)}
              onDelete={canDelete(m) ? () => handleDelete(m.id) : undefined}
            />
          );
        })}
      </div>

      {error && <div style={{ color: "var(--live-red)", fontSize: 13, padding: "0 20px 8px" }}>{error}</div>}

      <form
        onSubmit={handleSendText}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          onChange={handleFileSelected}
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "9px 12px", fontSize: 16, lineHeight: 1, borderRadius: "50%" }}
          title="Anexar vídeo, áudio ou imagem/gif"
          disabled={sending}
          onClick={() => fileInputRef.current?.click()}
        >
          📎
        </button>
        <input
          className="input"
          placeholder="Escreva uma mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
          style={{ borderRadius: 999 }}
        />
        <button className="btn btn-primary" type="submit" disabled={sending || !text.trim()} style={{ padding: "9px 18px", borderRadius: 999 }}>
          Enviar
        </button>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  isMine,
  grouped,
  onDelete,
}: {
  message: ChatMessage;
  isMine: boolean;
  grouped: boolean;
  onDelete?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        gap: 10,
        padding: "3px 8px",
        marginTop: grouped ? 0 : 14,
        borderRadius: "var(--radius-sm)",
        background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
        position: "relative",
      }}
    >
      <div style={{ width: 34, flexShrink: 0 }}>
        {!grouped && <Avatar username={message.author.username} avatarUrl={message.author.avatarUrl} size={34} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {!grouped && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: isMine ? "var(--blue-400)" : "var(--pink-400)" }}>
              {message.author.username}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-2)" }}>{formatTime(message.createdAt)}</span>
          </div>
        )}
        {message.content && (
          <div style={{ fontSize: 14.5, color: "var(--text-0)", wordBreak: "break-word", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {message.content}
          </div>
        )}
        {message.attachmentUrl && (
          <div style={{ marginTop: message.content ? 6 : 0 }}>
            <AttachmentView url={message.attachmentUrl} type={message.attachmentType} name={message.attachmentName} />
          </div>
        )}
      </div>
      {onDelete && hovered && (
        <button
          onClick={onDelete}
          title="Excluir mensagem"
          style={{
            position: "absolute",
            top: -10,
            right: 8,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            color: "var(--live-red)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function AttachmentView({ url, type, name }: { url: string; type: string | null; name: string | null }) {
  const mediaStyle: React.CSSProperties = {
    maxWidth: 320,
    maxHeight: 260,
    borderRadius: "var(--radius-md)",
    display: "block",
    border: "1px solid var(--border)",
  };
  if (type?.startsWith("video/")) {
    return <video src={url} controls style={mediaStyle} />;
  }
  if (type?.startsWith("audio/")) {
    return <audio src={url} controls style={{ maxWidth: 300 }} />;
  }
  if (type?.startsWith("image/")) {
    return <img src={url} alt={name ?? "anexo"} style={{ ...mediaStyle, objectFit: "cover" }} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--blue-400)", fontSize: 13 }}>
      📄 {name ?? "Arquivo anexado"}
    </a>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
