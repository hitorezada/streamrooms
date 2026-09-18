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
  currentUserId: string;
  emptyHint: string;
}

const POLL_INTERVAL_MS = 4000;
const MAX_ATTACHMENT_MB = 25;

export function ChatPanel({ fetchMessages, sendMessage, currentUserId, emptyHint }: ChatPanelProps) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.length === 0 && (
          <span style={{ color: "var(--text-2)", fontSize: 13, margin: "auto" }}>{emptyHint}</span>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isMine={m.author.id === currentUserId} />
        ))}
      </div>

      {error && <div style={{ color: "var(--live-red)", fontSize: 13, padding: "0 20px 8px" }}>{error}</div>}

      <form
        onSubmit={handleSendText}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 20px",
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
          style={{ padding: "8px 12px", fontSize: 16, lineHeight: 1 }}
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
        />
        <button className="btn btn-primary" type="submit" disabled={sending || !text.trim()} style={{ padding: "8px 16px" }}>
          Enviar
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, flexDirection: isMine ? "row-reverse" : "row" }}>
      <Avatar username={message.author.username} avatarUrl={message.author.avatarUrl} size={30} />
      <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", gap: 4, alignItems: isMine ? "flex-end" : "flex-start" }}>
        <span style={{ fontSize: 11, color: "var(--text-2)" }}>
          {message.author.username} · {formatTime(message.createdAt)}
        </span>
        {message.content && (
          <div
            style={{
              background: isMine ? "var(--blue-600)" : "var(--bg-3)",
              color: "var(--text-0)",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              fontSize: 14,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.content}
          </div>
        )}
        {message.attachmentUrl && <AttachmentView url={message.attachmentUrl} type={message.attachmentType} name={message.attachmentName} />}
      </div>
    </div>
  );
}

function AttachmentView({ url, type, name }: { url: string; type: string | null; name: string | null }) {
  if (type?.startsWith("video/")) {
    return <video src={url} controls style={{ maxWidth: 280, borderRadius: "var(--radius-md)", display: "block" }} />;
  }
  if (type?.startsWith("audio/")) {
    return <audio src={url} controls style={{ maxWidth: 280 }} />;
  }
  if (type?.startsWith("image/")) {
    return <img src={url} alt={name ?? "anexo"} style={{ maxWidth: 280, borderRadius: "var(--radius-md)", display: "block" }} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--blue-400)", fontSize: 13 }}>
      {name ?? "Arquivo anexado"}
    </a>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
