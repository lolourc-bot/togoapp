import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchStaffInviteByToken, acceptStaffInvite, type StaffInviteDetails } from "@/lib/institution-staff";

export const Route = createFileRoute("/institucion-invitacion/$token")({
  head: () => ({
    meta: [{ title: "Invitación — TOGO" }],
  }),
  component: InvitePage,
});

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, border: "1px solid #E5E7EB", borderRadius: 10,
  padding: "0 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 };

function InvitePage() {
  const { token } = useParams({ from: "/institucion-invitacion/$token" });
  const navigate = useNavigate();
  const [invite, setInvite] = useState<StaffInviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [inv, { data: { session } }] = await Promise.all([fetchStaffInviteByToken({ data: { token } }), supabase.auth.getSession()]);
      setInvite(inv);
      setSessionEmail(session?.user.email ?? null);
      setLoading(false);
    })();
  }, [token]);

  const acceptWithSession = async (userId: string) => {
    if (!invite) return;
    await acceptStaffInvite({ data: { token, authUserId: userId } });
    navigate({ to: "/institucion" });
  };

  const handleSubmit = async () => {
    if (!invite) return;
    setError("");
    setSubmitting(true);
    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email: invite.email, password });
      if (error) { setError(error.message); setSubmitting(false); return; }
      await acceptWithSession(data.user.id);
    } else {
      if (!name.trim()) { setError("Ingresá tu nombre"); setSubmitting(false); return; }
      const { data, error } = await supabase.auth.signUp({
        email: invite.email, password,
        options: { data: { full_name: name, role: "institution" } },
      });
      if (error) { setError(error.message); setSubmitting(false); return; }
      if (data.user) await acceptWithSession(data.user.id);
    }
    setSubmitting(false);
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#F8FAFC" }} />;

  if (!invite || invite.status === "revoked") {
    return (
      <Shell>
        <p style={{ fontSize: 14, color: "#374151" }}>Esta invitación no es válida o fue revocada.</p>
      </Shell>
    );
  }

  if (invite.status === "active") {
    return (
      <Shell>
        <p style={{ fontSize: 14, color: "#374151" }}>Esta invitación ya fue aceptada. Ingresá normalmente desde el login.</p>
      </Shell>
    );
  }

  // Ya hay una sesión iniciada con el email exacto de la invitación — aceptar directo.
  if (sessionEmail && sessionEmail.toLowerCase() === invite.email.toLowerCase()) {
    return (
      <Shell>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 16 }}>
          Te invitaron a administrar <strong>{invite.institutionName}</strong>.
        </p>
        <button
          type="button"
          onClick={async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) await acceptWithSession(session.user.id);
          }}
          style={{ width: "100%", height: 48, borderRadius: 10, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer" }}
        >
          Aceptar invitación
        </button>
      </Shell>
    );
  }

  if (sessionEmail) {
    return (
      <Shell>
        <p style={{ fontSize: 14, color: "#374151" }}>
          Estás logueado como <strong>{sessionEmail}</strong>, pero esta invitación es para <strong>{invite.email}</strong>. Cerrá sesión e ingresá con ese email.
        </p>
        <button
          type="button"
          onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
          style={{ marginTop: 16, width: "100%", height: 48, borderRadius: 10, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Cerrar sesión
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
        Te invitaron a {invite.institutionName}
      </h1>
      <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>
        {mode === "login" ? "Ingresá con tu cuenta para aceptar." : "Creá tu contraseña para aceptar la invitación."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input value={invite.email} disabled style={{ ...inputStyle, background: "#F8FAFC", color: "#94A3B8" }} />
        </div>
        {mode === "register" ? (
          <div>
            <label style={labelStyle}>Tu nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" style={inputStyle} />
          </div>
        ) : null}
        <div>
          <label style={labelStyle}>Contraseña</label>
          <div style={{ position: "relative" }}>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ position: "absolute", right: 14, top: 12, background: "none", border: "none", cursor: "pointer" }}>
              {showPassword ? <EyeOff size={16} color="#9CA3AF" /> : <Eye size={16} color="#9CA3AF" />}
            </button>
          </div>
        </div>
      </div>

      {error && <p style={{ color: "#DC2626", fontSize: 13, marginTop: 12 }}>{error}</p>}

      <button type="button" onClick={handleSubmit} disabled={submitting}
        style={{ width: "100%", height: 48, borderRadius: 10, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", marginTop: 24, opacity: submitting ? 0.7 : 1 }}>
        {submitting ? "Cargando..." : mode === "login" ? "Ingresar y aceptar" : "Crear cuenta y aceptar"}
      </button>

      <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 24 }}>
        {mode === "login" ? "¿Primera vez? " : "¿Ya tenés cuenta en TOGO? "}
        <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ color: "#111827", fontWeight: 600, cursor: "pointer" }}>
          {mode === "login" ? "Crear cuenta" : "Ingresar"}
        </span>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 440, padding: "40px 36px", backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
        {children}
      </div>
    </div>
  );
}
