import { useState } from "react";
import { useAuth } from "./AuthContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Escribí tu email arriba y después tocá 'recuperar contraseña'.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo("Te enviamos un email para restablecer la contraseña. Revisá tu casilla (y el spam).");
    } catch (err) {
      setError("No pudimos enviar el email. Verificá que la dirección sea correcta.");
    }
  }

  const inputStyle = { padding: "10px 12px", borderRadius: "8px", border: "1px solid #2a3f34", background: "#15231C", color: "#F4F1E9", fontSize: "14px", width: "100%", boxSizing: "border-box" };

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
          style={inputStyle}
        />

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ ...inputStyle, paddingRight: "44px" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", padding: "2px 4px", color: "#7FC8C0" }}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {error && <div style={{ color: "#e57373", fontSize: "13px" }}>{error}</div>}
        {info && <div style={{ color: "#7FC8C0", fontSize: "13px" }}>{info}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px", borderRadius: "8px", border: "none", background: "#1C6E6A", color: "#F4F1E9", fontWeight: 600, fontSize: "14px", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={handleReset}
          style={{ background: "transparent", border: "none", color: "#7FC8C0", fontSize: "12px", cursor: "pointer", textDecoration: "underline", padding: 0 }}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    </div>
  );
}
