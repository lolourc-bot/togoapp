import { createFileRoute, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Copy, Dumbbell, Footprints, Link2, Plus, Search, Send, Trash2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { getCoachId } from "@/lib/programs";
import { supabase } from "@/lib/supabase";
import { fetchLibraryExercises, type LibraryExercise } from "@/lib/exercise-data";
import { insertAthleteSession, updateAthleteSession, patchAthleteSessionStatus, deleteAthleteSession, fetchAthleteSessionById, moveAthleteSessionDate } from "@/lib/athlete-sessions";
import type { CalEx, DaySession } from "@/components/togo/AthleteSessionCard";
import { CircuitModal, circuitTimerLabel, type CircuitConfig } from "@/components/togo/CircuitModal";
import { AerobicEditor } from "@/components/togo/FieldSessionEditor";

export const Route = createFileRoute("/coach-app/sesion/$athleteId")({
  validateSearch: (search: Record<string, unknown>): { sessionId?: string; date?: string } => ({
    ...(typeof search["sessionId"] === "string" ? { sessionId: search["sessionId"] } : {}),
    ...(typeof search["date"] === "string" ? { date: search["date"] } : {}),
  }),
  head: () => ({ meta: [{ title: "Sesión · TOGO" }] }),
  component: SesionEditor,
});

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let n = 0;
const newRow = (ex: LibraryExercise): CalEx => ({ id: `row${Date.now()}${++n}`, name: ex.name, sets: "3", reps: "10", weight: "", chain: false, notes: "", rest: "90s", repsUnit: "Reps", weightUnit: "kg" });

const REPS_UNIT_OPTIONS = ["Reps", "Segundos", "Metros", "Calorías", "Distancia"];
const WEIGHT_UNIT_OPTIONS = ["kg", "lb", "% 1RM", "RPE", "Altura (cm)", "Tiempo (min:ss)", "Ninguna"];
const EXTRA_METRIC_OPTIONS = ["Ninguna", "RIR", "RPE"];

/** Agrupa ejercicios encadenados en un solo bloque visual, como en el editor de escritorio. */
function groupItems(items: CalEx[]): CalEx[][] {
  const groups: CalEx[][] = [];
  for (const it of items) {
    if (it.chain && groups.length > 0) groups[groups.length - 1]!.push(it);
    else groups.push([it]);
  }
  return groups;
}

function labelFor(groupIdx: number, subIdx: number): string {
  const letter = String.fromCharCode(65 + groupIdx);
  return subIdx === 0 ? letter : `${letter}${subIdx + 1}`;
}

function SesionEditor() {
  const navigate = useNavigate();
  const { athleteId } = useParams({ from: "/coach-app/sesion/$athleteId" });
  const { sessionId, date: dateParam } = Route.useSearch();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [sessionType, setSessionType] = useState<"fuerza" | "campo">("fuerza");
  const [fieldSession, setFieldSession] = useState<DaySession | undefined>(undefined);

  const [name, setName] = useState("");
  const [date, setDate] = useState(dateParam ?? todayKey());
  const originalDateRef = useRef(date);
  const [minutes, setMinutes] = useState("45");
  const [status, setStatus] = useState<DaySession["status"]>("published");
  const [items, setItems] = useState<CalEx[]>([]);
  const [circuits, setCircuits] = useState<CircuitConfig[]>([]);
  const [circuitModalOpen, setCircuitModalOpen] = useState(false);
  const [editingCircuitIdx, setEditingCircuitIdx] = useState<number | null>(null);

  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const backToCalendar = () => navigate({ to: "/coach-app/atleta/$athleteId", params: { athleteId } });

  useEffect(() => {
    (async () => {
      try {
        const cid = await getCoachId();
        if (!cid) { navigate({ to: "/coach-app/ingresar" }); return; }
        setCoachId(cid);
        const [{ data: athlete }, lib] = await Promise.all([
          supabase.from("athletes").select("full_name").eq("id", athleteId).maybeSingle(),
          fetchLibraryExercises(cid),
        ]);
        setAthleteName(athlete?.full_name ?? "Atleta");
        setLibrary(lib);
        if (sessionId) {
          const existing = await fetchAthleteSessionById(sessionId);
          if (existing) {
            if (existing.field) {
              setSessionType("campo");
              setFieldSession(existing);
            } else {
              setName(existing.name);
              setDate(existing.date);
              originalDateRef.current = existing.date;
              setMinutes(String(existing.minutes || 45));
              setStatus(existing.status);
              setItems(existing.items);
              setCircuits(existing.circuits ?? []);
            }
          }
        } else {
          setName(`Sesión — ${new Date(`${date}T00:00`).toLocaleDateString("es-AR", { weekday: "long" })}`);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = query.trim()
    ? library.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 20)
    : library.slice(0, 20);

  const addExercise = (ex: LibraryExercise) => {
    setItems((r) => [...r, newRow(ex)]);
    setPicking(false);
    setQuery("");
  };

  const updateItem = (id: string, patch: Partial<CalEx>) => setItems((r) => r.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id: string) => setItems((r) => r.filter((it) => it.id !== id));

  const saveCircuit = (cfg: CircuitConfig) => {
    setCircuits((cs) => (editingCircuitIdx !== null ? cs.map((c, i) => (i === editingCircuitIdx ? cfg : c)) : [...cs, cfg]));
    setCircuitModalOpen(false);
    setEditingCircuitIdx(null);
  };
  const removeCircuit = (idx: number) => setCircuits((cs) => cs.filter((_, i) => i !== idx));

  const save = async () => {
    if (!coachId) return;
    if (!name.trim()) { toast.error("Ponele un nombre a la sesión"); return; }
    if (items.length === 0 && circuits.length === 0) { toast.error("Agregá al menos un ejercicio o circuito"); return; }
    setSaving(true);
    try {
      const session: DaySession = {
        id: sessionId ?? crypto.randomUUID(),
        name: name.trim(),
        status,
        minutes: Number(minutes) || 0,
        items,
        circuits,
      };
      if (sessionId) {
        await updateAthleteSession(session);
        if (date !== originalDateRef.current) await moveAthleteSessionDate(sessionId, date);
      } else {
        await insertAthleteSession(coachId, athleteId, date, session);
      }
      toast.success("Sesión guardada ✓");
      backToCalendar();
    } catch {
      toast.error("No se pudo guardar la sesión");
    } finally {
      setSaving(false);
    }
  };

  const saveFieldSession = async (s: DaySession) => {
    if (!coachId) return;
    try {
      if (sessionId) await updateAthleteSession(s);
      else await insertAthleteSession(coachId, athleteId, date, s);
      toast.success("Sesión guardada ✓");
      backToCalendar();
    } catch {
      toast.error("No se pudo guardar la sesión");
    }
  };

  const toggleStatus = async () => {
    if (!sessionId) return;
    const next: DaySession["status"] = status === "published" ? "draft" : "published";
    try {
      await patchAthleteSessionStatus(sessionId, next);
      setStatus(next);
      toast.success(next === "published" ? "Sesión publicada ✓" : "Sesión pasada a borrador");
    } catch {
      toast.error("No se pudo cambiar el estado");
    }
  };

  const duplicate = async () => {
    if (!coachId) return;
    try {
      const copy: DaySession = {
        id: crypto.randomUUID(),
        name: `${name.trim()} (copia)`,
        status: "draft",
        minutes: Number(minutes) || 0,
        items,
        circuits,
      };
      await insertAthleteSession(coachId, athleteId, date, copy);
      toast.success("Sesión duplicada ✓");
      backToCalendar();
    } catch {
      toast.error("No se pudo duplicar la sesión");
    }
  };

  const confirmedDelete = async () => {
    if (!sessionId) return;
    try {
      await deleteAthleteSession(sessionId);
      toast.success("Sesión borrada");
      backToCalendar();
    } catch {
      toast.error("No se pudo borrar la sesión");
    }
  };

  const deleteWithConfirm = () => {
    if (window.confirm("¿Borrar esta sesión? No se puede deshacer.")) confirmedDelete();
  };

  const duplicateField = async () => {
    if (!coachId || !fieldSession) return;
    try {
      await insertAthleteSession(coachId, athleteId, date, { ...fieldSession, id: crypto.randomUUID(), name: `${fieldSession.name} (copia)`, status: "draft" });
      toast.success("Sesión duplicada ✓");
      backToCalendar();
    } catch {
      toast.error("No se pudo duplicar la sesión");
    }
  };

  if (loading) return <PhoneFrame><div /></PhoneFrame>;

  // Sesión de campo: reusa el mismo editor completo que usa la compu (mismas funciones,
  // mismo guardado) — se muestra como overlay a pantalla completa.
  if (sessionType === "campo") {
    const dateLabel = new Date(`${date}T00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
    return (
      <PhoneFrame>
        <AerobicEditor
          dateLabel={dateLabel}
          {...(fieldSession ? { initial: fieldSession, onDuplicate: duplicateField, onDelete: deleteWithConfirm } : {})}
          onClose={backToCalendar}
          onSave={saveFieldSession}
        />
      </PhoneFrame>
    );
  }

  const groups = groupItems(items);

  return (
    <PhoneFrame>
      <div className="flex items-center" style={{ position: "sticky", top: 0, background: "#FFF", borderBottom: "1px solid #E2E8F0", padding: "12px 16px", zIndex: 10, gap: 12 }}>
        <button type="button" onClick={backToCalendar} aria-label="Volver" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
          <ChevronLeft size={22} color="#111827" />
        </button>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#111827" }}>{athleteName}</span>
      </div>

      {sessionId ? (
        <div className="flex items-center" style={{ gap: 6, padding: "10px 16px", borderBottom: "1px solid #F1F5F9", overflowX: "auto" }}>
          <button type="button" onClick={toggleStatus} className="flex items-center" style={{ gap: 6, flexShrink: 0, height: 32, padding: "0 12px", borderRadius: 999, border: "1px solid #E2E8F0", background: "#FFF", fontSize: 12, fontWeight: 600, color: "#111827", cursor: "pointer" }}>
            <Send size={12} color={status === "published" ? "#2563EB" : "#94A3B8"} /> {status === "published" ? "Retirar publicación" : "Publicar"}
          </button>
          <button type="button" onClick={duplicate} className="flex items-center" style={{ gap: 6, flexShrink: 0, height: 32, padding: "0 12px", borderRadius: 999, border: "1px solid #E2E8F0", background: "#FFF", fontSize: 12, fontWeight: 600, color: "#111827", cursor: "pointer" }}>
            <Copy size={12} color="#94A3B8" /> Duplicar
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center" style={{ gap: 6, flexShrink: 0, height: 32, padding: "0 12px", borderRadius: 999, border: "1px solid #FEE2E2", background: "#FEF2F2", fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
            <Trash2 size={12} /> Borrar
          </button>
        </div>
      ) : (
        <div className="flex" style={{ gap: 8, padding: "10px 16px", borderBottom: "1px solid #F1F5F9" }}>
          <button
            type="button"
            onClick={() => setSessionType("fuerza")}
            className="flex flex-1 items-center justify-center"
            style={{ gap: 6, height: 34, borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#FFF", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            <Dumbbell size={13} /> Fuerza
          </button>
          <button
            type="button"
            onClick={() => setSessionType("campo")}
            className="flex flex-1 items-center justify-center"
            style={{ gap: 6, height: 34, borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            <Footprints size={13} /> Campo
          </button>
        </div>
      )}

      {confirmDelete ? (
        <div className="flex items-center" style={{ gap: 10, background: "#FEF2F2", borderBottom: "1px solid #FEE2E2", padding: "10px 16px" }}>
          <span style={{ flex: 1, fontSize: 12, color: "#991B1B" }}>¿Borrar esta sesión? No se puede deshacer.</span>
          <button type="button" onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, fontWeight: 600, color: "#374151", background: "none", border: 0, cursor: "pointer" }}>Cancelar</button>
          <button type="button" onClick={confirmedDelete} style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", background: "none", border: 0, cursor: "pointer" }}>Borrar</button>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: 16, gap: 12, overflowX: "hidden", minWidth: 0 }}>
        {sessionId ? (
          <span
            style={{
              alignSelf: "flex-start", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
              color: status === "published" ? "#2563EB" : status === "done" ? "#16A34A" : "#6B7280",
              background: status === "published" ? "#EFF6FF" : status === "done" ? "#F0FDF4" : "#F1F5F9",
            }}
          >
            {status === "published" ? "Publicada" : status === "done" ? "Hecha" : "Borrador"}
          </span>
        ) : null}
        <div>
          <label style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4, display: "block" }}>Nombre de la sesión</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", minWidth: 0, height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div className="flex" style={{ gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4, display: "block" }}>Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%", minWidth: 0, height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 10px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div style={{ width: 90, flexShrink: 0 }}>
            <label style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4, display: "block" }}>Minutos</label>
            <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ width: "100%", minWidth: 0, height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 10px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 10, marginTop: 8 }}>
          {groups.map((group, gi) => (
            <div key={group[0]!.id} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
              {group.map((it, si) => {
                const isOpen = !!expanded[it.id];
                const isLast = si === group.length - 1;
                return (
                  <div key={it.id} style={{ padding: 12, borderTop: si > 0 ? "1px dashed #E2E8F0" : undefined, display: "flex", gap: 10 }}>
                    {group.length > 1 ? (
                      <div className="flex flex-col items-center" style={{ flexShrink: 0, width: 4 }}>
                        <div style={{ width: 3, flex: 1, background: "#BFDBFE", borderRadius: 2, minHeight: 20 }} />
                      </div>
                    ) : null}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: group.length > 1 ? "#2563EB" : "#94A3B8", width: 22, flexShrink: 0 }}>{labelFor(gi, si)}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                        {!(gi === 0 && si === 0) ? (
                          <button
                            type="button"
                            onClick={() => updateItem(it.id, { chain: !it.chain })}
                            aria-label={it.chain ? "Desencadenar" : "Encadenar con el anterior"}
                            style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0, flexShrink: 0 }}
                          >
                            {it.chain ? <Unlink size={14} color="#2563EB" /> : <Link2 size={14} color="#CBD5E1" />}
                          </button>
                        ) : null}
                        <button type="button" onClick={() => removeItem(it.id)} aria-label="Quitar" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0, flexShrink: 0 }}>
                          <Trash2 size={14} color="#CBD5E1" />
                        </button>
                      </div>
                      <div className="flex" style={{ gap: 8 }}>
                        <input value={it.sets} onChange={(e) => updateItem(it.id, { sets: e.target.value })} placeholder="Sets" style={{ width: 44, flexShrink: 0, minWidth: 0, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 4px", fontSize: 12, textAlign: "center", boxSizing: "border-box" }} />
                        <div className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: 3 }}>
                          <input value={it.reps} onChange={(e) => updateItem(it.id, { reps: e.target.value })} placeholder="Cantidad" style={{ width: "100%", minWidth: 0, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 6px", fontSize: 12, textAlign: "center", boxSizing: "border-box" }} />
                          <select
                            value={it.repsUnit ?? "Reps"}
                            onChange={(e) => updateItem(it.id, { repsUnit: e.target.value })}
                            style={{ width: "100%", height: 22, border: "none", background: "none", fontSize: 10, color: "#94A3B8", textAlign: "center" }}
                          >
                            {REPS_UNIT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: 3 }}>
                          <input value={it.weight} onChange={(e) => updateItem(it.id, { weight: e.target.value })} placeholder="Valor" style={{ width: "100%", minWidth: 0, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 6px", fontSize: 12, textAlign: "center", boxSizing: "border-box" }} />
                          <select
                            value={it.weightUnit ?? "kg"}
                            onChange={(e) => updateItem(it.id, { weightUnit: e.target.value })}
                            style={{ width: "100%", height: 22, border: "none", background: "none", fontSize: 10, color: "#94A3B8", textAlign: "center" }}
                          >
                            {WEIGHT_UNIT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>
                      {isOpen ? (
                        <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
                          <input
                            value={it.rest ?? ""}
                            onChange={(e) => updateItem(it.id, { rest: e.target.value })}
                            placeholder="Descanso (ej: 90s)"
                            style={{ height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 12, minWidth: 0, boxSizing: "border-box" }}
                          />
                          <input
                            value={it.notes ?? ""}
                            onChange={(e) => updateItem(it.id, { notes: e.target.value })}
                            placeholder="Nota para el atleta (opcional)"
                            style={{ height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 12, minWidth: 0, boxSizing: "border-box" }}
                          />
                          <div className="flex items-center" style={{ gap: 6 }}>
                            <select
                              value={it.extras?.[0]?.name ?? "Ninguna"}
                              onChange={(e) => {
                                const metricName = e.target.value;
                                updateItem(it.id, { extras: metricName === "Ninguna" ? [] : [{ name: metricName, values: [it.extras?.[0]?.values?.[0] ?? ""] }] });
                              }}
                              style={{ flex: 1, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 8px", fontSize: 12 }}
                            >
                              {EXTRA_METRIC_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            {it.extras?.[0] ? (
                              <input
                                value={it.extras[0].values[0] ?? ""}
                                onChange={(e) => updateItem(it.id, { extras: [{ name: it.extras![0]!.name, values: [e.target.value] }] })}
                                placeholder="Valor"
                                style={{ width: 70, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 8px", fontSize: 12, textAlign: "center", boxSizing: "border-box" }}
                              />
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpanded((e) => ({ ...e, [it.id]: true }))}
                          style={{ marginTop: 6, fontSize: 11, color: "#94A3B8", background: "none", border: 0, cursor: "pointer", padding: 0 }}
                        >
                          + descanso, nota y métrica extra (RIR/RPE)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
                  <button key={ex.name} type="button" onClick={() => addExercise(ex)} style={{ textAlign: "left", padding: "8px 6px", fontSize: 13, color: "#374151", background: "none", border: 0, cursor: "pointer", borderRadius: 6 }}>
                    {ex.name}
                  </button>
                ))}
                {filtered.length === 0 ? <p style={{ fontSize: 12, color: "#94A3B8", padding: "8px 6px" }}>Sin resultados.</p> : null}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="flex items-center justify-center"
              style={{ gap: 6, border: "1.5px dashed #E2E8F0", borderRadius: 12, height: 44, background: "none", cursor: "pointer" }}
            >
              <Plus size={14} color="#94A3B8" />
              <span style={{ fontSize: 13, color: "#94A3B8" }}>Agregar ejercicio</span>
            </button>
          )}

          {circuits.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setEditingCircuitIdx(i); setCircuitModalOpen(true); }}
              style={{ textAlign: "left", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 12, cursor: "pointer" }}
            >
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: "#92400E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name || c.type}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); removeCircuit(i); }} aria-label="Quitar circuito" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0, flexShrink: 0 }}>
                  <Trash2 size={14} color="#D97706" />
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#B45309", marginTop: 2 }}>{c.type} · {c.exercises.length} ejercicio{c.exercises.length === 1 ? "" : "s"}{circuitTimerLabel(c) ? ` · ${circuitTimerLabel(c)}` : ""}</p>
            </button>
          ))}

          <button
            type="button"
            onClick={() => { setEditingCircuitIdx(null); setCircuitModalOpen(true); }}
            className="flex items-center justify-center"
            style={{ gap: 6, border: "1.5px dashed #FDE68A", borderRadius: 12, height: 44, background: "none", cursor: "pointer" }}
          >
            <Plus size={14} color="#D97706" />
            <span style={{ fontSize: 13, color: "#D97706" }}>Agregar circuito (AMRAP/EMOM/TABATA)</span>
          </button>
        </div>
      </div>

      <div style={{ padding: "16px", borderTop: "1px solid #F1F5F9" }}>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{ width: "100%", background: "#111827", color: "#FFF", borderRadius: 12, height: 48, fontSize: 14, fontWeight: 700, border: 0, cursor: "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Guardando…" : "Guardar sesión"}
        </button>
      </div>

      <CircuitModal
        open={circuitModalOpen}
        onClose={() => { setCircuitModalOpen(false); setEditingCircuitIdx(null); }}
        onSubmit={saveCircuit}
        initial={editingCircuitIdx !== null ? circuits[editingCircuitIdx] ?? null : null}
        mode={editingCircuitIdx !== null ? "edit" : "create"}
      />
    </PhoneFrame>
  );
}
