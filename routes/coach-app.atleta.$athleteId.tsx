import { sessionTitle } from "@/lib/session-title";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, MoreVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { CoachAppBottomNav } from "@/components/togo/CoachAppBottomNav";
import { getCoachId } from "@/lib/programs";
import { supabase } from "@/lib/supabase";
import { fetchAthleteSessions, insertAthleteSession, patchAthleteSessionStatus, deleteAthleteSession } from "@/lib/athlete-sessions";
import type { DaySession } from "@/components/togo/AthleteSessionCard";

export const Route = createFileRoute("/coach-app/atleta/$athleteId")({
  head: () => ({ meta: [{ title: "Calendario del atleta · TOGO" }] }),
  component: AthleteCalendar,
});

const STATUS_LABEL: Record<DaySession["status"], string> = { draft: "Borrador", published: "Publicada", done: "Hecha" };
const STATUS_COLOR: Record<DaySession["status"], string> = { draft: "#94A3B8", published: "#2563EB", done: "#16A34A" };
const STATUS_RANK: Record<DaySession["status"], number> = { draft: 0, published: 1, done: 2 };
const WEEKDAY_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Lunes de la semana que contiene `dateKey`. */
function mondayOf(dateKey: string): Date {
  const d = new Date(`${dateKey}T00:00`);
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dow);
  return d;
}

function formatDateHeading(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00`);
  const label = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function AthleteCalendar() {
  const navigate = useNavigate();
  const { athleteId } = useParams({ from: "/coach-app/atleta/$athleteId" });
  const [coachId, setCoachId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState("");
  const [grouped, setGrouped] = useState<Record<string, DaySession[]>>({});
  const [loading, setLoading] = useState(true);
  const today = todayKey();
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(today));
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const reload = async () => {
    const sessions = await fetchAthleteSessions(athleteId);
    setGrouped(sessions);
  };

  useEffect(() => {
    (async () => {
      try {
        const cid = await getCoachId();
        if (!cid) { navigate({ to: "/coach-app/ingresar" }); return; }
        setCoachId(cid);
        const [{ data: athlete }, sessions] = await Promise.all([
          supabase.from("athletes").select("full_name").eq("id", athleteId).maybeSingle(),
          fetchAthleteSessions(athleteId),
        ]);
        setAthleteName(athlete?.full_name ?? "Atleta");
        setGrouped(sessions);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSessionStatus = async (s: DaySession) => {
    setOpenMenuId(null);
    const next: DaySession["status"] = s.status === "published" ? "draft" : "published";
    try {
      await patchAthleteSessionStatus(s.id, next);
      toast.success(next === "published" ? "Sesión publicada ✓" : "Sesión pasada a borrador");
      reload();
    } catch {
      toast.error("No se pudo cambiar el estado");
    }
  };

  const duplicateSession = async (s: DaySession) => {
    setOpenMenuId(null);
    if (!coachId) return;
    try {
      await insertAthleteSession(coachId, athleteId, selectedDate, { ...s, id: crypto.randomUUID(), name: s.name ? `${s.name} (copia)` : "", status: "draft" });
      toast.success("Sesión duplicada ✓");
      reload();
    } catch {
      toast.error("No se pudo duplicar la sesión");
    }
  };

  const deleteSession = async (id: string) => {
    setConfirmDeleteId(null);
    try {
      await deleteAthleteSession(id);
      toast.success("Sesión borrada");
      reload();
    } catch {
      toast.error("No se pudo borrar la sesión");
    }
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  if (loading) return <PhoneFrame><div /></PhoneFrame>;

  const daySessions = grouped[selectedDate] ?? [];

  return (
    <PhoneFrame>
      <div className="flex items-center" style={{ position: "sticky", top: 0, background: "#FFF", borderBottom: "1px solid #E2E8F0", padding: "12px 16px", zIndex: 10, gap: 12 }}>
        <button type="button" onClick={() => navigate({ to: "/coach-app" })} aria-label="Volver" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
          <ChevronLeft size={22} color="#111827" />
        </button>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#111827" }}>{athleteName}</span>
        <Link
          to="/coach-app/sesion/$athleteId"
          params={{ athleteId }}
          search={{ date: selectedDate }}
          aria-label="Nueva sesión"
          className="flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: "50%", background: "#111827", color: "#FFF" }}
        >
          <Plus size={16} />
        </Link>
      </div>

      <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid #F1F5F9" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
            style={{ background: "none", border: 0, cursor: "pointer", padding: 4 }}
          >
            <ChevronLeft size={16} color="#94A3B8" />
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>
            {weekDays[0]!.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – {weekDays[6]!.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
          </span>
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
            style={{ background: "none", border: 0, cursor: "pointer", padding: 4 }}
          >
            <ChevronRight size={16} color="#94A3B8" />
          </button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {weekDays.map((d, i) => {
            const dk = keyOf(d);
            const sessions = grouped[dk] ?? [];
            const best = sessions.reduce<DaySession["status"] | null>((acc, s) => (acc === null || STATUS_RANK[s.status] > STATUS_RANK[acc] ? s.status : acc), null);
            const isSelected = dk === selectedDate;
            const isToday = dk === today;
            return (
              <button
                key={dk}
                type="button"
                onClick={() => setSelectedDate(dk)}
                className="flex flex-col items-center"
                style={{
                  gap: 4, padding: "6px 0", borderRadius: 10, border: isToday ? "1px solid #CBD5E1" : "1px solid transparent",
                  background: isSelected ? "#111827" : "transparent", cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? "#9CA3AF" : "#94A3B8" }}>{WEEKDAY_SHORT[i]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#FFFFFF" : "#111827" }}>{d.getDate()}</span>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: best ? (isSelected ? "#FFFFFF" : STATUS_COLOR[best]) : "transparent" }} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: 16, gap: 10, overflowX: "hidden" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
          {formatDateHeading(selectedDate)}{selectedDate === today ? " · Hoy" : ""}
        </p>

        {daySessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 16 }}>Sin sesiones este día.</p>
            <Link
              to="/coach-app/sesion/$athleteId"
              params={{ athleteId }}
              search={{ date: selectedDate }}
              className="inline-flex items-center justify-center"
              style={{ height: 40, padding: "0 18px", borderRadius: 10, background: "#111827", color: "#FFF", fontSize: 13, fontWeight: 600 }}
            >
              Crear sesión
            </Link>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {daySessions.map((s) => (
              <div key={s.id} style={{ position: "relative" }}>
                <Link
                  to="/coach-app/sesion/$athleteId"
                  params={{ athleteId }}
                  search={{ sessionId: s.id }}
                  className="flex items-center"
                  style={{ gap: 10, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px" }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827" }}>{sessionTitle(s)}</span>
                    <span style={{ display: "block", fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{s.items.length} ejercicio{s.items.length === 1 ? "" : "s"} · {s.minutes} min</span>
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[s.status], flexShrink: 0 }}>{STATUS_LABEL[s.status]}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }}
                    aria-label="Más opciones"
                    style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0, flexShrink: 0 }}
                  >
                    <MoreVertical size={16} color="#94A3B8" />
                  </button>
                </Link>

                {openMenuId === s.id ? (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width: 180, zIndex: 20, overflow: "hidden" }}>
                    <button type="button" onClick={() => toggleSessionStatus(s)} style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#111827", background: "none", border: 0, cursor: "pointer" }}>
                      {s.status === "published" ? "Retirar publicación" : "Publicar"}
                    </button>
                    <button type="button" onClick={() => duplicateSession(s)} className="flex items-center" style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#111827", background: "none", border: 0, cursor: "pointer", borderTop: "1px solid #F1F5F9", gap: 8 }}>
                      <Copy size={13} color="#94A3B8" /> Duplicar
                    </button>
                    <button type="button" onClick={() => { setOpenMenuId(null); setConfirmDeleteId(s.id); }} className="flex items-center" style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#DC2626", background: "none", border: 0, cursor: "pointer", borderTop: "1px solid #F1F5F9", gap: 8 }}>
                      <Trash2 size={13} /> Borrar
                    </button>
                  </div>
                ) : null}

                {confirmDeleteId === s.id ? (
                  <div className="flex items-center" style={{ gap: 10, marginTop: 6, background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 10, padding: "8px 12px" }}>
                    <span style={{ flex: 1, fontSize: 11, color: "#991B1B" }}>¿Borrar esta sesión?</span>
                    <button type="button" onClick={() => setConfirmDeleteId(null)} style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "none", border: 0, cursor: "pointer" }}>Cancelar</button>
                    <button type="button" onClick={() => deleteSession(s.id)} style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", background: "none", border: 0, cursor: "pointer" }}>Borrar</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <CoachAppBottomNav active="Atletas" />
    </PhoneFrame>
  );
}
