import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Dumbbell,
  GripVertical,
  User,
  LayoutTemplate,
  Link2,
  Trash2,
  X,
  Edit2,
  Copy,
  Move,
  Save,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import {
  fetchProgramCanvases,
  createProgramCanvas,
  renameProgramCanvas,
  deleteProgramCanvas,
  setProgramWeeks,
  upsertProgramSession,
  deleteProgramSession,
  moveProgramSession,
} from "@/lib/program-canvas";
import { assignProgramToAthletes } from "@/lib/programs";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type CanvasExercise = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  chained: boolean;
};

type CanvasSession = {
  name: string;
  exercises: CanvasExercise[];
};

type CanvasDoc = {
  id: string;
  name: string;
  weeks: number;
  sessions: Record<string, CanvasSession>;
};

export type LabCanvasHandle = {
  addWeek: () => void;
  newSession: () => void;
};

let uid = 0;
const nextId = () => `ex${++uid}`;

const blankSession = (): CanvasSession => ({
  name: "",
  exercises: [{ id: nextId(), name: "", sets: "3", reps: "10", weight: "", chained: false }],
});

type Run = { items: CanvasExercise[]; group: boolean };

function buildRuns(list: CanvasExercise[]): Run[] {
  const runs: Run[] = [];
  let i = 0;
  while (i < list.length) {
    const items = [list[i]!];
    while (list[i]?.chained && list[i + 1]) {
      items.push(list[i + 1]!);
      i++;
    }
    runs.push({ items, group: items.length > 1 });
    i++;
  }
  return runs;
}

export const LabCanvas = forwardRef<
  LabCanvasHandle,
  {
    coachId: string | null;
    onEditDetail?: (programId: string, key: string) => void;
    programs?: string[];
    athletes?: { id: string; name: string }[];
  }
>(function LabCanvas({ coachId, onEditDetail, programs = [], athletes = [] }, ref) {
  const [canvases, setCanvases] = useState<CanvasDoc[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<CanvasSession | null>(null);
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<string | null>(null);
  const [xHover, setXHover] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ key: string; x: number; y: number } | null>(null);
  const [soonHover, setSoonHover] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelSel, setConfirmDelSel] = useState(false);
  const [rect, setRect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [progOpen, setProgOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPick, setAssignPick] = useState<string[]>([]);
  const [flash, setFlash] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const active = canvases.find((c) => c.id === activeId) ?? canvases[0]!;

  useEffect(() => {
    if (!coachId) return;
    fetchProgramCanvases(coachId).then((cs) => {
      setCanvases(cs);
      setActiveId((prev) => prev || cs[0]?.id || "");
      setLoaded(true);
    });
  }, [coachId]);

  const keyParts = (key: string) => {
    const [w, d] = key.split("-").map(Number);
    return { week: w!, day: d! };
  };

  const patchActive = (fn: (c: CanvasDoc) => CanvasDoc) =>
    setCanvases((prev) => prev.map((c) => (c.id === active.id ? fn(c) : c)));

  const setSessions = (fn: (s: Record<string, CanvasSession>) => Record<string, CanvasSession>) =>
    patchActive((c) => ({ ...c, sessions: fn(c.sessions) }));

  const commitSession = (key: string, session: CanvasSession) => {
    setSessions((prev) => ({ ...prev, [key]: session }));
    if (!coachId) return;
    const { week, day } = keyParts(key);
    upsertProgramSession(coachId, active.id, week, day, session).catch(() => toast.error("No se pudo guardar la sesión"));
  };

  const removeSession = (key: string) => {
    setSessions((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    const { week, day } = keyParts(key);
    deleteProgramSession(active.id, week, day).catch(() => toast.error("No se pudo eliminar la sesión"));
  };

  const addWeek = () => {
    const nextWeeks = active.weeks + 1;
    patchActive((c) => ({ ...c, weeks: nextWeeks }));
    setProgramWeeks(active.id, nextWeeks).catch(() => toast.error("No se pudo agregar la semana"));
  };

  const freeCells = (sessions: Record<string, CanvasSession>, weeks: number, count: number) => {
    const out: string[] = [];
    for (let w = 0; w < weeks && out.length < count; w++) {
      for (let d = 0; d < 7 && out.length < count; d++) {
        const k = `${w}-${d}`;
        if (!sessions[k]) out.push(k);
      }
    }
    return out;
  };

  const duplicateKeys = (keys: string[]) => {
    const created: { key: string; session: CanvasSession }[] = [];
    let weeksAfter = active.weeks;
    patchActive((c) => {
      const sessions = { ...c.sessions };
      let weeks = c.weeks;
      for (const key of keys) {
        const src = c.sessions[key];
        if (!src) continue;
        let target = freeCells(sessions, weeks, 1)[0];
        if (!target) {
          target = `${weeks}-0`;
          weeks += 1;
        }
        const clone = { ...src, exercises: src.exercises.map((e) => ({ ...e, id: nextId() })) };
        sessions[target] = clone;
        created.push({ key: target, session: clone });
      }
      weeksAfter = weeks;
      return { ...c, sessions, weeks };
    });
    if (!coachId) return;
    if (weeksAfter !== active.weeks) setProgramWeeks(active.id, weeksAfter).catch(() => toast.error("No se pudo guardar la semana nueva"));
    created.forEach(({ key, session }) => {
      const { week, day } = keyParts(key);
      upsertProgramSession(coachId, active.id, week, day, session).catch(() => toast.error("No se pudo duplicar una sesión"));
    });
  };

  useImperativeHandle(ref, () => ({
    addWeek,
    newSession: () => {
      const free = freeCells(active.sessions, active.weeks, 1)[0];
      if (free) {
        setEditing(free);
        setDraft(blankSession());
        return;
      }
      addWeek();
      setEditing(`${active.weeks}-0`);
      setDraft(blankSession());
    },
  }));

  useEffect(() => {
    if (!rect) return;
    const move = (e: MouseEvent) => setRect((r) => (r ? { ...r, x1: e.clientX, y1: e.clientY } : r));
    const up = () => {
      setRect((r) => {
        if (r) {
          const left = Math.min(r.x0, r.x1);
          const right = Math.max(r.x0, r.x1);
          const top = Math.min(r.y0, r.y1);
          const bottom = Math.max(r.y0, r.y1);
          const hits: string[] = [];
          gridRef.current?.querySelectorAll<HTMLElement>("[data-chip]").forEach((el) => {
            const b = el.getBoundingClientRect();
            if (b.left < right && b.right > left && b.top < bottom && b.bottom > top) {
              hits.push(el.dataset["chip"]!);
            }
          });
          if (Math.abs(r.x1 - r.x0) > 4 || Math.abs(r.y1 - r.y0) > 4) setSelected(hits);
        }
        return null;
      });
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }, [rect]);

  const openCell = (key: string) => {
    const s = active.sessions[key];
    skipAuto.current = true;
    setEditing(key);
    setDraft(s ? { ...s, exercises: s.exercises.map((e) => ({ ...e })) } : blankSession());
  };

  const save = () => {
    if (!editing || !draft) return;
    const key = editing;
    commitSession(key, { ...draft, name: draft.name.trim() || "Sesión sin título" });
    setEditing(null);
    setDraft(null);
  };

  const editorRef = useRef<HTMLDivElement>(null);
  const [savedTick, setSavedTick] = useState(false);
  const skipAuto = useRef(true);
  const closeEditor = () => { setEditing(null); setDraft(null); };
  useEffect(() => {
    if (!editing || !draft) return;
    if (skipAuto.current) { skipAuto.current = false; return; }
    const key = editing;
    commitSession(key, { ...draft, name: draft.name.trim() || "Sesión sin título" });
    setSavedTick(true);
    const t = window.setTimeout(() => setSavedTick(false), 2000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  useEffect(() => {
    if (!editing) return;
    const onDown = (e: PointerEvent) => {
      if (editorRef.current?.contains(e.target as Node)) return;
      setEditing(null);
      setDraft(null);
    };
    const id = window.setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    return () => { window.clearTimeout(id); document.removeEventListener("pointerdown", onDown); };
  }, [editing]);

  const patchExercise = (id: string, patch: Partial<CanvasExercise>) =>
    setDraft((d) =>
      d ? { ...d, exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : d,
    );

  const toolBtn = "flex flex-row items-center gap-1.5 rounded-[9px] border text-[12px] font-medium hover:bg-[#F8FAFC]";
  const toolStyle: React.CSSProperties = {
    height: 36,
    padding: "0 16px",
    borderColor: "#E2E8F0",
    color: "#374151",
  };

  const renderEditor = () =>
    draft ? (
      <div
        ref={editorRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white"
        style={{ border: "1px solid #CBD5E1", borderLeft: "3px solid #E2E8F0", borderRadius: 6, padding: 10, width: "100%", cursor: "default" }}
      >
          <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Nombre de la sesión"
              aria-label="Nombre de la sesión"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-bold outline-none"
              style={{ color: "#111827", border: "none" }}
            />
            <button type="button" aria-label="Contraer sesión" onClick={closeEditor} style={{ lineHeight: 0 }}>
              <ChevronUp size={12} color="#CBD5E1" />
            </button>
          </div>
          {savedTick ? <div className="text-[10px]" style={{ color: "#94A3B8", marginTop: -6, marginBottom: 6 }}>Guardado ✓</div> : null}

            <div className="flex flex-col gap-2">
              {draft.exercises.map((ex, i) => (
                <div key={ex.id} className="flex flex-row flex-wrap items-center gap-1">
                  <span className="w-[22px] text-[11px] font-bold" style={{ color: "#94A3B8" }}>
                    {`A${i + 1}`}
                  </span>
                  <input
                    value={ex.name}
                    onChange={(e) => patchExercise(ex.id, { name: e.target.value })}
                    placeholder="Ejercicio"
                    aria-label="Ejercicio"
                    className="min-w-0 rounded-[4px] border px-1.5 text-[11px] font-semibold outline-none"
                    style={{ height: 22, borderColor: "#E2E8F0", color: "#374151", flex: "1 1 calc(100% - 30px)" }}
                  />
                  {(["sets", "reps", "weight"] as const).map((f) => (
                    <input
                      key={f}
                      value={ex[f]}
                      onChange={(e) => patchExercise(ex.id, { [f]: e.target.value })}
                      placeholder={f === "sets" ? "S" : f === "reps" ? "R" : "Kg"}
                      aria-label={f === "sets" ? "Series" : f === "reps" ? "Repeticiones" : "Peso"}
                      className="rounded-[4px] border text-center text-[11px] outline-none"
                      style={{ height: 22, width: f === "weight" ? 34 : 28, borderColor: "#E2E8F0", color: "#111827" }}
                    />
                  ))}
                  <button
                    type="button"
                    aria-label="Encadenar"
                    onClick={() => patchExercise(ex.id, { chained: !ex.chained })}
                  >
                    <Link2 size={13} style={{ color: ex.chained ? "#3B82F6" : "#CBD5E1" }} />
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar ejercicio"
                    onClick={() =>
                      setDraft({ ...draft, exercises: draft.exercises.filter((e) => e.id !== ex.id) })
                    }
                  >
                    <Trash2 size={13} style={{ color: "#CBD5E1" }} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  exercises: [
                    ...draft.exercises,
                    { id: nextId(), name: "", sets: "3", reps: "10", weight: "", chained: false },
                  ],
                })
              }
              className="flex flex-row items-center gap-1.5 text-[12px]"
              style={{ color: "#94A3B8", marginTop: 10 }}
            >
              <Plus size={13} style={{ color: "#CBD5E1" }} />
              ejercicio
            </button>

        <button
          type="button"
          onClick={() => { if (editing) { const k = editing; closeEditor(); onEditDetail?.(active.id, k); } }}
          className="text-[11px]"
          style={{ color: "#94A3B8", marginTop: 8, display: "block" }}
        >
          Editar en detalle
        </button>
      </div>
    ) : null;

  if (!coachId || !loaded) {
    return <div style={{ padding: 24, fontSize: 13, color: "#94A3B8" }}>Cargando lienzos…</div>;
  }

  if (canvases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ padding: 60 }}>
        <span style={{ fontSize: 13, color: "#94A3B8" }}>Todavía no tenés programas en el Lienzo.</span>
        <button
          type="button"
          onClick={() => {
            createProgramCanvas(coachId, "Programa 1")
              .then((id) => {
                setCanvases([{ id, name: "Programa 1", weeks: 2, sessions: {} }]);
                setActiveId(id);
              })
              .catch(() => toast.error("No se pudo crear el programa"));
          }}
          className="cursor-pointer rounded-[9px] text-[13px] font-semibold"
          style={{ backgroundColor: "#111827", color: "#FFFFFF", height: 38, padding: "0 18px" }}
        >
          Crear el primero
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* CANVAS TABS */}
      <div
        className="flex flex-row items-center"
        style={{ borderBottom: "1px solid #E2E8F0", marginBottom: 20, overflowX: "auto" }}
      >
        {canvases.map((c) => {
          const isActive = c.id === active.id;
          return (
            <div
              key={c.id}
              onClick={() => {
                setActiveId(c.id);
                setSelected([]);
              }}
              onDoubleClick={() => setRenaming(c.id)}
              className="relative flex cursor-pointer flex-row items-center gap-2"
              style={{
                padding: "8px 14px",
                borderRight: "1px solid #E2E8F0",
                whiteSpace: "nowrap",
                backgroundColor: isActive ? "#FFFFFF" : "#F8FAFC",
                borderBottom: isActive ? "2px solid #111827" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {renaming === c.id ? (
                <input
                  autoFocus
                  value={c.name}
                  aria-label="Nombre del lienzo"
                  onChange={(e) =>
                    setCanvases((prev) =>
                      prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)),
                    )
                  }
                  onBlur={() => {
                    setRenaming(null);
                    renameProgramCanvas(c.id, c.name).catch(() => toast.error("No se pudo renombrar el programa"));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setRenaming(null);
                      e.currentTarget.blur();
                    }
                  }}
                  className="bg-transparent text-[13px] font-medium outline-none"
                  style={{ color: "#111827", border: "none", borderBottom: "1px solid #111827", width: 90 }}
                />
              ) : (
                <span
                  className="text-[13px]"
                  style={{ color: isActive ? "#111827" : "#94A3B8", fontWeight: isActive ? 600 : 500 }}
                >
                  {c.name}
                </span>
              )}
              <button
                type="button"
                aria-label={`Eliminar ${c.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canvases.length === 1) return;
                  if (confirmClose === c.id) {
                    setCanvases((prev) => prev.filter((x) => x.id !== c.id));
                    if (active.id === c.id) {
                      const rest = canvases.filter((x) => x.id !== c.id);
                      setActiveId(rest[0]!.id);
                    }
                    setConfirmClose(null);
                    deleteProgramCanvas(c.id).catch(() => toast.error("No se pudo eliminar el programa"));
                  } else {
                    setConfirmClose(c.id);
                  }
                }}
                className="cursor-pointer text-[#CBD5E1] hover:text-[#EF4444]"
              >
                <X size={12} />
              </button>
              {confirmClose === c.id ? (
                <span
                  className="rounded-[6px] text-[10px]"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 4,
                    marginTop: 4,
                    backgroundColor: "#111827",
                    color: "#FFFFFF",
                    padding: "3px 8px",
                    whiteSpace: "nowrap",
                    zIndex: 30,
                  }}
                >
                  ¿Eliminar lienzo?
                </span>
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          aria-label="Nuevo lienzo"
          onClick={() => {
            if (!coachId) return;
            const name = `Programa ${canvases.length + 1}`;
            createProgramCanvas(coachId, name)
              .then((id) => {
                const c: CanvasDoc = { id, name, weeks: 2, sessions: {} };
                setCanvases((prev) => [...prev, c]);
                setActiveId(id);
                setSelected([]);
              })
              .catch(() => toast.error("No se pudo crear el programa"));
          }}
          className="cursor-pointer text-[13px] text-[#94A3B8] hover:text-[#111827]"
          style={{ padding: "8px 14px" }}
        >
          +
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-row items-center justify-between" style={{ marginBottom: 16 }}>
        <span
          className="rounded-[6px] text-[11px] font-medium"
          style={{ backgroundColor: "#FEF9C3", color: "#854D0E", padding: "3px 8px" }}
        >
          Borrador
        </span>

        <div className="flex flex-row items-center gap-2">
          {saved ? (
            <span className="text-[13px]" style={{ color: "#10B981" }}>
              Guardado ✓
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSaved(true);
                window.setTimeout(() => setSaved(false), 2000);
              }}
              className={toolBtn}
              style={toolStyle}
            >
              <Save size={13} style={{ color: "#94A3B8" }} />
              Guardar
            </button>
          )}
          <button type="button" onClick={() => setAssignOpen(true)} className={toolBtn} style={toolStyle}>
            <User size={13} style={{ color: "#94A3B8" }} />
            Asignar a atleta
          </button>
        </div>
      </div>

      {/* SELECTION TOOLBAR */}
      {selected.length > 0 ? (
        <div
          className="flex flex-row items-center gap-2.5 rounded-[10px] border bg-white"
          style={{ borderColor: "#E2E8F0", padding: "8px 14px", marginBottom: 12 }}
        >
          <span className="text-[12px] font-medium" style={{ color: "#374151" }}>
            {`${selected.length} ${selected.length === 1 ? "sesión seleccionada" : "sesiones seleccionadas"}`}
          </span>
          <span style={{ width: 1, height: 16, backgroundColor: "#E2E8F0" }} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setProgOpen((v) => !v)}
              className="flex cursor-pointer flex-row items-center gap-1.5 text-[12px]"
              style={{ color: "#374151" }}
            >
              <LayoutTemplate size={12} style={{ color: "#94A3B8" }} />
              Copiar a programa
            </button>
            {progOpen ? (
              <>
                <div className="fixed inset-0" style={{ zIndex: 25 }} onClick={() => setProgOpen(false)} />
                <div
                  className="absolute rounded-[10px] border bg-white"
                  style={{
                    left: 0,
                    top: 24,
                    zIndex: 30,
                    minWidth: 220,
                    padding: 4,
                    borderColor: "#E2E8F0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  {programs.length === 0 ? (
                    <span className="block text-[12px]" style={{ color: "#94A3B8", padding: "7px 10px" }}>
                      Sin programas
                    </span>
                  ) : (
                    programs.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setProgOpen(false);
                          setFlash(`${selected.length} sesiones agregadas a ${p}`);
                          window.setTimeout(() => setFlash(""), 2200);
                        }}
                        className="flex w-full rounded-[6px] text-left text-[12px] hover:bg-[#F8FAFC]"
                        style={{ padding: "7px 10px", color: "#374151", whiteSpace: "nowrap" }}
                      >
                        {p}
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="flex cursor-pointer flex-row items-center gap-1.5 text-[12px]"
            style={{ color: "#374151" }}
          >
            <User size={12} style={{ color: "#94A3B8" }} />
            Asignar a atleta
          </button>
          <button
            type="button"
            onClick={() => duplicateKeys(selected)}
            className="flex cursor-pointer flex-row items-center gap-1.5 text-[12px]"
            style={{ color: "#374151" }}
          >
            <Copy size={12} style={{ color: "#94A3B8" }} />
            Duplicar en este lienzo
          </button>
          {confirmDelSel ? (
            <span className="flex items-center gap-2">
              <span className="text-[12px] font-semibold" style={{ color: "#EF4444" }}>{`¿Eliminar ${selected.length} sesiones?`}</span>
              <button
                type="button"
                onClick={() => {
                  selected.forEach((k) => removeSession(k));
                  setSelected([]);
                  setConfirmDelSel(false);
                }}
                className="cursor-pointer text-[12px] font-semibold text-white"
                style={{ height: 28, padding: "0 12px", borderRadius: 6, backgroundColor: "#EF4444" }}
              >
                Confirmar
              </button>
              <button type="button" onClick={() => setConfirmDelSel(false)} className="cursor-pointer text-[12px]" style={{ color: "#94A3B8" }}>
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelSel(true)}
              className="flex cursor-pointer flex-row items-center gap-1.5 text-[12px] font-semibold hover:bg-[#FEE2E2]"
              style={{ color: "#EF4444", height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #FEE2E2", backgroundColor: "#FFF5F5" }}
            >
              <Trash2 size={13} style={{ color: "#EF4444" }} />
              Eliminar selección
            </button>
          )}
          {flash ? (
            <span className="text-[12px]" style={{ color: "#10B981" }}>
              {flash}
            </span>
          ) : null}
          <button
            type="button"
            aria-label="Deseleccionar"
            onClick={() => setSelected([])}
            className="ml-auto cursor-pointer text-[#CBD5E1] hover:text-[#111827]"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* GRID */}
      <div
        ref={gridRef}
        className="flex flex-col"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-chip]")) return;
          setSelected([]);
          setRect({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY });
        }}
      >
        {Array.from({ length: active.weeks }).map((_, w) => (
          <div key={w} className="flex flex-row items-stretch" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <div
              className="flex shrink-0 items-start"
              style={{ width: 64, padding: "14px 12px 14px 0", borderRight: "1.5px solid #E2E8F0" }}
            >
              <span className="text-[12px] font-bold" style={{ color: "#94A3B8" }}>
                S{w + 1}
              </span>
            </div>

            <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
              {w === 0
                ? DAYS.map((d) => (
                    <div
                      key={`h${d}`}
                      className="text-center text-[10px] font-medium"
                      style={{
                        color: "#94A3B8",
                        padding: "8px 0",
                        backgroundColor: "#F8FAFC",
                        borderBottom: "1.5px solid #E2E8F0",
                        position: "sticky",
                        top: 0,
                        zIndex: 5,
                      }}
                    >
                      {d}
                    </div>
                  ))
                : null}

              {DAYS.map((_d, dIdx) => {
                const key = `${w}-${dIdx}`;
                const session = active.sessions[key];
                const isSel = selected.includes(key);
                const isCollapsed = collapsed[`${active.id}:${key}`] ?? false;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (!session) openCell(key);
                    }}
                    onMouseEnter={() => setHoverCell(key)}
                    onMouseLeave={() => setHoverCell((h) => (h === key ? null : h))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (!dragFrom || dragFrom === key) return;
                      setSessions((prev) => {
                        const moved = prev[dragFrom];
                        if (!moved) return prev;
                        const next = { ...prev };
                        delete next[dragFrom];
                        next[key] = moved;
                        return next;
                      });
                      const from = keyParts(dragFrom);
                      const to = keyParts(key);
                      moveProgramSession(active.id, from, to).catch(() => toast.error("No se pudo mover la sesión"));
                      setDragFrom(null);
                    }}
                    className="relative cursor-pointer"
                    style={{
                      minHeight: 80,
                      padding: 8,
                      backgroundColor: hoverCell === key && !session ? "#F8FAFC" : "transparent",
                      borderRight: dIdx === 6 ? "none" : "1px solid #E2E8F0",
                    }}
                  >
                    {editing === key && draft ? (
                      renderEditor()
                    ) : session ? (
                      <div
                        data-chip={key}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDragFrom(key);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected((prev) =>
                            e.shiftKey
                              ? prev.includes(key)
                                ? prev.filter((k) => k !== key)
                                : [...prev, key]
                              : [key],
                          );
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          openCell(key);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCtx({ key, x: e.clientX, y: e.clientY });
                        }}
                        className="relative flex cursor-pointer flex-col gap-1.5 rounded-[10px] bg-white"
                        style={{
                          border: isSel ? "2px solid #3B82F6" : "1px solid #E2E8F0",
                          backgroundColor: isSel ? "#EFF6FF" : "#FFFFFF",
                          padding: "10px 12px",
                          minHeight: 80,
                          boxShadow:
                            hoverCell === key
                              ? "0 3px 10px rgba(0,0,0,0.1)"
                              : "0 1px 4px rgba(0,0,0,0.06)",
                        }}
                      >
                        <div className="flex flex-row items-center gap-1.5" style={{ marginBottom: 4 }}>
                          <span
                            className="min-w-0 flex-1 truncate text-[11px] font-bold"
                            style={{ color: "#111827" }}
                          >
                            {session.name}
                          </span>
                          <button
                            type="button"
                            aria-label={isCollapsed ? "Expandir sesión" : "Colapsar sesión"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollapsed((prev) => ({
                                ...prev,
                                [`${active.id}:${key}`]: !isCollapsed,
                              }));
                            }}
                          >
                            {isCollapsed ? (
                              <ChevronDown size={10} style={{ color: "#CBD5E1" }} />
                            ) : (
                              <ChevronUp size={10} style={{ color: "#CBD5E1" }} />
                            )}
                          </button>
                        </div>

                        {isCollapsed ? (
                          <span className="text-[10px]" style={{ color: "#94A3B8" }}>
                            {`${session.exercises.length} ejercicios`}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-[3px]">
                            {(() => {
                              let aCount = 0;
                              return buildRuns(session.exercises).map((run, ri) => {
                                const rows = run.items.map((e, i) => {
                                  const label = run.group ? `B${i + 1}` : `A${++aCount}`;
                                  const color = run.group ? "#3B82F6" : "#94A3B8";
                                  return (
                                    <div key={e.id} className="flex flex-row items-center gap-1.5">
                                      <span
                                        className="text-[9px] font-bold"
                                        style={{ color, width: 18, flexShrink: 0 }}
                                      >
                                        {label}
                                      </span>
                                      <span
                                        className="min-w-0 flex-1 truncate text-[10px]"
                                        style={{ color: "#374151" }}
                                      >
                                        {e.name || "Ejercicio"}
                                      </span>
                                      <span
                                        className="whitespace-nowrap text-[10px]"
                                        style={{ color: "#94A3B8" }}
                                      >
                                        {`${e.sets}×${e.reps}${e.weight ? `×${e.weight}kg` : ""}`}
                                      </span>
                                    </div>
                                  );
                                });
                                return run.group ? (
                                  <div
                                    key={`run${ri}`}
                                    className="flex flex-col gap-[3px]"
                                    style={{
                                      borderLeft: "2px solid #3B82F6",
                                      backgroundColor: "#FAFAFA",
                                      paddingLeft: 5,
                                    }}
                                  >
                                    {rows}
                                  </div>
                                ) : (
                                  <div key={`run${ri}`} className="flex flex-col gap-[3px]">
                                    {rows}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}

                        {hoverCell === key ? (
                          <>
                            <GripVertical
                              size={10}
                              style={{ color: "#CBD5E1", position: "absolute", bottom: 6, right: 4 }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditDetail?.(active.id, key);
                              }}
                              className="cursor-pointer rounded-[5px] border bg-white text-[10px]"
                              style={{
                                position: "absolute",
                                top: 6,
                                right: 22,
                                borderColor: "#E2E8F0",
                                color: "#94A3B8",
                                padding: "2px 6px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Editar en detalle
                            </button>
                            <button
                              type="button"
                              aria-label="Eliminar sesión"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSession(key);
                                setSelected((prev) => prev.filter((k) => k !== key));
                              }}
                              onMouseEnter={() => setXHover(key)}
                              onMouseLeave={() => setXHover((h) => (h === key ? null : h))}
                              className="flex cursor-pointer items-center justify-center rounded-full"
                              style={{
                                position: "absolute",
                                top: 6,
                                right: 4,
                                width: 16,
                                height: 16,
                                backgroundColor: xHover === key ? "#EF4444" : "rgba(17,24,39,0.08)",
                                border: "none",
                                padding: 0,
                              }}
                            >
                              <X size={10} style={{ color: xHover === key ? "#FFFFFF" : "#64748B" }} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1">
                        <Plus size={16} style={{ color: "#94A3B8" }} />
                        <span
                          className="text-[11px]"
                          style={{
                            color: "#94A3B8",
                            opacity: hoverCell === key ? 1 : 0,
                            transition: "opacity .15s",
                          }}
                        >
                          Agregar
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addWeek}
          className="group flex w-full flex-row items-center gap-2 hover:bg-[#F8FAFC]"
          style={{ padding: "12px 0 12px 64px", borderTop: "1px dashed #E2E8F0" }}
        >
          <Plus size={14} className="text-[#94A3B8] group-hover:text-[#111827]" />
          <span className="text-[12px] text-[#94A3B8] group-hover:text-[#111827]">Agregar semana</span>
        </button>
      </div>

      {/* SELECTION RECTANGLE */}
      {rect ? (
        <div
          style={{
            position: "fixed",
            left: Math.min(rect.x0, rect.x1),
            top: Math.min(rect.y0, rect.y1),
            width: Math.abs(rect.x1 - rect.x0),
            height: Math.abs(rect.y1 - rect.y0),
            border: "1.5px solid #3B82F6",
            backgroundColor: "rgba(59,130,246,0.08)",
            zIndex: 15,
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* ASSIGN MODAL */}
      {assignOpen ? (
        <>
          <div
            className="fixed inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.35)", zIndex: 40 }}
            onClick={() => setAssignOpen(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[14px] border bg-white"
            style={{
              width: 380,
              zIndex: 45,
              borderColor: "#E2E8F0",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: 20,
            }}
          >
            <h3 className="text-[15px] font-bold" style={{ color: "#111827", marginBottom: 12 }}>
              Asignar a atleta
            </h3>
            <div className="flex flex-col" style={{ maxHeight: 260, overflowY: "auto" }}>
              {athletes.map((a) => {
                const on = assignPick.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setAssignPick((prev) =>
                        on ? prev.filter((x) => x !== a.id) : [...prev, a.id],
                      )
                    }
                    className="flex flex-row items-center gap-2.5 rounded-[8px] text-left hover:bg-[#F8FAFC]"
                    style={{ padding: "8px 10px" }}
                  >
                    <span
                      className="flex items-center justify-center rounded-[5px] border"
                      style={{
                        width: 16,
                        height: 16,
                        borderColor: on ? "#111827" : "#E2E8F0",
                        backgroundColor: on ? "#111827" : "#FFFFFF",
                      }}
                    >
                      {on ? <Check size={11} style={{ color: "#FFFFFF" }} /> : null}
                    </span>
                    <span className="text-[13px]" style={{ color: "#374151" }}>
                      {a.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-row items-center justify-end gap-2" style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="cursor-pointer text-[12px]"
                style={{ color: "#94A3B8" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={assignPick.length === 0}
                onClick={() => {
                  if (!coachId) return;
                  const startDate = new Date().toISOString().slice(0, 10);
                  assignProgramToAthletes(coachId, active.id, assignPick, startDate)
                    .then(() => {
                      setAssignOpen(false);
                      setAssignPick([]);
                      setFlash("Sesiones asignadas");
                      window.setTimeout(() => setFlash(""), 2200);
                    })
                    .catch(() => toast.error("No se pudo asignar el programa"));
                }}
                className="rounded-[8px] text-[12px] font-semibold"
                style={{
                  backgroundColor: assignPick.length === 0 ? "#E2E8F0" : "#111827",
                  color: assignPick.length === 0 ? "#94A3B8" : "#FFFFFF",
                  height: 36,
                  padding: "0 18px",
                }}
              >
                Asignar
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* CONTEXT MENU */}
      {ctx ? (
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 25 }}
            onClick={() => setCtx(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtx(null);
            }}
          />
          <div
            className="fixed bg-white"
            style={{
              left: ctx.x,
              top: ctx.y,
              borderRadius: 10,
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              padding: 4,
              zIndex: 30,
              minWidth: 160,
            }}
          >
            {(
              [
                { label: "Editar sesión", icon: Edit2, action: () => openCell(ctx.key) },
                { label: "Duplicar", icon: Copy, action: () => duplicateKeys([ctx.key]) },
              ] as const
            ).map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  action();
                  setCtx(null);
                }}
                className="flex w-full flex-row items-center gap-2 rounded-[6px] text-left text-[12px] hover:bg-[#F8FAFC]"
                style={{ padding: "7px 10px", color: "#374151" }}
              >
                <Icon size={12} style={{ color: "#94A3B8" }} />
                {label}
              </button>
            ))}
            <button
              type="button"
              onMouseEnter={() => setSoonHover(true)}
              onMouseLeave={() => setSoonHover(false)}
              className="relative flex w-full flex-row items-center gap-2 rounded-[6px] text-left text-[12px] hover:bg-[#F8FAFC]"
              style={{ padding: "7px 10px", color: "#374151" }}
            >
              <Move size={12} style={{ color: "#94A3B8" }} />
              Mover a…
              {soonHover ? (
                <span
                  className="rounded-[6px] text-[10px]"
                  style={{
                    position: "absolute",
                    left: "100%",
                    marginLeft: 6,
                    backgroundColor: "#111827",
                    color: "#FFFFFF",
                    padding: "3px 8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Próximamente
                </span>
              ) : null}
            </button>
            <div style={{ height: 1, backgroundColor: "#F1F5F9", margin: "4px 0" }} />
            <button
              type="button"
              onClick={() => {
                removeSession(ctx.key);
                setCtx(null);
              }}
              className="flex w-full flex-row items-center gap-2 rounded-[6px] text-left text-[12px] hover:bg-[#F8FAFC]"
              style={{ padding: "7px 10px", color: "#EF4444" }}
            >
              <Trash2 size={12} style={{ color: "#EF4444" }} />
              Eliminar sesión
            </button>
          </div>
        </>
      ) : null}

    </div>
  );
});
