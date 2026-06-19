import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#15231C", fontFamily: "Inter, system-ui, sans-serif" }}>
      <form onSubmit={handleSubmit} style={{ width: "320px", padding: "32px", background: "#1b2c24", borderRadius: "12px", border: "1px solid #2a3f34", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "22px", color: "#F4F1E9" }}>Praxia<span style={{ color: "#7FC8C0" }}>.</span></span>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #2a3f34", background: "#15231C", color: "#F4F1E9", fontSize: "14px" }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #2a3f34", background: "#15231C", color: "#F4F1E9", fontSize: "14px" }}
        />
        {error && <div style={{ color: "#e57373", fontSize: "13px" }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px", borderRadius: "8px", border: "none", background: "#1C6E6A", color: "#F4F1E9", fontWeight: 600, fontSize: "14px", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
