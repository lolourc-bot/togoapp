import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X } from "lucide-react";

export type MktCoach = { name: string; spec: string; athletes: number; online: boolean; tags: string[]; mod: "Online" | "Presencial" | "Ambas"; price: number; years: number; days: string[] };
export type SortKey = "priceAsc" | "priceDesc" | "athletes" | "years";
export type MktFilters = { specs: string[]; mod: string | null; min: number; max: number; days: string[]; sort: SortKey };

export const PRICE_MAX = 50000;
export const EMPTY_FILTERS: MktFilters = { specs: [], mod: null, min: 0, max: PRICE_MAX, days: [], sort: "athletes" };
const MODS = ["Online", "Presencial", "Ambas"];
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const SORTS: { k: SortKey; l: string }[] = [
  { k: "athletes", l: "Más atletas" },
  { k: "years", l: "Más experiencia" },
  { k: "priceAsc", l: "Precio: menor a mayor" },
  { k: "priceDesc", l: "Precio: mayor a menor" },
];
const money = (n: number) => "$" + n.toLocaleString("es-AR");

export function matchFilters(c: MktCoach, f: MktFilters) {
  if (f.specs.length && !f.specs.some((s) => c.tags.includes(s))) return false;
  if (f.mod && c.mod !== f.mod && !(f.mod !== "Ambas" && c.mod === "Ambas")) return false;
  if (c.price < f.min || c.price > f.max) return false;
  if (f.days.length && !f.days.some((d) => c.days.includes(d))) return false;
  return true;
}

export function sortCoaches(list: MktCoach[], s: SortKey) {
  const by: Record<SortKey, (a: MktCoach, b: MktCoach) => number> = {
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    athletes: (a, b) => b.athletes - a.athletes,
    years: (a, b) => b.years - a.years,
  };
  return [...list].sort(by[s]);
}

export function activeChips(f: MktFilters, set: (f: MktFilters) => void) {
  const out: { label: string; remove: () => void }[] = [];
  f.specs.forEach((s) => out.push({ label: s, remove: () => set({ ...f, specs: f.specs.filter((x) => x !== s) }) }));
  if (f.mod) out.push({ label: f.mod, remove: () => set({ ...f, mod: null }) });
  if (f.min > 0 || f.max < PRICE_MAX) out.push({ label: rangeLabel(f), remove: () => set({ ...f, min: 0, max: PRICE_MAX }) });
  f.days.forEach((d) => out.push({ label: d, remove: () => set({ ...f, days: f.days.filter((x) => x !== d) }) }));
  return out;
}

function rangeLabel(f: MktFilters) {
  if (f.min > 0 && f.max < PRICE_MAX) return `${money(f.min)} – ${money(f.max)}`;
  if (f.min > 0) return `Desde ${money(f.min)}`;
  return `Hasta ${money(f.max)}`;
}

export function FiltersButton({ count, onClick }: { count: number; onClick: () => void }) {
  const on = count > 0;
  return (
    <button onClick={onClick} className="flex items-center" style={{ height: 40, padding: "0 14px", gap: 6, borderRadius: 9, border: `1px solid ${on ? "#111827" : "#E2E8F0"}`, background: on ? "#111827" : "#FFF", color: on ? "#FFF" : "#374151", fontSize: 13, flexShrink: 0 }}>
      <SlidersHorizontal size={13} color={on ? "#FFF" : "#94A3B8"} />Filtros
      {on && <span className="flex items-center justify-center" style={{ minWidth: 18, height: 18, borderRadius: 9, background: "#FFF", color: "#111827", fontSize: 10, fontWeight: 700, padding: "0 5px" }}>{count}</span>}
    </button>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>{children}</div>;
const chip = (on: boolean): React.CSSProperties => ({ borderRadius: 20, padding: "6px 14px", fontSize: 12, background: on ? "#111827" : "#FFF", color: on ? "#FFF" : "#374151", border: `1px solid ${on ? "#111827" : "#E2E8F0"}`, transition: "all .15s" });
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function FilterSheet({ value, specs, onClose, onApply, countFor }: { value: MktFilters; specs: string[]; onClose: () => void; onApply: (f: MktFilters) => void; countFor: (f: MktFilters) => number }) {
  const [f, setF] = useState(value);
  const active = activeChips(f, setF).length > 0 || f.sort !== "athletes";
  const n = countFor(f);
  const pct = (v: number) => (v / PRICE_MAX) * 100;
  const anchor = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setHost(anchor.current?.closest<HTMLElement>(".relative") ?? null); }, []);
  if (!host) return <span ref={anchor} style={{ display: "none" }} />;
  return createPortal(
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 180 }} />
      <div className="flex flex-col" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "85%", background: "#FFF", borderRadius: "20px 20px 0 0", zIndex: 190, animation: "togoSheetUp .3s ease" }}>
        <style>{`@keyframes togoSheetUp{from{transform:translateY(100%)}to{transform:none}}
.togo-range{position:absolute;left:0;right:0;top:0;width:100%;height:20px;margin:0;background:none;pointer-events:none;-webkit-appearance:none;appearance:none}
.togo-range::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#FFF;border:2px solid #111827;box-shadow:0 2px 6px rgba(0,0,0,.15);cursor:pointer}
.togo-range::-moz-range-thumb{pointer-events:auto;width:16px;height:16px;border-radius:50%;background:#FFF;border:2px solid #111827;box-shadow:0 2px 6px rgba(0,0,0,.15);cursor:pointer}`}</style>
        <div style={{ width: 36, height: 4, background: "#E2E8F0", borderRadius: 2, margin: "12px auto" }} />
        <div className="flex items-center" style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", gap: 12 }}>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "#111827" }}>Filtros</div>
          {active && <button onClick={() => setF(EMPTY_FILTERS)} style={{ fontSize: 12, color: "#3B82F6" }}>Limpiar todo</button>}
          <button onClick={onClose} aria-label="Cerrar"><X size={20} color="#CBD5E1" /></button>
        </div>
        <div className="flex flex-col" style={{ padding: 20, gap: 24, overflowY: "auto", flex: 1 }}>
          <div className="flex flex-col" style={{ gap: 10 }}>
            <Label>Especialidad</Label>
            {specs.length === 0 ? (
              <p style={{ fontSize: 12, color: "#94A3B8" }}>Todavía no hay especialidades cargadas.</p>
            ) : (
              <div className="flex flex-wrap" style={{ gap: 6 }}>{specs.map((s) => <button key={s} onClick={() => setF({ ...f, specs: toggle(f.specs, s) })} style={chip(f.specs.includes(s))}>{s}</button>)}</div>
            )}
          </div>
          <div className="flex flex-col" style={{ gap: 10 }}>
            <Label>Modalidad</Label>
            <div className="flex flex-wrap" style={{ gap: 6 }}>{MODS.map((m) => <button key={m} onClick={() => setF({ ...f, mod: f.mod === m ? null : m })} style={chip(f.mod === m)}>{m}</button>)}</div>
          </div>
          <div className="flex flex-col" style={{ gap: 10 }}>
            <Label>Precio por mes</Label>
            <div style={{ position: "relative", height: 20, margin: "4px 0" }}>
              <div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 4, borderRadius: 2, background: "#E2E8F0" }} />
              <div style={{ position: "absolute", top: 8, height: 4, borderRadius: 2, background: "#111827", left: `${pct(f.min)}%`, right: `${100 - pct(f.max)}%` }} />
              <input aria-label="Precio mínimo" className="togo-range" type="range" min={0} max={PRICE_MAX} step={1000} value={f.min} onChange={(e) => setF({ ...f, min: Math.min(+e.target.value, f.max - 1000) })} />
              <input aria-label="Precio máximo" className="togo-range" type="range" min={0} max={PRICE_MAX} step={1000} value={f.max} onChange={(e) => setF({ ...f, max: Math.max(+e.target.value, f.min + 1000) })} />
            </div>
            <div className="flex justify-between" style={{ fontSize: 12, color: "#94A3B8" }}><span>$0</span><span>$50.000</span></div>
            <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#111827", marginTop: 6 }}>{rangeLabel(f)} / mes</div>
          </div>
          <div className="flex flex-col" style={{ gap: 10 }}>
            <Label>Disponibilidad</Label>
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {DAYS.map((d) => { const on = f.days.includes(d); return <button key={d} onClick={() => setF({ ...f, days: toggle(f.days, d) })} style={{ width: 32, height: 32, borderRadius: 8, fontSize: 11, fontWeight: 600, background: on ? "#111827" : "#FFF", color: on ? "#FFF" : "#374151", border: `1px solid ${on ? "#111827" : "#E2E8F0"}` }}>{d}</button>; })}
            </div>
          </div>
          <div className="flex flex-col" style={{ gap: 10 }}>
            <Label>Ordenar por</Label>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {SORTS.map((o) => { const on = f.sort === o.k; return (
                <button key={o.k} onClick={() => setF({ ...f, sort: o.k })} className="flex items-center" style={{ gap: 10, padding: "10px 12px", borderRadius: 10, background: on ? "#F8FAFC" : "transparent", textAlign: "left" }}>
                  <span className="flex items-center justify-center" style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${on ? "#111827" : "#CBD5E1"}` }}>{on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#111827" }} />}</span>
                  <span style={{ fontSize: 13, color: "#374151" }}>{o.l}</span>
                </button>); })}
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #F1F5F9" }}>
          <button onClick={() => onApply(f)} style={{ width: "100%", background: "#111827", color: "#FFF", borderRadius: 12, height: 50, fontSize: 15, fontWeight: 700 }}>{n === 0 ? "Sin resultados" : `Ver ${n} ${n === 1 ? "coach" : "coaches"}`}</button>
        </div>
      </div>
    </>,
    host,
  );
}
