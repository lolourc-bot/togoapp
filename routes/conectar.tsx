import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Compass, UserCircle2, type LucideIcon } from "lucide-react";
import { Dumbbell } from "@/components/togo/icons/Dumbbell";
import { BrandLogo } from "@/components/togo/BrandLogo";
import { setUserContext } from "@/lib/user-context";

export const Route = createFileRoute("/conectar")({
  head: () => ({ meta: [{ title: "Conectate · TOGO" }] }),
  component: ConectarPage,
});

function ConectarPage() {
  const navigate = useNavigate();

  const options: { icon: LucideIcon; title: string; desc: string; onClick: () => void }[] = [
    {
      icon: UserCircle2,
      title: "Tengo un entrenador personal",
      desc: "Ingresá con la cuenta que te dio tu coach.",
      onClick: () => navigate({ to: "/ingresar-atleta" }),
    },
    {
      icon: Dumbbell,
      title: "Soy socio de un gimnasio o club",
      desc: "Ingresá con la cuenta de tu institución.",
      onClick: () => navigate({ to: "/ingresar-socio" }),
    },
    {
      icon: Compass,
      title: "Todavía no tengo coach",
      desc: "Explorá la app y buscá un coach en el marketplace.",
      onClick: () => { setUserContext({ type: "explorer" }); navigate({ to: "/hoy" }); },
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 440, padding: "48px 40px", backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
        <div className="flex items-center" style={{ gap: 10, marginBottom: 24 }}>
          <BrandLogo className="h-9 w-9" />
          <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: -0.5 }}>TOGO</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>¿Cómo vas a usar TOGO?</h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 28 }}>Elegí la opción que te describe mejor.</p>

        <div className="flex flex-col" style={{ gap: 10 }}>
          {options.map(({ icon: Icon, title, desc, onClick }) => (
            <button
              key={title}
              type="button"
              onClick={onClick}
              className="flex items-center hover:border-[#111827]"
              style={{ gap: 14, background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: 16, cursor: "pointer", textAlign: "left", transition: "border-color .15s" }}
            >
              <span className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: "50%", background: "#F8FAFC", flexShrink: 0 }}>
                <Icon size={18} color="#374151" />
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#111827" }}>{title}</span>
                <span style={{ display: "block", fontSize: 12, color: "#94A3B8" }}>{desc}</span>
              </span>
              <ChevronRight size={14} color="#CBD5E1" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
