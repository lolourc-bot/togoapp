import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Download, Plus, Calendar, MessageCircle, MoreHorizontal, X, Check, UserCheck, Users,
  TrendingUp, TrendingDown, Star, Upload, Link2, ArrowRight,
} from "lucide-react";
import { COACHES as GYM_COACHES, MEMBER_NAMES, initials } from "@/lib/gym-classes";
import { useCoachRequests, assignCoach, type CoachRequest } from "@/lib/coach-requests";
import { AssignModal } from "./GymMembers";
import { AthleteProfile, CoachProfileInst } from "./InstProfiles";

type Mode = "club" | "gym";
type Notify = (m: string) => void;

/* ───────── shared data ───────── */
export type CatKey = "Sub-14" | "Sub-16" | "Sub-18" | "Primera" | "Femenino" | "Master";
export const CATS: CatKey[] = ["Sub-14", "Sub-16", "Sub-18", "Primera", "Femenino", "Master"];
export const CAT_COLORS: Record<CatKey | "Otro", string> = { "Sub-14": "#3B82F6", "Sub-16": "#8B5CF6", "Sub-18": "#EC4899", Primera: "#111827", Femenino: "#EC4899", Master: "#D97706", Otro: "#94A3B8" };
const tint = (hex: string) => `${hex}1A`;

export const CLUB_COACHES = ["Martín Gómez", "Diego Torres", "Lucas Fernández", "Valeria López", "Carla Méndez", "Rodrigo Paz", "Sofía Ibarra", "Nicolás Ruiz"];
const CLUB_COACH_SPEC: Record<string, string> = {
  "Martín Gómez": "Sub-14 Masculino", "Diego Torres": "Sub-16 Masculino", "Lucas Fernández": "Sub-18 · Velocidad",
  "Valeria López": "Primera División", "Carla Méndez": "Femenino juvenil", "Rodrigo Paz": "Master · Resistencia",
  "Sofía Ibarra": "Preparación física", "Nicolás Ruiz": "Primera B",
};
const GYM_COACH_SPEC: Record<string, string> = {
  "Martín Gutiérrez": "Fuerza · CrossFit", "Lucía Fernández": "Yoga · Movilidad", "Diego Romero": "Hipertrofia",
  "Camila Sosa": "Funcional · Pérdida de peso", "Joaquín Paz": "Running · Resistencia", "Valentina Ruiz": "Rehabilitación",
};

export type Sport = "Fútbol" | "Rugby" | "Hockey" | "Básquet" | "Otro";
export const SPORTS: Sport[] = ["Fútbol", "Rugby", "Hockey", "Básquet", "Otro"];
export const SPORT_COLORS: Record<Sport, string> = { Fútbol: "#3B82F6", Rugby: "#16A34A", Hockey: "#F59E0B", Básquet: "#EF4444", Otro: "#94A3B8" };
export type Team = { id: string; name: string; cat: CatKey | "Otro"; sport: Sport; sportName?: string | undefined; coach: string | null; ath: number; ses: number; att: number };
const SPORT_OF: Record<string, Sport> = { t1: "Fútbol", t2: "Fútbol", t3: "Fútbol", t4: "Rugby", t5: "Rugby", t6: "Hockey", t7: "Hockey", t8: "Hockey", t9: "Fútbol", t10: "Básquet", t11: "Básquet", t12: "Otro" };
export const INITIAL_TEAMS: Team[] = ([
  { id: "t1", name: "Sub-14 Masculino", cat: "Sub-14", coach: "Martín Gómez", ath: 18, ses: 4, att: 16 },
  { id: "t2", name: "Sub-14 Mixto B", cat: "Sub-14", coach: "Sofía Ibarra", ath: 16, ses: 3, att: 12 },
  { id: "t3", name: "Sub-16 Masculino", cat: "Sub-16", coach: "Diego Torres", ath: 22, ses: 3, att: 18 },
  { id: "t4", name: "Sub-16 B", cat: "Sub-16", coach: "Diego Torres", ath: 20, ses: 3, att: 16 },
  { id: "t5", name: "Sub-18 Masculino", cat: "Sub-18", coach: "Lucas Fernández", ath: 19, ses: 3, att: 11 },
  { id: "t6", name: "Sub-16 Femenino", cat: "Femenino", coach: "Carla Méndez", ath: 15, ses: 3, att: 11 },
  { id: "t7", name: "Sub-18 Femenino", cat: "Femenino", coach: "Carla Méndez", ath: 14, ses: 3, att: 12 },
  { id: "t8", name: "Femenino Primera", cat: "Femenino", coach: "Sofía Ibarra", ath: 20, ses: 4, att: 17 },
  { id: "t9", name: "Primera División", cat: "Primera", coach: "Valeria López", ath: 26, ses: 5, att: 24 },
  { id: "t10", name: "Primera B", cat: "Primera", coach: "Nicolás Ruiz", ath: 24, ses: 4, att: 19 },
  { id: "t11", name: "Master A", cat: "Master", coach: "Rodrigo Paz", ath: 12, ses: 2, att: 8 },
  { id: "t12", name: "Master B", cat: "Master", coach: null, ath: 9, ses: 2, att: 5 },
] as Omit<Team, "sport">[]).map((t) => ({ ...t, sport: SPORT_OF[t.id]! }));

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
function MembersLine({ data }: { data: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 300, H = 100, L = 28, B = 16;
  const min = Math.floor(Math.min(...data) / 10) * 10 - 10, max = Math.ceil(Math.max(...data) / 10) * 10;
  const x = (i: number) => L + (i * (W - L - 4)) / (data.length - 1);
  const y = (v: number) => 4 + ((max - v) / (max - min)) * (H - B - 8);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 100, display: "block" }} onMouseLeave={() => setHover(null)}>
        {[min, Math.round((min + max) / 2), max].map((v) => (
          <g key={v}><line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke="#F1F5F9" /><text x={L - 4} y={y(v) + 3} fontSize={8} fill="#94A3B8" textAnchor="end">{v}</text></g>
        ))}
        <path d={`${line} L${x(data.length - 1)},${H - B} L${x(0)},${H - B} Z`} fill="rgba(17,24,39,0.06)" />
        <path d={line} fill="none" stroke="#111827" strokeWidth={1.5} />
        {data.map((v, i) => (
          <g key={i}>
            <text x={x(i)} y={H - 3} fontSize={7} fill="#94A3B8" textAnchor="middle">{MONTHS[i]}</text>
            <rect x={x(i) - 10} y={0} width={20} height={H - B} fill="transparent" onMouseEnter={() => setHover(i)} />
            {hover === i && <circle cx={x(i)} cy={y(v)} r={3} fill="#111827" stroke="#FFF" strokeWidth={1.5} />}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div style={{ position: "absolute", top: -6, left: `${(x(hover) / W) * 100}%`, transform: "translate(-50%,-100%)", background: "#111827", color: "#FFF", fontSize: 11, borderRadius: 6, padding: "4px 8px", whiteSpace: "nowrap", pointerEvents: "none" }}>
          {MONTHS[hover]} · {data[hover]} socios
        </div>
      )}
    </div>
  );
}

export const attColor = (p: number) => (p >= 80 ? "#22C55E" : p >= 60 ? "#EAB308" : "#EF4444");

/* ───────── shared UI ───────── */
export const card: React.CSSProperties = { background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 14 };
export const outlineBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, border: "1px solid #E2E8F0", borderRadius: 9, height: 36, padding: "0 14px", fontSize: 12, color: "#374151", background: "#FFF", cursor: "pointer", whiteSpace: "nowrap" };
export const darkBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", background: "#111827", color: "#FFF", borderRadius: 9, height: 36, padding: "0 16px", fontSize: 13, fontWeight: 600, border: 0, cursor: "pointer", whiteSpace: "nowrap" };
export const inputStyle: React.CSSProperties = { width: "100%", height: 38, border: "1px solid #E2E8F0", borderRadius: 9, padding: "0 12px", fontSize: 13, color: "#111827", background: "#FFF", outline: "none" };
const smallBtn: React.CSSProperties = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, border: "1px solid #E2E8F0", borderRadius: 9, height: 34, fontSize: 12, color: "#374151", background: "#FFF", cursor: "pointer" };

export function Av({ name, size = 34, radius = "50%", fs }: { name: string; size?: number; radius?: string | number; fs?: number }) {
  return <span style={{ width: size, height: size, borderRadius: radius, background: "#F1F5F9", color: "#64748B", fontSize: fs ?? Math.max(9, Math.round(size / 3)), fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid #FFF" }}>{initials(name)}</span>;
}

export function Header({ title, count, children }: { title: string; count?: string | number; children?: React.ReactNode }) {
  return (
    <header style={{ padding: "24px 32px 0", display: "flex", alignItems: "center", marginBottom: 20, gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", flex: 1 }}>
        {title}{count !== undefined && <span style={{ fontSize: 18, fontWeight: 400, color: "#94A3B8" }}> · {count}</span>}
      </h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{children}</div>
    </header>
  );
}

export function SearchBox({ q, setQ }: { q: string; setQ: (v: string) => void }) {
  return (
    <div style={{ position: "relative" }}>
      <Search size={13} color="#CBD5E1" style={{ position: "absolute", left: 12, top: 11.5 }} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" style={{ width: 220, height: 36, border: "1px solid #E2E8F0", borderRadius: 9, padding: "0 12px 0 34px", fontSize: 12, outline: "none" }} />
    </div>
  );
}

export function FChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ border: `1px solid ${on ? "#111827" : "#E2E8F0"}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, color: on ? "#FFF" : "#374151", background: on ? "#111827" : "#FFF", cursor: "pointer", whiteSpace: "nowrap" }}>{children}</button>;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ height: 32, border: "1px solid #E2E8F0", borderRadius: 20, padding: "0 12px", fontSize: 12, color: "#374151", background: "#FFF", cursor: "pointer" }}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

export function Pill({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return <span style={{ background: bg, color: fg, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap" }}>{children}</span>;
}

export function Toggle36({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{ width: 36, height: 20, borderRadius: 10, border: 0, cursor: "pointer", background: on ? "#111827" : "#E2E8F0", position: "relative", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#FFF", transition: "left .15s" }} />
    </button>
  );
}

export function DotMenu({ options, onPick, size = 14 }: { options: string[]; onPick: (o: string) => void; size?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", lineHeight: 0 }}>
      <button aria-label="Más opciones" onClick={() => setOpen((v) => !v)} className="text-[#CBD5E1] hover:text-[#111827]" style={{ background: "none", border: 0, cursor: "pointer", padding: 2 }}><MoreHorizontal size={size} /></button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 22, ...card, borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,.08)", padding: 4, zIndex: 30, minWidth: 170, lineHeight: 1.4 }}>
          {options.map((o) => (
            <button key={o} className="hover:bg-slate-50" onClick={() => { setOpen(false); onPick(o); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", border: 0, background: "none", borderRadius: 7, fontSize: 12, cursor: "pointer", color: o.startsWith("Eliminar") || o === "Desactivar" ? "#EF4444" : "#374151" }}>{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Modal({ title, width = 480, onClose, footer, children }: { title: string; width?: number; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width, maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#FFF", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}>
        <div style={{ background: "#111827", borderRadius: "16px 16px 0 0", padding: "18px 24px", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#FFF", flex: 1 }}>{title}</span>
          <button aria-label="Cerrar" onClick={onClose} style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}><X size={16} color="#FFF" /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>{children}</div>
        {footer && <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function ModalFooter({ onCancel, onOk, ok, disabled }: { onCancel: () => void; onOk: () => void; ok: string; disabled?: boolean }) {
  return (
    <>
      <button onClick={onCancel} style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF", fontSize: 13, color: "#374151", cursor: "pointer" }}>Cancelar</button>
      <button disabled={disabled} onClick={onOk} style={{ flex: 1, height: 42, borderRadius: 10, border: 0, background: disabled ? "#CBD5E1" : "#111827", color: "#FFF", fontSize: 13, fontWeight: 600, cursor: disabled ? "default" : "pointer" }}>{ok}</button>
    </>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#374151", fontWeight: 500, minWidth: 0 }}>{label}{children}</label>;
}

export function ChipPicker<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T | null; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} style={{ border: `1px solid ${value === o ? "#111827" : "#E2E8F0"}`, borderRadius: 20, padding: "6px 12px", fontSize: 12, background: value === o ? "#111827" : "#FFF", color: value === o ? "#FFF" : "#374151", cursor: "pointer" }}>{o}</button>
      ))}
    </div>
  );
}

function InviteRow({ on, setOn }: { on: boolean; setOn: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
      <Toggle36 on={on} onChange={setOn} label="Enviar invitación por email" />
      <div>
        <div style={{ fontSize: 13, color: "#374151" }}>Enviar invitación por email</div>
        <div style={{ fontSize: 11, color: "#94A3B8" }}>Le llegará un link para descargar la app.</div>
      </div>
    </div>
  );
}

function PickModal({ title, options, onClose, onPick }: { title: string; options: string[]; onClose: () => void; onPick: (o: string) => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const list = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal title={title} width={420} onClose={onClose} footer={<ModalFooter onCancel={onClose} ok="Confirmar" disabled={!sel} onOk={() => sel && onPick(sel)} />}>
      {options.length > 5 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" style={inputStyle} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
        {list.map((o) => (
          <button key={o} onClick={() => setSel(o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${sel === o ? "#111827" : "#E2E8F0"}`, background: "#FFF", cursor: "pointer", fontSize: 13, color: "#111827", textAlign: "left" }}>
            <span style={{ flex: 1 }}>{o}</span>{sel === o && <Check size={14} />}
          </button>
        ))}
      </div>
    </Modal>
  );
}

function Checkbox({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button role="checkbox" aria-checked={on} aria-label={label} onClick={(e) => { e.stopPropagation(); onChange(); }} style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${on ? "#111827" : "#CBD5E1"}`, background: on ? "#111827" : "#FFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
      {on && <Check size={11} color="#FFF" strokeWidth={3} />}
    </button>
  );
}

function StatRow({ stats }: { stats: [string, string][] }) {
  return (
    <div style={{ display: "flex", borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9" }}>
      {stats.map(([v, l], i) => (
        <div key={l} style={{ flex: 1, padding: "10px 0", textAlign: "center", borderRight: i < stats.length - 1 ? "1px solid #F1F5F9" : "none" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{v}</div>
          <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 2 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ═════════ SOCIOS / ATLETAS ═════════ */
export type Person = { id: string; name: string; email: string; plan: "Mensual" | "Trimestral" | "Anual"; coach: string | null; att: string; status: string; teamId?: string | undefined };
const email = (n: string) => `${n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, ".")}@mail.com`;
export const PLAN_STYLE = { Mensual: ["#EFF6FF", "#3B82F6"], Trimestral: ["#F0FDF4", "#16A34A"], Anual: ["#FFFBEB", "#D97706"] } as const;
const STATUS_STYLE: Record<string, [string, string]> = { Activo: ["#DCFCE7", "#16A34A"], Inactivo: ["#F1F5F9", "#94A3B8"], "Cuota vencida": ["#FEE2E2", "#EF4444"], Lesionado: ["#FEF9C3", "#D97706"] };

export function initialGym(): Person[] {
  const inactive = new Set(["Agustina Esposito", "Bruno Pereyra", "Gonzalo Zárate"]);
  const overdue = new Set(["Ignacio López", "Delfina Vega", "Micaela Acosta"]);
  const plans = ["Mensual", "Trimestral", "Anual"] as const;
  return MEMBER_NAMES.map((n, i) => ({
    id: `m${i}`, name: n, email: email(n), plan: plans[i % 3]!, coach: i % 4 === 1 ? GYM_COACHES[i % GYM_COACHES.length]! : null,
    att: `${(i * 7) % 17 + 3}/20 este mes`, status: inactive.has(n) ? "Inactivo" : overdue.has(n) ? "Cuota vencida" : "Activo",
  }));
}
export const CLUB_NAMES = ["Tomás Acuña", "Benjamín Ríos", "Joaquín Molina", "Valentín Sosa", "Thiago Castro", "Lautaro Gil", "Camila Duarte", "Morena Ruiz", "Luana Paredes", "Felipe Arias", "Bautista Luna", "Franco Medina", "Ramiro Ponce", "Ezequiel Rey", "Abril Godoy", "Pilar Funes"];
export function initialClub(): Person[] {
  const teamOf = ["t1", "t1", "t3", "t3", "t5", "t5", "t6", "t7", "t8", "t9", "t9", "t10", "t11", "t12", "t8", ""];
  return CLUB_NAMES.map((n, i) => {
    const tid = teamOf[i] || undefined;
    const t = INITIAL_TEAMS.find((x) => x.id === tid);
    return { id: `a${i}`, name: n, email: email(n), plan: "Mensual", coach: t?.coach ?? null, att: `${[3, 2, 3, 1, 2, 3, 3, 2, 4, 5, 4, 3, 1, 2, 3, 0][i]}/${t?.ses ?? 3} prácticas`, status: i === 4 ? "Lesionado" : i === 12 ? "Inactivo" : "Activo", teamId: tid };
  });
}

export function MembersScreen({ mode, notify, initialFilter = "Todos", startAdding = false }: { mode: Mode; notify: Notify; initialFilter?: string; startAdding?: boolean }) {
  const club = mode === "club";
  const requests = useCoachRequests();
  const [rows, setRows] = useState<Person[]>(() => (club ? initialClub() : initialGym()));
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [status, setStatus] = useState<string | null>(null);
  const [coachF, setCoachF] = useState(club ? "Todos los equipos" : "Todos los coaches");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(startAdding);
  const [pick, setPick] = useState<{ title: string; options: string[]; apply: (o: string) => void } | null>(null);
  const [assigning, setAssigning] = useState<CoachRequest | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  // members who requested a coach from the app (shared with the member app)
  const all = useMemo(() => {
    if (club) return rows;
    const extra = requests.filter((r) => !rows.some((p) => p.name === r.member)).map((r, i) => ({ id: `r${i}`, name: r.member, email: email(r.member), plan: "Mensual" as const, coach: null, att: "8/20 este mes", status: "Activo" }));
    return [...rows, ...extra].map((p) => { const r = requests.find((x) => x.member === p.name); return r?.coach ? { ...p, coach: r.coach } : p; });
  }, [rows, requests, club]);
  const reqOf = (n: string) => requests.find((r) => r.member === n && !r.coach);
  const teamOf = (p: Person) => INITIAL_TEAMS.find((t) => t.id === p.teamId);

  const list = all.filter((p) => {
    if (!p.name.toLowerCase().includes(q.toLowerCase()) && !p.email.includes(q.toLowerCase())) return false;
    if (club) {
      const t = teamOf(p);
      if (filter !== "Todos" && t?.cat !== filter) return false;
      if (coachF !== "Todos los equipos" && t?.name !== coachF) return false;
      if (status === "Activos" && p.status !== "Activo") return false;
      if (status === "Inactivos" && p.status !== "Inactivo") return false;
      if (status === "Sin equipo" && t) return false;
      return true;
    }
    if (coachF !== "Todos los coaches" && p.coach !== coachF) return false;
    if (filter === "Activos") return p.status === "Activo";
    if (filter === "Inactivos") return p.status === "Inactivo";
    if (filter === "Cuota vencida") return p.status === "Cuota vencida";
    if (filter === "Solicitan coach") return !!reqOf(p.name);
    return true;
  });

  const update = (ids: string[], patch: Partial<Person>) => setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, ...patch } : r)));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = list.length > 0 && list.every((p) => sel.has(p.id));
  const coachOptions = club ? CLUB_COACHES : GYM_COACHES;
  const teamNames = INITIAL_TEAMS.map((t) => t.name);
  const noun = club ? "atleta" : "socio";

  const assignCoachTo = (p: Person) => {
    const r = reqOf(p.name);
    if (r) return setAssigning(r);
    setPick({ title: `Asignar coach · ${p.name}`, options: coachOptions, apply: (c) => { update([p.id], { coach: c }); notify(`Coach asignado a ${p.name}`); } });
  };
  const changeTeam = (ids: string[]) => setPick({ title: "Asignar a equipo", options: teamNames, apply: (n) => { const t = INITIAL_TEAMS.find((x) => x.name === n)!; update(ids, { teamId: t.id, coach: t.coach }); notify(`${ids.length} ${ids.length === 1 ? "atleta movido" : "atletas movidos"} a ${n}`); } });

  const cols = "32px 2fr 1fr 1fr 1fr 1fr 80px";
  const ids = [...sel];

  const viewed = viewing ? all.find((p) => p.id === viewing) : undefined;
  if (viewed) {
    const t = teamOf(viewed);
    return <AthleteProfile mode={mode} notify={notify} onBack={() => setViewing(null)} a={{ name: viewed.name, email: viewed.email, status: viewed.status, plan: viewed.plan, coach: viewed.coach, team: t?.name, teamCoach: t?.coach, idx: all.indexOf(viewed) }} />;
  }
  return (
    <div>
      <Header title={club ? "Atletas" : "Socios"} count={all.length}>
        <SearchBox q={q} setQ={setQ} />
        <button style={outlineBtn} onClick={() => notify(`Exportando ${list.length} ${noun}s…`)}><Download size={12} color="#94A3B8" /> Exportar</button>
        <button style={darkBtn} onClick={() => setAdding(true)}>＋ Agregar {noun}</button>
      </Header>

      <div style={{ padding: "0 32px", display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {(club ? ["Todos", ...CATS] : ["Todos", "Activos", "Inactivos", "Solicitan coach", "Cuota vencida"]).map((f) => {
          const n = f === "Solicitan coach" ? requests.filter((r) => !r.coach).length : 0;
          return <FChip key={f} on={filter === f} onClick={() => setFilter(f)}>{f}{n ? ` · ${n}` : ""}</FChip>;
        })}
        <Select value={coachF} onChange={setCoachF} options={club ? ["Todos los equipos", ...teamNames] : ["Todos los coaches", ...GYM_COACHES]} />
        {club && <span style={{ width: 1, height: 20, background: "#E2E8F0", margin: "0 4px" }} />}
        {club && ["Activos", "Inactivos", "Sin equipo"].map((s) => <FChip key={s} on={status === s} onClick={() => setStatus(status === s ? null : s)}>{s}</FChip>)}
      </div>

      {sel.size > 0 && (
        <div style={{ position: "sticky", top: 12, zIndex: 10, background: "#111827", borderRadius: 10, padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, margin: "0 32px 12px" }}>
          <span style={{ fontSize: 12, color: "#FFF", flex: 1 }}>{sel.size} seleccionados</span>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
          {(club ? ["Asignar a equipo", "Cambiar entrenador", "Enviar mensaje"] : ["Asignar coach", "Cambiar membresía", "Enviar mensaje"]).map((a) => (
            <button key={a} className="hover:opacity-75" style={{ fontSize: 12, color: "#FFF", background: "none", border: 0, cursor: "pointer" }} onClick={() => {
              if (a === "Enviar mensaje") { notify(`Mensaje enviado a ${sel.size} ${noun}s`); setSel(new Set()); return; }
              if (a === "Asignar a equipo") return changeTeam(ids);
              if (a === "Cambiar membresía") return setPick({ title: "Cambiar membresía", options: ["Mensual", "Trimestral", "Anual"], apply: (o) => { update(ids, { plan: o as Person["plan"] }); notify(`Membresía actualizada (${ids.length})`); } });
              setPick({ title: a, options: coachOptions, apply: (c) => { update(ids, { coach: c }); notify(`${c} asignado a ${ids.length} ${noun}s`); } });
            }}>{a}</button>
          ))}
          <button onClick={() => setSel(new Set())} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", background: "none", border: 0, cursor: "pointer" }}>Cancelar</button>
        </div>
      )}

      <div style={{ ...card, overflow: "visible", margin: "0 32px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", padding: "10px 20px", borderRadius: "14px 14px 0 0" }}>
          <Checkbox on={allOn} label="Seleccionar todos" onChange={() => setSel(allOn ? new Set() : new Set(list.map((p) => p.id)))} />
          {(club ? ["Atleta", "Equipo / Categoría", "Entrenador", "Asistencia sem.", "Estado", ""] : ["Socio", "Membresía", "Coach", "Asistencia", "Estado", ""]).map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>{h}</span>
          ))}
        </div>
        {list.length === 0 && <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>No hay {noun}s con estos filtros.</div>}
        {list.map((p) => {
          const t = teamOf(p);
          const [done = 0, of = 1] = p.att.split(" ")[0]!.split("/").map(Number);
          const st = STATUS_STYLE[p.status] ?? STATUS_STYLE["Activo"]!;
          const pending = !club && reqOf(p.name);
          return (
            <div key={p.id} className="hover:bg-[#FAFAFA]" style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #F8FAFC" }}>
              <Checkbox on={sel.has(p.id)} label={`Seleccionar ${p.name}`} onChange={() => toggle(p.id)} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Av name={p.name} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email}</div>
                </div>
              </div>
              {club ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t ? "#374151" : "#94A3B8", fontStyle: t ? "normal" : "italic" }}>
                  {t && <span style={{ width: 6, height: 6, borderRadius: "50%", background: CAT_COLORS[t.cat] }} />}{t ? t.name : "Sin equipo"}
                </span>
              ) : (
                <span><Pill bg={PLAN_STYLE[p.plan][0]} fg={PLAN_STYLE[p.plan][1]}>{p.plan}</Pill></span>
              )}
              <span style={{ fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                {p.coach ? (
                  <>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.coach}</span>
                    <span style={{ color: "#CBD5E1", lineHeight: 0 }}>
                      <DotMenu size={12} options={["Cambiar coach", "Quitar coach"]} onPick={(o) => {
                        if (o === "Quitar coach") { update([p.id], { coach: null }); return notify(`Coach quitado a ${p.name}`); }
                        setPick({ title: `Cambiar coach · ${p.name}`, options: coachOptions.filter((c) => c !== p.coach), apply: (c) => { update([p.id], { coach: c }); notify(`Coach cambiado a ${c}`); } });
                      }} />
                    </span>
                  </>
                ) : (
                  <button onClick={() => (pending ? setAssigning(pending) : assignCoachTo(p))} className="hover:bg-[#F8FAFC]" style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "2px 10px", fontSize: 11, color: "#374151", background: "#FFF", cursor: "pointer" }}>Asignar</button>
                )}
              </span>
              <span style={{ fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                {p.att}{club && <span style={{ width: 6, height: 6, borderRadius: "50%", background: attColor((done / (of || 1)) * 100) }} />}
              </span>
              <span><Pill bg={st[0]} fg={st[1]}>{p.status}</Pill></span>
              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
                <button aria-label="Ver calendario" className="text-[#CBD5E1] hover:text-[#111827]" style={{ background: "none", border: 0, cursor: "pointer", padding: 2, lineHeight: 0 }} onClick={() => notify(`Calendario de ${p.name}`)}><Calendar size={14} /></button>
                <button aria-label="Abrir chat" className="text-[#CBD5E1] hover:text-[#111827]" style={{ background: "none", border: 0, cursor: "pointer", padding: 2, lineHeight: 0 }} onClick={() => notify(`Chat con ${p.name}`)}><MessageCircle size={14} /></button>
                <DotMenu options={["Ver perfil", club ? "Cambiar equipo" : "Asignar coach", p.status === "Inactivo" ? "Marcar activo" : "Marcar inactivo", "Eliminar"]} onPick={(o) => {
                  if (o === "Asignar coach") return assignCoachTo(p);
                  if (o === "Cambiar equipo") return changeTeam([p.id]);
                  if (o === "Marcar inactivo") { update([p.id], { status: "Inactivo" }); return notify(`${p.name} marcado como inactivo`); }
                  if (o === "Marcar activo") { update([p.id], { status: "Activo" }); return notify(`${p.name} marcado como activo`); }
                  if (o === "Eliminar") { setRows((rs) => rs.filter((r) => r.id !== p.id)); setSel((s) => { const n = new Set(s); n.delete(p.id); return n; }); return notify(`${p.name} eliminado`); }
                  if (o === "Ver perfil") return setViewing(p.id);
                  notify(`Perfil de ${p.name}`);
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {adding && (club
        ? <AddAthleteModal onClose={() => setAdding(false)} onAdd={(p, invite) => { setRows((rs) => [p, ...rs]); setAdding(false); notify("Atleta agregado ✓"); }} />
        : <AddMemberModal onClose={() => setAdding(false)} onAdd={(p, invite) => { setRows((rs) => [p, ...rs]); setAdding(false); notify("Atleta agregado ✓"); }} />)}
      {pick && <PickModal title={pick.title} options={pick.options} onClose={() => setPick(null)} onPick={(o) => { pick.apply(o); setPick(null); setSel(new Set()); }} />}
      {assigning && <AssignModal req={assigning} onClose={() => setAssigning(null)} onDone={(c, msg) => { assignCoach(assigning.id, c, msg); notify("Entrenador asignado ✓"); setAssigning(null); }} />}
    </div>
  );
}

function NameFields({ f, set }: { f: { first: string; last: string; email: string; phone: string }; set: (k: "first" | "last" | "email" | "phone", v: string) => void }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Nombre"><input style={inputStyle} value={f.first} onChange={(e) => set("first", e.target.value)} /></Field>
        <Field label="Apellido"><input style={inputStyle} value={f.last} onChange={(e) => set("last", e.target.value)} /></Field>
      </div>
      <Field label="Email"><input type="email" style={inputStyle} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
      <Field label="Teléfono (opcional)"><input style={inputStyle} value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
    </>
  );
}
function useNameForm() {
  const [f, setF] = useState({ first: "", last: "", email: "", phone: "" });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.first.trim() && f.last.trim() && /\S+@\S+\.\S+/.test(f.email);
  return { f, set, valid: !!valid, name: `${f.first.trim()} ${f.last.trim()}` };
}

function AddMemberModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Person, invite: boolean) => void }) {
  const n = useNameForm();
  const [plan, setPlan] = useState<Person["plan"]>("Mensual");
  const [coach, setCoach] = useState("Sin asignar");
  const [start, setStart] = useState("2026-10-06");
  const [invite, setInvite] = useState(true);
  return (
    <Modal title="Agregar socio" onClose={onClose} footer={<ModalFooter onCancel={onClose} ok="Agregar socio" disabled={!n.valid} onOk={() => onAdd({ id: `n${Date.now()}`, name: n.name, email: n.f.email, plan, coach: coach === "Sin asignar" ? null : coach, att: "0/20 este mes", status: "Activo" }, invite)} />}>
      <NameFields f={n.f} set={n.set} />
      <Field label="Membresía"><ChipPicker options={["Mensual", "Trimestral", "Anual"] as const} value={plan} onChange={setPlan} /></Field>
      <Field label="Coach asignado (opcional)">
        <select value={coach} onChange={(e) => setCoach(e.target.value)} style={inputStyle}>{["Sin asignar", ...GYM_COACHES].map((c) => <option key={c}>{c}</option>)}</select>
      </Field>
      <Field label="Fecha de inicio"><input type="date" style={inputStyle} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <InviteRow on={invite} setOn={setInvite} />
    </Modal>
  );
}

function AddAthleteModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Person, invite: boolean) => void }) {
  const n = useNameForm();
  const teams = INITIAL_TEAMS;
  const [teamId, setTeamId] = useState("");
  const team = INITIAL_TEAMS.find((t) => t.id === teamId);
  const [coach, setCoach] = useState("Sin asignar");
  useEffect(() => { setCoach(team?.coach ?? "Sin asignar"); }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [birth, setBirth] = useState("");
  const [pos, setPos] = useState("");
  const [invite, setInvite] = useState(true);
  const coachOpts = team?.coach ? [team.coach] : ["Sin asignar", ...CLUB_COACHES];
  return (
    <Modal title="Agregar atleta" onClose={onClose} footer={<ModalFooter onCancel={onClose} ok="Agregar atleta" disabled={!n.valid} onOk={() => onAdd({ id: `n${Date.now()}`, name: n.name, email: n.f.email, plan: "Mensual", coach: coach === "Sin asignar" ? null : coach, att: `0/${team?.ses ?? 3} prácticas`, status: "Activo", teamId: teamId || undefined }, invite)} />}>
      <NameFields f={n.f} set={n.set} />
      <Field label="Fecha de nacimiento"><input type="date" style={inputStyle} value={birth} onChange={(e) => setBirth(e.target.value)} /></Field>
      <Field label="Equipo">
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={inputStyle}>
          <option value="">Sin equipo</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Entrenador">
        <select value={coach} onChange={(e) => setCoach(e.target.value)} style={inputStyle}>{coachOpts.map((c) => <option key={c}>{c}</option>)}</select>
      </Field>
      <Field label="Posición / Especialidad"><input style={inputStyle} placeholder="Ej. Defensor central" value={pos} onChange={(e) => setPos(e.target.value)} /></Field>
      <InviteRow on={invite} setOn={setInvite} />
    </Modal>
  );
}

/* ═════════ ENTRENADORES ═════════ */
type Coach = { name: string; spec: string; active: boolean; teams: string[]; athletes: number; att: number; rating: number };
function initialCoaches(club: boolean): Coach[] {
  if (club) return CLUB_COACHES.map((c, i) => {
    const teams = INITIAL_TEAMS.filter((t) => t.coach === c).map((t) => t.id);
    const ath = INITIAL_TEAMS.filter((t) => t.coach === c).reduce((s, t) => s + t.ath, 0);
    return { name: c, spec: CLUB_COACH_SPEC[c] ?? "Entrenador", active: i !== 6 || true, teams, athletes: ath, att: [92, 85, 61, 94, 78, 70, 82, 88][i]!, rating: 0 };
  });
  return GYM_COACHES.map((c, i) => ({ name: c, spec: GYM_COACH_SPEC[c] ?? "Coach", active: i !== 5, teams: [], athletes: [24, 15, 31, 18, 22, 6][i]!, att: [89, 92, 76, 84, 81, 70][i]!, rating: [4.8, 4.9, 4.5, 4.7, 4.6, 4.4][i]! }));
}

export function CoachesScreen({ mode, notify, startAdding = false }: { mode: Mode; notify: Notify; startAdding?: boolean }) {
  const club = mode === "club";
  const [coaches, setCoaches] = useState<Coach[]>(() => initialCoaches(club));
  const [q, setQ] = useState("");
  const [f, setF] = useState("Todos");
  const [spec, setSpec] = useState("Todas las especialidades");
  const [adding, setAdding] = useState(startAdding);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const specs = ["Todas las especialidades", ...new Set(coaches.map((c) => c.spec))];
  const list = coaches.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) && (f === "Todos" || (f === "Activos" ? c.active : !c.active)) && (spec === "Todas las especialidades" || c.spec === spec));
  const teamName = (id: string) => INITIAL_TEAMS.find((t) => t.id === id);

  const vc = viewing ? coaches.find((x) => x.name === viewing) : undefined;
  if (vc) {
    const teams = vc.teams.map(teamName).filter((t): t is Team => !!t).map((t) => ({ name: t.name, ath: t.ath, sport: t.sport, color: SPORT_COLORS[t.sport] }));
    const gm = initialGym(); const own = gm.filter((p) => p.coach === vc.name);
    const members = club ? [] : (own.length ? own : gm.filter((_, i) => i % GYM_COACHES.length === coaches.indexOf(vc)).slice(0, 6)).map((p) => ({ name: p.name, plan: p.plan, active: p.status === "Activo" }));
    return <CoachProfileInst mode={mode} notify={notify} onBack={() => setViewing(null)} c={{ ...vc, idx: coaches.indexOf(vc), teams, members }} />;
  }
  return (
    <div>
      <Header title="Entrenadores" count={coaches.length}>
        <SearchBox q={q} setQ={setQ} />
        <button style={outlineBtn} onClick={() => notify("Exportando entrenadores…")}><Download size={12} color="#94A3B8" /> Exportar</button>
        <button style={darkBtn} onClick={() => setAdding(true)}>＋ Agregar entrenador</button>
      </Header>
      <div style={{ padding: "0 32px", display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {["Todos", "Activos", "Inactivos"].map((s) => <FChip key={s} on={f === s} onClick={() => setF(s)}>{s}</FChip>)}
        {club && <Select value={spec} onChange={setSpec} options={specs} />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: "0 32px 32px" }}>
        {list.map((c) => (
          <div key={c.name} style={{ ...card, padding: 20, display: "flex", flexDirection: "column", opacity: c.active ? 1 : 0.7 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <Av name={c.name} size={48} radius={14} fs={16} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <button onClick={() => setViewing(c.name)} className="hover:underline" style={{ fontSize: 14, fontWeight: 700, color: "#111827", background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left" }}>{c.name}</button>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.spec}</div>
              </div>
              <span title={c.active ? "Activo" : "Inactivo"} style={{ width: 8, height: 8, borderRadius: "50%", background: c.active ? "#22C55E" : "#E2E8F0", marginTop: 6 }} />
              <DotMenu options={["Ver perfil", "Editar perfil", "Ver atletas", "Enviar mensaje", c.active ? "Desactivar" : "Activar"]} onPick={(o) => {
                if (o === "Ver perfil") return setViewing(c.name);
                if (o === "Desactivar" || o === "Activar") { setCoaches((cs) => cs.map((x) => (x.name === c.name ? { ...x, active: o === "Activar" } : x))); return notify(`${c.name} ${o === "Activar" ? "activado" : "desactivado"}`); }
                notify(`${o}: ${c.name}`);
              }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <StatRow stats={club
                ? [[String(c.athletes), "atletas"], [String(c.teams.length), "equipos"], [`${c.att}%`, "asistencia"]]
                : [[String(c.athletes), "atletas"], [`${c.att}%`, "asistencia"], [`${c.rating} ★`, "rating"]]} />
            </div>
            {club && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Equipos asignados</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {c.teams.length === 0 && <span style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Sin equipos</span>}
                  {c.teams.map((id) => { const t = teamName(id); return t && (
                    <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid #E2E8F0", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#374151" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: CAT_COLORS[t.cat] }} />{t.name}
                    </span>); })}
                </div>
                <button onClick={() => setAssignFor(c.name)} style={{ alignSelf: "flex-start", fontSize: 11, color: "#3B82F6", background: "none", border: 0, cursor: "pointer", padding: 0 }}>＋ Asignar equipo</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
              <button style={smallBtn} onClick={() => notify(`Atletas de ${c.name}`)}><UserCheck size={12} color="#94A3B8" /> Ver atletas</button>
              <button style={smallBtn} onClick={() => notify(`Chat con ${c.name}`)}><MessageCircle size={12} color="#94A3B8" /> Mensaje</button>
            </div>
          </div>
        ))}
      </div>
      {assignFor && <PickModal title={`Asignar equipo · ${assignFor}`} options={INITIAL_TEAMS.map((t) => t.name)} onClose={() => setAssignFor(null)} onPick={(n) => {
        const t = INITIAL_TEAMS.find((x) => x.name === n)!;
        setCoaches((cs) => cs.map((x) => (x.name === assignFor && !x.teams.includes(t.id) ? { ...x, teams: [...x.teams, t.id], athletes: x.athletes + t.ath } : x)));
        notify(`${n} asignado a ${assignFor}`); setAssignFor(null);
      }} />}
      {adding && <AddCoachModal club={club} onClose={() => setAdding(false)} onAdd={(c, invite) => { setCoaches((cs) => [c, ...cs]); setAdding(false); notify(`${c.name} agregado${invite ? " · invitación enviada" : ""}`); }} />}
    </div>
  );
}

function AddCoachModal({ club, onClose, onAdd }: { club: boolean; onClose: () => void; onAdd: (c: Coach, invite: boolean) => void }) {
  const n = useNameForm();
  const [spec, setSpec] = useState("");
  const [max, setMax] = useState("");
  const [comm, setComm] = useState("");
  const [teams, setTeams] = useState<string[]>([]);
  const roles = club ? ["Entrenador principal", "Asistente"] : ["Coach personal", "Instructor de clases"];
  const [sel, setSel] = useState<string[]>([roles[0]!]);
  const role = sel.join(" · ");
  const [invite, setInvite] = useState(true);
  return (
    <Modal title="Agregar entrenador" onClose={onClose} footer={<ModalFooter onCancel={onClose} ok="Agregar entrenador" disabled={!n.valid} onOk={() => onAdd({ name: n.name, spec: spec || role, active: true, teams, athletes: INITIAL_TEAMS.filter((t) => teams.includes(t.id)).reduce((s, t) => s + t.ath, 0), att: 0, rating: 0 }, invite)} />}>
      <NameFields f={n.f} set={n.set} />
      <Field label="Especialidad"><input style={inputStyle} placeholder="Ej. Fuerza y potencia, Running…" value={spec} onChange={(e) => setSpec(e.target.value)} /></Field>
      {club ? (
        <Field label="Equipos asignados">
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 9, maxHeight: 160, overflowY: "auto" }}>
            {INITIAL_TEAMS.map((t) => {
              const on = teams.includes(t.id);
              return (
                <div key={t.id} onClick={() => setTeams((x) => (on ? x.filter((i) => i !== t.id) : [...x, t.id]))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid #F8FAFC", cursor: "pointer", fontWeight: 400 }}>
                  <Checkbox on={on} label={t.name} onChange={() => setTeams((x) => (on ? x.filter((i) => i !== t.id) : [...x, t.id]))} />
                  <span style={{ flex: 1, fontSize: 12, color: "#111827" }}>{t.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: SPORT_COLORS[t.sport], background: tint(SPORT_COLORS[t.sport]), borderRadius: 4, padding: "2px 7px" }}>{t.sport}</span>
                </div>
              );
            })}
          </div>
        </Field>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Atletas máximos"><input type="number" min={0} style={inputStyle} value={max} onChange={(e) => setMax(e.target.value)} /></Field>
          <Field label="Comisión % (opcional)"><input type="number" min={0} max={100} style={inputStyle} value={comm} onChange={(e) => setComm(e.target.value)} /></Field>
        </div>
      )}
      <Field label="Rol">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {roles.map((r) => {
            const on = sel.includes(r);
            return <button key={r} type="button" aria-pressed={on} onClick={() => setSel((x) => (on ? x.filter((y) => y !== r) : [...x, r]))} style={{ border: `1px solid ${on ? "#111827" : "#E2E8F0"}`, borderRadius: 20, padding: "6px 12px", fontSize: 12, background: on ? "#111827" : "#FFF", color: on ? "#FFF" : "#374151", cursor: "pointer" }}>{r}</button>;
          })}
        </div>
      </Field>
      <InviteRow on={invite} setOn={setInvite} />
    </Modal>
  );
}

/* ═════════ EQUIPOS (club) ═════════ */
export function TeamsScreen({ notify, onCalendar }: { notify: Notify; onCalendar: () => void }) {
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [f, setF] = useState("Todos");
  const [creating, setCreating] = useState(false);
  const [coachFor, setCoachFor] = useState<Team | null>(null);
  const list = teams.filter((t) => f === "Todos" || t.sport === f);
  return (
    <div>
      <Header title="Equipos" count={`${teams.length} equipos`}>
        <button style={darkBtn} onClick={() => setCreating(true)}>＋ Crear equipo</button>
      </Header>
      <div style={{ padding: "0 32px", display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["Todos", ...SPORTS].map((c) => <FChip key={c} on={f === c} onClick={() => setF(c)}>{c}</FChip>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: "0 32px 32px" }}>
        {list.map((t) => {
          const col = SPORT_COLORS[t.sport];
          const pct = Math.round((t.att / (t.ath || 1)) * 100);
          const stack = CLUB_NAMES.slice((Number(t.id.slice(1)) * 3) % 12, ((Number(t.id.slice(1)) * 3) % 12) + 4);
          return (
            <div key={t.id} style={{ ...card, overflow: "visible" }}>
              <div style={{ height: 6, background: col, borderRadius: "14px 14px 0 0" }} />
              <div style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ display: "flex", paddingTop: 2 }}>
                    {stack.map((n, i) => <span key={n} style={{ marginLeft: i ? -8 : 0 }}><Av name={n} size={26} fs={9} /></span>)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{t.name}</div>
                    <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 600, color: col, background: tint(col), borderRadius: 4, padding: "2px 7px" }}>{t.sportName ?? t.sport}</span>
                  </div>
                  <DotMenu options={["Editar equipo", "Ver calendario", "Gestionar atletas", "Eliminar equipo"]} onPick={(o) => {
                    if (o === "Ver calendario") return onCalendar();
                    if (o === "Eliminar equipo") { setTeams((ts) => ts.filter((x) => x.id !== t.id)); return notify(`${t.name} eliminado`); }
                    notify(`${o}: ${t.name}`);
                  }} />
                </div>
                <div style={{ margin: "12px 0" }}><StatRow stats={[[String(t.ath), "atletas"], [String(t.ses), "sesiones/sem"], [`${pct}%`, "asist."]]} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  {t.coach ? (
                    <>
                      <Av name={t.coach} size={24} fs={9} />
                      <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{t.coach}</span>
                      <button onClick={() => setCoachFor(t)} className="text-[#94A3B8] hover:text-[#374151]" style={{ fontSize: 11, background: "none", border: 0, cursor: "pointer" }}>Cambiar</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>Sin entrenador</span>
                      <button onClick={() => setCoachFor(t)} style={{ fontSize: 11, color: "#3B82F6", background: "none", border: 0, cursor: "pointer" }}>Asignar</button>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={smallBtn} onClick={() => notify(`Atletas de ${t.name}`)}><Users size={12} color="#94A3B8" /> Ver atletas</button>
                  <button style={smallBtn} onClick={onCalendar}><Calendar size={12} color="#94A3B8" /> Calendario</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {coachFor && <PickModal title={`Entrenador · ${coachFor.name}`} options={CLUB_COACHES} onClose={() => setCoachFor(null)} onPick={(c) => { setTeams((ts) => ts.map((x) => (x.id === coachFor.id ? { ...x, coach: c } : x))); notify(`${c} asignado a ${coachFor.name}`); setCoachFor(null); }} />}
      {creating && <CreateTeamModal onClose={() => setCreating(false)} onCreate={(t) => { setTeams((ts) => [t, ...ts]); setCreating(false); notify("Equipo creado ✓"); }} />}
    </div>
  );
}

function CreateTeamModal({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Team) => void }) {
  const [name, setName] = useState("");
  const [sport, setSport] = useState<Sport | null>(null);
  const [other, setOther] = useState("");
  const [main, setMain] = useState("");
  const [asst, setAsst] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [ses, setSes] = useState("3");
  const [notes, setNotes] = useState("");
  const pool = initialClub();
  const list = pool.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const tog = (id: string) => setPicked((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]));
  const ok = !!name.trim() && !!sport && (sport !== "Otro" || !!other.trim());
  return (
    <Modal title="Crear equipo" width={520} onClose={onClose} footer={<ModalFooter onCancel={onClose} ok="Crear equipo" disabled={!ok} onOk={() => onCreate({ id: `t${Date.now()}`, name: name.trim(), cat: "Otro", sport: sport!, sportName: sport === "Otro" ? other.trim() : undefined, coach: main || null, ath: picked.length, ses: Number(ses) || 0, att: 0 })} />}>
      <Field label="Nombre del equipo"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Sub-16 Masculino B" /></Field>
      <Field label="Deporte">
        <ChipPicker options={SPORTS} value={sport} onChange={setSport} />
        {sport === "Otro" && <input style={inputStyle} value={other} onChange={(e) => setOther(e.target.value)} placeholder="¿Cuál?" />}
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Entrenador principal">
          <select style={inputStyle} value={main} onChange={(e) => setMain(e.target.value)}><option value="">Elegir…</option>{CLUB_COACHES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Entrenador asistente (opcional)">
          <select style={inputStyle} value={asst} onChange={(e) => setAsst(e.target.value)}><option value="">Ninguno</option>{CLUB_COACHES.filter((c) => c !== main).map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
      </div>
      <Field label={`Atletas${picked.length ? ` · ${picked.length} seleccionados` : ""}`}>
        <input style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar atleta…" />
        <div style={{ border: "1px solid #E2E8F0", borderRadius: 9, maxHeight: 200, overflowY: "auto" }}>
          {list.map((p) => {
            const cur = INITIAL_TEAMS.find((t) => t.id === p.teamId);
            return (
              <div key={p.id} onClick={() => tog(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid #F8FAFC", cursor: "pointer", fontWeight: 400 }}>
                <Checkbox on={picked.includes(p.id)} label={p.name} onChange={() => tog(p.id)} />
                <Av name={p.name} size={26} fs={9} />
                <span style={{ flex: 1, fontSize: 12, color: "#111827" }}>{p.name}</span>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>{cur?.name ?? "Sin equipo"}</span>
              </div>
            );
          })}
        </div>
      </Field>
      <Field label="Sesiones por semana"><input type="number" min={0} max={14} style={{ ...inputStyle, width: 120 }} value={ses} onChange={(e) => setSes(e.target.value)} /></Field>
      <Field label="Descripción / Notas (opcional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, height: 60, padding: 10, resize: "none" }} /></Field>
    </Modal>
  );
}

/* ═════════ REPORTES ═════════ */
function Spark({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 60},${28 - ((v - min) / (max - min || 1)) * 26}`).join(" ");
  return <svg width={60} height={30} viewBox="0 0 60 30"><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TrendCard({ label, data, value, delta, up }: { label: string; data: number[]; value: string; delta: string; up: boolean | null }) {
  const c = up === null ? "#94A3B8" : up ? "#22C55E" : "#EF4444";
  return (
    <div style={{ ...card, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, color: "#94A3B8", flex: 1 }}>{label}</span>
        <Spark data={data} color={up === false ? "#EF4444" : "#111827"} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: c, marginTop: 2 }}>{delta}</div>
    </div>
  );
}

function Donut({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const R = 54, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <svg width={150} height={150} viewBox="0 0 150 150">
        <g transform="rotate(-90 75 75)">
          {parts.map((p) => { const len = (p.value / total) * C; const el = <circle key={p.label} cx={75} cy={75} r={R} fill="none" stroke={p.color} strokeWidth={20} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}><title>{`${p.label}: ${p.value}`}</title></circle>; off += len; return el; })}
        </g>
        <text x={75} y={72} textAnchor="middle" fontSize={20} fontWeight={800} fill="#111827">{total}</text>
        <text x={75} y={90} textAnchor="middle" fontSize={10} fill="#94A3B8">total</text>
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", justifyContent: "center" }}>
        {parts.map((p) => (
          <span key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />{p.label} <b>{p.value}</b> <span style={{ color: "#94A3B8" }}>{Math.round((p.value / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function WeekBars({ data }: { data: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  return (
    <div style={{ display: "flex", height: 200, gap: 8, marginTop: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 9, color: "#CBD5E1", paddingBottom: 18, textAlign: "right", width: 28 }}>
        {["100%", "75%", "50%", "25%", "0%"].map((l) => <span key={l}>{l}</span>)}
      </div>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative" }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {hover === i && <span style={{ position: "absolute", bottom: `calc(${v}% + 6px)`, background: "#111827", color: "#FFF", fontSize: 10, borderRadius: 6, padding: "3px 6px", whiteSpace: "nowrap" }}>{v}%</span>}
            <div style={{ width: "60%", maxWidth: 36, height: `${v}%`, background: hover === i ? "#374151" : "#111827", borderRadius: "6px 6px 0 0", transition: "background .15s" }} />
          </div>
          <span style={{ fontSize: 10, color: "#94A3B8", height: 14 }}>{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

function Trend({ up }: { up: boolean }) {
  return up ? <TrendingUp size={14} color="#22C55E" /> : <TrendingDown size={14} color="#EF4444" />;
}
function PctBar({ v }: { v: number }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 60, height: 4, borderRadius: 2, background: "#F1F5F9" }}><span style={{ display: "block", width: `${v}%`, height: 4, borderRadius: 2, background: attColor(v) }} /></span><span style={{ fontSize: 12, color: "#374151" }}>{v}%</span></span>;
}

export function ReportsScreen({ mode, notify }: { mode: Mode; notify: Notify }) {
  const club = mode === "club";
  const [period, setPeriod] = useState("Este mes");
  const cols = "2fr 1fr 1.4fr 1fr 1fr 80px";
  const teamRows = [...INITIAL_TEAMS].map((t) => ({ ...t, pct: Math.round((t.att / t.ath) * 100) })).sort((a, b) => b.pct - a.pct);
  const gymCoaches = initialCoaches(false);
  return (
    <div>
      <Header title="Reportes">
        <Select value={period} onChange={setPeriod} options={["Esta semana", "Este mes", "Este trimestre", "Esta temporada"]} />
        <button style={outlineBtn} onClick={() => notify(`Exportando PDF · ${period}`)}><Download size={12} color="#94A3B8" /> Exportar PDF</button>
      </Header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: "0 32px", marginBottom: 20 }}>
        {club ? (
          <>
            <TrendCard label="Atletas activos" data={[205, 210, 214, 218, 222, 231]} value="231" delta="+14 vs mes ant." up />
            <TrendCard label="Asistencia semanal" data={[84, 86, 83, 88, 85, 87]} value="87%" delta="+2% presentes en práctica" up />
            <TrendCard label="Sesiones completadas" data={[78, 82, 85, 84, 88, 89]} value="89%" delta="Plan remoto · +4%" up />
            <TrendCard label="Equipos activos" data={[10, 10, 11, 11, 12, 12]} value="12" delta="1 sin entrenador" up={null} />
          </>
        ) : (
          <>
            <TrendCard label="Socios activos" data={[290, 301, 310, 318, 319, 342]} value="342" delta="+23 vs mes ant." up />
            <TrendCard label="Asistencia promedio" data={[84, 83, 85, 82, 82, 79]} value="79%" delta="-3% vs mes ant." up={false} />
            <TrendCard label="Ingresos" data={[2.1, 2.2, 2.3, 2.4, 2.41, 2.85]} value="$2.847.000" delta="+18%" up />
            <TrendCard label="Clases completadas" data={[380, 398, 402, 415, 420, 436]} value="436" delta="94% ocupación" up={null} />
          </>
        )}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 32px", marginBottom: 20 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{club ? "Asistencia semanal por equipo" : "Asistencia por día de la semana"}</div>
          {club ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              {teamRows.map((t) => (
                <div key={t.id} title={`${t.name}: ${t.pct}%`} style={{ display: "grid", gridTemplateColumns: "120px 1fr 36px", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  <span style={{ height: 10, background: "#F1F5F9", borderRadius: 5 }}><span style={{ display: "block", height: 10, width: `${t.pct}%`, background: CAT_COLORS[t.cat], borderRadius: 5 }} /></span>
                  <span style={{ fontSize: 11, color: "#374151", textAlign: "right" }}>{t.pct}%</span>
                </div>
              ))}
            </div>
          ) : <WeekBars data={[86, 82, 88, 79, 74, 62, 41]} />}
        </div>
        <div style={{ ...card, padding: 20 }}>
          {club ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Distribución por categoría</div>
              <Donut parts={CATS.map((c) => ({ label: c, value: INITIAL_TEAMS.filter((t) => t.cat === c).reduce((s, t) => s + t.ath, 0), color: c === "Femenino" ? "#F472B6" : CAT_COLORS[c] }))} />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Socios por tipo de membresía</div>
                <Donut parts={[{ label: "Mensual", value: 186, color: "#3B82F6" }, { label: "Trimestral", value: 98, color: "#16A34A" }, { label: "Anual", value: 58, color: "#D97706" }]} />
              </div>
              <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Socios totales por mes</div>
                <MembersLine data={[268, 275, 290, 301, 296, 308, 315, 322, 330, 336, 338, 342]} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section style={{ ...card, overflow: "hidden", margin: "0 32px 32px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", padding: "18px 20px" }}>{club ? "Rendimiento por equipo" : "Rendimiento de coaches"}</div>
        <div style={{ display: "grid", gridTemplateColumns: cols, background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0", padding: "10px 20px" }}>
          {(club ? ["Equipo", "Atletas", "Asistencia sem.", "Sesiones/sem", "Entrenador", "Tendencia"] : ["Coach", "Atletas", "Asistencia", "Clases dadas", "Rating", "Tendencia"]).map((h) => <span key={h} style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>{h}</span>)}
        </div>
        {club
          ? teamRows.map((t, i) => (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #F8FAFC", fontSize: 12, color: "#374151" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#111827" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[t.cat] }} />{t.name}</span>
                <span>{t.ath}</span><PctBar v={t.pct} /><span>{t.ses}</span>
                <span style={{ color: t.coach ? "#374151" : "#94A3B8", fontStyle: t.coach ? "normal" : "italic" }}>{t.coach ?? "Sin asignar"}</span>
                <Trend up={i % 3 !== 2} />
              </div>
            ))
          : gymCoaches.map((c, i) => (
              <div key={c.name} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #F8FAFC", fontSize: 12, color: "#374151" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#111827" }}><Av name={c.name} size={28} fs={10} />{c.name}</span>
                <span>{c.athletes}</span><PctBar v={c.att} /><span>{[64, 48, 72, 55, 60, 20][i]}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Star size={12} color="#EAB308" fill="#EAB308" />{c.rating}</span>
                <Trend up={i !== 2 && i !== 5} />
              </div>
            ))}
      </section>
    </div>
  );
}

/* ═════════ CONFIGURACIÓN ═════════ */
export function SettingsScreen({ mode, notify, onChangeMode, billing, setBilling }: { mode: Mode; notify: Notify; onChangeMode: (m: Mode) => void; billing: boolean; setBilling: (v: boolean) => void }) {
  const club = mode === "club";
  const sections = ["Institución", "Accesos y roles", "Notificaciones", "Integraciones", ...(club ? [] : ["Facturación"])];
  const [sec, setSec] = useState("Institución");
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2, padding: "20px 12px", borderRight: "1px solid #E2E8F0", background: "#FFF" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", padding: "4px 12px 10px" }}>Configuración</div>
        {sections.map((s) => (
          <button key={s} onClick={() => setSec(s)} className={sec === s ? "" : "hover:bg-slate-50"} style={{ textAlign: "left", padding: "8px 12px", borderRadius: 8, border: 0, cursor: "pointer", fontSize: 13, fontWeight: sec === s ? 600 : 500, color: sec === s ? "#111827" : "#374151", background: sec === s ? "#F1F5F9" : "transparent" }}>{s}</button>
        ))}
      </nav>
      <div style={{ flex: 1, padding: "28px 32px", maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 20 }}>{sec}</h1>
        {sec === "Institución" && <InstSection club={club} notify={notify} onChangeMode={onChangeMode} billing={billing} setBilling={setBilling} />}
        {sec === "Accesos y roles" && <AccessSection club={club} notify={notify} />}
        {sec === "Notificaciones" && <NotifSection club={club} />}
        {sec === "Integraciones" && <IntegrationsSection club={club} notify={notify} />}
        {sec === "Facturación" && <BillingSection billing={billing} setBilling={setBilling} notify={notify} />}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div style={{ ...card, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>;
}

function InstSection({ club, notify, onChangeMode, billing, setBilling }: { club: boolean; notify: Notify; onChangeMode: (m: Mode) => void; billing: boolean; setBilling: (v: boolean) => void }) {
  const [name, setName] = useState(club ? "Club Atlético Palermo" : "CrossFit Palermo");
  const [desc, setDesc] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ addr: "", city: "Buenos Aires", country: "Argentina", web: "", phone: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Panel>
      <Field label="Nombre"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Tipo de institución">
        {club ? (
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 400 }}>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>Tipo: Club deportivo</span>
            <button type="button" onClick={() => setConfirm(true)} style={{ fontSize: 11, color: "#94A3B8", background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }}>Cambiar tipo</button>
          </span>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 400 }}>
            <span style={{ fontSize: 11, borderRadius: 6, padding: "3px 10px", color: "#D97706", background: "#FFFBEB", fontWeight: 600 }}>Gimnasio</span>
            <button type="button" onClick={() => setConfirm(true)} style={{ fontSize: 11, color: "#94A3B8", background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }}>Cambiar tipo</button>
          </span>
        )}
      </Field>
      {confirm && (
        <Modal title={club ? "¿Cambiar a Gimnasio?" : "¿Cambiar a Club deportivo?"} width={460} onClose={() => setConfirm(false)} footer={<>
          <button onClick={() => setConfirm(false)} style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF", fontSize: 13, color: "#374151", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => { setConfirm(false); onChangeMode(club ? "gym" : "club"); }} style={{ flex: 1, height: 42, borderRadius: 10, border: 0, background: "#111827", color: "#FFF", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{club ? "Sí, cambiar a Gimnasio" : "Sí, cambiar a Club"}</button>
        </>}>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0 }}>{club ? "Estás por cambiar el tipo de institución de Club deportivo a Gimnasio." : "Estás por cambiar el tipo de institución de Gimnasio a Club deportivo."}{" Este cambio es permanente y afecta el funcionamiento de la plataforma."}</p>
          {(club ? ([
            ["¿Qué cambia?", "#F8FAFC", "#111827", "#94A3B8", undefined, ["El panel cambia a modo Gimnasio: socios, membresías y gestión de clases con reserva de turnos.", "La Facturación pasa a Caja con cuotas mensuales, trimestrales y anuales.", "Los atletas se migran como socios sin membresía asignada."]],
            ["⚠ Lo que se pierde", "#FFF7ED", "#D97706", "#D97706", "1px solid #FED7AA", ["El calendario de prácticas y el historial de asistencia por equipo no se pueden recuperar.", "Los equipos y sus categorías desaparecen.", "Los entrenadores quedan sin equipos asignados."]],
          ] as const) : ([
            ["¿Qué cambia?", "#F8FAFC", "#111827", "#94A3B8", undefined, ["El panel cambia a modo Club: equipos, atletas por categoría y calendario de prácticas.", "La sección de Clases y reserva de turnos desaparece.", "La Caja pasa a Facturación con cuotas anuales por atleta (sin membresías mensuales).", "Los socios actuales se migran como atletas sin equipo asignado."]],
            ["⚠ Lo que se pierde", "#FFF7ED", "#D97706", "#D97706", "1px solid #FED7AA", ["El historial de clases y reservas no se puede recuperar.", "Las membresías (mensual/trimestral/anual) no aplican en modo Club.", "Los coaches tipo 'Instructor de clases' quedan sin rol asignado."]],
          ] as const)).map(([t, bg, tc, ic, bd, items]) => (
            <div key={t} style={{ background: bg, borderRadius: 12, padding: 16, border: bd }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: tc, marginBottom: 10 }}>{t}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((x) => (
                  <div key={x} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <ArrowRight size={12} color={ic} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{x}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Modal>
      )}
      {!club && <Field label="Descripción"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...inputStyle, height: 72, padding: 10, resize: "none" }} /></Field>}
      {club && <Field label="Ciudad"><input style={inputStyle} value={f.city} onChange={set("city")} /></Field>}
      <Field label="Logo">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => setLogo(r.result as string); r.readAsDataURL(file); }} />
        <button type="button" onClick={() => fileRef.current?.click()} style={{ width: 120, height: 120, border: "1.5px dashed #CBD5E1", borderRadius: 12, background: "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", overflow: "hidden", padding: 0 }}>
          {logo ? <img src={logo} alt="Logo de la institución" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <><Upload size={16} color="#94A3B8" /><span style={{ fontSize: 12, color: "#94A3B8" }}>Subir logo</span></>}
        </button>
      </Field>
      {!club && (
        <>
          <Field label="Dirección"><input style={inputStyle} value={f.addr} onChange={set("addr")} placeholder="Av. Siempre Viva 123" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Ciudad"><input style={inputStyle} value={f.city} onChange={set("city")} /></Field>
            <Field label="País"><input style={inputStyle} value={f.country} onChange={set("country")} /></Field>
            <Field label="Sitio web"><input style={inputStyle} value={f.web} onChange={set("web")} placeholder="https://" /></Field>
            <Field label="Teléfono de contacto"><input style={inputStyle} value={f.phone} onChange={set("phone")} /></Field>
          </div>
        </>
      )}
      <button onClick={() => notify("Cambios guardados ✓")} style={{ ...darkBtn, width: "100%", height: 42, borderRadius: 10 }}>Guardar cambios</button>
    </Panel>
  );
}

function AccessSection({ club, notify }: { club: boolean; notify: Notify }) {
  const [admins, setAdmins] = useState([
    { name: "Adolfo Martínez", email: "adolfo@togo.app", role: "Admin" },
    { name: "Laura Benítez", email: "laura.benitez@mail.com", role: "Admin" },
    { name: "Pedro Salas", email: "pedro.salas@mail.com", role: "Visualizador" },
  ]);
  const [seeAll, setSeeAll] = useState(false);
  const [inv, setInv] = useState(false);
  const [mail, setMail] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Administradores</div>
        {admins.map((a) => (
          <div key={a.email} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Av name={a.name} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{a.name}</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{a.email}</div>
            </div>
            <Pill bg={a.role === "Admin" ? "#F1F5F9" : "#EFF6FF"} fg={a.role === "Admin" ? "#111827" : "#3B82F6"}>{a.role}</Pill>
            {a.name !== "Adolfo Martínez" && <button onClick={() => { setAdmins((x) => x.filter((y) => y.email !== a.email)); notify(`${a.name} removido`); }} style={{ fontSize: 12, color: "#EF4444", background: "none", border: 0, cursor: "pointer" }}>Quitar</button>}
          </div>
        ))}
        {inv ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input autoFocus style={inputStyle} type="email" placeholder="email@ejemplo.com" value={mail} onChange={(e) => setMail(e.target.value)} />
            <button style={darkBtn} disabled={!/\S+@\S+\.\S+/.test(mail)} onClick={() => { setAdmins((x) => [...x, { name: mail.split("@")[0]!, email: mail, role: "Visualizador" }]); notify("Invitación enviada ✓"); setMail(""); setInv(false); }}>Invitar</button>
          </div>
        ) : (
          <button onClick={() => setInv(true)} style={{ ...outlineBtn, alignSelf: "flex-start" }}><Plus size={12} color="#94A3B8" /> Invitar administrador</button>
        )}
      </Panel>
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{club ? "Los entrenadores pueden ver todos los atletas" : "Los coaches pueden ver todos los socios"}</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>Si está apagado, cada {club ? "entrenador" : "coach"} solo ve los suyos.</div>
          </div>
          <Toggle36 on={seeAll} onChange={setSeeAll} label="Visibilidad" />
        </div>
      </Panel>
    </div>
  );
}

function NotifSection({ club }: { club: boolean }) {
  const items: [string, string][] = [
    [club ? "Nuevo atleta registrado" : "Nuevo socio registrado", "Cuando alguien se une a la institución."],
    ...(!club ? ([["Cuota vencida", "Cuando un socio no pagó su membresía."], ["Solicitudes de coach personal", "Cuando un socio pide planificación personalizada."]] as [string, string][]) : []),
    ...(club ? ([["Equipo sin sesiones esta semana", "Cuando un equipo no tiene prácticas planificadas."], ["Atleta con asistencia baja", "Menos del 60% de asistencia en las últimas 2 semanas."]] as [string, string][]) : []),
    ["Coach inactivo más de 7 días", "Cuando un entrenador no registra actividad."],
  ];
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map(([l]) => [l, true])));
  return (
    <Panel>
      {items.map(([l, d], i) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: i < items.length - 1 ? 14 : 0, borderBottom: i < items.length - 1 ? "1px solid #F1F5F9" : "none" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{l}</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>{d}</div>
          </div>
          <Toggle36 on={!!on[l]} onChange={(v) => setOn((x) => ({ ...x, [l]: v }))} label={l} />
        </div>
      ))}
    </Panel>
  );
}

function IntegrationsSection({ club, notify }: { club: boolean; notify: Notify }) {
  const all = [
    { name: "Mercado Pago", desc: "Procesá pagos de membresías directamente.", color: "#009EE3" },
    { name: "Strava", desc: "Sincronizá actividades automáticamente.", color: "#FC4C02" },
    { name: "Google Calendar", desc: `Exportá el calendario de ${club ? "prácticas" : "clases"}.`, color: "#4285F4" },
  ];
  const list = club ? [...all.slice(1), all[0]!] : all;
  const [conn, setConn] = useState<Set<string>>(new Set());
  return (
    <Panel>
      {list.map((it, i) => {
        const on = conn.has(it.name);
        return (
          <div key={it.name} style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: i < list.length - 1 ? 14 : 0, borderBottom: i < list.length - 1 ? "1px solid #F1F5F9" : "none" }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: tint(it.color), color: it.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{initials(it.name)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{it.name}</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{it.desc}</div>
            </div>
            <button onClick={() => { setConn((s) => { const n = new Set(s); on ? n.delete(it.name) : n.add(it.name); return n; }); notify(on ? `${it.name} desconectado` : `${it.name} conectado`); }}
              style={on ? { ...outlineBtn, height: 32, color: "#16A34A", borderColor: "#BBF7D0", background: "#F0FDF4" } : { ...darkBtn, height: 32, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
              {on ? "Conectado ✓" : <><Link2 size={12} /> Conectar</>}
            </button>
          </div>
        );
      })}
    </Panel>
  );
}

function BillingSection({ billing, setBilling, notify }: { billing: boolean; setBilling: (v: boolean) => void; notify: Notify }) {
  const [currency, setCurrency] = useState("ARS");
  const [prices, setPrices] = useState({ Mensual: "12000", Trimestral: "32000", Anual: "115000" });
  const [renew, setRenew] = useState(true);
  const [grace, setGrace] = useState("3");
  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Activar módulo de facturación</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>Cobrá membresías y controlá cuotas desde TOGO.</div>
        </div>
        <Toggle36 on={billing} onChange={setBilling} label="Activar módulo de facturación" />
      </div>
      {billing && (
        <>
          <Field label="Moneda">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ ...inputStyle, width: 160 }}>{["ARS", "USD", "BRL", "CLP"].map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Precios de membresía</div>
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
              {(Object.keys(prices) as (keyof typeof prices)[]).map((k, i) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", borderTop: i ? "1px solid #F1F5F9" : "none" }}>
                  <span style={{ flex: 1, fontSize: 13, color: "#111827" }}>{k}</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>{currency} $</span>
                  <input type="number" min={0} value={prices[k]} onChange={(e) => setPrices((p) => ({ ...p, [k]: e.target.value }))} style={{ ...inputStyle, width: 140, height: 34 }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Renovación automática</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Renovar membresías al vencer.</div>
            </div>
            <Toggle36 on={renew} onChange={setRenew} label="Renovación automática" />
          </div>
          <Field label="Días de gracia tras vencimiento"><input type="number" min={0} value={grace} onChange={(e) => setGrace(e.target.value)} style={{ ...inputStyle, width: 120 }} /></Field>
          <button onClick={() => notify("Facturación actualizada")} style={{ ...darkBtn, width: "100%", height: 42, borderRadius: 10 }}>Guardar cambios</button>
        </>
      )}
    </Panel>
  );
}
