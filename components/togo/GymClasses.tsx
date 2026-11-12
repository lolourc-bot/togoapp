import type React from "react";
import { useMemo, useState } from "react";
import { Activity, CheckCircle, CheckSquare, ChevronDown, Clock, Edit2, Info, Lock, MapPin, User, UserCheck, Users, X } from "lucide-react";
import {
  buildClasses, CLASS_TYPES, COACHES, DAY_ABBR, dayLabel, endTime, initials, iso, MEMBER_NAMES, TODAY, toMin, WEEK_START,
  type ClassType, type GymClass,
} from "@/lib/gym-classes";

const SLOT = 40; // px per 30 min
const START = 6 * 60;
const END = 23 * 60;
const px = (min: number) => ((min - START) / 30) * SLOT;

type Att = { confirmed: { name: string; present: boolean }[]; waiting: string[] };

function seedAtt(c: GymClass): Att {
  const off = Number(c.id.replace(/\D/g, "")) % MEMBER_NAMES.length;
  const pool = [...MEMBER_NAMES.slice(off), ...MEMBER_NAMES.slice(0, off)];
  return {
    confirmed: Array.from({ length: c.booked }, (_, i) => ({ name: pool[i % pool.length]! + (i >= pool.length ? " (2)" : ""), present: false })),
    waiting: Array.from({ length: c.waitlist }, (_, i) => pool[(c.booked + i) % pool.length]!),
  };
}

export function GymClasses({ notify }: { notify: (t: string) => void }) {
  const [classes, setClasses] = useState<GymClass[]>(() => buildClasses());
  const [view, setView] = useState<"Semana" | "Día">("Semana");
  const [day, setDay] = useState(TODAY);
  const [openId, setOpenId] = useState<string | null>(null);
  const [att, setAtt] = useState<Record<string, Att>>({});
  const [modal, setModal] = useState<GymClass | "new" | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => iso(new Date(WEEK_START.getFullYear(), WEEK_START.getMonth(), WEEK_START.getDate() + i)));
  const shown = view === "Semana" ? days : [day];
  const open = classes.find((c) => c.id === openId) ?? null;
  const openAtt = open ? att[open.id] ?? seedAtt(open) : null;
  const setOpenAtt = (a: Att) => {
    if (!open) return;
    setAtt((s) => ({ ...s, [open.id]: a }));
    setClasses((cs) => cs.map((c) => (c.id === open.id ? { ...c, booked: a.confirmed.length, waitlist: a.waiting.length } : c)));
  };

  const weekClasses = classes.filter((c) => days.includes(c.date));
  const occ = Math.round((weekClasses.reduce((s, c) => s + c.booked / c.capacity, 0) / Math.max(1, weekClasses.length)) * 100);

  return (
    <div style={{ position: "relative" }}>
      <header style={{ padding: "24px 32px 0", display: "flex", alignItems: "center", marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Clases</h1>
          <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>{view === "Semana" ? "Semana del 28 sep al 4 oct" : dayLabel(day)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
            {(["Semana", "Día"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500, background: view === v ? "#111827" : "#FFF", color: view === v ? "#FFF" : "#374151" }}>{v}</button>
            ))}
          </div>
          <button onClick={() => setModal("new")} style={{ background: "#111827", color: "#FFF", borderRadius: 9, height: 36, padding: "0 16px", fontSize: 13, fontWeight: 600 }}>＋ Nueva clase</button>
        </div>
      </header>

      {view === "Día" && (
        <div style={{ display: "flex", gap: 6, padding: "0 32px 12px" }}>
          {days.map((d, i) => (
            <button key={d} onClick={() => setDay(d)} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, border: "1px solid #E2E8F0", background: d === day ? "#111827" : "#FFF", color: d === day ? "#FFF" : "#374151" }}>{DAY_ABBR[i]} {Number(d.slice(8))}</button>
          ))}
        </div>
      )}

      <div style={{ margin: "0 32px", background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ ["--slot-height" as string]: `${SLOT}px` } as React.CSSProperties}>
          <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${shown.length}, 1fr)`, borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            <div />
            {shown.map((d) => {
              const dt = new Date(d + "T00:00");
              const wd = (dt.getDay() + 6) % 7;
              return (
                <div key={d} style={{ height: 52, minWidth: 0, borderLeft: "1px solid #E2E8F0", padding: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: "#94A3B8" }}>{DAY_ABBR[wd]}</div>
                  {d === TODAY ? (
                    <span style={{ display: "inline-flex", width: 26, height: 26, borderRadius: "50%", background: "#111827", color: "#FFF", fontSize: 15, fontWeight: 700, alignItems: "center", justifyContent: "center" }}>{dt.getDate()}</span>
                  ) : <div style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>{dt.getDate()}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${shown.length}, 1fr)` }}>
            <div>
              {Array.from({ length: (END - START) / 30 }, (_, i) => {
                const m = START + i * 30;
                return <div key={i} style={{ height: "var(--slot-height)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingTop: 4, paddingRight: 8, fontSize: 10, color: "#94A3B8", boxSizing: "border-box" }}>{m % 60 === 0 ? `${String(m / 60).padStart(2, "0")}:00` : ""}</div>;
              })}
            </div>
            {shown.map((d) => (
              <div key={d} style={{ minWidth: 0, borderLeft: "1px solid #E2E8F0", position: "relative", height: `calc(${(END - START) / 30} * var(--slot-height))`, backgroundImage: `repeating-linear-gradient(to bottom, #F1F5F9 0 1px, transparent 1px ${SLOT * 2}px)` }}>
                {classes.filter((c) => c.date === d).map((c) => {
                  const full = c.booked >= c.capacity;
                  const left = c.capacity - c.booked;
                  const big = view === "Día";
                  const [sh = 0, sm = 0] = c.start.split(":").map(Number);
                  const slots = c.duration / 30;
                  const small = slots * SLOT < 60;
                  const ell: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                  return (
                    <div key={c.id} onClick={() => setOpenId(c.id)} style={{ position: "absolute", top: `calc(${(sh - 6) * 2 + sm / 30} * var(--slot-height) + 1px)`, height: `calc(${slots} * var(--slot-height) - 2px)`, left: 3, right: 3, background: CLASS_TYPES[c.type], borderRadius: 8, padding: small ? "4px 6px" : big ? "8px 12px 10px" : "6px 6px 9px", overflow: "hidden", cursor: "pointer", color: "#FFF", display: "flex", flexDirection: "column", boxSizing: "border-box", outline: openId === c.id ? "2px solid #FBBF24" : "none" }}>
                      <div style={{ fontSize: big ? 13 : 11, fontWeight: 700, ...ell }}>{c.name}</div>
                      {!small && <>
                        <div style={{ fontSize: big ? 11 : 9, color: "rgba(255,255,255,0.8)", ...ell }}>{c.start} · {c.duration} min{big ? ` · ${c.room}` : ""}</div>
                        <div style={{ fontSize: big ? 11 : 9, color: "rgba(255,255,255,0.7)", ...ell }}>{c.coach}</div>
                        {slots * SLOT >= 80 && <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 4, minWidth: 0, overflow: "hidden" }}>
                          {full ? <><Lock size={9} /><span style={{ background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: "1px 5px", fontSize: 9, ...ell }}>Completo</span></> :
                            c.booked / c.capacity >= 0.9 ? <span style={{ background: "#FDE047", color: "#713F12", borderRadius: 4, padding: "1px 5px", fontSize: 9, ...ell }}>¡Últimos {left}!</span> : null}
                          <span style={{ fontSize: 9, marginLeft: "auto", ...ell }}>{c.booked}/{c.capacity}</span>
                        </div>}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.25)", borderRadius: "0 0 8px 8px", overflow: "hidden" }}><div style={{ width: `${(c.booked / c.capacity) * 100}%`, height: 3, background: "rgba(255,255,255,0.85)" }} /></div>
                      </>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {([["Clases esta semana", String(weekClasses.length), Activity], ["Ocupación promedio", `${occ}%`, Users], ["Total reservas", String(weekClasses.reduce((s, c) => s + c.booked, 0)), CheckCircle], ["Cancelaciones", "24", X]] as const).map(([l, v, I]) => (
          <div key={l} style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, border: "1px solid #E2E8F0" }}>
            <I size={18} color="#94A3B8" />
            <div><div style={{ fontSize: 11, color: "#94A3B8" }}>{l}</div><div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{v}</div></div>
          </div>
        ))}
      </div>

      {open && openAtt && (
        <DetailPanel c={open} a={openAtt} setA={setOpenAtt} onClose={() => setOpenId(null)} onEdit={() => setModal(open)}
          onCancel={() => { setClasses((cs) => cs.filter((x) => x.id !== open.id)); setOpenId(null); notify(`Clase cancelada · se notificó a ${open.booked} socios`); }} notify={notify} />
      )}
      {modal && (
        <ClassModal initial={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={(list) => {
          setClasses((cs) => modal === "new" ? [...cs, ...list] : cs.map((c) => (c.id === list[0]!.id ? list[0]! : c)));
          setModal(null);
          notify(modal === "new" ? (list.length > 1 ? `${list.length} clases creadas` : "Clase creada") : "Clase actualizada");
        }} />
      )}
    </div>
  );
}

function DetailPanel({ c, a, setA, onClose, onEdit, onCancel, notify }: { c: GymClass; a: Att; setA: (a: Att) => void; onClose: () => void; onEdit: () => void; onCancel: () => void; notify: (t: string) => void }) {
  const [showWait, setShowWait] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const n = a.confirmed.length;
  const pct = n / c.capacity;
  const barColor = n >= c.capacity ? "#EF4444" : pct >= 0.75 ? "#EAB308" : "#22C55E";
  return (
    <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 320, background: "#FFF", borderLeft: "1px solid #E2E8F0", zIndex: 20, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(0,0,0,0.06)", animation: "slideInR .2s ease-out" }}>
      <style>{`@keyframes slideInR{from{transform:translateX(100%)}to{transform:none}}`}</style>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: CLASS_TYPES[c.type] }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", flex: 1 }}>{c.name}</span>
        <button aria-label="Editar clase" onClick={onEdit}><Edit2 size={16} color="#94A3B8" /></button>
        <button aria-label="Cerrar" onClick={onClose}><X size={18} color="#CBD5E1" /></button>
      </div>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 8 }}>
        {([[Clock, `${dayLabel(c.date)} · ${c.start} – ${endTime(c)} hs (${c.duration} min)`], [User, c.coach], [MapPin, c.room]] as const).map(([I, t], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}><I size={13} color="#CBD5E1" />{t}</div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}><Users size={13} color="#CBD5E1" />Cupo</div>
        <div style={{ padding: "12px 16px", background: "#F8FAFC", borderRadius: 10, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>{n} / {c.capacity} reservas</span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#E2E8F0" }}><div style={{ width: `${Math.min(100, pct * 100)}%`, height: 8, borderRadius: 4, background: barColor }} /></div>
          </div>
          <div style={{ fontSize: 11, color: n >= c.capacity ? "#EF4444" : "#22C55E", marginTop: 6 }}>{n >= c.capacity ? "Clase completa" : `${c.capacity - n} lugares libres`}</div>
          {a.waiting.length > 0 && (
            <button onClick={() => setShowWait(!showWait)} style={{ fontSize: 11, color: "#D97706", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
              {a.waiting.length} en lista de espera <ChevronDown size={12} style={{ transform: showWait ? "rotate(180deg)" : "none" }} />
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "0 20px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", padding: "12px 0 8px" }}>Reservas confirmadas</div>
        {a.confirmed.length === 0 && <div style={{ fontSize: 12, color: "#94A3B8", paddingBottom: 8 }}>Sin reservas todavía.</div>}
        {a.confirmed.map((r, i) => (
          <div key={r.name + i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}>
            <Avatar name={r.name} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "#111827", flex: 1 }}>{r.name}</span>
            <button onClick={() => setA({ ...a, confirmed: a.confirmed.map((x, j) => (j === i ? { ...x, present: !x.present } : x)) })} style={{ borderRadius: 6, padding: "2px 8px", fontSize: 10, background: r.present ? "#DCFCE7" : "#F1F5F9", color: r.present ? "#16A34A" : "#94A3B8" }}>{r.present ? "Presente" : "Ausente"}</button>
            <button aria-label="Cancelar reserva" className="hover:[&>svg]:stroke-[#EF4444]" onClick={() => { setA({ ...a, confirmed: a.confirmed.filter((_, j) => j !== i) }); notify(`Reserva de ${r.name} cancelada`); }}><X size={12} color="#CBD5E1" /></button>
          </div>
        ))}
        {a.waiting.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", padding: "10px 0 8px" }}>Lista de espera</div>
            {a.waiting.map((w, i) => (
              <div key={w + i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}>
                <Avatar name={w} />
                <span style={{ fontSize: 12, fontWeight: 500, color: "#111827", flex: 1 }}>{w}</span>
                <span style={{ borderRadius: 6, padding: "2px 8px", fontSize: 10, background: "#FEF3C7", color: "#D97706" }}>En espera</span>
                <button aria-label="Pasar a confirmadas" title="Pasar a confirmadas" onClick={() => { setA({ confirmed: [...a.confirmed, { name: w, present: false }], waiting: a.waiting.filter((_, j) => j !== i) }); notify(`${w} pasó a confirmadas`); }}><UserCheck size={14} color="#16A34A" /></button>
              </div>
            ))}
          </>
        )}
      </div>
      <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => { setA({ ...a, confirmed: a.confirmed.map((x) => ({ ...x, present: true })) }); notify("Asistencia marcada para todos"); }} style={{ border: "1px solid #E2E8F0", borderRadius: 9, height: 36, width: "100%", fontSize: 12, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CheckSquare size={12} color="#94A3B8" />Marcar asistencia masiva</button>
        {confirmCancel ? (
          <div style={{ fontSize: 12, color: "#374151", textAlign: "center" }}>
            ¿Cancelar esta clase? Se notificará a los {n} socios.
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
              <button onClick={() => setConfirmCancel(false)} style={{ fontSize: 12, color: "#94A3B8" }}>No</button>
              <button onClick={onCancel} style={{ fontSize: 12, color: "#EF4444", fontWeight: 600 }}>Sí, cancelar</button>
            </div>
          </div>
        ) : <button onClick={() => setConfirmCancel(true)} style={{ fontSize: 12, color: "#EF4444", textAlign: "center" }}>Cancelar clase</button>}
      </div>
    </aside>
  );
}

function Avatar({ name }: { name: string }) {
  return <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#F1F5F9", color: "#94A3B8", fontSize: 10, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(name)}</span>;
}

const inp: React.CSSProperties = { height: 44, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13, width: "100%", color: "#111827", background: "#FFF" };
const lbl: React.CSSProperties = { fontSize: 12, color: "#374151", marginBottom: 6, display: "block" };

function Tg({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#111827" : "#E2E8F0", position: "relative", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#FFF", transition: "left .15s" }} />
    </button>
  );
}

function ClassModal({ initial, onClose, onSave }: { initial: GymClass | null; onClose: () => void; onSave: (c: GymClass[]) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<ClassType>(initial?.type ?? "CrossFit");
  const [coach, setCoach] = useState(initial?.coach ?? COACHES[0]!);
  const [coachQ, setCoachQ] = useState("");
  const [coachOpen, setCoachOpen] = useState(false);
  const [room, setRoom] = useState(initial?.room ?? "Sala principal");
  const [date, setDate] = useState(initial?.date ?? TODAY);
  const [start, setStart] = useState(initial?.start ?? "09:00");
  const [duration, setDuration] = useState(initial?.duration ?? 60);
  const [capacity, setCapacity] = useState(initial?.capacity ?? 20);
  const [wl, setWl] = useState(initial?.waitlistEnabled ?? true);
  const [wlMax, setWlMax] = useState(5);
  const [rep, setRep] = useState(false);
  const [repDays, setRepDays] = useState<number[]>([]);
  const [endMode, setEndMode] = useState<"fecha" | "semanas">("semanas");
  const [until, setUntil] = useState("2026-10-31");
  const [weeks, setWeeks] = useState(4);
  const [desc, setDesc] = useState(initial?.description ?? "");
  const coaches = useMemo(() => COACHES.filter((c) => c.toLowerCase().includes(coachQ.toLowerCase())), [coachQ]);

  const save = () => {
    const base = { name: name.trim() || type, type, coach, room, start, duration, capacity, waitlistEnabled: wl, description: desc };
    if (initial) return onSave([{ ...initial, ...base, date }]);
    const dates = [date];
    if (rep && repDays.length) {
      const s = new Date(date + "T00:00");
      const limit = endMode === "fecha" ? new Date(until + "T00:00") : new Date(s.getFullYear(), s.getMonth(), s.getDate() + weeks * 7 - 1);
      dates.length = 0;
      for (let d = new Date(s); d <= limit; d.setDate(d.getDate() + 1)) if (repDays.includes((d.getDay() + 6) % 7)) dates.push(iso(d));
    }
    onSave(dates.map((d, i) => ({ ...base, id: `n${Date.now()}-${i}`, date: d, booked: 0, waitlist: 0 })));
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxHeight: "92vh", display: "flex", flexDirection: "column", borderRadius: 16, background: "#FFF", boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}>
        <div style={{ background: "#111827", borderRadius: "16px 16px 0 0", padding: "18px 24px", display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#FFF", flex: 1 }}>{initial ? "Editar clase" : "Nueva clase"}</span>
          <button aria-label="Cerrar" onClick={onClose}><X size={18} color="rgba(255,255,255,0.6)" /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          <div><label style={lbl}>Nombre de la clase</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. CrossFit Avanzado" style={inp} /></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(Object.keys(CLASS_TYPES) as ClassType[]).map((t) => (
              <button key={t} onClick={() => setType(t)} style={{ border: `1px solid ${type === t ? CLASS_TYPES[t] : "#E2E8F0"}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, background: type === t ? CLASS_TYPES[t] : "#FFF", color: type === t ? "#FFF" : "#374151" }}>{t}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <label style={lbl}>Coach</label>
              <input value={coachOpen ? coachQ : coach} onFocus={() => { setCoachOpen(true); setCoachQ(""); }} onBlur={() => setTimeout(() => setCoachOpen(false), 150)} onChange={(e) => setCoachQ(e.target.value)} placeholder="Buscar coach…" style={inp} />
              {coachOpen && (
                <div style={{ position: "absolute", top: 72, left: 0, right: 0, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 2, maxHeight: 180, overflowY: "auto" }}>
                  {coaches.map((c) => <button key={c} onMouseDown={() => { setCoach(c); setCoachOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, color: "#374151" }}>{c}</button>)}
                  {!coaches.length && <div style={{ padding: "8px 12px", fontSize: 12, color: "#94A3B8" }}>Sin resultados</div>}
                </div>
              )}
            </div>
            <div><label style={lbl}>Sala / Espacio</label><input value={room} onChange={(e) => setRoom(e.target.value)} style={inp} /></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1.3 }}><label style={lbl}>Día</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>Hora inicio</label><input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={inp} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>Duración</label><div style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="number" min={15} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={inp} /><span style={{ fontSize: 12, color: "#94A3B8" }}>min</span></div></div>
          </div>
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}>Cupo máximo <span title="Cantidad máxima de socios que pueden reservar."><Info size={12} color="#94A3B8" /></span></label>
            <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} style={{ ...inp, width: 140 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>Permitir lista de espera</span>
            {wl && <><span style={{ fontSize: 12, color: "#94A3B8" }}>Cupo máximo de espera:</span><input type="number" min={1} value={wlMax} onChange={(e) => setWlMax(Number(e.target.value))} style={{ ...inp, width: 80, height: 34 }} /></>}
            <Tg on={wl} set={setWl} label="Permitir lista de espera" />
          </div>
          {!initial && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center" }}><span style={{ fontSize: 13, color: "#374151", flex: 1 }}>Repetir</span><Tg on={rep} set={setRep} label="Repetir" /></div>
              {rep && (
                <>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => {
                      const on = repDays.includes(i);
                      return <button key={d} onClick={() => setRepDays(on ? repDays.filter((x) => x !== i) : [...repDays, i])} style={{ width: 34, height: 34, borderRadius: 17, fontSize: 12, fontWeight: 600, background: on ? "#111827" : "#FFF", color: on ? "#FFF" : "#374151", border: on ? "none" : "1px solid #E2E8F0" }}>{d}</button>;
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                      {(["fecha", "semanas"] as const).map((m) => <button key={m} onClick={() => setEndMode(m)} style={{ padding: "5px 12px", fontSize: 12, background: endMode === m ? "#111827" : "#FFF", color: endMode === m ? "#FFF" : "#374151" }}>{m === "fecha" ? "Hasta fecha" : "Semanas"}</button>)}
                    </div>
                    {endMode === "fecha" ? <><span style={{ fontSize: 12, color: "#374151" }}>Hasta:</span><input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={{ ...inp, height: 34, width: 160 }} /></> :
                      <><input type="number" min={1} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} style={{ ...inp, height: 34, width: 70 }} /><span style={{ fontSize: 12, color: "#374151" }}>semanas</span></>}
                  </div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>Aplica a partir de: {dayLabel(date)}. Los socios podrán reservar cada instancia por separado.</div>
                </>
              )}
            </div>
          )}
          <div><label style={lbl}>Descripción (opcional)</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Nivel, qué traer, qué esperar…" style={{ ...inp, height: 72, padding: 12, resize: "none" }} /></div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10 }}>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{ border: "1px solid #E2E8F0", borderRadius: 10, height: 42, padding: "0 18px", fontSize: 13, color: "#374151" }}>Cancelar</button>
          <button onClick={save} style={{ background: "#111827", color: "#FFF", borderRadius: 10, height: 42, padding: "0 22px", fontSize: 13, fontWeight: 600 }}>Guardar clase</button>
        </div>
      </div>
    </div>
  );
}
