import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(usernameOrEmail, password);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Entrar">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input
          className="input"
          placeholder="Usuário ou e-mail"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          autoFocus
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <span style={{ color: "var(--live-red)", fontSize: 13 }}>{error}</span>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p style={{ marginTop: 18, fontSize: 13, color: "var(--text-2)", textAlign: "center" }}>
        Não tem conta? <Link to="/register" style={{ color: "var(--blue-400)" }}>Criar conta</Link>
      </p>
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
