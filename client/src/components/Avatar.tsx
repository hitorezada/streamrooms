interface AvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: number;
  status?: "online" | "offline";
}

export function Avatar({ username, avatarUrl, size = 36, status }: AvatarProps) {
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
        {avatarUrl ? <img src={avatarUrl} alt={username} /> : <b>{initials}</b>}
      </div>
      {status && (
        <span
          className={`status-dot ${status}`}
          style={{ position: "absolute", right: -1, bottom: -1 }}
        />
      )}
    </div>
  );
}
