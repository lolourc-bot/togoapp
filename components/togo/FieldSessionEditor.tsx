import { useRef, useState } from "react";
import { maskMinSec } from "@/lib/time-mask";
import {
  Activity,
  ArrowDown,
  Bike,
  Copy,
  Footprints,
  GripVertical,
  MoreHorizontal,
  PauseCircle,
  Plus,
  Trash2,
  Waves,
  X,
  Zap,
} from "lucide-react";
import type { DaySession } from "@/components/togo/AthleteSessionCard";

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

type Sport = "Correr" | "Bici" | "Natación" | "Remo" | "Otro";
function OarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="19" y2="5" />
      <path d="M19 5 C21 3 22 5 20 7 L17 10 L14 7 Z" />
      <line x1="5" y1="19" x2="3" y2="21" />
    </svg>
  );
}
const SPORTS: { id: Sport; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "Correr", icon: Footprints },
  { id: "Bici", icon: Bike },
  { id: "Natación", icon: Waves },
  { id: "Remo", icon: OarIcon },
  { id: "Otro", icon: MoreHorizontal },
];
const TYPES = ["Continuo extensivo", "Continuo progresivo", "Fartlek", "Intervalos", "Series", "Custom"] as const;
type TType = (typeof TYPES)[number];

type Units = { dist: "km" | "m"; pace: string; paceLabel: string; cadence: string | null };
function unitsFor(s: Sport, bikePower: boolean): Units {
  switch (s) {
    case "Bici":
      return { dist: "km", pace: bikePower ? "W" : "km/h", paceLabel: bikePower ? "Potencia" : "Velocidad", cadence: "RPM" };
    case "Natación":
      return { dist: "m", pace: "min/100m", paceLabel: "Ritmo", cadence: null };
    case "Remo":
      return { dist: "m", pace: "min/500m", paceLabel: "Ritmo", cadence: "gpm" };
    case "Otro":
      return { dist: "km", pace: "min/km", paceLabel: "Ritmo", cadence: null };
    default:
      return { dist: "km", pace: "min/km", paceLabel: "Ritmo", cadence: "ppm" };
  }
}

const rpeColor = (v: number) => (v <= 3 ? "#22C55E" : v <= 6 ? "#EAB308" : "#EF4444");
const n = (v: string) => Number(String(v).replace(",", ".")) || 0;
const fmtPace = (minPerUnit: number) =>
  `${Math.floor(minPerUnit)}:${String(Math.round((minPerUnit % 1) * 60)).padStart(2, "0")}`;

type IntSet = { reps: string; workVal: string; workUnit: "min" | "km" | "m"; pace: string; rpe: number; rest: string; restType: string };
const EFFORT_TYPES = ["Continuo", "Progresivo", "Fartlek", "Pasadas", "Técnica", "Libre"] as const;
type EffortExtra = {
  etype?: (typeof EFFORT_TYPES)[number];
  pace2?: string;
  rpe2?: number;
  dist2?: string;
  fastMin?: string;
  fastPace?: string;
  slowMin?: string;
  slowPace?: string;
  reps?: string;
  restVal?: string;
  restType?: string;
};
type Block =
  | ({ id: string; kind: "effort"; name: string; mode: "Tiempo" | "Distancia"; val: string; unit: string; pace: string; rpe: number; desc: string } & EffortExtra)
  | { id: string; kind: "pause"; val: string; unit: "min" | "seg"; type: string };
type Tramo = { from: string; to: string; pace: string; rpe: string };

type EditorState = {
  sport: Sport;
  bikePower: boolean;
  stroke: string;
  type: TType;
  distance: string;
  duration: string;
  rpe: number;
  instructions: string;
  prog: { start: string; startRpe: string; end: string; endRpe: string; by: string; tramos: Tramo[] };
  fart: { fastMin: string; fastPace: string; fastRpe: number; easyMin: string; easyPace: string; easyRpe: number };
  warm: { on: boolean; min: string };
  cool: { on: boolean; min: string };
  sets: IntSet[];
  blocks: Block[];
};

const uid = () => Math.random().toString(36).slice(2, 9);
const defaults = (): EditorState => ({
  sport: "Correr",
  bikePower: false,
  stroke: "Crol",
  type: "Continuo extensivo",
  distance: "",
  duration: "",
  rpe: 5,
  instructions: "",
  prog: { start: "", startRpe: "Suave", end: "", endRpe: "Fuerte", by: "Km", tramos: [] },
  fart: { fastMin: "2", fastPace: "", fastRpe: 8, easyMin: "4", easyPace: "", easyRpe: 3 },
  warm: { on: true, min: "10" },
  cool: { on: true, min: "10" },
  sets: [{ reps: "6", workVal: "3", workUnit: "min", pace: "", rpe: 8, rest: "2", restType: "Trote" }],
  blocks: [
    { id: uid(), kind: "effort", name: "Entrada en calor", mode: "Tiempo", val: "10", unit: "min", pace: "", rpe: 3, desc: "" },
    { id: uid(), kind: "pause", val: "2", unit: "min", type: "Marcha" },
    { id: uid(), kind: "effort", name: "", mode: "Tiempo", val: "20", unit: "min", pace: "", rpe: 7, desc: "" },
  ],
});

// ---------- small UI helpers ----------
const labelCss: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 };
const small: React.CSSProperties = { height: 34, borderRadius: 8, border: "1px solid #E2E8F0", padding: "0 8px", fontSize: 13, fontWeight: 600, color: "#111827", outline: "none", textAlign: "center", minWidth: 0 };
const unitTxt: React.CSSProperties = { fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap" };

function Chip({ on, label, onClick, dense }: { on: boolean; label: string; onClick: () => void; dense?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        border: "1px solid",
        borderColor: on ? "#111827" : "#E2E8F0",
        backgroundColor: on ? "#111827" : "#FFFFFF",
        color: on ? "#FFFFFF" : "#374151",
        borderRadius: 8,
        padding: dense ? "4px 10px" : "7px 14px",
        fontSize: dense ? 11 : 12,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Rpe({ value, onChange, size = 30 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <div className="flex" style={{ gap: 5 }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-label={`RPE ${v}`}
          style={{
            width: size,
            height: size,
            borderRadius: 999,
            border: "1px solid",
            borderColor: value === v ? rpeColor(v) : "#E2E8F0",
            backgroundColor: value === v ? rpeColor(v) : "#FFFFFF",
            color: value === v ? "#FFFFFF" : "#374151",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function BigField({ label, value, onChange, unit, readOnly }: { label: string; value: string; onChange?: (v: string) => void; unit: string; readOnly?: boolean }) {
  return (
    <label className="flex flex-col" style={{ gap: 6, fontSize: 12, fontWeight: 500, color: "#374151", minWidth: 0 }}>
      {label}
      <div className="flex items-center" style={{ height: 52, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 14px", gap: 6, backgroundColor: readOnly ? "#F8FAFC" : "#FFFFFF" }}>
        <input
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          inputMode="decimal"
          placeholder={readOnly ? "—" : "0"}
          style={{ border: "none", outline: "none", background: "transparent", fontSize: 20, fontWeight: 700, color: readOnly ? "#64748B" : "#111827", width: "100%", minWidth: 0 }}
        />
        <span style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>{unit}</span>
      </div>
    </label>
  );
}

function Instructions({ value, onChange, h = 80, label = "Instrucciones", placeholder = "Describí el ritmo, referencias de esfuerzo…" }: { value: string; onChange: (v: string) => void; h?: number; label?: string; placeholder?: string }) {
  return (
    <label className="flex flex-col" style={{ gap: 6, fontSize: 12, fontWeight: 500, color: "#374151" }}>
      {label}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ height: h, border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#111827", resize: "vertical", outline: "none" }} />
    </label>
  );
}

function TrashBtn({ onClick, size = 12 }: { onClick: () => void; size?: number }) {
  return (
    <button type="button" aria-label="Eliminar" onClick={onClick} className="text-[#CBD5E1] hover:text-[#EF4444]" style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0 }}>
      <Trash2 size={size} />
    </button>
  );
}

// ---------- main ----------
export function AerobicEditor({
  dateLabel,
  initial,
  onClose,
  onSave,
  onDuplicate,
  onDelete,
}: {
  dateLabel: string;
  initial?: DaySession;
  onClose: () => void;
  onSave: (s: DaySession) => void;
  /** Opcionales: cuando se pasan, aparecen como acciones extra en el header (editar sesión existente). */
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  const f0 = initial?.field;
  const [name, setName] = useState(initial?.name ?? "");
  const [st, setSt] = useState<EditorState>(() => {
    const saved = (f0 as { editor?: EditorState } | undefined)?.editor;
    if (saved) return saved;
    const d = defaults();
    if (f0) {
      d.distance = f0.distance;
      d.duration = f0.duration;
      d.rpe = f0.rpe;
      d.instructions = f0.instructions;
      if (f0.intervals?.length) {
        d.type = "Intervalos";
        d.sets = f0.intervals.map((i) => ({ reps: i.reps, workVal: String(parseFloat(i.len) || ""), workUnit: "min", pace: "", rpe: i.zone, rest: String(parseFloat(i.rest) || ""), restType: "Trote" }));
      } else if (/fartlek/i.test(f0.effort)) d.type = "Fartlek";
    }
    return d;
  });
  const [status, setStatus] = useState<DaySession["status"]>(initial?.status ?? "draft");
  const [strava, setStrava] = useState(true);
  const set = <K extends keyof EditorState>(k: K, v: EditorState[K]) => setSt((s) => ({ ...s, [k]: v }));
  const u = unitsFor(st.sport, st.bikePower);

  // auto pace / speed for continuous
  const distKm = n(st.distance) * (u.dist === "m" ? 0.001 : 1);
  const mins = n(st.duration);
  const autoPace = (() => {
    if (!distKm || !mins) return "";
    if (st.sport === "Bici") return st.bikePower ? "" : (distKm / (mins / 60)).toFixed(1).replace(".", ",");
    if (st.sport === "Natación") return fmtPace(mins / (distKm * 10));
    if (st.sport === "Remo") return fmtPace(mins / (distKm * 2));
    return fmtPace(mins / distKm);
  })();

  const topRow = (third = true) => (
    <div className="grid" style={{ gridTemplateColumns: third ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
      <BigField label="Distancia" value={st.distance} onChange={(v) => set("distance", v)} unit={u.dist} />
      <BigField label={st.type === "Continuo progresivo" ? "Duración total" : "Duración"} value={st.duration} onChange={(v) => set("duration", v)} unit="min" />
      {third && <BigField label={st.type === "Continuo progresivo" ? `${u.paceLabel} prom.` : u.paceLabel} value={autoPace} readOnly unit={u.pace} />}
    </div>
  );

  // ----- interval / series -----
  const isSeries = st.type === "Series";
  const setSet = (i: number, patch: Partial<IntSet>) => set("sets", st.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const intTotals = (() => {
    let work = 0, rest = 0, vol = 0;
    for (const s of st.sets) {
      const r = n(s.reps);
      const w = n(s.workVal);
      if (s.workUnit === "min") {
        work += r * w;
        const p = n(s.pace.split(":")[0] ?? "") + n(s.pace.split(":")[1] ?? "0") / 60;
        if (p && st.sport !== "Bici") vol += (r * w) / p;
      } else vol += r * w * (s.workUnit === "m" ? 0.001 : 1);
      rest += r * n(s.rest);
    }
    const w0 = st.warm.on ? n(st.warm.min) : 0;
    const c0 = st.cool.on ? n(st.cool.min) : 0;
    return { work, rest, ratio: work ? (rest / work).toFixed(1).replace(".", ",") : "—", vol: vol.toFixed(1).replace(".", ","), total: work + rest + w0 + c0 };
  })();

  const wcRow = (key: "warm" | "cool", label: string) => (
    <div className="flex items-center" style={{ gap: 8 }}>
      <input type="checkbox" checked={st[key].on} onChange={(e) => set(key, { ...st[key], on: e.target.checked })} aria-label={label} style={{ accentColor: "#111827" }} />
      <span style={{ fontSize: 12, color: "#94A3B8", width: 110 }}>{label}</span>
      <input value={st[key].min} disabled={!st[key].on} onChange={(e) => set(key, { ...st[key], min: e.target.value })} inputMode="numeric" style={{ ...small, width: 64, opacity: st[key].on ? 1 : 0.4 }} />
      <span style={unitTxt}>min</span>
    </div>
  );

  const intervalsUI = (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {wcRow("warm", "Entrada en calor")}
      <div className="flex flex-col" style={{ gap: 10 }}>
        {st.sets.map((s, i) => (
          <div key={i} className="flex flex-col" style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", gap: 8 }}>
            <div className="flex items-center" style={{ gap: 10 }}>
              <span style={{ fontSize: 14, color: "#94A3B8" }}>×</span>
              <input value={s.reps} onChange={(e) => setSet(i, { reps: e.target.value })} inputMode="numeric" aria-label="Repeticiones" style={{ ...small, width: 40, fontSize: 16, fontWeight: 700 }} />
              <span style={{ fontSize: 12, color: "#94A3B8" }}>{isSeries ? "series" : "repeticiones"}</span>
              <span style={{ marginLeft: "auto" }}>
                <TrashBtn size={11} onClick={() => set("sets", st.sets.filter((_, j) => j !== i))} />
              </span>
            </div>
            <div className="flex flex-wrap items-center" style={{ gap: 8, paddingLeft: 8 }}>
              <span style={{ fontSize: 11, color: "#94A3B8", width: 52 }}>Trabajo:</span>
              <input value={s.workVal} onChange={(e) => setSet(i, { workVal: e.target.value })} inputMode="decimal" style={{ ...small, width: s.workUnit === "min" ? 56 : 64 }} />
              <select value={s.workUnit} onChange={(e) => setSet(i, { workUnit: e.target.value as IntSet["workUnit"] })} aria-label="Unidad" style={{ height: 28, border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 11 }}>
                <option value="min">min</option>
                <option value="km">km</option>
                <option value="m">m</option>
              </select>
              <input value={s.pace} onChange={(e) => setSet(i, { pace: e.target.value })} placeholder={isSeries ? "Obj." : "—"} aria-label={isSeries ? "Objetivo de ritmo" : u.paceLabel} style={{ ...small, width: 72 }} />
              <span style={unitTxt}>{u.pace}</span>
              <div className="flex" style={{ gap: 3 }}>
                {[2, 4, 6, 8, 10].map((v) => (
                  <button key={v} type="button" onClick={() => setSet(i, { rpe: v })} aria-label={`RPE ${v}`} style={{ width: 20, height: 20, borderRadius: 999, border: "1px solid", borderColor: s.rpe === v ? rpeColor(v) : "#E2E8F0", backgroundColor: s.rpe === v ? rpeColor(v) : "#FFFFFF", color: s.rpe === v ? "#FFFFFF" : "#64748B", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>{v}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center" style={{ gap: 8, paddingLeft: 8 }}>
              <span style={{ fontSize: 11, color: "#94A3B8", width: 52 }}>{isSeries ? "Recup.:" : "Descanso:"}</span>
              <input value={s.rest} onChange={(e) => setSet(i, { rest: e.target.value })} inputMode="decimal" style={{ ...small, width: 56 }} />
              <span style={unitTxt}>min</span>
              {["Pasivo", "Trote", "Marcha"].map((t) => (
                <Chip key={t} dense on={s.restType === t} label={t} onClick={() => setSet(i, { restType: t })} />
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("sets", [...st.sets, { reps: "4", workVal: isSeries ? "1" : "3", workUnit: isSeries ? "km" : "min", pace: "", rpe: 8, rest: "2", restType: "Trote" }])}
          className="flex items-center justify-center text-[#94A3B8] hover:border-[#CBD5E1] hover:text-[#374151]"
          style={{ height: 36, width: "100%", border: "1px dashed #E2E8F0", borderRadius: 8, fontSize: 12, gap: 6, background: "none", cursor: "pointer" }}
        >
          <Plus size={11} /> Agregar serie
        </button>
      </div>
      {wcRow("cool", "Vuelta a la calma")}
      <div className="flex flex-wrap" style={{ backgroundColor: "#F8FAFC", borderRadius: 8, padding: "10px 14px", gap: 16, fontSize: 11, color: "#374151" }}>
        <span>Total trabajo: {intTotals.work}min</span>
        <span>{isSeries ? "Total recuperación" : "Total descanso"}: {intTotals.rest}min</span>
        <span>Ratio 1:{intTotals.ratio}</span>
        <span>Vol. total: {intTotals.vol}km</span>
      </div>
      <Instructions value={st.instructions} onChange={(v) => set("instructions", v)} />
    </div>
  );

  // ----- custom blocks -----
  const dragFrom = useRef<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const updBlock = (id: string, patch: Partial<Block>) => set("blocks", st.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  const newEffort = (): Block => ({ id: uid(), kind: "effort", name: "", mode: "Tiempo", val: "", unit: "min", pace: "", rpe: 5, desc: "" });
  const newPause = (): Block => ({ id: uid(), kind: "pause", val: "2", unit: "min", type: "Pasiva" });
  const insertAt = (i: number, b: Block) => set("blocks", [...st.blocks.slice(0, i), b, ...st.blocks.slice(i)]);
  const pauseTypes = ["Pasiva", "Marcha", "Trote suave", ...(st.sport === "Natación" ? ["Nado suave"] : []), ...(st.sport === "Bici" ? ["Pedaleo suave"] : [])];
  const blockTotals = (() => {
    let work = 0, rest = 0, dist = 0;
    for (const b of st.blocks) {
      if (b.kind === "pause") rest += n(b.val) / (b.unit === "seg" ? 60 : 1);
      else if (b.mode === "Tiempo") {
        const m = n(b.val) / (b.unit === "seg" ? 60 : 1);
        work += m;
        const [a, c] = b.pace.split(":");
        const p = n(a ?? "") + n(c ?? "0") / 60;
        if (p && st.sport !== "Bici") dist += m / p;
      } else dist += n(b.val) * (b.unit === "m" ? 0.001 : 1);
    }
    return { work: Math.round(work), rest: Math.round(rest), total: Math.round(work + rest), dist: dist.toFixed(1).replace(".", ",") };
  })();
  const blockColor = (r: number) => (r <= 3 ? "#93C5FD" : r <= 6 ? "#FACC15" : "#EF4444");
  const toggle2 = (opts: string[], v: string, on: (v: string) => void) => (
    <div className="flex" style={{ border: "1px solid #E2E8F0", borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
      {opts.map((o) => (
        <button key={o} type="button" onClick={() => on(o)} style={{ height: 26, padding: "0 7px", fontSize: 10, border: "none", backgroundColor: v === o ? "#111827" : "#FFFFFF", color: v === o ? "#FFFFFF" : "#64748B", cursor: "pointer" }}>{o}</button>
      ))}
    </div>
  );
  const connector = (i: number) => (
    <div className="relative flex justify-center" style={{ height: 24 }}>
      <div style={{ width: 0, height: "100%", borderLeft: "2px dashed #E2E8F0" }} />
      <button type="button" aria-label="Insertar bloque" onClick={() => insertAt(i, newEffort())} className="absolute text-[#94A3B8] hover:border-[#111827] hover:text-[#111827]" style={{ top: 0, width: 24, height: 24, borderRadius: 999, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", fontSize: 12, lineHeight: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Plus size={12} />
      </button>
    </div>
  );
  let effortIdx = 0;
  const customUI = (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div className="flex flex-col">
        {st.blocks.map((b, i) => {
          const dragProps = {
            onDragOver: (e: React.DragEvent) => {
              e.preventDefault();
              setDropAt(i);
            },
            onDrop: () => {
              const from = dragFrom.current;
              if (from == null || from === i) return setDropAt(null);
              const arr = [...st.blocks];
              const [m] = arr.splice(from, 1);
              if (m) arr.splice(i, 0, m);
              set("blocks", arr);
              dragFrom.current = null;
              setDropAt(null);
            },
          };
          const grip = (
            <span draggable onDragStart={() => (dragFrom.current = i)} onDragEnd={() => setDropAt(null)} style={{ cursor: "grab", lineHeight: 0 }} aria-label="Reordenar">
              <GripVertical size={13} color="#CBD5E1" />
            </span>
          );
          const line = dropAt === i && dragFrom.current !== i ? <div style={{ height: 2, backgroundColor: "#111827", borderRadius: 2, margin: "2px 0" }} /> : null;
          if (b.kind === "effort") effortIdx++;
          return (
            <div key={b.id}>
              {i > 0 && connector(i)}
              {line}
              {b.kind === "effort" ? (
                <div {...dragProps} style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", backgroundColor: "#FFFFFF" }}>
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
                    <span style={{ width: 8, height: 24, borderRadius: 4, backgroundColor: blockColor(b.rpe) }} />
                    <input value={b.name} onChange={(e) => updBlock(b.id, { name: e.target.value })} placeholder={`Bloque ${effortIdx} · Ej. Rodaje fuerte`} style={{ border: "none", background: "transparent", fontSize: 11, fontWeight: 600, color: "#374151", outline: "none", flex: 1, minWidth: 0 }} />
                    <span style={{ fontSize: 9, color: "#3B82F6", backgroundColor: "#EFF6FF", borderRadius: 20, padding: "2px 8px" }}>Esfuerzo</span>
                    {grip}
                    <TrashBtn onClick={() => set("blocks", st.blocks.filter((x) => x.id !== b.id))} />
                  </div>
                  <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: "#94A3B8", alignSelf: "center" }}>Tipo:</span>
                    {EFFORT_TYPES.map((t) => {
                      const on = (b.etype ?? "Continuo") === t;
                      return (
                        <button key={t} type="button" onClick={() => updBlock(b.id, { etype: t })} style={{ border: `1px solid ${on ? "#111827" : "#E2E8F0"}`, borderRadius: 6, padding: "5px 11px", fontSize: 11, fontWeight: 500, color: on ? "#FFFFFF" : "#374151", backgroundColor: on ? "#111827" : "#FFFFFF", cursor: "pointer", flexShrink: 0 }}>{t}</button>
                      );
                    })}
                  </div>
                  {(() => {
                    const et = b.etype ?? "Continuo";
                    const inp = (v: string | undefined, k: keyof EffortExtra, ph: string, w: number | string = "100%") => (
                      <input value={v ?? ""} onChange={(e) => updBlock(b.id, { [k]: ph === "0:00" ? maskMinSec(e.target.value, v ?? "") : e.target.value } as Partial<Block>)} inputMode={ph === "0:00" ? "numeric" : undefined} placeholder={ph} style={{ ...small, height: 36, fontSize: 13, textAlign: "left", padding: "0 10px", width: w }} />
                    );
                    const lbl = (t: string) => <span style={{ fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>{t}</span>;
                    const area = (ph: string) => (
                      <textarea value={b.desc} onChange={(e) => updBlock(b.id, { desc: e.target.value })} placeholder={ph} style={{ width: "100%", height: 56, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#374151", padding: 8, outline: "none", resize: "none", marginBottom: 10 }} />
                    );
                    const durOnly = (
                      <div className="flex items-center" style={{ gap: 6 }}>
                        {lbl("Duración")}
                        {inp(b.val, "val" as keyof EffortExtra, "0", 80)}
                        {toggle2(["min", "seg"], b.unit, (v) => updBlock(b.id, { unit: v, mode: "Tiempo" }))}
                      </div>
                    );
                    const durDist = (
                      <div className="flex flex-col" style={{ gap: 4 }}>
                        <div className="flex" style={{ gap: 10 }}>
                          {(["Tiempo", "Distancia"] as const).map((m) => (
                            <button key={m} type="button" onClick={() => updBlock(b.id, { mode: m, unit: m === "Tiempo" ? "min" : u.dist })} style={{ background: "none", border: "none", borderBottom: `1px solid ${b.mode === m ? "#111827" : "transparent"}`, fontSize: 10, color: b.mode === m ? "#111827" : "#94A3B8", padding: "0 0 2px", cursor: "pointer" }}>{m}</button>
                          ))}
                        </div>
                        <div className="flex items-center" style={{ gap: 6 }}>
                          <input value={b.val} onChange={(e) => updBlock(b.id, { val: e.target.value })} inputMode="decimal" placeholder="0" style={{ ...small, height: 40, fontSize: 14, textAlign: "left", padding: "0 10px", width: "100%" }} />
                          {toggle2(b.mode === "Tiempo" ? ["min", "seg"] : ["km", "m"], b.unit, (v) => updBlock(b.id, { unit: v }))}
                        </div>
                      </div>
                    );
                    if (et === "Técnica") return <>{area("Ej. Zancada alta, skiping, tobilleos…")}{durOnly}</>;
                    if (et === "Libre") return <>{area("Describí el esfuerzo libre…")}{durOnly}</>;
                    if (et === "Progresivo") {
                      const r2 = b.rpe2 ?? Math.min(10, b.rpe + 3);
                      return (
                        <>
                          {durDist}
                          <div className="flex items-center" style={{ gap: 6, marginTop: 10, padding: 8, borderRadius: 8, background: "linear-gradient(90deg, #F1F5F9, #CBD5E1)" }}>
                            {lbl("Ritmo inicio:")}
                            <input value={b.pace} onChange={(e) => updBlock(b.id, { pace: maskMinSec(e.target.value, b.pace) })} inputMode="numeric" placeholder="0:00" style={{ ...small, height: 32, width: 70 }} />
                            <span style={unitTxt}>{u.pace}</span>
                            <span style={{ color: "#64748B" }}>→</span>
                            {lbl("Ritmo final:")}
                            {inp(b.pace2, "pace2", "0:00", 70)}
                            <span style={unitTxt}>{u.pace}</span>
                          </div>
                          <div className="flex flex-col" style={{ gap: 6, marginTop: 10 }}>
                            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>RPE {b.rpe} → {r2}</span>
                            <div className="flex items-center" style={{ gap: 6 }}>{lbl("Desde")}<Rpe value={b.rpe} onChange={(v) => updBlock(b.id, { rpe: v })} size={22} /></div>
                            <div className="flex items-center" style={{ gap: 6 }}>{lbl("Hasta")}<Rpe value={r2} onChange={(v) => updBlock(b.id, { rpe2: v })} size={22} /></div>
                          </div>
                        </>
                      );
                    }
                    if (et === "Fartlek") {
                      const tramo = (t: string, dk: keyof EffortExtra, pk: keyof EffortExtra) => (
                        <div className="flex flex-col" style={{ gap: 4 }}>
                          {lbl(t)}
                          <div className="flex items-center" style={{ gap: 4 }}>
                            {inp(b[dk] as string | undefined, dk, "0", 48)}
                            {lbl("min a")}
                            {inp(b[pk] as string | undefined, pk, "0:00", 64)}
                            <span style={unitTxt}>{u.pace}</span>
                          </div>
                        </div>
                      );
                      return (
                        <>
                          <div className="grid grid-cols-2" style={{ gap: 10 }}>
                            <div className="flex items-center" style={{ gap: 6 }}>{lbl("Duración total")}{inp(b.val, "val" as keyof EffortExtra, "min (opc.)")}</div>
                            <div className="flex items-center" style={{ gap: 6 }}>{lbl("Distancia total")}{inp(b.dist2, "dist2", `${u.dist} (opc.)`)}</div>
                          </div>
                          <div className="grid grid-cols-2" style={{ gap: 10, marginTop: 10 }}>
                            {tramo("Tramos rápidos ~", "fastMin", "fastPace")}
                            {tramo("Tramos suaves ~", "slowMin", "slowPace")}
                          </div>
                          <div style={{ marginTop: 10 }}>{area("Cambiá el ritmo según cómo te sentís, sin estructura fija…")}</div>
                        </>
                      );
                    }
                    if (et === "Pasadas") {
                      const reps = n(b.reps ?? "") || 0;
                      const work = (n(b.val) / (b.unit === "seg" ? 60 : 1)) * reps;
                      const rec = n(b.restVal ?? "") * Math.max(0, reps - 1);
                      const [pa, pc] = b.pace.split(":");
                      const p = n(pa ?? "") + n(pc ?? "0") / 60;
                      const vol = b.mode === "Distancia" ? n(b.val) * (b.unit === "m" ? 0.001 : 1) * reps : p ? work / p : 0;
                      const sub = { paddingLeft: 12, borderLeft: "2px solid #E2E8F0", gap: 6 } as const;
                      return (
                        <>
                          <div className="flex items-center" style={{ gap: 6, marginBottom: 8 }}>
                            <input value={b.reps ?? ""} onChange={(e) => updBlock(b.id, { reps: e.target.value })} inputMode="numeric" placeholder="6" style={{ ...small, width: 40, height: 36, fontSize: 16, fontWeight: 700 }} />
                            <span style={{ fontSize: 12, color: "#94A3B8" }}>pasadas</span>
                          </div>
                          <div className="flex flex-wrap items-center" style={{ ...sub, marginBottom: 8 }}>
                            {lbl("Esfuerzo:")}
                            <input value={b.val} onChange={(e) => updBlock(b.id, { val: e.target.value })} placeholder="0" style={{ ...small, height: 32, width: 56 }} />
                            {toggle2(["min", "seg", "km", "m"], b.unit, (v) => updBlock(b.id, { unit: v, mode: v === "min" || v === "seg" ? "Tiempo" : "Distancia" }))}
                            <input value={b.pace} onChange={(e) => updBlock(b.id, { pace: e.target.value })} placeholder="Ritmo" style={{ ...small, height: 32, width: 64 }} />
                            <span style={unitTxt}>{u.pace}</span>
                            <div className="flex" style={{ gap: 4 }}>
                              {[2, 4, 6, 8, 10].map((r) => (
                                <button key={r} type="button" onClick={() => updBlock(b.id, { rpe: r })} style={{ width: 22, height: 22, borderRadius: 999, fontSize: 10, border: `1px solid ${b.rpe === r ? "#111827" : "#E2E8F0"}`, backgroundColor: b.rpe === r ? "#111827" : "#FFFFFF", color: b.rpe === r ? "#FFFFFF" : "#64748B", cursor: "pointer" }}>{r}</button>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center" style={sub}>
                            {lbl("Rec.:")}
                            {inp(b.restVal, "restVal", "0", 56)}
                            <span style={unitTxt}>min</span>
                            {["Pasivo", "Trote", "Marcha"].map((t) => {
                              const on = (b.restType ?? "Pasivo") === t;
                              return <button key={t} type="button" onClick={() => updBlock(b.id, { restType: t })} style={{ border: `1px solid ${on ? "#111827" : "#E2E8F0"}`, borderRadius: 6, padding: "4px 9px", fontSize: 11, backgroundColor: on ? "#111827" : "#FFFFFF", color: on ? "#FFFFFF" : "#374151", cursor: "pointer" }}>{t}</button>;
                            })}
                          </div>
                          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 8 }}>
                            Total trabajo: {Math.round(work)}min · Total rec.: {Math.round(rec)}min · Vol.: {vol.toFixed(1).replace(".", ",")}km
                          </div>
                        </>
                      );
                    }
                    return (
                      <>
                        <div className="grid grid-cols-2" style={{ gap: 10 }}>
                          {durDist}
                          <div className="flex flex-col" style={{ gap: 4 }}>
                            <span style={{ fontSize: 10, color: "#94A3B8", paddingBottom: 3 }}>{u.paceLabel}</span>
                            <div className="flex items-center" style={{ gap: 6 }}>
                              <input value={b.pace} onChange={(e) => updBlock(b.id, { pace: e.target.value })} placeholder="Opcional" style={{ ...small, height: 40, fontSize: 14, textAlign: "left", padding: "0 10px", width: "100%" }} />
                              <span style={unitTxt}>{u.pace}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <Rpe value={b.rpe} onChange={(v) => updBlock(b.id, { rpe: v })} size={26} />
                        </div>
                        <input value={b.desc} onChange={(e) => updBlock(b.id, { desc: e.target.value })} placeholder="Ej. Esfuerzo controlado, conversación posible…" style={{ marginTop: 10, width: "100%", border: "none", borderBottom: "1px solid #F1F5F9", fontSize: 12, color: "#64748B", padding: "4px 0", outline: "none", background: "transparent" }} />
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div {...dragProps} style={{ backgroundColor: "#F8FAFC", border: "1px dashed #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
                    <PauseCircle size={14} color="#CBD5E1" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>Pausa</span>
                    <span style={{ marginLeft: "auto", fontSize: 9, color: "#94A3B8", backgroundColor: "#F1F5F9", borderRadius: 20, padding: "2px 8px" }}>Recuperación</span>
                    {grip}
                    <TrashBtn onClick={() => set("blocks", st.blocks.filter((x) => x.id !== b.id))} />
                  </div>
                  <div className="flex flex-wrap items-center" style={{ gap: 12 }}>
                    <div className="flex items-center" style={{ gap: 6 }}>
                      <input value={b.val} onChange={(e) => updBlock(b.id, { val: e.target.value })} inputMode="decimal" style={{ ...small, height: 36, width: 64, backgroundColor: "#FFFFFF" }} />
                      {toggle2(["min", "seg"], b.unit, (v) => updBlock(b.id, { unit: v as "min" | "seg" }))}
                    </div>
                    <div className="flex flex-wrap" style={{ gap: 6 }}>
                      {pauseTypes.map((t) => (
                        <Chip key={t} dense on={b.type === t} label={t} onClick={() => updBlock(b.id, { type: t })} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {st.blocks.length > 0 && <div className="flex justify-center" style={{ height: 16 }}><div style={{ borderLeft: "2px dashed #E2E8F0" }} /></div>}
        <div className="flex" style={{ gap: 8 }}>
          <button type="button" onClick={() => set("blocks", [...st.blocks, newEffort()])} className="flex flex-1 items-center justify-center" style={{ height: 36, borderRadius: 8, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 12, fontWeight: 600, gap: 6, border: "none", cursor: "pointer" }}>
            <Activity size={12} /> Bloque de esfuerzo
          </button>
          <button type="button" onClick={() => set("blocks", [...st.blocks, newPause()])} className="flex flex-1 items-center justify-center" style={{ height: 36, borderRadius: 8, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", color: "#374151", fontSize: 12, gap: 6, cursor: "pointer" }}>
            <PauseCircle size={12} color="#94A3B8" /> Pausa
          </button>
        </div>
      </div>
      <div className="flex flex-wrap" style={{ position: "sticky", bottom: 0, backgroundColor: "#FFFFFF", borderTop: "1px solid #E2E8F0", padding: "10px 0", gap: 16, fontSize: 11, fontWeight: 500, color: "#374151" }}>
        <span>Duración total: {blockTotals.total} min</span>
        <span>Trabajo: {blockTotals.work} min</span>
        <span>Descanso: {blockTotals.rest} min</span>
        <span>Distancia estimada: {blockTotals.dist}km</span>
      </div>
      <Instructions h={72} label="Instrucciones generales" placeholder="Indicaciones generales, notas de ritmo o esfuerzo para toda la sesión…" value={st.instructions} onChange={(v) => set("instructions", v)} />
    </div>
  );

  // ----- progressive -----
  const P = st.prog;
  const setP = (patch: Partial<EditorState["prog"]>) => set("prog", { ...P, ...patch });
  const rpeChips = (v: string, on: (v: string) => void) => (
    <div className="flex" style={{ gap: 4 }}>
      {[{ l: "Suave", c: "#22C55E" }, { l: "Medio", c: "#EAB308" }, { l: "Fuerte", c: "#EF4444" }].map((o) => (
        <button key={o.l} type="button" onClick={() => on(o.l)} style={{ fontSize: 11, padding: "4px 9px", borderRadius: 6, border: "1px solid", borderColor: v === o.l ? o.c : "#E2E8F0", backgroundColor: v === o.l ? o.c : "#FFFFFF", color: v === o.l ? "#FFFFFF" : "#374151", cursor: "pointer" }}>{o.l}</button>
      ))}
    </div>
  );
  const progUI = (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {topRow()}
      <div className="flex flex-col" style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, gap: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Progresión de ritmo</span>
        {(["start", "end"] as const).map((k, idx) => (
          <div key={k}>
            {idx === 1 && <div className="flex justify-center" style={{ marginBottom: 14 }}><ArrowDown size={14} color="#CBD5E1" /></div>}
            <div className="flex items-center" style={{ gap: 12 }}>
              <span style={{ fontSize: 12, color: "#94A3B8", width: 44 }}>{k === "start" ? "Inicio:" : "Final:"}</span>
              <input value={P[k]} onChange={(e) => setP({ [k]: maskMinSec(e.target.value, P[k]) })} inputMode="numeric" placeholder="0:00" style={{ ...small, width: 80 }} />
              <span style={unitTxt}>{u.pace}</span>
              <span style={{ color: "#CBD5E1" }}>·</span>
              {rpeChips(k === "start" ? P.startRpe : P.endRpe, (v) => setP(k === "start" ? { startRpe: v } : { endRpe: v }))}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>Progresión por</span>
          {["Km", "Minutos", "Tramos libres"].map((o) => (
            <Chip key={o} dense on={P.by === o} label={o} onClick={() => setP({ by: o })} />
          ))}
        </div>
        {P.by === "Tramos libres" && (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {P.tramos.map((t, i) => {
              const upd = (patch: Partial<Tramo>) => setP({ tramos: P.tramos.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="flex flex-wrap items-center" style={{ gap: 8 }}>
                  <input value={t.from} onChange={(e) => upd({ from: e.target.value })} placeholder="0" style={{ ...small, width: 48 }} />
                  <span style={unitTxt}>a</span>
                  <input value={t.to} onChange={(e) => upd({ to: e.target.value })} placeholder="0" style={{ ...small, width: 48 }} />
                  <span style={unitTxt}>{u.dist}/min</span>
                  <input value={t.pace} onChange={(e) => upd({ pace: maskMinSec(e.target.value, t.pace) })} inputMode="numeric" placeholder="0:00" style={{ ...small, width: 64 }} />
                  <span style={unitTxt}>{u.pace}</span>
                  {rpeChips(t.rpe, (v) => upd({ rpe: v }))}
                  <TrashBtn onClick={() => setP({ tramos: P.tramos.filter((_, j) => j !== i) })} />
                </div>
              );
            })}
            <button type="button" onClick={() => setP({ tramos: [...P.tramos, { from: "", to: "", pace: "", rpe: "Medio" }] })} style={{ alignSelf: "flex-start", background: "none", border: "none", fontSize: 12, color: "#3B82F6", cursor: "pointer", padding: 0 }}>＋ Agregar tramo</button>
          </div>
        )}
      </div>
      <Instructions value={st.instructions} onChange={(v) => set("instructions", v)} />
    </div>
  );

  // ----- fartlek -----
  const F = st.fart;
  const setF = (patch: Partial<EditorState["fart"]>) => set("fart", { ...F, ...patch });
  const ratio = n(F.fastMin) && n(F.easyMin) ? `1:${(n(F.easyMin) / n(F.fastMin)).toFixed(1).replace(",0", "").replace(".0", "").replace(".", ",")}` : "—";
  const fartCol = (title: string, m: "fast" | "easy") => (
    <div className="flex flex-col" style={{ gap: 8, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: m === "fast" ? "#EF4444" : "#22C55E" }}>{title}</span>
      <div className="flex items-center" style={{ gap: 6 }}>
        <span style={unitTxt}>~</span>
        <input value={F[`${m}Min`]} onChange={(e) => setF({ [`${m}Min`]: e.target.value })} inputMode="decimal" style={{ ...small, width: 52 }} />
        <span style={unitTxt}>min</span>
        <input value={F[`${m}Pace`]} onChange={(e) => setF({ [`${m}Pace`]: maskMinSec(e.target.value, F[`${m}Pace`]) })} inputMode="numeric" placeholder="0:00" style={{ ...small, width: 60 }} />
        <span style={unitTxt}>{u.pace}</span>
      </div>
      <div className="flex items-center" style={{ gap: 6 }}>
        <span style={unitTxt}>RPE</span>
        <input value={String(F[`${m}Rpe`])} onChange={(e) => setF({ [`${m}Rpe`]: Math.min(10, Math.max(1, n(e.target.value) || 1)) })} inputMode="numeric" style={{ ...small, width: 44, borderColor: rpeColor(F[`${m}Rpe`]) }} />
        <span style={unitTxt}>/10</span>
      </div>
    </div>
  );
  const fartUI = (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {topRow(false)}
      <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
        <div className="flex items-baseline" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Cambios de ritmo</span>
          <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 6 }}>Sin estructura fija</span>
        </div>
        <div className="grid grid-cols-2" style={{ gap: 12 }}>
          {fartCol("Tramos rápidos", "fast")}
          {fartCol("Tramos suaves", "easy")}
        </div>
        <span style={{ display: "block", fontSize: 11, color: "#94A3B8", marginTop: 8 }}>Relación trabajo:recuperación {ratio}</span>
      </div>
      <Instructions h={100} placeholder="Describí las señales para cambiar el ritmo, referencias de terreno, sensación esperada…" value={st.instructions} onChange={(v) => set("instructions", v)} />
    </div>
  );

  const extUI = (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {topRow()}
      <div>
        <span style={labelCss}>Intensidad · RPE</span>
        <Rpe value={st.rpe} onChange={(v) => set("rpe", v)} />
      </div>
      <Instructions value={st.instructions} onChange={(v) => set("instructions", v)} />
    </div>
  );

  const body =
    st.type === "Continuo extensivo" ? extUI : st.type === "Continuo progresivo" ? progUI : st.type === "Fartlek" ? fartUI : st.type === "Custom" ? customUI : intervalsUI;

  const conn = (icon: React.ReactNode, label: string, on: boolean, toggle: () => void) => (
    <button type="button" onClick={toggle} className="flex cursor-pointer items-center" style={{ gap: 6, height: 34, padding: "0 12px", borderRadius: 8, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", fontSize: 12, color: "#374151" }}>
      {icon}
      {label}
      {on ? (
        <span className="flex items-center" style={{ gap: 4, color: "#94A3B8" }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: "#22C55E" }} />
          Conectado
        </span>
      ) : (
        <span style={{ color: "#3B82F6" }}>Conectar</span>
      )}
    </button>
  );

  const save = () => {
    const minutes =
      st.type === "Custom" ? blockTotals.total : st.type === "Intervalos" || st.type === "Series" ? intTotals.total : n(st.duration);
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim() || `${st.type} · ${st.sport}`,
      status,
      minutes: Math.round(minutes) || 45,
      items: [],
      circuits: [],
      field: {
        ...(f0 ?? {}),
        effort: st.type,
        distance: st.distance,
        unit: u.dist,
        duration: st.duration || String(Math.round(minutes) || ""),
        rpe: st.rpe,
        intervals:
          st.type === "Intervalos" || st.type === "Series"
            ? st.sets.map((s) => ({ reps: s.reps, len: `${s.workVal} ${s.workUnit}`, zone: s.rpe, rest: `${s.rest} min` }))
            : null,
        instructions: st.instructions,
        editor: st,
      } as NonNullable<DaySession["field"]>,
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 60, backgroundColor: "rgba(15,23,42,0.35)" }} onClick={onClose}>
      <div onClick={stop} onPointerDown={stop} onMouseDown={stop} role="dialog" aria-label="Sesión de campo" style={{ width: 600, maxWidth: "calc(100vw - 32px)", maxHeight: "92vh", overflowY: "auto", borderRadius: 16, backgroundColor: "#FFFFFF", boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}>
        {/* ZONA 1 */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "#0B1220", borderRadius: "16px 16px 0 0", padding: "18px 24px 0" }}>
          <div className="flex items-center" style={{ gap: 10, marginBottom: 14 }}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (opcional)"
              aria-label="Nombre de la sesión"
              className="placeholder:text-[rgba(255,255,255,0.4)]"
              style={{ flex: 1, minWidth: 0, border: "none", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 8, color: "#FFFFFF", fontSize: 16, fontWeight: 700, padding: "6px 12px", outline: "none" }}
            />
            <span style={{ backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>{dateLabel}</span>
            {onDuplicate ? (
              <button type="button" aria-label="Duplicar sesión" onClick={onDuplicate} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0 }}>
                <Copy size={16} color="rgba(255,255,255,0.5)" />
              </button>
            ) : null}
            {onDelete ? (
              <button type="button" aria-label="Borrar sesión" onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0 }}>
                <Trash2 size={16} color="rgba(255,255,255,0.5)" />
              </button>
            ) : null}
            <button type="button" aria-label="Cerrar" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0 }}>
              <X size={18} color="rgba(255,255,255,0.5)" />
            </button>
          </div>
          <div className="flex flex-wrap" style={{ gap: 4, paddingBottom: 10 }}>
            {SPORTS.map(({ id, icon: Icon }) => {
              const on = st.sport === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => set("sport", id)}
                  className={on ? "" : "hover:bg-[rgba(255,255,255,0.15)]"}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, backgroundColor: on ? "#FFFFFF" : "rgba(255,255,255,0.08)", color: on ? "#111827" : "rgba(255,255,255,0.65)", flexShrink: 0, whiteSpace: "nowrap" }}
                >
                  <Icon size={14} />
                  {id}
                </button>
              );
            })}
          </div>
        </div>

        {/* ZONA 2 */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #E2E8F0" }}>
          <span style={labelCss}>Tipo de entrenamiento</span>
          <div className="flex" style={{ gap: 8, overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none" }}>
            {TYPES.map((t) => (
              <Chip key={t} on={st.type === t} label={t} onClick={() => set("type", t)} />
            ))}
          </div>
          {(st.sport === "Bici" || st.sport === "Natación") && (
            <div className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "#94A3B8", marginRight: 4 }}>{st.sport === "Bici" ? "Medir por" : "Estilo"}</span>
              {st.sport === "Bici"
                ? [["Velocidad", false], ["Potencia", true]].map(([l, v]) => <Chip key={String(l)} dense on={st.bikePower === v} label={String(l)} onClick={() => set("bikePower", v as boolean)} />)
                : ["Crol", "Espalda", "Pecho", "Mariposa"].map((s) => <Chip key={s} dense on={st.stroke === s} label={s} onClick={() => set("stroke", s)} />)}
            </div>
          )}
        </div>

        {/* ZONA 3 */}
        <div style={{ padding: "20px 24px" }}>
          {body}
          {u.cadence && st.type !== "Custom" && (
            <span style={{ display: "block", marginTop: 10, fontSize: 10, color: "#94A3B8" }}>
              Cadencia en {u.cadence}
              {st.sport === "Remo" ? " · potencia en W" : ""} — se registra al importar la actividad.
            </span>
          )}
        </div>

        {/* ZONA 4 */}
        <div style={{ borderTop: "1px solid #E2E8F0", padding: "16px 24px" }}>
          <div className="flex flex-wrap items-center" style={{ gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Enviar a:</span>
            {conn(<Zap size={13} color="#E34402" />, "Strava", strava, () => setStrava((v) => !v))}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#94A3B8" }}>Los datos se importarán al completar.</span>
          </div>
          <div className="flex items-center" style={{ gap: 10 }}>
            <select value={status} onChange={(e) => setStatus(e.target.value as DaySession["status"])} aria-label="Estado" style={{ height: 36, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#374151", padding: "0 32px 0 12px", appearance: "none", WebkitAppearance: "none", backgroundColor: "#FFFFFF", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23CBD5E1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", cursor: "pointer" }}>
              <option value="draft">Borrador</option>
              <option value="published">Publicada</option>
              {status === "done" && <option value="done">Completada</option>}
            </select>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={onClose} style={{ height: 42, padding: "0 18px", borderRadius: 10, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", fontSize: 13, color: "#374151", cursor: "pointer" }}>Cancelar</button>
            <button type="button" onClick={save} style={{ height: 42, padding: "0 22px", borderRadius: 10, border: "none", backgroundColor: "#111827", color: "#FFFFFF", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
