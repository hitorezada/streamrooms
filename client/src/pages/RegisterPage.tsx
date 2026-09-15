import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthShell } from "./LoginPage";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(username, email, password);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Criar conta">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input
          className="input"
          placeholder="Nome de usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
        />
        <input
          className="input"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Senha (mín. 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        {error && <span style={{ color: "var(--live-red)", fontSize: 13 }}>{error}</span>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Criando..." : "Criar conta"}
        </button>
      </form>
      <p style={{ marginTop: 18, fontSize: 13, color: "var(--text-2)", textAlign: "center" }}>
        Já tem conta? <Link to="/login" style={{ color: "var(--blue-400)" }}>Entrar</Link>
      </p>
    </AuthShell>
  );
}
