import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const ERROR_MESSAGES: Record<string, string> = {
  discord_denied: "Você cancelou a conexão com o Discord.",
  invalid_state: "Sessão de login expirou, tente novamente.",
  discord_failed: "Não foi possível conectar com o Discord. Tente de novo.",
};

export function LoginPage() {
  const { loginWithDiscord } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (code) {
      setError(ERROR_MESSAGES[code] ?? "Erro ao entrar.");
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  return (
    <AuthShell title="Entrar">
      <p style={{ textAlign: "center", color: "var(--text-2)", fontSize: 14, marginTop: -6, marginBottom: 20 }}>
        Use sua conta do Discord para entrar. Sem senha, sem cadastro.
      </p>
      {error && (
        <div style={{ color: "var(--live-red)", fontSize: 13, textAlign: "center", marginBottom: 14 }}>{error}</div>
      )}
      <button
        className="btn btn-primary"
        onClick={loginWithDiscord}
        style={{ width: "100%", background: "#5865F2", fontSize: 15 }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#4752C4")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#5865F2")}
      >
        Entrar com Discord
      </button>
    </AuthShell>
  );
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.12), transparent 40%), radial-gradient(circle at 80% 80%, rgba(236,72,153,0.10), transparent 40%), var(--bg-0)",
      }}
    >
      <div
        style={{
          width: 360,
          maxWidth: "90vw",
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 32,
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 12px",
              borderRadius: 14,
              background: "linear-gradient(135deg, var(--blue-500), var(--pink-500))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
            }}
          >
            SR
          </div>
          <h1 style={{ fontSize: 20, margin: 0 }}>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
