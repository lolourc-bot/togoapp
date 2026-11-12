import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2, X, Calendar, MapPin, User, Download, DollarSign, CheckCircle, AlertCircle, Clock, Users, Search } from "lucide-react";
import {
  Av, Header, FChip, Pill, DotMenu, Modal, ModalFooter, Field, ChipPicker, Toggle36,
  card, outlineBtn, darkBtn, inputStyle, INITIAL_TEAMS, CLUB_COACHES, SPORT_COLORS, PLAN_STYLE,
  initialClub, initialGym, type Team,
} from "./InstScreens";
import { COACHES as GYM_COACHES } from "@/lib/gym-classes";

type Notify = (m: string) => void;
const tint = (hex: string, a = "1F") => `${hex}${a}`;
const TODAY = new Date(2026, 9, 6);
const DAY_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const DAY_CHIPS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y!, m! - 1, d!); };
const dow = (d: Date) => (d.getDay() + 6) % 7;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monday = (d: Date) => addDays(d, -dow(d));
const same = (a: Date, b: Date) => key(a) === key(b);

type Practice = { id: string; teamId: string; date: string; start: string; end: string; name?: string | undefined; place?: string | undefined; coach?: string | null; notes?: string | undefined };

const PLACES = ["Campo principal", "Cancha 2", "Gimnasio B", "Campo auxiliar"];
const PATTERNS = [[0, 2, 4], [1, 3], [0, 2, 4, 5], [1, 3, 5], [0, 1, 3, 4]];
const TIMES = [["09:00", "11:00"], ["17:00", "18:30"], ["18:30", "20:00"], ["19:00", "21:00"], ["10:00", "12:00"]];
function seed(): Practice[] {
  const out: Practice[] = [];
  INITIAL_TEAMS.forEach((t, ti) => {
    const pat = PATTERNS[ti % PATTERNS.length]!.slice(0, Math.max(2, Math.min(t.ses, 4)));
    const [s, e] = TIMES[ti % TIMES.length]!;
    for (let d = new Date(2026, 8, 28); d < new Date(2026, 10, 9); d = addDays(d, 1)) {
      if (!pat.includes(dow(d))) continue;
      out.push({ id: `p${t.id}-${key(d)}`, teamId: t.id, date: key(d), start: s!, end: e!, place: ti % 4 === 3 ? undefined : PLACES[ti % PLACES.length], coach: t.coach, name: dow(d) === 5 ? "Partido amistoso" : undefined });
    }
  });
  return out;
}
const teamOf = (id: string) => INITIAL_TEAMS.find((t) => t.id === id)!;
const colorOf = (t: Team) => SPORT_COLORS[t.sport];

/* ═════════ CALENDARIO DE PRÁCTICAS ═════════ */
export function PracticeCalendar({ notify }: { notify: Notify }) {
  const [practices, setPractices] = useState<Practice[]>(seed);
  const [view, setView] = useState<"Semana" | "Mes">("Semana");
  const [anchor, setAnchor] = useState(TODAY);
  const [team, setTeam] = useState("all");
  const [open, setOpen] = useState<Practice | null>(null);
  const [editing, setEditing] = useState<{ p?: Practice; teamId?: string; date?: string; start?: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = practices.filter((p) => team === "all" || p.teamId === team);
  const wk = monday(anchor);
  const label = view === "Semana"
    ? `${wk.getDate()} – ${addDays(wk, 6).getDate()} ${cap(MONTHS[addDays(wk, 6).getMonth()]!)} ${addDays(wk, 6).getFullYear()}`
    : `${cap(MONTHS[anchor.getMonth()]!)} ${anchor.getFullYear()}`;
  const move = (n: number) => setAnchor((a) => (view === "Semana" ? addDays(a, 7 * n) : new Date(a.getFullYear(), a.getMonth() + n, 1)));

  const save = (list: Practice[], isEdit: boolean) => {
    setPractices((ps) => (isEdit ? ps.map((p) => (p.id === list[0]!.id ? list[0]! : p)) : [...ps, ...list]));
    setEditing(null);
    setOpen(null);
    notify(isEdit ? "Práctica actualizada" : list.length > 1 ? "Práctica creada ✓" : "Práctica creada ✓");
  };

  return (
    <div>
      <header style={{ padding: "24px 32px 0", display: "flex", alignItems: "center", marginBottom: 20, gap: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", flex: 1 }}>Calendario de prácticas</h1>
        <button aria-label="Anterior" onClick={() => move(-1)} style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}><ChevronLeft size={16} color="#374151" /></button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", minWidth: 130, textAlign: "center" }}>{label}</span>
        <button aria-label="Siguiente" onClick={() => move(1)} style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}><ChevronRight size={16} color="#374151" /></button>
        <div style={{ display: "flex", border: "1px solid #E2E8F0", borderRadius: 9, overflow: "hidden" }}>
          {(["Semana", "Mes"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "7px 14px", fontSize: 12, border: 0, cursor: "pointer", background: view === v ? "#111827" : "#FFF", color: view === v ? "#FFF" : "#374151" }}>{v}</button>
          ))}
        </div>
        <button style={darkBtn} onClick={() => setEditing({})}>＋ Agregar práctica</button>
      </header>

      <div style={{ padding: "0 32px", display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
        <FChip on={team === "all"} onClick={() => setTeam("all")}>Todos los equipos</FChip>
        {INITIAL_TEAMS.map((t) => (
          <FChip key={t.id} on={team === t.id} onClick={() => setTeam(t.id)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: colorOf(t) }} />{t.name}</span>
          </FChip>
        ))}
      </div>

      {view === "Semana" ? (
        <div style={{ ...card, overflow: "hidden", margin: "0 32px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "64px repeat(7, 1fr)", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            <span />
            {DAY_SHORT.map((d, i) => {
              const date = addDays(wk, i);
              const today = same(date, TODAY);
              return (
                <div key={d} style={{ padding: "10px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8" }}>{d}</div>
                  <div style={{ margin: "4px auto 0", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, background: today ? "#111827" : "transparent", color: today ? "#FFF" : "#111827" }}>{date.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div style={{ position: "relative" }}>
          <NowLine />
          {HOURS.map((h, hi) => (
            <div key={h} style={{ display: "grid", gridTemplateColumns: "64px repeat(7, 1fr)", background: hi % 2 ? "#FAFAFA" : "#FFFFFF" }}>
              <div style={{ fontSize: 10, color: "#CBD5E1", textAlign: "right", paddingRight: 10, paddingTop: 4, borderRight: "1px solid #F1F5F9" }}>{String(h).padStart(2, "0")}:00</div>
              {DAY_SHORT.map((_, i) => {
                const date = key(addDays(wk, i));
                const lanes = laneMap(visible.filter((p) => p.date === date));
                const starting = visible.filter((p) => p.date === date && Math.floor(toMin(p.start) / 60) === h);
                const busy = visible.some((p) => p.date === date && toMin(p.start) < (h + 1) * 60 && toMin(p.end) > h * 60);
                return (
                  <div key={i} className="group" style={{ height: SLOT, borderRight: "1px solid #F1F5F9", borderBottom: "1px solid #F8FAFC", padding: 4, position: "relative" }}>
                    {starting.map((p) => <PracticeBlock key={p.id} p={p} t={teamOf(p.teamId)} n={lanes.get(p.id)?.[1] ?? 1} j={lanes.get(p.id)?.[0] ?? 0} onClick={() => setOpen(p)} />)}
                    {!busy && (
                      <button aria-label={`Agregar práctica ${date} ${h}:00`} onClick={() => setEditing({ date, start: `${String(h).padStart(2, "0")}:00` })} className="opacity-0 group-hover:opacity-100" style={{ position: "absolute", inset: 0, background: "none", border: 0, cursor: "pointer", fontSize: 12, color: "#CBD5E1" }}>＋</button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          </div>
        </div>
      ) : (
        <MonthGrid anchor={anchor} practices={visible} expanded={expanded} setExpanded={setExpanded} onOpen={setOpen} />
      )}

      {open && (
        <PracticePanel p={open} onClose={() => setOpen(null)} notify={notify}
          onEdit={() => setEditing({ p: open })}
          onDelete={() => { setPractices((ps) => ps.filter((x) => x.id !== open.id)); setOpen(null); notify("Práctica eliminada"); }} />
      )}
      {editing && <PracticeModal init={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

const SLOT = 60;
function NowLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const m = now.getHours() * 60 + now.getMinutes() - HOURS[0]! * 60;
  if (m < 0 || m > HOURS.length * 60) return null;
  const top = (m / 60) * SLOT;
  return (
    <div style={{ position: "absolute", left: 64, right: 0, top, height: 0, borderTop: "1.5px solid #EF4444", zIndex: 5, pointerEvents: "none" }}>
      <span style={{ position: "absolute", left: -3, top: -3.75, width: 6, height: 6, borderRadius: "50%", background: "#EF4444" }} />
    </div>
  );
}
function laneMap(ps: Practice[]) {
  const m = new Map<string, [number, number]>();
  const sorted = [...ps].sort((a, b) => toMin(a.start) - toMin(b.start));
  let cluster: Practice[] = []; let ends: number[] = []; let maxEnd = -1;
  const flush = () => { cluster.forEach((p) => m.set(p.id, [m.get(p.id)![0], ends.length])); cluster = []; ends = []; };
  for (const p of sorted) {
    if (toMin(p.start) >= maxEnd) flush();
    let l = ends.findIndex((e) => e <= toMin(p.start)); if (l < 0) l = ends.length;
    ends[l] = toMin(p.end); maxEnd = Math.max(maxEnd, toMin(p.end));
    m.set(p.id, [l, 0]); cluster.push(p);
  }
  flush();
  return m;
}
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h! * 60 + m!; };
function PracticeBlock({ p, t, n, j, onClick }: { p: Practice; t: Team; n: number; j: number; onClick: () => void }) {
  const c = colorOf(t);
  const top = 4 + ((toMin(p.start) % 60) / 60) * SLOT;
  const height = Math.max(40, ((toMin(p.end) - toMin(p.start)) / 60) * SLOT - 4);
  const ell: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  return (
    <button onClick={onClick} className="group/b" title={`${t.name} · ${p.start} – ${p.end}`} style={{ position: "absolute", top, left: `calc(4px + ${j} * (100% - 8px) / ${n})`, width: `calc((100% - 8px) / ${n} - ${n > 1 ? 2 : 0}px)`, height, zIndex: 2, overflow: "hidden", textAlign: "left", borderRadius: 10, padding: "8px 10px", background: `color-mix(in srgb, ${c} 10%, #FFF)`, border: 0, borderLeft: `3px solid ${c}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer", minWidth: 0, display: "flex", flexDirection: "column", gap: 2, justifyContent: "flex-start" }}>
      <Pencil size={11} color="#94A3B8" className="opacity-0 group-hover/b:opacity-100" style={{ position: "absolute", top: 5, right: 5 }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: "#111827", ...ell }}>{t.name}</div>
      {height > 40 && <div style={{ fontSize: 10, fontWeight: 500, color: c, ...ell }}>{p.start} – {p.end}</div>}
      {p.place && height > 80 && <div style={{ fontSize: 9, color: "#94A3B8", ...ell }}>{p.place}</div>}
    </button>
  );
}

function MonthGrid({ anchor, practices, expanded, setExpanded, onOpen }: { anchor: Date; practices: Practice[]; expanded: string | null; setExpanded: (k: string | null) => void; onOpen: (p: Practice) => void }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = monday(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weeks = days[35]!.getMonth() !== anchor.getMonth() ? days.slice(0, 35) : days;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "#E2E8F0", borderRadius: 14, overflow: "hidden", margin: "0 32px 32px", border: "1px solid #E2E8F0" }}>
      {DAY_CHIPS.map((d) => <div key={d} style={{ background: "#F8FAFC", fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", padding: 8, textAlign: "center" }}>{d}</div>)}
      {weeks.map((d) => {
        const k = key(d);
        const out = d.getMonth() !== anchor.getMonth();
        const today = same(d, TODAY);
        const ps = practices.filter((p) => p.date === k).sort((a, b) => a.start.localeCompare(b.start));
        const all = expanded === k || ps.length <= 3;
        const shown = all ? ps : ps.slice(0, 2);
        return (
          <div key={k} style={{ background: out ? "#FAFAFA" : "#FFF", minHeight: 110, padding: 8, minWidth: 0 }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, background: today ? "#111827" : "transparent", color: today ? "#FFF" : out ? "#CBD5E1" : "#374151" }}>{d.getDate()}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
              {shown.map((p) => {
                const t = teamOf(p.teamId);
                const c = colorOf(t);
                return (
                  <button key={p.id} onClick={() => onOpen(p)} style={{ textAlign: "left", borderRadius: 5, padding: "3px 7px", border: 0, borderLeft: `3px solid ${c}`, background: tint(c, "1A"), cursor: "pointer", display: "flex", gap: 4, alignItems: "baseline", minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{t.name}</span>
                    <span style={{ fontSize: 9, color: "#94A3B8", flexShrink: 0 }}>{p.start}</span>
                  </button>
                );
              })}
              {!all && <button onClick={() => setExpanded(k)} style={{ textAlign: "left", fontSize: 10, color: "#3B82F6", background: "none", border: 0, cursor: "pointer", padding: 0 }}>+ {ps.length - 2} más</button>}
              {expanded === k && ps.length > 3 && <button onClick={() => setExpanded(null)} style={{ textAlign: "left", fontSize: 10, color: "#94A3B8", background: "none", border: 0, cursor: "pointer", padding: 0 }}>Ver menos</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SlideIn({ width, onClose, head, children }: { width: number; onClose: () => void; head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(15,23,42,.15)" }}>
      <aside onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width, background: "#FFF", boxShadow: "-8px 0 32px rgba(0,0,0,.1)", display: "flex", flexDirection: "column", animation: "slideInR .2s ease-out" }}>
        <style>{"@keyframes slideInR{from{transform:translateX(100%)}to{transform:none}}"}</style>
        <div style={{ background: "#111827", padding: "18px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>{head}</div>
          <button aria-label="Cerrar" onClick={onClose} style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}><X size={16} color="#FFF" /></button>
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>{children}</div>
      </aside>
    </div>
  );
}

function MiniToggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange} style={{ width: 28, height: 16, borderRadius: 8, border: 0, background: on ? "#22C55E" : "#E2E8F0", position: "relative", cursor: "pointer", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#FFF", transition: "left .15s" }} />
    </button>
  );
}

function PracticePanel({ p, onClose, onEdit, onDelete, notify }: { p: Practice; onClose: () => void; onEdit: () => void; onDelete: () => void; notify: Notify }) {
  const t = teamOf(p.teamId);
  const c = colorOf(t);
  const d = parse(p.date);
  const roster = useMemo(() => {
    const own = initialClub().filter((a) => a.teamId === t.id).map((a) => a.name);
    const extra = ["Ignacio Vera", "Matías Sanz", "Santino Díaz", "Lisandro Ortiz", "Agustín Rojas", "Facundo Ibáñez"];
    return [...own, ...extra].slice(0, Math.max(6, Math.min(t.ath, 8)));
  }, [t]);
  const [present, setPresent] = useState<Set<string>>(() => new Set(roster.filter((_, i) => i % 5 !== 3)));
  const row = (icon: React.ReactNode, text: React.ReactNode, empty = false) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: empty ? "#94A3B8" : "#374151", fontStyle: empty ? "italic" : "normal" }}>{icon}{text}</div>
  );
  return (
    <SlideIn width={320} onClose={onClose} head={<>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#FFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: c, background: tint(c, "33"), borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>{t.sportName ?? t.sport}</span>
    </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {p.name && <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{p.name}</div>}
        {row(<Calendar size={13} color="#94A3B8" />, `${DAY_LONG[dow(d)]} ${d.getDate()} de ${MONTHS[d.getMonth()]} · ${p.start} – ${p.end}`)}
        {row(<MapPin size={13} color="#94A3B8" />, p.place || "Sin ubicación", !p.place)}
        {row(<User size={13} color="#94A3B8" />, p.coach || "Sin entrenador asignado", !p.coach)}
        <div style={{ marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" }}>Asistencia</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#374151" }}>{present.size} / {roster.length}</span>
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {roster.map((n) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Av name={n} size={26} fs={9} />
                <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{n}</span>
                <MiniToggle on={present.has(n)} label={`Presente ${n}`} onChange={() => setPresent((s) => { const x = new Set(s); if (x.has(n)) x.delete(n); else x.add(n); return x; })} />
              </div>
            ))}
          </div>
          <button onClick={() => notify(`Asistencia guardada · ${present.size}/${roster.length}`)} style={{ width: "100%", border: "1px solid #E2E8F0", borderRadius: 9, height: 36, fontSize: 12, color: "#374151", background: "#FFF", cursor: "pointer", marginTop: 8 }}>Guardar asistencia</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={onEdit} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, border: "1px solid #E2E8F0", borderRadius: 9, height: 36, fontSize: 12, color: "#374151", background: "#FFF", cursor: "pointer" }}><Pencil size={12} color="#94A3B8" />Editar práctica</button>
          <button onClick={onDelete} style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid #FEE2E2", borderRadius: 9, height: 36, padding: "0 14px", fontSize: 12, color: "#EF4444", background: "#FFF", cursor: "pointer" }}><Trash2 size={12} />Eliminar</button>
        </div>
      </div>
    </SlideIn>
  );
}

function PracticeModal({ init, onClose, onSave }: { init: { p?: Practice; teamId?: string; date?: string; start?: string }; onClose: () => void; onSave: (ps: Practice[], isEdit: boolean) => void }) {
  const p = init.p;
  const baseDate = p ? parse(p.date) : init.date ? parse(init.date) : TODAY;
  const [teamId, setTeamId] = useState(p?.teamId ?? init.teamId ?? INITIAL_TEAMS[0]!.id);
  const [days, setDays] = useState<number[]>([dow(baseDate)]);
  const [rec, setRec] = useState(false);
  const [start, setStart] = useState(p?.start ?? init.start ?? "18:00");
  const [end, setEnd] = useState(p?.end ?? (init.start ? `${String(Number(init.start.slice(0, 2)) + 1).padStart(2, "0")}:30` : "19:30"));
  const [place, setPlace] = useState(p?.place ?? "");
  const team = teamOf(teamId);
  const [coach, setCoach] = useState(p?.coach ?? team.coach ?? "");
  const [notes, setNotes] = useState(p?.notes ?? "");
  const coachOpts = team.coach ? [team.coach, ...CLUB_COACHES.filter((c) => c !== team.coach)] : CLUB_COACHES;
  const toggleDay = (i: number) => setDays((d) => (rec ? (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]) : [i]));
  const ok = days.length > 0 && start < end;
  const submit = () => {
    const wk = monday(baseDate);
    const common = { teamId, start, end, place: place.trim() || undefined, coach: coach || null, notes: notes.trim() || undefined, name: p?.name };
    if (p) return onSave([{ ...p, ...common, date: key(addDays(wk, days[0]!)) }], true);
    const list: Practice[] = [];
    const weeks = rec ? 8 : 1;
    for (let w = 0; w < weeks; w++) for (const d of days) list.push({ ...common, id: `n${Date.now()}-${w}-${d}`, date: key(addDays(wk, w * 7 + d)) });
    onSave(list, false);
  };
  return (
    <Modal title={p ? "Editar práctica" : "Agregar práctica"} width={440} onClose={onClose} footer={<ModalFooter onCancel={onClose} onOk={submit} ok="Guardar práctica" disabled={!ok} />}>
      <Field label="Equipo">
        <select style={inputStyle} value={teamId} onChange={(e) => { setTeamId(e.target.value); setCoach(teamOf(e.target.value).coach ?? ""); }}>
          {INITIAL_TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Día">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DAY_CHIPS.map((d, i) => {
            const on = days.includes(i);
            return <button key={d} type="button" aria-pressed={on} onClick={() => toggleDay(i)} style={{ border: `1px solid ${on ? "#111827" : "#E2E8F0"}`, borderRadius: 20, padding: "6px 12px", fontSize: 12, background: on ? "#111827" : "#FFF", color: on ? "#FFF" : "#374151", cursor: "pointer" }}>{d}</button>;
          })}
        </div>
      </Field>
      {!p && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Toggle36 on={rec} onChange={(v) => { setRec(v); if (!v) setDays((d) => d.slice(0, 1)); }} label="Recurrente" />
          <div>
            <div style={{ fontSize: 13, color: "#374151" }}>Recurrente</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>{rec ? "Se repite cada semana en los días elegidos." : "Práctica única."}</div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Hora de inicio"><input type="time" style={inputStyle} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Hora de fin"><input type="time" style={inputStyle} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Lugar (opcional)"><input style={inputStyle} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ej. Campo principal, Gimnasio B" /></Field>
      <Field label="Entrenador (opcional)">
        <select style={inputStyle} value={coach} onChange={(e) => setCoach(e.target.value)}>
          <option value="">Sin entrenador</option>
          {coachOpts.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Notas (opcional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, height: 48, padding: 10, resize: "none" }} /></Field>
    </Modal>
  );
}

/* ═════════ FACTURACIÓN ═════════ */
type Bill = { id: string; name: string; email: string; plan: "Mensual" | "Trimestral" | "Anual"; coach: string | null; teamId?: string | undefined; amount: number; due: string; lastPay: string | null; status: string };
const money = (n: number) => `$${n.toLocaleString("es-AR")}`;
const PRICES = { Mensual: 11900, Trimestral: 32000, Anual: 119000 };
const fmtDate = (k: string) => { const d = parse(k); return `${d.getDate()} ${MONTHS[d.getMonth()]!.slice(0, 3)} ${d.getFullYear()}`; };
const GYM_ST: Record<string, [string, string]> = { "Al día": ["#DCFCE7", "#16A34A"], Vencido: ["#FEE2E2", "#EF4444"], Próximo: ["#FEF9C3", "#D97706"] };
const CLUB_ST: Record<string, [string, string]> = { "Al día": ["#DCFCE7", "#16A34A"], Impago: ["#FEE2E2", "#EF4444"], Parcial: ["#FEF9C3", "#D97706"] };

function seedBills(club: boolean): Bill[] {
  if (club) return initialClub().map((p, i) => {
    const st = i % 5 === 2 ? "Impago" : i % 7 === 4 ? "Parcial" : "Al día";
    return { ...p, amount: 24000, due: "2026-03-31", lastPay: st === "Impago" ? null : key(addDays(TODAY, -((i * 13) % 120) - 3)), status: st };
  });
  return initialGym().map((p, i) => {
    const st = p.status === "Cuota vencida" || i % 9 === 5 ? "Vencido" : i % 6 === 2 ? "Próximo" : "Al día";
    const due = st === "Vencido" ? addDays(TODAY, -((i % 8) + 2)) : st === "Próximo" ? addDays(TODAY, (i % 5) + 1) : addDays(TODAY, 10 + (i % 18));
    return { ...p, amount: PRICES[p.plan], due: key(due), lastPay: key(addDays(due, p.plan === "Mensual" ? -30 : p.plan === "Trimestral" ? -90 : -365)), status: st };
  });
}

export function BillingScreen({ mode, notify }: { mode: "club" | "gym"; notify: Notify }) {
  const club = mode === "club";
  const [rows, setRows] = useState<Bill[]>(() => seedBills(club));
  const [period, setPeriod] = useState("Este mes");
  const [f, setF] = useState("Todos");
  const [who, setWho] = useState("all");
  const [q, setQ] = useState("");
  const [paying, setPaying] = useState<{ b: Bill; partial: boolean } | null>(null);
  const [hist, setHist] = useState<Bill | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>(SEED_EXPENSES);
  const teamName = (id?: string) => INITIAL_TEAMS.find((t) => t.id === id);
  const list = rows.filter((r) =>
    (f === "Todos" || r.status === (f === "Próximo a vencer" ? "Próximo" : f)) &&
    (who === "all" || (club ? r.teamId === who : r.coach === who)) &&
    r.name.toLowerCase().includes(q.toLowerCase()),
  );
  const st = club ? CLUB_ST : GYM_ST;
  type K = { l: string; icon: typeof DollarSign; v: string; s: string; sc?: string; vc?: string; b?: string; fs?: number };
  const kpis: K[] = club
    ? [
        { l: "Cuotas cobradas este año", icon: DollarSign, v: "$1.240.000", s: "+12% vs año ant.", sc: "#22C55E" },
        { l: "Atletas al día", icon: CheckCircle, v: "198", s: "de 234 atletas" },
        { l: "Cuotas impagas", icon: AlertCircle, v: "36", s: "$288.000 pendientes" },
        { l: "Por equipo con mayor deuda", icon: Users, v: "Sub-16 Rugby", fs: 18, s: "8 atletas impagos" },
      ]
    : [
        { l: "Ingresos del mes", icon: DollarSign, v: "$2.847.000", s: "+18% vs mes ant.", sc: "#22C55E" },
        { l: "Cuotas cobradas", icon: CheckCircle, v: "318", s: "de 342 socios activos" },
        { l: "Cuotas vencidas", icon: AlertCircle, v: "24", s: "$384.000 pendientes" },
        { l: "Próximos vencimientos", icon: Clock, v: "37", vc: "#D97706", s: "vencen esta semana", b: "#FEF9C3" },
      ];
  const cols = "2fr 1fr 1fr 1fr 1fr 100px";
  const sel: React.CSSProperties = { height: 32, border: "1px solid #E2E8F0", borderRadius: 20, padding: "0 12px", fontSize: 12, color: "#374151", background: "#FFF", cursor: "pointer" };
  const actBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, border: "1px solid #E2E8F0", borderRadius: 7, padding: "4px 10px", fontSize: 11, color: "#374151", background: "#FFF", cursor: "pointer", whiteSpace: "nowrap" };

  return (
    <div>
      <Header title={club ? "Facturación" : "Caja"}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ ...sel, height: 36, borderRadius: 9 }}>
          {["Este mes", "Último trimestre", "Este año"].map((o) => <option key={o}>{o}</option>)}
        </select>
        <button style={outlineBtn} onClick={() => notify(`Exportando ${club ? "facturación" : "caja"} · ${period}`)}><Download size={12} color="#94A3B8" />Exportar</button>
      </Header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: "0 32px", marginBottom: 24 }}>
        {kpis.map((k) => (
          <div key={k.l} style={{ ...card, padding: 18, border: `1px solid ${k.b ?? "#E2E8F0"}` }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#94A3B8" }}><span style={{ flex: 1 }}>{k.l}</span><k.icon size={16} color="#94A3B8" /></div>
            <div style={{ fontSize: k.fs ?? 24, fontWeight: 800, color: k.vc ?? "#111827", marginTop: 8 }}>{k.v}</div>
            <div style={{ fontSize: 11, color: k.sc ?? "#94A3B8", marginTop: 4 }}>{k.s}</div>
          </div>
        ))}
      </div>

      {!club && <CajaSummary expenses={expenses} />}

      <div style={{ padding: "0 32px", display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(club ? ["Todos", "Al día", "Impago", "Parcial"] : ["Todos", "Al día", "Vencido", "Próximo a vencer"]).map((c) => <FChip key={c} on={f === c} onClick={() => setF(c)}>{c}</FChip>)}
        <select value={who} onChange={(e) => setWho(e.target.value)} style={sel}>
          <option value="all">{club ? "Todos los equipos" : "Todos los coaches"}</option>
          {club ? INITIAL_TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>) : GYM_COACHES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <Search size={13} color="#CBD5E1" style={{ position: "absolute", left: 12, top: 11.5 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={club ? "Buscar atleta…" : "Buscar socio…"} style={{ width: 220, height: 36, border: "1px solid #E2E8F0", borderRadius: 9, padding: "0 12px 0 34px", fontSize: 12, outline: "none" }} />
        </div>
      </div>

      <div style={{ ...card, overflow: "visible", margin: "0 32px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", padding: "10px 20px", borderRadius: "14px 14px 0 0" }}>
          {(club ? ["Atleta", "Equipo", "Cuota anual", "Último pago", "Estado", ""] : ["Socio", "Membresía", "Monto", "Vencimiento", "Estado", ""]).map((h, i) => <span key={i} style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>{h}</span>)}
        </div>
        {!list.length && <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>No hay resultados.</div>}
        {list.map((r) => {
          const t = teamName(r.teamId);
          const [bg, fg] = st[r.status]!;
          const late = !club && r.status === "Vencido";
          const canPay = club ? r.status !== "Al día" : r.status !== "Al día";
          return (
            <div key={r.id} className="hover:bg-[#FAFAFA]" style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #F8FAFC" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Av name={r.name} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</div>
                </div>
              </div>
              {club ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", minWidth: 0 }}>
                  {t && <span style={{ width: 6, height: 6, borderRadius: "50%", background: colorOf(t), flexShrink: 0 }} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t?.name ?? "—"}</span>
                </span>
              ) : <span><Pill bg={PLAN_STYLE[r.plan][0]} fg={PLAN_STYLE[r.plan][1]}>{r.plan}</Pill></span>}
              <span style={{ fontSize: 13, color: "#374151" }}>{money(r.amount)}</span>
              {club
                ? <span style={{ fontSize: 12, color: r.lastPay ? "#374151" : "#94A3B8", fontStyle: r.lastPay ? "normal" : "italic" }}>{r.lastPay ? fmtDate(r.lastPay) : "Sin pagos"}</span>
                : <span style={{ fontSize: 12, color: late ? "#EF4444" : "#374151" }}>{fmtDate(r.due)}</span>}
              <span><Pill bg={bg} fg={fg}>{r.status}</Pill></span>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                {canPay && <button style={actBtn} onClick={() => setPaying({ b: r, partial: false })}><CheckCircle size={11} color="#94A3B8" />{club ? "Registrar pago" : "Marcar pagado"}</button>}
                <DotMenu options={club ? ["Ver historial de pagos", "Enviar recordatorio", "Registrar pago parcial"] : ["Ver historial de pagos", "Enviar recordatorio", "Cambiar membresía"]} onPick={(o) => {
                  if (o === "Ver historial de pagos") return setHist(r);
                  if (o === "Registrar pago parcial") return setPaying({ b: r, partial: true });
                  if (o === "Cambiar membresía") {
                    const next = r.plan === "Mensual" ? "Trimestral" : r.plan === "Trimestral" ? "Anual" : "Mensual";
                    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, plan: next, amount: PRICES[next] } : x)));
                    return notify(`${r.name} pasó a ${next}`);
                  }
                  notify(`Recordatorio enviado a ${r.name}`);
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {!club && <ExpensesSection expenses={expenses} setExpenses={setExpenses} notify={notify} />}

      {paying && <PayModal club={club} b={paying.b} partial={paying.partial} onClose={() => setPaying(null)} onConfirm={(amt) => {
        const full = amt >= paying.b.amount;
        setRows((rs) => rs.map((x) => (x.id === paying.b.id ? { ...x, status: full ? "Al día" : club ? "Parcial" : x.status, lastPay: key(TODAY), due: !club && full ? key(addDays(parse(x.due), x.plan === "Mensual" ? 30 : x.plan === "Trimestral" ? 90 : 365)) : x.due } : x)));
        notify("Pago registrado ✓");
        setPaying(null);
      }} />}
      {hist && <HistoryPanel b={hist} club={club} onClose={() => setHist(null)} />}
    </div>
  );
}

function PayModal({ club, b, partial, onClose, onConfirm }: { club: boolean; b: Bill; partial: boolean; onClose: () => void; onConfirm: (amount: number) => void }) {
  const [amt, setAmt] = useState(String(partial ? Math.round(b.amount / 2) : b.amount));
  const [date, setDate] = useState(key(TODAY));
  const [method, setMethod] = useState<"Efectivo" | "Transferencia" | "Tarjeta" | "Mercado Pago" | null>("Transferencia");
  const [notes, setNotes] = useState("");
  const t = INITIAL_TEAMS.find((x) => x.id === b.teamId);
  const n = Number(amt);
  return (
    <Modal title={club ? "Registrar pago" : "Marcar como pagado"} width={420} onClose={onClose} footer={<ModalFooter onCancel={onClose} onOk={() => onConfirm(n)} ok="Confirmar pago" disabled={!(n > 0) || !method || !date} />}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#F8FAFC", borderRadius: 10, padding: 12 }}>
        <Av name={b.name} size={36} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{b.name}</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>{club ? t?.name ?? "Sin equipo" : `Membresía ${b.plan}`}</div>
        </div>
      </div>
      <Field label="Monto"><input type="number" min={0} style={inputStyle} value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
      <Field label="Fecha de pago"><input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Método de pago"><ChipPicker options={["Efectivo", "Transferencia", "Tarjeta", "Mercado Pago"] as const} value={method} onChange={setMethod} /></Field>
      <Field label="Notas (opcional)"><input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </Modal>
  );
}

function HistoryPanel({ b, club, onClose }: { b: Bill; club: boolean; onClose: () => void }) {
  const methods = ["Transferencia", "Mercado Pago", "Efectivo", "Tarjeta"];
  const n = club ? (b.lastPay ? (b.status === "Parcial" ? 2 : 3) : 1) : 6;
  const items = Array.from({ length: n }, (_, i) => {
    const d = club ? addDays(TODAY, -60 * i - 5) : addDays(TODAY, -30 * i - 4);
    const failed = club ? !b.lastPay : i === 2;
    return { d, m: methods[(i + b.name.length) % 4]!, amt: club ? (b.status === "Parcial" ? 8000 : 8000) : b.amount, failed };
  });
  const total = items.filter((x) => !x.failed).reduce((s, x) => s + x.amt, 0);
  return (
    <SlideIn width={360} onClose={onClose} head={<><Av name={b.name} size={32} /><span style={{ fontSize: 14, fontWeight: 700, color: "#FFF" }}>{b.name}</span></>}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 12 }}>Historial</div>
      {items.map((x, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F8FAFC" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{fmtDate(key(x.d))}</div>
            <div style={{ fontSize: 10, color: "#94A3B8" }}>{x.m}{x.failed ? " · Rechazado" : ""}</div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginRight: 8 }}>{money(x.amt)}</span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: x.failed ? "#EF4444" : "#22C55E" }} />
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
        <span style={{ flex: 1, fontSize: 12, color: "#94A3B8" }}>Total pagado este año</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{money(total)}</span>
      </div>
    </SlideIn>
  );
}

/* ═════════ CAJA · GASTOS (gym) ═════════ */
const EXP_CATS = ["Alquiler", "Sueldos", "Servicios", "Mantenimiento", "Insumos", "Otro"] as const;
type ExpCat = (typeof EXP_CATS)[number];
type Expense = { id: string; concept: string; cat: ExpCat; date: string; amount: number; notes?: string | undefined };
const EXP_STYLE: Record<ExpCat, [string, string]> = { Alquiler: ["#EFF6FF", "#3B82F6"], Sueldos: ["#F0FDF4", "#16A34A"], Servicios: ["#FFFBEB", "#D97706"], Mantenimiento: ["#FDF4FF", "#9333EA"], Insumos: ["#FFF7ED", "#EA580C"], Otro: ["#F1F5F9", "#94A3B8"] };
const SEED_EXPENSES: Expense[] = [
  { id: "e1", concept: "Alquiler del local", cat: "Alquiler", date: "2026-10-01", amount: 450000 },
  { id: "e2", concept: "Sueldo instructor", cat: "Sueldos", date: "2026-10-01", amount: 280000 },
  { id: "e3", concept: "Sueldo recepción", cat: "Sueldos", date: "2026-10-01", amount: 210000 },
  { id: "e4", concept: "Agua y luz", cat: "Servicios", date: "2026-10-02", amount: 95000 },
  { id: "e5", concept: "Internet", cat: "Servicios", date: "2026-10-02", amount: 25000 },
  { id: "e6", concept: "Reparación cinta", cat: "Mantenimiento", date: "2026-10-03", amount: 78000 },
  { id: "e7", concept: "Productos de limpieza", cat: "Insumos", date: "2026-10-04", amount: 42000 },
  { id: "e8", concept: "Publicidad redes", cat: "Otro", date: "2026-10-05", amount: 60000 },
];
const INCOME = 2847000;

function CajaSummary({ expenses }: { expenses: Expense[] }) {
  const out = expenses.reduce((s, e) => s + e.amount, 0);
  const net = INCOME - out;
  const prev = 1362000;
  const pct = Math.round(((net - prev) / prev) * 100);
  const cols: [string, string, string, string?][] = [
    ["Ingresos del mes", money(INCOME), "342 cuotas cobradas"],
    ["Gastos del mes", money(out), `${expenses.length} egresos registrados`],
    ["Resultado neto", money(net), `${pct >= 0 ? "+" : ""}${pct}% vs mes ant.`, pct >= 0 ? "#22C55E" : "#EF4444"],
  ];
  return (
    <div style={{ background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "20px 0", margin: "0 32px 20px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
      {cols.map(([l, v, s, c], i) => (
        <div key={l} style={{ padding: "0 24px", borderRight: i < 2 ? "1px solid #F1F5F9" : "none" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{v}</div>
          <div style={{ fontSize: 11, color: c ?? "#94A3B8", marginTop: 2 }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

function ExpensesSection({ expenses, setExpenses, notify }: { expenses: Expense[]; setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>; notify: Notify }) {
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const cols = "2fr 1fr 1fr 1fr 80px";
  return (
    <>
      <div style={{ padding: "0 32px", display: "flex", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#111827", flex: 1 }}>Gastos</span>
        <button onClick={() => setEditing("new")} style={{ background: "#111827", color: "#FFF", border: 0, borderRadius: 9, height: 34, padding: "0 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>＋ Registrar gasto</button>
      </div>
      <div style={{ background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", margin: "0 32px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", padding: "10px 20px", borderRadius: "14px 14px 0 0" }}>
          {["Concepto", "Categoría", "Fecha", "Monto", ""].map((h, i) => <span key={i} style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>{h}</span>)}
        </div>
        {!expenses.length && <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Sin gastos registrados.</div>}
        {expenses.map((e) => (
          <div key={e.id} className="hover:bg-[#FAFAFA]" style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #F8FAFC" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.concept}</span>
            <span><span style={{ borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 500, background: EXP_STYLE[e.cat][0], color: EXP_STYLE[e.cat][1] }}>{e.cat}</span></span>
            <span style={{ fontSize: 12, color: "#374151" }}>{fmtDate(e.date)}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{money(e.amount)}</span>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <DotMenu options={["Editar", "Eliminar"]} onPick={(o) => {
                if (o === "Editar") return setEditing(e);
                setExpenses((xs) => xs.filter((x) => x.id !== e.id));
                notify("Gasto eliminado");
              }} />
            </div>
          </div>
        ))}
      </div>
      {editing && <ExpenseModal init={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSave={(x) => {
        setExpenses((xs) => (xs.some((y) => y.id === x.id) ? xs.map((y) => (y.id === x.id ? x : y)) : [x, ...xs]));
        notify(editing === "new" ? "Gasto registrado ✓" : "Gasto actualizado");
        setEditing(null);
      }} />}
    </>
  );
}

function ExpenseModal({ init, onClose, onSave }: { init?: Expense | undefined; onClose: () => void; onSave: (e: Expense) => void }) {
  const [concept, setConcept] = useState(init?.concept ?? "");
  const [cat, setCat] = useState<ExpCat | null>(init?.cat ?? null);
  const [amount, setAmount] = useState(init ? String(init.amount) : "");
  const [date, setDate] = useState(init?.date ?? key(TODAY));
  const [notes, setNotes] = useState(init?.notes ?? "");
  const n = Number(amount);
  const ok = concept.trim() && cat && n > 0 && date;
  return (
    <Modal title={init ? "Editar gasto" : "Registrar gasto"} width={420} onClose={onClose} footer={<ModalFooter onCancel={onClose} ok="Guardar gasto" disabled={!ok} onOk={() => onSave({ id: init?.id ?? `e${Date.now()}`, concept: concept.trim(), cat: cat!, amount: n, date, notes: notes.trim() || undefined })} />}>
      <Field label="Concepto"><input style={inputStyle} value={concept} placeholder="Ej. Alquiler de local" onChange={(e) => setConcept(e.target.value)} /></Field>
      <Field label="Categoría"><ChipPicker options={EXP_CATS} value={cat} onChange={setCat} /></Field>
      <Field label="Monto"><input type="number" min={0} style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label="Fecha"><input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Notas (opcional)"><input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </Modal>
  );
}
