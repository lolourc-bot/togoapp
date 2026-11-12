import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { useMyCoachRequest } from "@/components/togo/CoachPlanRequest";
import { useAthleteAuth } from "@/hooks/useAthleteAuth";
import { fetchAthleteSessions } from "@/lib/athlete-sessions";
import type { DaySession } from "@/components/togo/AthleteSessionCard";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/mi-calendario")({
  head: () => ({
    meta: [
      { title: "Mi calendario — TOGO" },
      { name: "description", content: "Tus sesiones de entrenamiento del mes, planificadas por tu coach." },
      { property: "og:title", content: "Mi calendario — TOGO" },
      { property: "og:description", content: "Mirá todas tus sesiones del mes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function CalendarPage() {
  const myReq = useMyCoachRequest();
  const { athlete } = useAthleteAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sel, setSel] = useState(today.getDate());
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, DaySession[]>>({});
  const [coachName, setCoachName] = useState<string | null>(null);

  useEffect(() => {
    if (!athlete) { setSessionsByDate({}); return; }
    fetchAthleteSessions(athlete.id).then(setSessionsByDate);
    supabase.from("profiles").select("full_name").eq("id", athlete.coach_id).maybeSingle()
      .then(({ data }) => setCoachName(data?.full_name ?? null));
  }, [athlete]);

  const changeMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const dateKey = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const selSessions = sessionsByDate[dateKey(sel)] ?? [];
  const selSession = selSessions[0];

  const first = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div className="relative flex flex-col" style={{ width: 375, height: 812, backgroundColor: "#F8FAFC", borderRadius: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div className="flex-1 overflow-y-auto" style={{ padding: "44px 20px 20px" }}>
          <div className="flex items-center" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", flex: 1, textTransform: "capitalize" }}>{MONTHS[month]} {year}</span>
            <button aria-label="Mes anterior" onClick={() => changeMonth(-1)} style={{ padding: 6 }}><ChevronLeft size={18} color="#94A3B8" /></button>
            <button aria-label="Mes siguiente" onClick={() => changeMonth(1)} style={{ padding: 6 }}><ChevronRight size={18} color="#94A3B8" /></button>
          </div>
          {athlete && coachName ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", gap: 12 }}>
              <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#111827", color: "#FFF", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{coachName.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{coachName} · tu coach</div>
              </div>
            </div>
          ) : !athlete && myReq?.coach ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", gap: 12 }}>
              <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#111827", color: "#FFF", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{myReq.coach.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{myReq.coach} · tu coach</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, lineHeight: 1.5 }}>{myReq.welcome || `¡Hola! Soy ${myReq.coach}. Esta semana empezamos con una evaluación para armar tu plan.`}</div>
              </div>
            </div>
          ) : null}
          <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 4, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 10 }}>
            {["L", "M", "X", "J", "V", "S", "D"].map((d) => <span key={d} style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", fontWeight: 600 }}>{d}</span>)}
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const has = (sessionsByDate[dateKey(d)]?.length ?? 0) > 0;
              return (
                <button key={i} onClick={() => setSel(d)} className="flex flex-col items-center" style={{ height: 40, borderRadius: 10, background: d === sel ? "#111827" : "transparent", color: d === sel ? "#FFFFFF" : "#111827", fontSize: 13, fontWeight: 600, justifyContent: "center", gap: 3 }}>
                  {d}
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: has ? (d === sel ? "#FFFFFF" : "#22C55E") : "transparent" }} />
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 16, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>{sel} de {MONTHS[month]}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginTop: 4 }}>
              {!athlete ? "Iniciá sesión para ver tus sesiones" : selSession ? selSession.name : "Día de descanso"}
            </div>
            {athlete && selSession ? (
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                {coachName ? `${coachName} · ` : ""}{selSession.minutes} min
              </div>
            ) : null}
          </div>
        </div>
        <AthleteBottomNav active="Calendario" />
      </div>
    </div>
  );
}
