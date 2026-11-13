import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { BrandLogo } from "@/components/togo/BrandLogo";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/coach-app/ingresar")({
  validateSearch: (search: Record<string, unknown>): { modo?: "registro" } =>
    search["modo"] === "registro" ? { modo: "registro" } : {},
  head: () => ({ meta: [{ title: "Ingresar · TOGO" }] }),
  component: CoachAppLogin,
});

function CoachAppLogin() {
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
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Lands here (still in recovery mode) after the user clicks the reset-password email link.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 46, border: "1px solid #E2E8F0", borderRadius: 10,
    padding: "0 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6,
  };

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
        options: { data: { full_name: name, role: "coach" } },
      });
      if (error) setError(error.message);
      else navigate({ to: "/" });
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");
    if (!email.trim()) { setError("Ingresá tu email para recuperar tu contraseña"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/coach-app/ingresar`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setInfo("Si ese email tiene una cuenta, te enviamos un link para restablecer tu contraseña.");
  };

  const handleSetNewPassword = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { setError(error.message); return; }
    navigate({ to: "/coach-app" });
  };

  if (recovery) {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col" style={{ padding: "48px 24px 24px", overflowY: "auto", overflowX: "hidden" }}>
          <div className="flex items-center" style={{ gap: 10, marginBottom: 28 }}>
            <BrandLogo className="h-9 w-9" />
            <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: -0.5 }}>TOGO</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Elegí una nueva contraseña</h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>Esto reemplaza tu contraseña anterior.</p>
          <div className="flex flex-col" style={{ gap: 14 }}>
            <div>
              <label style={labelStyle}>Nueva contraseña</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
            </div>
          </div>
          {error ? <p style={{ color: "#DC2626", fontSize: 13, marginTop: 12 }}>{error}</p> : null}
          <button
            type="button"
            onClick={handleSetNewPassword}
            disabled={loading || !newPassword.trim()}
            style={{ width: "100%", height: 48, borderRadius: 10, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", marginTop: 20, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Un momento…" : "Guardar contraseña"}
          </button>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col" style={{ overflowY: "auto", overflowX: "hidden" }}>
        {/* Photo header (same photo as the desktop login), fading into the form */}
        <div className="relative shrink-0 overflow-hidden" style={{ height: 300 }}>
          <img src="/login-athlete.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_30%]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,23,38,0.55)_0%,rgba(1,23,38,0.25)_45%,rgba(248,250,252,0)_62%,#F8FAFC_100%)]" />
          <div className="relative flex items-center" style={{ gap: 10, padding: "48px 24px 0" }}>
            <BrandLogo className="h-9 w-9" />
            <span className="text-white" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>TOGO</span>
          </div>
        </div>
      <div className="flex flex-1 flex-col" style={{ padding: "4px 24px 24px" }}>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
          {mode === "login" ? "Bienvenido de vuelta" : "Creá tu cuenta"}
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>
          {mode === "login" ? "Ingresá a tu panel de coach" : "Empezá gratis, sin tarjeta de crédito"}
        </p>

        <div className="flex flex-col" style={{ gap: 14 }}>
          {mode === "register" && (
            <div>
              <label style={labelStyle}>Nombre completo</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" style={inputStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} style={{ position: "absolute", right: 14, top: 0, height: 46, display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}>
                {showPassword ? <EyeOff size={16} color="#9CA3AF" /> : <Eye size={16} color="#9CA3AF" />}
              </button>
            </div>
            {mode === "login" ? (
              <span onClick={handleForgotPassword} style={{ fontSize: 12, color: "#6B7280", cursor: "pointer", marginTop: 4, display: "inline-block" }}>
                ¿Olvidaste tu contraseña?
              </span>
            ) : null}
          </div>
        </div>

        {error ? <p style={{ color: "#DC2626", fontSize: 13, marginTop: 12 }}>{error}</p> : null}
        {info ? <p style={{ color: "#166534", fontSize: 13, marginTop: 12 }}>{info}</p> : null}

        {mode === "register" ? (
          <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 14, lineHeight: 1.5 }}>
            Al crear tu cuenta aceptás los <a href="/legal" target="_blank" rel="noreferrer" style={{ color: "#6B7280", textDecoration: "underline" }}>Términos y la Política de Privacidad</a> de TOGO.
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !email.trim() || !password.trim()}
          style={{ width: "100%", height: 48, borderRadius: 10, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", marginTop: 20, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Cargando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
        </button>

        <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 20 }}>
          {mode === "login" ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
          <span
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{ color: "#111827", fontWeight: 600, cursor: "pointer" }}
          >
            {mode === "login" ? "Registrate gratis" : "Ingresá"}
          </span>
        </p>
      </div>
      </div>
    </PhoneFrame>
  );
}
