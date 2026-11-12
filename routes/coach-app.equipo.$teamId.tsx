import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { CoachAppBottomNav } from "@/components/togo/CoachAppBottomNav";
import { getCoachId } from "@/lib/programs";
import { supabase } from "@/lib/supabase";
import { fetchTeams, type Team } from "@/lib/teams";
import {
  fetchTeamSessions,
  addTeamSession,
  patchTeamSessionGroup,
  deleteTeamSessionGroup,
  duplicateTeamSessionGroup,
  type TeamDaySession,
} from "@/lib/team-sessions";
import { fetchLibraryExercises, type LibraryExercise } from "@/lib/exercise-data";
import type { CalEx, DaySession } from "@/components/togo/AthleteSessionCard";

export const Route = createFileRoute("/coach-app/equipo/$teamId")({
  head: () => ({ meta: [{ title: "Equipo · TOGO" }] }),
  component: TeamDetail,
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
function mondayOf(dateKey: string): Date {
  const d = new Date(`${dateKey}T00:00`);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}
function formatDateHeading(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00`);
  const label = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

let n = 0;
const newRow = (ex: LibraryExercise): CalEx => ({ id: `row${Date.now()}${++n}`, name: ex.name, sets: "3", reps: "10", weight: "", chain: false });

function TeamDetail() {
  const navigate = useNavigate();
  const { teamId } = useParams({ from: "/coach-app/equipo/$teamId" });
  const [coachId, setCoachId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [grouped, setGrouped] = useState<Record<string, TeamDaySession[]>>({});
  const [loading, setLoading] = useState(true);
  const today = todayKey();
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(today));
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [showMembers, setShowMembers] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("45");
  const [items, setItems] = useState<CalEx[]>([]);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const sessions = await fetchTeamSessions(teamId);
    setGrouped(sessions);
  };

  useEffect(() => {
    (async () => {
      try {
        const cid = await getCoachId();
        if (!cid) { navigate({ to: "/coach-app/ingresar" }); return; }
        setCoachId(cid);
        const [teams, sessions, lib] = await Promise.all([fetchTeams(cid), fetchTeamSessions(teamId), fetchLibraryExercises(cid)]);
        const t = teams.find((x) => x.id === teamId) ?? null;
        setTeam(t);
        setGrouped(sessions);
        setLibrary(lib);
        if (t && t.members.length) {
          const { data: rows } = await supabase.from("athletes").select("id, full_name").in("id", t.members);
          setMemberNames(Object.fromEntries((rows ?? []).map((r) => [r.id, r.full_name])));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);

  const filtered = query.trim()
    ? library.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 20)
    : library.slice(0, 20);

  const createSession = async () => {
    if (!coachId || !team) return;
    if (!name.trim()) { toast.error("Ponele un nombre a la sesión"); return; }
    if (items.length === 0) { toast.error("Agregá al menos un ejercicio"); return; }
    setSaving(true);
    try {
      await addTeamSession(coachId, team.id, team.members, selectedDate, { name: name.trim(), minutes: Number(minutes) || 45, items, circuits: [] });
      toast.success("Sesión creada para todo el equipo ✓");
      setCreating(false);
      setName("");
      setItems([]);
      await reload();
    } catch {
      toast.error("No se pudo crear la sesión");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (s: TeamDaySession) => {
    setOpenMenuId(null);
    const next: DaySession["status"] = s.status === "published" ? "draft" : "published";
    try {
      await patchTeamSessionGroup(s.id, { status: next });
      toast.success(next === "published" ? "Sesión publicada para todo el equipo ✓" : "Pasada a borrador");
      await reload();
    } catch {
      toast.error("No se pudo cambiar el estado");
    }
  };

  const duplicateSession = async (s: TeamDaySession) => {
    setOpenMenuId(null);
    if (!coachId || !team) return;
    try {
      await duplicateTeamSessionGroup(coachId, team.id, team.members, s, selectedDate);
      toast.success("Sesión duplicada para el equipo ✓");
      await reload();
    } catch {
      toast.error("No se pudo duplicar");
    }
  };

  const deleteSession = async (groupId: string) => {
    setConfirmDeleteId(null);
    try {
      await deleteTeamSessionGroup(groupId);
      toast.success("Sesión borrada para todo el equipo");
      await reload();
    } catch {
      toast.error("No se pudo borrar");
    }
  };

  if (loading) return <PhoneFrame><div /></PhoneFrame>;
  if (!team) return <PhoneFrame><div style={{ padding: 20, fontSize: 13, color: "#94A3B8" }}>No se encontró el equipo.</div></PhoneFrame>;

  const daySessions = grouped[`${teamId}|${selectedDate}`] ?? [];

  return (
    <PhoneFrame>
      <div className="flex items-center" style={{ position: "sticky", top: 0, background: "#FFF", borderBottom: "1px solid #E2E8F0", padding: "12px 16px", zIndex: 10, gap: 12 }}>
        <button type="button" onClick={() => navigate({ to: "/coach-app/equipos" })} aria-label="Volver" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
          <ChevronLeft size={22} color="#111827" />
        </button>
        <button type="button" onClick={() => setShowMembers(true)} style={{ flex: 1, textAlign: "left", background: "none", border: 0, cursor: "pointer" }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#111827" }}>{team.name}</span>
          <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>{team.members.length} {team.members.length === 1 ? "miembro" : "miembros"} · ver</span>
        </button>
        <button type="button" onClick={() => setCreating(true)} aria-label="Nueva sesión para el equipo" className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "50%", background: "#111827", color: "#FFF" }}>
          <Plus size={16} />
        </button>
      </div>

      {showMembers ? (
        <div className="flex flex-col" style={{ position: "absolute", inset: 0, zIndex: 30, background: "#FFF" }}>
          <div className="flex items-center" style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0", gap: 12 }}>
            <button type="button" onClick={() => setShowMembers(false)} aria-label="Cerrar" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
              <ChevronLeft size={22} color="#111827" />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Miembros</span>
          </div>
          <div className="flex flex-col overflow-y-auto" style={{ padding: 16, gap: 8 }}>
            {team.members.length === 0 ? (
              <p style={{ fontSize: 13, color: "#94A3B8" }}>Este equipo todavía no tiene miembros.</p>
            ) : (
              team.members.map((id) => (
                <div key={id} className="flex items-center" style={{ gap: 10, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "10px 14px" }}>
                  <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "50%", background: "#F1F5F9", fontSize: 11, fontWeight: 700, color: "#94A3B8", flexShrink: 0 }}>
                    {(memberNames[id] ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13, color: "#111827" }}>{memberNames[id] ?? "Atleta"}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {creating ? (
        <div className="flex flex-col" style={{ position: "absolute", inset: 0, zIndex: 30, background: "#FFF" }}>
          <div className="flex items-center" style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0", gap: 12 }}>
            <button type="button" onClick={() => setCreating(false)} aria-label="Cerrar" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
              <ChevronLeft size={22} color="#111827" />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Nueva sesión · {team.name}</span>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: 16, gap: 12, overflowX: "hidden" }}>
            <p style={{ fontSize: 11, color: "#94A3B8" }}>Se crea igual para los {team.members.length} miembros, el {formatDateHeading(selectedDate)}.</p>
            <div>
              <label style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4, display: "block" }}>Nombre de la sesión</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", minWidth: 0, height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ width: 100 }}>
              <label style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4, display: "block" }}>Minutos</label>
              <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ width: "100%", minWidth: 0, height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 10px", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {items.map((it, i) => (
                <div key={it.id} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 12 }}>
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", width: 16 }}>{String.fromCharCode(65 + i)}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#111827" }}>{it.name}</span>
                    <button type="button" onClick={() => setItems((r) => r.filter((x) => x.id !== it.id))} aria-label="Quitar" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
                      <Trash2 size={14} color="#CBD5E1" />
                    </button>
                  </div>
                  <div className="flex" style={{ gap: 8 }}>
                    <input value={it.sets} onChange={(e) => setItems((r) => r.map((x) => x.id === it.id ? { ...x, sets: e.target.value } : x))} placeholder="Sets" style={{ flex: 1, minWidth: 0, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 6px", fontSize: 12, textAlign: "center", boxSizing: "border-box" }} />
                    <input value={it.reps} onChange={(e) => setItems((r) => r.map((x) => x.id === it.id ? { ...x, reps: e.target.value } : x))} placeholder="Reps" style={{ flex: 1, minWidth: 0, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 6px", fontSize: 12, textAlign: "center", boxSizing: "border-box" }} />
                    <input value={it.weight} onChange={(e) => setItems((r) => r.map((x) => x.id === it.id ? { ...x, weight: e.target.value } : x))} placeholder="Peso" style={{ flex: 1, minWidth: 0, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 6px", fontSize: 12, textAlign: "center", boxSizing: "border-box" }} />
                  </div>
                </div>
              ))}
              {picking ? (
                <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 10 }}>
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
                    <Search size={14} color="#94A3B8" />
                    <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ejercicio…" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 13 }} />
                  </div>
                  <div className="flex flex-col" style={{ gap: 2, maxHeight: 220, overflowY: "auto" }}>
                    {filtered.map((ex) => (
                      <button key={ex.name} type="button" onClick={() => { setItems((r) => [...r, newRow(ex)]); setPicking(false); setQuery(""); }} style={{ textAlign: "left", padding: "8px 6px", fontSize: 13, color: "#374151", background: "none", border: 0, cursor: "pointer", borderRadius: 6 }}>
                        {ex.name}
                      </button>
                    ))}
                    {filtered.length === 0 ? <p style={{ fontSize: 12, color: "#94A3B8", padding: "8px 6px" }}>Sin resultados.</p> : null}
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setPicking(true)} className="flex items-center justify-center" style={{ gap: 6, border: "1.5px dashed #E2E8F0", borderRadius: 12, height: 44, background: "none", cursor: "pointer" }}>
                  <Plus size={14} color="#94A3B8" />
                  <span style={{ fontSize: 13, color: "#94A3B8" }}>Agregar ejercicio</span>
                </button>
              )}
            </div>
          </div>
          <div style={{ padding: 16, borderTop: "1px solid #F1F5F9" }}>
            <button type="button" onClick={createSession} disabled={saving} style={{ width: "100%", background: "#111827", color: "#FFF", borderRadius: 12, height: 48, fontSize: 14, fontWeight: 700, border: 0, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Creando…" : `Crear para los ${team.members.length} miembros`}
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid #F1F5F9" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <button type="button" aria-label="Semana anterior" onClick={() => setWeekStart((d) => { const n2 = new Date(d); n2.setDate(n2.getDate() - 7); return n2; })} style={{ background: "none", border: 0, cursor: "pointer", padding: 4 }}>
            <ChevronLeft size={16} color="#94A3B8" />
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>
            {weekDays[0]!.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – {weekDays[6]!.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
          </span>
          <button type="button" aria-label="Semana siguiente" onClick={() => setWeekStart((d) => { const n2 = new Date(d); n2.setDate(n2.getDate() + 7); return n2; })} style={{ background: "none", border: 0, cursor: "pointer", padding: 4 }}>
            <ChevronRight size={16} color="#94A3B8" />
          </button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {weekDays.map((d, i) => {
            const dk = keyOf(d);
            const sessions = grouped[`${teamId}|${dk}`] ?? [];
            const best = sessions.reduce<DaySession["status"] | null>((acc, s) => (acc === null || STATUS_RANK[s.status] > STATUS_RANK[acc] ? s.status : acc), null);
            const isSelected = dk === selectedDate;
            const isToday = dk === today;
            return (
              <button key={dk} type="button" onClick={() => setSelectedDate(dk)} className="flex flex-col items-center" style={{ gap: 4, padding: "6px 0", borderRadius: 10, border: isToday ? "1px solid #CBD5E1" : "1px solid transparent", background: isSelected ? "#111827" : "transparent", cursor: "pointer" }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? "#9CA3AF" : "#94A3B8" }}>{WEEKDAY_SHORT[i]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#FFFFFF" : "#111827" }}>{d.getDate()}</span>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: best ? (isSelected ? "#FFFFFF" : STATUS_COLOR[best]) : "transparent" }} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: 16, gap: 10, overflowX: "hidden" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{formatDateHeading(selectedDate)}{selectedDate === today ? " · Hoy" : ""}</p>
        {daySessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 16 }}>Sin sesiones de equipo este día.</p>
            <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center justify-center" style={{ height: 40, padding: "0 18px", borderRadius: 10, background: "#111827", color: "#FFF", fontSize: 13, fontWeight: 600, border: 0, cursor: "pointer" }}>
              Crear sesión
            </button>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {daySessions.map((s) => (
              <div key={s.id} style={{ position: "relative" }}>
                <div className="flex items-center" style={{ gap: 10, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.name}</span>
                    <span style={{ display: "block", fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{s.items.length} ejercicio{s.items.length === 1 ? "" : "s"} · {s.minutes} min · {team.members.length} atletas</span>
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[s.status], flexShrink: 0 }}>{STATUS_LABEL[s.status]}</span>
                  <button type="button" onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)} aria-label="Más opciones" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0, flexShrink: 0 }}>
                    <MoreVertical size={16} color="#94A3B8" />
                  </button>
                </div>
                {openMenuId === s.id ? (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width: 180, zIndex: 20, overflow: "hidden" }}>
                    <button type="button" onClick={() => toggleStatus(s)} style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#111827", background: "none", border: 0, cursor: "pointer" }}>
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
                    <span style={{ flex: 1, fontSize: 11, color: "#991B1B" }}>¿Borrar para todo el equipo?</span>
                    <button type="button" onClick={() => setConfirmDeleteId(null)} style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "none", border: 0, cursor: "pointer" }}>Cancelar</button>
                    <button type="button" onClick={() => deleteSession(s.id)} style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", background: "none", border: 0, cursor: "pointer" }}>Borrar</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <CoachAppBottomNav active="Equipos" />
    </PhoneFrame>
  );
}
