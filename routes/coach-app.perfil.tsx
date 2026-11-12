import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { CoachAppBottomNav } from "@/components/togo/CoachAppBottomNav";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/coach-app/perfil")({
  head: () => ({ meta: [{ title: "Perfil · TOGO" }] }),
  component: CoachAppPerfil,
});

function CoachAppPerfil() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate({ to: "/coach-app/ingresar" }); return; }
        setEmail(session.user.email ?? "");
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle();
        setFullName(profile?.full_name ?? "");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading) return <PhoneFrame><div /></PhoneFrame>;

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col" style={{ padding: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 20 }}>Perfil</h1>

        <div style={{ background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: 16, marginBottom: 16 }}>
          <span className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: "50%", background: "#F1F5F9", fontSize: 18, fontWeight: 700, color: "#94A3B8", marginBottom: 12 }}>
            {fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"}
          </span>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{fullName || "Coach"}</p>
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{email}</p>
        </div>

        <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>
          Para facturación, marketplace y configuración avanzada, usá TOGO desde una computadora.
        </p>

        <button
          type="button"
          onClick={() => navigate({ to: "/legal" })}
          className="flex items-center"
          style={{ gap: 10, height: 44, borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "0 14px", marginBottom: 10 }}
        >
          Términos y privacidad
        </button>

        <button
          type="button"
          onClick={signOut}
          className="flex items-center justify-center"
          style={{ gap: 8, height: 44, borderRadius: 10, border: "1px solid #FEE2E2", background: "#FEF2F2", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>

      <CoachAppBottomNav active="Perfil" />
    </PhoneFrame>
  );
}
