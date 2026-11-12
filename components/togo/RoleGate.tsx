import { useNavigate } from "@tanstack/react-router";
import { User, Users } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export function RoleGate() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0B1220", padding: 24 }}>
      <BrandLogo className="h-14 w-14" />
      <div style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", letterSpacing: -1, marginTop: 16 }}>TOGO</div>
      <p style={{ fontSize: 15, color: "#9CA3AF", marginTop: 10, textAlign: "center", maxWidth: 320 }}>
        ¿Cómo querés entrar?
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32, width: "100%", maxWidth: 320 }}>
        <button
          type="button"
          onClick={() => navigate({ to: typeof window !== "undefined" && window.innerWidth < 768 ? "/coach-app/ingresar" : "/ingresar" })}
          className="flex items-center"
          style={{ gap: 12, padding: "18px 20px", borderRadius: 14, backgroundColor: "#FFFFFF", border: "none", cursor: "pointer", textAlign: "left", WebkitTapHighlightColor: "transparent", outline: "none" }}
        >
          <span className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#F1F5F9", flexShrink: 0 }}>
            <Users size={20} color="#011726" />
          </span>
          <span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#011726" }}>Soy coach</span>
            <span style={{ display: "block", fontSize: 12, color: "#6B7280" }}>Entrenador personal o de un club/gimnasio</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/ingresar-atleta" })}
          className="flex items-center"
          style={{ gap: 12, padding: "18px 20px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", textAlign: "left", WebkitTapHighlightColor: "transparent", outline: "none" }}
        >
          <span className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", flexShrink: 0 }}>
            <User size={20} color="#FFFFFF" />
          </span>
          <span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>Soy atleta</span>
            <span style={{ display: "block", fontSize: 12, color: "#9CA3AF" }}>Entreno con un coach o en un club/gimnasio</span>
          </span>
        </button>
      </div>
    </div>
  );
}
