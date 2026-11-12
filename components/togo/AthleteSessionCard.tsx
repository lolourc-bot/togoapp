import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Dumbbell,
  Edit2,
  EyeOff,
  Link2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { fetchLibraryExercises, type LibraryExercise } from "@/lib/exercise-data";
import { getCoachId } from "@/lib/programs";
import { DenseSessionBlock, type DenseRow } from "@/components/togo/DenseSession";
import { CircuitModal, circuitTimerLabel, type CircuitConfig } from "@/components/togo/CircuitModal";

export type ExSeries = { weight: string; reps: string };
export type ExExtra = { name: string; values: string[] };

/**
 * sets/reps/weight stay the quick one-line summary used by the compact
 * calendar-cell editor and every list/preview. series/notes/rest/etc are the
 * richer per-set detail captured by the full-page editor (/sesiones/$id);
 * they're optional so older stored sessions without them keep working.
 */
export type CalEx = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  chain: boolean;
  series?: ExSeries[];
  notes?: string;
  rest?: string;
  microRest?: string | null;
  repsUnit?: string;
  weightUnit?: string;
  extras?: ExExtra[];
};

export type FieldData = {
  effort: string;
  distance: string;
  unit: "km" | "m";
  duration: string;
  rpe: number;
  intervals: { reps: string; len: string; zone: number; rest: string }[] | null;
  instructions: string;
  realDistance?: string;
  realTime?: string;
  hrAvg?: string;
  hrMax?: string;
  notes?: string;
  editor?: unknown;
};

export type DaySession = {
  id: string;
  name: string;
  status: "draft" | "published" | "done";
  minutes: number;
  items: CalEx[];
  circuits: CircuitConfig[];
  field?: FieldData;
};

let n = 0;
export const newEx = (name: string, sets = "3", reps = "10"): CalEx => ({
  id: `cx${Date.now()}${++n}`,
  name,
  sets,
  reps,
  weight: "",
  chain: false,
});

export const exCount = (s: DaySession) =>
  s.items.length + s.circuits.reduce((a, c) => a + c.exercises.length, 0);

const menuBox: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: 20,
  backgroundColor: "#FFFFFF",
  borderRadius: 10,
  border: "1px solid #E2E8F0",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  padding: 4,
  minWidth: 180,
  zIndex: 30,
};
const numIn = (w: number): React.CSSProperties => ({
  width: w,
  height: 22,
  border: "1px solid #E2E8F0",
  borderRadius: 4,
  textAlign: "center",
  fontSize: 11,
  color: "#111827",
  outline: "none",
});
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

function MenuItem({
  icon,
  label,
  color = "#374151",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center whitespace-nowrap rounded-[6px] text-left hover:bg-[#F8FAFC]"
      style={{ gap: 8, padding: "8px 10px", fontSize: 12, color, background: "none", border: "none" }}
    >
      {icon}
      {label}
    </button>
  );
}
const Divider = () => <div style={{ height: 1, backgroundColor: "#F1F5F9", margin: "4px 0" }} />;

function labels(items: CalEx[]) {
  // runs: exercise with chain=true joins the previous one
  const out: { label: string; super: boolean }[] = [];
  let a = 0;
  let b = 0;
  let i = 0;
  while (i < items.length) {
    let j = i + 1;
    while (j < items.length && items[j]!.chain) j++;
    if (j - i === 1) out.push({ label: `A${++a}`, super: false });
    else {
      b++;
      for (let k = i; k < j; k++) out.push({ label: `B${b}·${k - i + 1}`, super: true });
    }
    i = j;
  }
  return out;
}

function denseRows(s: DaySession): DenseRow[] {
  const out: DenseRow[] = [];
  let block = 0;
  let i = 0;
  while (i < s.items.length) {
    let j = i + 1;
    while (j < s.items.length && s.items[j]!.chain) j++;
    const letter = String.fromCharCode(65 + block++);
    for (let k = i; k < j; k++) {
      const e = s.items[k]!;
      const sup = j - i > 1;
      out.push({
        label: sup ? `${letter}${k - i + 1}` : letter,
        kind: sup ? "superset" : "single",
        ...(sup ? { group: letter } : {}),
        name: e.name,
        detail: `${e.sets} × ${e.reps}${e.weight ? ` @ ${e.weight} kg` : ""}`,
      });
    }
    i = j;
  }
  s.circuits.forEach((c, ci) =>
    c.exercises.forEach((e, ei) =>
      out.push({
        label: `C${ei + 1}`,
        kind: "circuit",
        group: `C${ci}`,
        name: e.name,
        detail: `${e.reps || "—"}${e.weight ? ` @ ${e.weight} ${e.unit}` : ""}${ei === 0 ? ` · ${c.type}` : ""}`,
      }),
    ),
  );
  return out;
}

function fieldRows(s: DaySession): DenseRow[] {
  const f = s.field!;
  const rows: DenseRow[] = [
    { label: "A", kind: "single", name: f.effort, detail: `${f.distance || "—"} ${f.unit} · ${f.duration || "—"} min · RPE ${f.rpe}` },
  ];
  f.intervals?.forEach((iv, i) =>
    rows.push({ label: String.fromCharCode(66 + i), kind: "single", name: `${iv.reps} × ${iv.len}`, detail: `RPE ${iv.zone} · rec ${iv.rest} min` }),
  );
  return rows;
}

export function SessionCard({
  session,
  alignRight,
  onChange,
  onDelete,
  onCopy,
  onRepeat,
  onEditDetail,
}: {
  session: DaySession;
  alignRight: boolean;
  onChange: (s: DaySession) => void;
  onDelete: () => void;
  onCopy: () => void;
  onRepeat: (everyWeeks: number, times: number) => void;
  onEditDetail: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);

  useEffect(() => {
    getCoachId().then((cid) => {
      if (cid) fetchLibraryExercises(cid).then(setLibrary);
    });
  }, []);
  const [repeat, setRepeat] = useState(false);
  const [every, setEvery] = useState(1);
  const [times, setTimes] = useState("4");
  const [draft, setDraft] = useState<DaySession>(session);
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState("");
  const [expC, setExpC] = useState<number | null>(null);
  const [circuitModal, setCircuitModal] = useState<{ index: number | null } | null>(null);
  const [saved, setSaved] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipSave = useRef(true);

  // auto-save every change while expanded
  useEffect(() => {
    if (!open) return;
    if (skipSave.current) { skipSave.current = false; return; }
    onChange(draft);
    setSaved(true);
    const t = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // click anywhere outside collapses (also enforces one open session at a time)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.("[role=dialog], [data-circuit-modal]")) return;
      if (circuitModal) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, circuitModal]);

  const border = session.status === "done" ? "#111827" : session.status === "published" ? "#22C55E" : "#E2E8F0";
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return library.filter(
      (e) =>
        !t ||
        e.name.toLowerCase().includes(t) ||
        e.pattern.toLowerCase().includes(t) ||
        e.equipment.toLowerCase().includes(t),
    ).slice(0, 7);
  }, [q, library]);

  const toggle = () => {
    if (!open) { setDraft(session); skipSave.current = true; }
    setOpen((v) => !v);
    setMenu(false);
  };
  const patch = (id: string, p: Partial<CalEx>) =>
    setDraft((d) => ({ ...d, items: d.items.map((e) => (e.id === id ? { ...e, ...p } : e)) }));
  const lbl = labels(draft.items);

  const closeMenu = () => {
    setMenu(false);
    setConfirmDel(false);
    setRepeat(false);
  };

  const menuEl = (
      <div className="relative">
        <button
          type="button"
          aria-label={`Opciones de ${session.name}`}
          onClick={() => setMenu((v) => !v)}
          className="cursor-pointer"
          style={{ background: "none", border: "none", padding: 0 }}
        >
          <MoreHorizontal size={14} color="#CBD5E1" />
        </button>
        {menu ? (
          <>
            <div className="fixed inset-0" style={{ zIndex: 29 }} onClick={closeMenu} />
            <div style={menuBox}>
              {repeat ? (
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Repetir sesión</span>
                  <div className="flex items-center" style={{ gap: 6, fontSize: 12, color: "#374151" }}>
                    Cada
                    <select
                      value={every}
                      onChange={(e) => setEvery(Number(e.target.value))}
                      aria-label="Frecuencia"
                      style={{ height: 28, border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12 }}
                    >
                      <option value={1}>semana</option>
                      <option value={2}>2 semanas</option>
                    </select>
                  </div>
                  <div className="flex items-center" style={{ gap: 6, fontSize: 12, color: "#374151" }}>
                    durante
                    <input value={times} onChange={(e) => setTimes(e.target.value)} aria-label="Veces" style={numIn(40)} />
                    veces
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onRepeat(every, Math.max(1, Math.min(24, Number(times) || 1)));
                      closeMenu();
                    }}
                    className="cursor-pointer"
                    style={{ height: 30, borderRadius: 8, border: "none", backgroundColor: "#111827", color: "#FFFFFF", fontSize: 12, fontWeight: 500 }}
                  >
                    Crear repeticiones
                  </button>
                </div>
              ) : (
                <>
                  <MenuItem icon={<Edit2 size={12} color="#94A3B8" />} label="Editar en detalle" onClick={() => { closeMenu(); onEditDetail(); }} />
                  <MenuItem icon={<Copy size={12} color="#94A3B8" />} label="Copiar sesión" onClick={() => { closeMenu(); onCopy(); }} />
                  <MenuItem icon={<RefreshCw size={12} color="#94A3B8" />} label="Repetir" onClick={() => setRepeat(true)} />
                  <Divider />
                  {session.status === "draft" ? (
                    <MenuItem icon={<Send size={12} color="#22C55E" />} label="Publicar" color="#22C55E" onClick={() => { closeMenu(); onChange({ ...session, status: "published" }); }} />
                  ) : null}
                  {session.status === "published" ? (
                    <MenuItem icon={<EyeOff size={12} color="#94A3B8" />} label="Retirar publicación" onClick={() => { closeMenu(); onChange({ ...session, status: "draft" }); }} />
                  ) : null}
                  {session.status !== "done" ? <Divider /> : null}
                  {confirmDel ? (
                    <div className="flex items-center justify-between" style={{ padding: "6px 10px", fontSize: 12, color: "#EF4444" }}>
                      ¿Eliminar sesión?
                      <button
                        type="button"
                        onClick={() => { closeMenu(); onDelete(); }}
                        className="cursor-pointer"
                        style={{ border: "none", borderRadius: 6, backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: 11, padding: "3px 10px" }}
                      >
                        Sí
                      </button>
                    </div>
                  ) : (
                    <MenuItem icon={<Trash2 size={12} color="#EF4444" />} label="Eliminar" color="#EF4444" onClick={() => setConfirmDel(true)} />
                  )}
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
  );

  const header = (
    <div className="flex items-start" style={{ gap: 4 }}>
      <div className="min-w-0 flex-1">
        {open ? (
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            aria-label="Nombre de la sesión"
            className="w-full bg-transparent outline-none"
            style={{ fontSize: 13, fontWeight: 700, color: "#111827", border: "none" }}
          />
        ) : (
          <div className="truncate" style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
            {session.name}
          </div>
        )}
        <div style={{ fontSize: 10, color: "#94A3B8" }}>
          {session.field
            ? `Campo · ${session.field.effort} · ${session.minutes} min`
            : `${exCount(open ? draft : session)} ejercicios · ${session.minutes} min`}
        </div>
      </div>
      {open && saved ? <span style={{ fontSize: 10, color: "#94A3B8", whiteSpace: "nowrap" }}>Guardado ✓</span> : null}
      <button
        type="button"
        aria-label={open ? "Contraer sesión" : "Expandir sesión"}
        onClick={toggle}
        className="cursor-pointer"
        style={{ background: "none", border: "none", padding: 0 }}
      >
        {open ? <ChevronUp size={12} color="#CBD5E1" /> : <ChevronDown size={12} color="#CBD5E1" />}
      </button>
      {menuEl}
    </div>
  );

  const card: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderLeft: `3px solid ${border}`,
    borderRadius: 8,
    padding: "8px 10px",
  };

  const openEditor = () => {
    skipSave.current = true;
    setDraft(session);
    setOpen(true);
    setMenu(false);
  };
  const dense = (
    <DenseSessionBlock
      name={session.name}
      status={session.status}
      rows={session.field ? fieldRows(session) : denseRows(session)}
      menu={menuEl}
      onOpen={openEditor}
    />
  );

  if (!open) return <div onPointerDown={stop}>{dense}</div>;

  return (
    <div ref={rootRef} className="relative" onPointerDown={stop}>
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #CBD5E1",
          borderLeft: `3px solid ${border}`,
          borderRadius: 6,
          padding: 10,
          width: "100%",
        }}
      >
        {header}
        <div className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as DaySession["status"] })}
            aria-label="Estado de la sesión"
            style={{ border: "1px solid #E2E8F0", borderRadius: 6, height: 26, padding: "0 8px", fontSize: 11, color: "#374151", backgroundColor: "#FFFFFF" }}
          >
            <option value="draft">Borrador</option>
            <option value="published">Publicada</option>
            <option value="done">Completada</option>
          </select>
          {saved ? <span style={{ fontSize: 10, color: "#94A3B8" }}>Guardado</span> : null}
        </div>
        <div className="flex flex-col" style={{ marginTop: 10 }}>
          {draft.field ? (
            <div style={{ fontSize: 12, color: "#374151", display: "flex", flexDirection: "column", gap: 4 }}>
              <span>{`${draft.field.distance || "—"} ${draft.field.unit} · ${draft.field.duration || "—"} min · RPE ${draft.field.rpe}/10`}</span>
              {draft.field.intervals?.map((iv, i) => (
                <span key={i} style={{ color: "#94A3B8", fontSize: 11 }}>{`${iv.reps} × ${iv.len} a RPE ${iv.zone} con ${iv.rest} min`}</span>
              ))}
              {draft.field.instructions ? <span style={{ color: "#94A3B8", fontSize: 11 }}>{draft.field.instructions}</span> : null}
            </div>
          ) : (
            <>
              {draft.items.map((e, i) => {
                const l = lbl[i]!;
                return (
                  <div key={e.id}>
                    {i > 0 ? (
                      <button
                        type="button"
                        aria-label={e.chain ? "Desencadenar" : "Encadenar con el anterior"}
                        onClick={() => patch(e.id, { chain: !e.chain })}
                        className={`cursor-pointer ${e.chain ? "text-[#3B82F6]" : "text-[#CBD5E1] hover:text-[#3B82F6]"}`}
                        style={{ background: "none", border: "none", padding: "0 0 0 6px", lineHeight: 0 }}
                      >
                        <Link2 size={10} />
                      </button>
                    ) : null}
                    <div
                      className="flex flex-wrap items-center"
                      style={{
                        gap: 5,
                        rowGap: 3,
                        padding: "4px 0 4px 6px",
                        borderLeft: l.super ? "2px solid #3B82F6" : "2px solid transparent",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: l.super ? "#3B82F6" : "#94A3B8", minWidth: 15 }}>{l.label}</span>
                      <span className="min-w-0 truncate" style={{ fontSize: 11, fontWeight: 600, color: "#374151", flex: "1 1 calc(100% - 30px)" }}>{e.name}</span>
                      <input value={e.sets} onChange={(ev) => patch(e.id, { sets: ev.target.value })} aria-label="Series" placeholder="4" style={numIn(28)} />
                      <span style={{ fontSize: 11, color: "#94A3B8" }}>×</span>
                      <input value={e.reps} onChange={(ev) => patch(e.id, { reps: ev.target.value })} aria-label="Repeticiones" placeholder="5" style={numIn(28)} />
                      <span style={{ fontSize: 11, color: "#94A3B8" }}>×</span>
                      <input value={e.weight} placeholder="—" onChange={(ev) => patch(e.id, { weight: ev.target.value })} aria-label="Peso" style={numIn(34)} />
                      <span style={{ fontSize: 10, color: "#94A3B8" }}>kg</span>
                      <button
                        type="button"
                        aria-label="Eliminar ejercicio"
                        onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((x) => x.id !== e.id) }))}
                        className="cursor-pointer text-[#CBD5E1] hover:text-[#EF4444]"
                        style={{ background: "none", border: "none", padding: 0 }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {draft.circuits.map((c, ci) => (
                <div key={ci} style={{ borderLeft: "3px solid #D97706", backgroundColor: "#FFFDF7", borderRadius: 8, padding: "4px 8px", marginTop: 6 }}>
                  <div className="flex items-center" style={{ gap: 6, padding: "4px 0" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#D97706" }}>{`C${ci + 1}`}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#D97706", backgroundColor: "#FFFBEB", borderRadius: 4, padding: "2px 6px" }}>{c.type}</span>
                    <span className="min-w-0 flex-1 truncate" style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{c.name || "Circuito"}</span>
                    <span style={{ fontSize: 10, color: "#D97706", whiteSpace: "nowrap" }}>{circuitTimerLabel(c)}</span>
                    <button type="button" aria-label="Editar circuito" onClick={() => setCircuitModal({ index: ci })} className="cursor-pointer text-[#CBD5E1] hover:text-[#111827]" style={{ background: "none", border: "none", padding: 0 }}>
                      <Edit2 size={11} />
                    </button>
                    <button type="button" aria-label="Eliminar circuito" onClick={() => setDraft((d) => ({ ...d, circuits: d.circuits.filter((_, i) => i !== ci) }))} className="cursor-pointer text-[#CBD5E1] hover:text-[#EF4444]" style={{ background: "none", border: "none", padding: 0 }}>
                      <Trash2 size={11} />
                    </button>
                    <button type="button" aria-label="Ver ejercicios del circuito" onClick={() => setExpC(expC === ci ? null : ci)} className="cursor-pointer" style={{ background: "none", border: "none", padding: 0 }}>
                      {expC === ci ? <ChevronUp size={12} color="#CBD5E1" /> : <ChevronDown size={12} color="#CBD5E1" />}
                    </button>
                  </div>
                  {expC === ci
                    ? c.exercises.map((e, ei) => (
                        <div key={ei} className="flex items-center" style={{ gap: 6, padding: "2px 0 2px 4px", fontSize: 11 }}>
                          <span style={{ fontWeight: 700, color: "#D97706", width: 20, fontSize: 10 }}>{`E${ei + 1}`}</span>
                          <span className="min-w-0 flex-1 truncate" style={{ color: "#374151" }}>{e.name}</span>
                          <span style={{ color: "#94A3B8" }}>{e.reps || "—"}</span>
                          <span style={{ color: "#94A3B8", width: 36, textAlign: "right" }}>{e.weight ? `${e.weight} ${e.unit}` : "—"}</span>
                        </div>
                      ))
                    : null}
                </div>
              ))}

              <div className="relative">
                <button type="button" onClick={() => { setPicker(true); setQ(""); }} className="flex cursor-pointer items-center text-[#94A3B8] hover:text-[#111827]" style={{ gap: 5, fontSize: 12, background: "none", border: "none", padding: "8px 0 2px" }}>
                  <Plus size={12} />ejercicio
                </button>
                {picker ? (
                  <>
                    <div className="fixed inset-0" style={{ zIndex: 21 }} onClick={() => setPicker(false)} />
                    <div style={{ position: "absolute", left: 0, top: 30, width: 260, zIndex: 22, backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: 6 }}>
                      <div className="relative" style={{ marginBottom: 4 }}>
                        <Search size={12} color="#CBD5E1" style={{ position: "absolute", left: 10, top: 10 }} />
                        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio…" aria-label="Buscar ejercicio" style={{ width: "100%", height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 8px 0 28px", fontSize: 12, outline: "none" }} />
                      </div>
                      {results.map((r) => (
                        <button key={r.name} type="button" onClick={() => { setDraft((d) => ({ ...d, items: [...d.items, newEx(r.name)] })); setPicker(false); }} className="flex w-full cursor-pointer flex-col rounded-[6px] text-left hover:bg-[#F8FAFC]" style={{ padding: "6px 8px", background: "none", border: "none" }}>
                          <span style={{ fontSize: 12, color: "#111827" }}>{r.name}</span>
                          <span style={{ fontSize: 10, color: "#94A3B8" }}>{`${r.pattern} · ${r.equipment}`}</span>
                        </button>
                      ))}
                      {results.length === 0 ? <span style={{ fontSize: 12, color: "#94A3B8", padding: 8, display: "block" }}>Sin resultados</span> : null}
                    </div>
                  </>
                ) : null}
              </div>
              <button type="button" onClick={() => setCircuitModal({ index: null })} className="flex cursor-pointer items-center text-[#94A3B8] hover:text-[#111827]" style={{ gap: 5, fontSize: 12, background: "none", border: "none", padding: "6px 0" }}>
                <Plus size={12} />circuito
              </button>
            </>
          )}
        </div>
        <div className="flex items-center" style={{ gap: 8, paddingTop: 6, marginTop: 6, borderTop: "1px solid #F8FAFC" }}>
          <button type="button" onClick={onEditDetail} className="cursor-pointer" style={{ fontSize: 11, color: "#94A3B8", background: "none", border: "none", padding: 0 }}>
            Editar en detalle
          </button>
        </div>
      </div>
      <CircuitModal
        open={circuitModal !== null}
        mode={circuitModal?.index === null ? "create" : "edit"}
        initial={circuitModal && circuitModal.index !== null ? draft.circuits[circuitModal.index] ?? null : null}
        onClose={() => setCircuitModal(null)}
        onSubmit={(cfg) => {
          const idx = circuitModal?.index ?? null;
          setDraft((d) => ({
            ...d,
            circuits: idx === null ? [...d.circuits, cfg] : d.circuits.map((c, i) => (i === idx ? cfg : c)),
          }));
          setCircuitModal(null);
        }}
      />
    </div>
  );
}

export function SessionTypePicker({
  alignRight,
  onClose,
  onStrength,
  onField,
  onLibrary,
}: {
  alignRight: boolean;
  onClose: () => void;
  onStrength: () => void;
  onField: () => void;
  onLibrary: () => void;
}) {
  const opt = (icon: React.ReactNode, title: string, sub: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-center text-left transition-colors hover:border-[#111827]" style={{ gap: 10, padding: "10px 12px", borderRadius: 9, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}>
      <span className="flex shrink-0 items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#F1F5F9" }}>{icon}</span>
      <span className="flex flex-col">
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>{title}</span>
        <span style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap" }}>{sub}</span>
      </span>
    </button>
  );
  return (
    <>
      <div className="fixed inset-0" style={{ zIndex: 24 }} onClick={onClose} />
      <div onPointerDown={stop} style={{ position: "absolute", top: 6, ...(alignRight ? { right: 6 } : { left: 6 }), minWidth: 220, zIndex: 25, backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 2 }}>¿Qué tipo de sesión?</span>
        {opt(<Dumbbell size={18} color="#94A3B8" />, "Sesión de fuerza", "Ejercicios con series y reps", onStrength)}
        {opt(<Activity size={18} color="#94A3B8" />, "Sesión de campo", "Velocidad, resistencia, aeróbico", onField)}
        <div style={{ height: 1, backgroundColor: "#F1F5F9" }} />
        <button type="button" onClick={onLibrary} className="flex cursor-pointer items-center rounded-[8px] hover:bg-[#F8FAFC]" style={{ gap: 8, padding: "8px 12px", fontSize: 12, color: "#374151", background: "none", border: "none" }}>
          <BookOpen size={12} color="#94A3B8" />Elegir sesión guardada
        </button>
      </div>
    </>
  );
}

export { AerobicEditor } from "@/components/togo/FieldSessionEditor";
