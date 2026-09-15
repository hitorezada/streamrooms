import { useState } from "react";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function ProfileSettingsModal({ onClose }: { onClose: () => void }) {
  const { user, updateUser, logout } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await api.patch<typeof user>("/users/me", {
        username: username !== user?.username ? username : undefined,
        avatarUrl: avatarUrl || null,
        bio: bio || null,
      });
      if (updated) updateUser(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Configurações de perfil" onClose={onClose}>
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <Avatar username={username || "?"} avatarUrl={avatarUrl} size={72} status={user?.status} />
        </div>

        <label style={{ fontSize: 12, color: "var(--text-2)" }}>Nome de usuário</label>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />

        <label style={{ fontSize: 12, color: "var(--text-2)" }}>URL do avatar</label>
        <input
          className="input"
          placeholder="https://..."
          value={avatarUrl ?? ""}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />

        <label style={{ fontSize: 12, color: "var(--text-2)" }}>Bio</label>
        <textarea
          className="input"
          rows={3}
          maxLength={200}
          value={bio ?? ""}
          onChange={(e) => setBio(e.target.value)}
        />

        {error && <span style={{ color: "var(--live-red)", fontSize: 13 }}>{error}</span>}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => logout()}>
          Sair da conta
        </button>
      </form>
    </Modal>
  );
}
