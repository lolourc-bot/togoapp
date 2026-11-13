import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoginShowcase } from "@/components/togo/LoginShowcase";
import { useEffect, useState } from "react";
import { Eye, EyeOff, User, Users, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type LoginSearch = { modo?: "registro"; rol?: "institucion" };

export const Route = createFileRoute("/ingresar")({
  // ?modo=registro opens the sign-up form and ?rol=institucion preselects Club / Gimnasio (landing CTAs).
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    ...(search["modo"] === "registro" ? { modo: "registro" as const } : {}),
    ...(search["rol"] === "institucion" ? { rol: "institucion" as const } : {}),
  }),
  component: LoginPage,
});

const ROLES = [
  { id: "coach", icon: User, label: "Coach", sub: "Entrenador personal o deportivo" },
  { id: "institution", icon: Building2, label: "Club / Gimnasio", sub: "Institución deportiva" },
];

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">(search.modo === "registro" ? "register" : "login");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"coach" | "institution">(search.rol === "institucion" ? "institution" : "coach");
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Lands here (still in recovery mode) after the user clicks the reset-password email link.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (mode === "register" && !name.trim()) { setError("Ingresá tu nombre"); return; }
    setLoading(true);
    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      navigate({ to: profile?.role === "institution" ? "/institucion" : "/" });
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name, role } },
      });
      if (error) setError(error.message);
      else navigate({ to: role === "institution" ? "/institucion" : "/" });
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");
    if (!email.trim()) { setError("Ingresá tu email para recuperar tu contraseña"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/ingresar`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setInfo("Si ese email tiene una cuenta, te enviamos un link para restablecer tu contraseña.");
  };

  const handleSetNewPassword = async () => {
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setError(error.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    setLoading(false);
    navigate({ to: profile?.role === "institution" ? "/institucion" : "/" });
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
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F8FAFC" }}>
      {/* Panel izquierdo — esta pantalla es exclusivamente la entrada desktop; la entrada
          mobile tiene su propia pantalla dedicada en /coach-app/ingresar. */}
      <LoginShowcase />

      {/* Panel derecho */}
      <div style={{ width: 520, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 64px", backgroundColor: "#FFFFFF", overflowY: "auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          {mode === "login" ? "Bienvenido de vuelta" : "Creá tu cuenta"}
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32 }}>
          {mode === "login" ? "Ingresá a tu panel" : "Empezá gratis, sin tarjeta de crédito"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "register" && (
            <>
              {/* Selector de tipo */}
              <div>
                <label style={labelStyle}>Soy...</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {ROLES.map(({ id, icon: Icon, label, sub }) => {
                    const on = role === id;
                    return (
                      <button key={id} type="button" onClick={() => setRole(id as any)}
                        style={{ flex: 1, padding: "14px 12px", border: `2px solid ${on ? "#111827" : "#E5E7EB"}`, borderRadius: 12, backgroundColor: on ? "#F9FAFB" : "#FFFFFF", cursor: "pointer", textAlign: "left" }}>
                        <Icon size={18} color={on ? "#111827" : "#9CA3AF"} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: on ? "#111827" : "#374151", marginTop: 6 }}>{label}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Nombre completo</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" style={inputStyle} />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 14, top: 12, background: "none", border: "none", cursor: "pointer" }}>
                {showPassword ? <EyeOff size={16} color="#9CA3AF" /> : <Eye size={16} color="#9CA3AF" />}
              </button>
            </div>
            {mode === "login" ? (
              <span onClick={handleForgotPassword} style={{ fontSize: 12, color: "#6B7280", cursor: "pointer", marginTop: 8, display: "inline-block" }}>
                ¿Olvidaste tu contraseña?
              </span>
            ) : null}
          </div>
        </div>

        {error && <p style={{ color: "#DC2626", fontSize: 13, marginTop: 12 }}>{error}</p>}
        {info && <p style={{ color: "#166534", fontSize: 13, marginTop: 12 }}>{info}</p>}

        {mode === "register" ? (
          <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 16, lineHeight: 1.5 }}>
            Al crear tu cuenta aceptás los <a href="/legal" target="_blank" rel="noreferrer" style={{ color: "#6B7280", textDecoration: "underline" }}>Términos y la Política de Privacidad</a> de TOGO.
          </p>
        ) : null}

        <button type="button" onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", height: 48, borderRadius: 10, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", marginTop: 24, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Cargando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
        </button>

        <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 24 }}>
          {mode === "login" ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
          <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{ color: "#111827", fontWeight: 600, cursor: "pointer" }}>
            {mode === "login" ? "Registrate gratis" : "Ingresá"}
          </span>
        </p>
      </div>
    </div>
  );
}
