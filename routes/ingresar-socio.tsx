import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/ingresar-socio")({
  component: MemberLoginPage,
});

function MemberLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Lands here from a magic-link invite (already signed in) or a password-reset link.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
        return;
      }
      if (event === "SIGNED_IN" && session) {
        await supabase.rpc("claim_institution_member");
        navigate({ to: "/clases" });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSetNewPassword = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { setError(error.message); return; }
    await supabase.rpc("claim_institution_member");
    navigate({ to: "/clases" });
  };

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");
    if (!email.trim()) { setError("Ingresá tu email para recuperar tu contraseña"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/ingresar-socio`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setInfo("Si ese email tiene una cuenta, te enviamos un link para restablecer tu contraseña.");
  };

  const handleSubmit = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        await supabase.rpc("claim_institution_member");
        navigate({ to: "/clases" });
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else if (!data.session) {
        setInfo("Revisá tu correo para confirmar tu cuenta antes de ingresar.");
      } else {
        await supabase.rpc("claim_institution_member");
        navigate({ to: "/clases" });
      }
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 44, border: "1px solid #E5E7EB", borderRadius: 10,
    padding: "0 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6,
  };

  if (recovery) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 420, padding: "48px 40px", backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: -0.5, marginBottom: 4 }}>TOGO</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Elegí una nueva contraseña</h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 28 }}>Esto reemplaza tu contraseña anterior.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Nueva contraseña</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
            </div>
            {error ? <p style={{ fontSize: 12, color: "#DC2626" }}>{error}</p> : null}
            <button
              onClick={handleSetNewPassword}
              disabled={loading || !newPassword.trim()}
              style={{ height: 44, borderRadius: 10, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Un momento…" : "Guardar contraseña"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 420, padding: "48px 40px", backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: -0.5, marginBottom: 4 }}>TOGO</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
          {mode === "login" ? "Ingresá a tu cuenta" : "Creá tu cuenta de socio"}
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 28 }}>
          {mode === "login" ? "Usá el email que registraste en tu gimnasio." : "Usá el mismo email que le diste a tu gimnasio."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="tu@email.com" />
          </div>
          <div>
            <label style={labelStyle}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 40 }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                style={{ position: "absolute", right: 10, top: 0, height: 44, display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
              >
                {showPassword ? <EyeOff size={16} color="#9CA3AF" /> : <Eye size={16} color="#9CA3AF" />}
              </button>
            </div>
            {mode === "login" ? (
              <span onClick={handleForgotPassword} style={{ fontSize: 12, color: "#6B7280", cursor: "pointer", marginTop: 8, display: "inline-block" }}>
                ¿Olvidaste tu contraseña?
              </span>
            ) : null}
          </div>

          {error ? <p style={{ fontSize: 12, color: "#DC2626" }}>{error}</p> : null}
          {info ? <p style={{ fontSize: 12, color: "#166534" }}>{info}</p> : null}

          <button
            onClick={handleSubmit}
            disabled={loading || !email.trim() || !password.trim()}
            style={{ height: 44, borderRadius: 10, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Un momento…" : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>

          <button
            type="button"
            onClick={() => { setMode((m) => (m === "login" ? "register" : "login")); setError(""); setInfo(""); }}
            style={{ fontSize: 13, color: "#6B7280", background: "none", border: "none", cursor: "pointer", textAlign: "center" }}
          >
            {mode === "login" ? "¿Primera vez? Creá tu cuenta" : "¿Ya tenés cuenta? Ingresá"}
          </button>
        </div>
      </div>
    </div>
  );
}
