import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { MY_TEAMS } from "@/components/togo/TeamBlocks";

export const Route = createFileRoute("/mi-equipo/$teamId")({
  head: () => ({
    meta: [
      { title: "Mi equipo · TOGO" },
      { name: "description", content: "Integrantes y calendario compartido de tu equipo." },
      { property: "og:title", content: "Mi equipo · TOGO" },
      { property: "og:description", content: "Integrantes y calendario compartido de tu equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamDetail,
});

const SESSIONS = [
  { day: "Mar 29", name: "Fuerza — Martes" },
  { day: "Jue 1", name: "Técnica y velocidad" },
  { day: "Sáb 3", name: "Partido amistoso" },
];

function TeamDetail() {
  const { teamId } = Route.useParams();
  const t = MY_TEAMS.find((x) => x.id === teamId) ?? MY_TEAMS[0]!;
  return (
    <PhoneFrame>
      <div className="flex-1 overflow-y-auto" style={{ padding: "44px 16px 16px" }}>
        <Link to="/hoy" className="flex items-center" style={{ gap: 4, fontSize: 12, color: "#94A3B8" }}><ChevronLeft size={14} /> Training</Link>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginTop: 8 }}>{t.name}</div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>{t.club} · {t.coach}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", margin: "20px 0 8px" }}>Calendario del equipo</div>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {SESSIONS.map((s) => (
            <div key={s.day} className="flex" style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "10px 14px", gap: 12 }}>
              <span style={{ fontSize: 11, color: "#94A3B8", width: 44 }}>{s.day}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.name}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", margin: "20px 0 8px" }}>Integrantes · {t.members.length}</div>
        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12 }}>
          {t.members.map((m, i) => (
            <div key={m} className="flex items-center" style={{ padding: "10px 14px", gap: 10, borderTop: i ? "1px solid #F1F5F9" : 0 }}>
              <span className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "50%", background: "#F1F5F9", color: "#94A3B8", fontSize: 10, fontWeight: 600 }}>{m.split(" ").map((p) => p[0]).join("")}</span>
              <span style={{ fontSize: 13, color: "#111827" }}>{m}</span>
            </div>
          ))}
        </div>
      </div>
      <AthleteBottomNav active="Training" />
    </PhoneFrame>
  );
}
