import { useState } from "react";
import {
  ChevronLeft, ChevronRight, MessageCircle, MoreHorizontal, CreditCard, Calendar, User, Mail, Phone, Users, Shirt,
  Briefcase, CheckCircle, AlertCircle,
} from "lucide-react";

type Notify = (m: string) => void;
type Row = [React.ComponentType<{ size?: number; color?: string }>, string, React.ReactNode];

const card: React.CSSProperties = { background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0" };
const h13: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#111827" };
const cardHead: React.CSSProperties = { display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #F8FAFC" };
const STATUS: Record<string, [string, string]> = { Activo: ["#DCFCE7", "#16A34A"], Inactivo: ["#F1F5F9", "#94A3B8"], Lesionado: ["#FEF9C3", "#D97706"], "Cuota vencida": ["#FEE2E2", "#EF4444"] };
const ini = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");
const phone = (i: number) => `+54 9 11 ${2345 + i * 37}-${6789 - i * 113}`;

function Avatar({ name, size, radius }: { name: string; size: number; radius: number | string }) {
  return <span style={{ width: size, height: size, borderRadius: radius, background: "#F1F5F9", color: "#94A3B8", fontSize: size / 3, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini(name)}</span>;
}

function TopBar({ section, name, onBack, menu, notify }: { section: string; name: string; onBack: () => void; menu: string[]; notify: Notify }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: "24px 32px 0", display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: 0, cursor: "pointer", padding: 0 }}>
        <ChevronLeft size={16} color="#374151" /><span style={{ fontSize: 13, color: "#94A3B8" }}>{section}</span>
      </button>
      <span style={{ fontSize: 13, color: "#CBD5E1" }}>/</span>
      <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{name}</span>
      <button onClick={() => notify(`Chat con ${name}`)} style={{ border: "1px solid #E2E8F0", borderRadius: 9, height: 36, padding: "0 14px", fontSize: 12, color: "#374151", background: "#FFF", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
        <MessageCircle size={12} color="#94A3B8" /> Enviar mensaje
      </button>
      <div style={{ position: "relative" }}>
        <button aria-label="Más opciones" onClick={() => setOpen(!open)} style={{ background: "none", border: 0, cursor: "pointer", padding: 4, lineHeight: 0 }}><MoreHorizontal size={16} color="#CBD5E1" /></button>
        {open && (
          <div style={{ position: "absolute", right: 0, top: 28, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 4, minWidth: 160, zIndex: 20 }}>
            {menu.map((o) => (
              <button key={o} onClick={() => { setOpen(false); notify(`${o}: ${name}`); }} className="hover:bg-[#F8FAFC]" style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", fontSize: 12, borderRadius: 6, border: 0, background: "none", cursor: "pointer", color: o === "Eliminar" ? "#EF4444" : "#374151" }}>{o}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRows({ rows }: { rows: Row[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
      {rows.map(([Icon, l, v]) => (
        <div key={l} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Icon size={13} color="#CBD5E1" />
          <span style={{ fontSize: 12, color: "#94A3B8", width: 90, flexShrink: 0 }}>{l}</span>
          <span style={{ fontSize: 12, color: "#374151", minWidth: 0, overflowWrap: "anywhere" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

type Act = { kind: "ok" | "msg" | "cal" | "warn"; text: string; when: string };
const ACT_STYLE = { ok: [CheckCircle, "#22C55E", "#F0FDF4"], msg: [MessageCircle, "#3B82F6", "#EFF6FF"], cal: [Calendar, "#D97706", "#FFFBEB"], warn: [AlertCircle, "#EA580C", "#FFF7ED"] } as const;
function Activity({ items }: { items: Act[] }) {
  return (
    <div style={{ ...card, overflow: "hidden" }}>
      <div style={cardHead}><span style={h13}>Actividad reciente</span></div>
      {items.map((a, i) => {
        const [Icon, fg, bg] = ACT_STYLE[a.kind];
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 20px", borderBottom: "1px solid #F8FAFC" }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={14} color={fg} /></span>
            <div>
              <div style={{ fontSize: 12, color: a.kind === "warn" && a.text.startsWith("Sin actividad") ? "#D97706" : "#374151" }}>{a.text}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{a.when}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═════════ ATHLETE / SOCIO ═════════ */
export type AthleteInfo = { name: string; email: string; status: string; plan: string; coach: string | null; team?: string | undefined; teamCoach?: string | null | undefined; idx: number };

const WEEK_SESSIONS = [
  { day: 0, start: 18, dur: 1.5, name: "Práctica técnica" },
  { day: 2, start: 18, dur: 1.5, name: "Práctica táctica" },
  { day: 3, start: 9, dur: 1, name: "Fuerza · Piernas" },
  { day: 5, start: 10, dur: 2, name: "Partido" },
];

export function AthleteProfile({ mode, a, onBack, notify }: { mode: "club" | "gym"; a: AthleteInfo; onBack: () => void; notify: Notify }) {
  const club = mode === "club";
  const st = STATUS[a.status] ?? STATUS["Activo"]!;
  const venc = new Date(2026, 9, 31).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
  const sinAsignar = <span style={{ fontStyle: "italic", color: "#94A3B8" }}>Sin asignar</span>;
  const rows: Row[] = club
    ? [[Users, "Equipo", a.team ?? "Sin equipo"], [User, "Entrenador", a.teamCoach ?? sinAsignar], [Calendar, "Nacimiento", `${String((a.idx % 27) + 1).padStart(2, "0")}/0${(a.idx % 9) + 1}/2010`], [Shirt, "Posición", ["Defensor central", "Mediocampista", "Delantero", "—"][a.idx % 4]], [Mail, "Email", a.email], [Phone, "Teléfono", phone(a.idx)]]
    : [[CreditCard, "Membresía", a.plan], [Calendar, "Vence", venc], [User, "Coach", a.coach ?? sinAsignar], [Mail, "Email", a.email], [Phone, "Teléfono", phone(a.idx)]];
  const weeks = [82, 70, 91, 74];
  const present = [true, true, false, true];
  const payments = [
    ["1 oct 2026", "Transferencia", "$28.000", true], ["1 sep 2026", "Efectivo", "$28.000", true],
    ["1 ago 2026", "Tarjeta", "$26.000", false], ["2 ago 2026", "Tarjeta", "$26.000", true], ["1 jul 2026", "Transferencia", "$26.000", true],
  ] as const;

  return (
    <div>
      <TopBar section={club ? "Atletas" : "Socios"} name={a.name} onBack={onBack} notify={notify} menu={["Editar perfil", "Marcar inactivo", "Eliminar"]} />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, padding: "0 32px 32px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ ...card, padding: 20, textAlign: "center" }}>
            <div style={{ margin: "0 auto 12px", width: 72 }}><Avatar name={a.name} size={72} radius="50%" /></div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{a.name}</div>
            <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 10px", background: st[0], color: st[1] }}>{a.status}</span>
            <div style={{ height: 1, background: "#F1F5F9", margin: "14px 0" }} />
            <InfoRows rows={rows} />
          </div>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ ...h13, marginBottom: 12 }}>Asistencia</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{club ? "18/22" : "79%"}</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{club ? "esta semana" : "este mes"}</span>
            </div>
            {club ? (
              <div style={{ display: "flex", gap: 6 }}>
                {present.map((p, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: p ? "#111827" : "#F1F5F9", color: p ? "#FFF" : "#CBD5E1", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{p ? "✓" : "✗"}</span>
                    <span style={{ fontSize: 8, color: "#94A3B8" }}>S{i + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                {weeks.map((w, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ height: 48, width: "100%", display: "flex", alignItems: "flex-end" }}><div title={`${w}%`} style={{ width: "100%", height: `${w}%`, background: "#111827", borderRadius: "4px 4px 0 0" }} /></div>
                    <span style={{ fontSize: 9, color: "#94A3B8" }}>S{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {club ? (
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={cardHead}><span style={h13}>Sesiones asignadas</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "40px repeat(7, 1fr)", height: 200, position: "relative" }}>
                <div />
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d, i) => (
                  <div key={d} style={{ position: "relative", borderLeft: "1px solid #F1F5F9", background: i % 2 ? "#FCFDFE" : "#FFF" }}>
                    <div style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>{d}</div>
                    {WEEK_SESSIONS.filter((s) => s.day === i).map((s) => (
                      <div key={s.name} style={{ position: "absolute", left: 4, right: 4, top: 26 + ((s.start - 8) / 14) * 170, height: Math.max(30, (s.dur / 14) * 170), background: "#EFF6FF", borderLeft: "3px solid #3B82F6", borderRadius: 8, padding: "4px 6px", boxShadow: "0 1px 3px rgba(15,23,42,0.06)", overflow: "hidden" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                        <div style={{ fontSize: 9, color: "#64748B" }}>{s.start}:00</div>
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ position: "absolute", left: 0, top: 26, display: "flex", flexDirection: "column", justifyContent: "space-between", height: 170, fontSize: 9, color: "#CBD5E1", paddingLeft: 6 }}>
                  <span>08</span><span>15</span><span>22</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={cardHead}>
                <span style={{ ...h13, flex: 1 }}>Historial de pagos</span>
                <button onClick={() => notify(`Registrar pago de ${a.name}`)} style={{ background: "#111827", color: "#FFF", borderRadius: 8, height: 30, padding: "0 12px", fontSize: 11, fontWeight: 600, border: 0, cursor: "pointer" }}>Registrar pago</button>
              </div>
              {payments.map(([d, m, amt, ok], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #F8FAFC", gap: 12 }}>
                  <Calendar size={12} color="#CBD5E1" />
                  <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{d}</span>
                  <span style={{ fontSize: 10, color: "#374151", border: "1px solid #E2E8F0", borderRadius: 20, padding: "1px 7px" }}>{m}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{amt}</span>
                  <span title={ok ? "Pagado" : "Rechazado"} style={{ width: 6, height: 6, borderRadius: "50%", background: ok ? "#22C55E" : "#EF4444" }} />
                </div>
              ))}
            </div>
          )}
          <Activity items={[
            { kind: "ok", text: "Completó sesión de Fuerza · Piernas", when: "Hace 2 días" },
            { kind: "msg", text: "Envió un mensaje", when: "Hace 3 días" },
            { kind: "cal", text: club ? "Asistió a práctica Sub-16" : "Reservó clase CrossFit 09:00", when: "Hace 5 días" },
            { kind: "warn", text: club ? "No asistió a la práctica" : "Cuota vencida", when: "Hace 7 días" },
          ]} />
        </div>
      </div>
    </div>
  );
}

/* ═════════ COACH / ENTRENADOR ═════════ */
export type CoachInfo = {
  name: string; spec: string; active: boolean; athletes: number; att: number; rating: number; idx: number;
  teams: { name: string; ath: number; sport: string; color: string }[];
  members: { name: string; plan: string; active: boolean }[];
};
const PLAN: Record<string, [string, string]> = { Mensual: ["#EFF6FF", "#3B82F6"], Trimestral: ["#F0FDF4", "#16A34A"], Anual: ["#FFFBEB", "#D97706"] };

export function CoachProfileInst({ mode, c, onBack, notify }: { mode: "club" | "gym"; c: CoachInfo; onBack: () => void; notify: Notify }) {
  const club = mode === "club";
  const email = `${c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, ".")}@mail.com`;
  const roles = club ? ["Entrenador"] : c.idx % 2 ? ["Coach personal", "Instructor"] : ["Coach personal"];
  const chip = (t: string) => <span key={t} style={{ fontSize: 10, border: "1px solid #E2E8F0", borderRadius: 20, padding: "1px 7px", color: "#374151", marginRight: 4, display: "inline-block", marginBottom: 2 }}>{t}</span>;
  const rows: Row[] = [
    [Briefcase, "Rol", <>{roles.map(chip)}</>],
    club ? [Users, "Equipos", c.teams.length ? c.teams.map((t) => t.name).join(", ") : "—"] : [Users, "Atletas", String(c.athletes)],
    [Mail, "Email", email], [Phone, "Teléfono", phone(c.idx + 3)],
    [Calendar, "Desde", ["Mar 2025", "Ago 2024", "Ene 2026", "Jun 2023"][c.idx % 4]],
  ];
  const stats: [string, string][] = club
    ? [["Atletas totales", String(c.athletes)], ["Equipos", String(c.teams.length)], ["Asistencia promedio", `${c.att}%`], ["Sesiones publicadas", String(c.teams.length * 12)]]
    : [["Atletas activos", String(c.athletes)], ["Asistencia promedio", `${c.att}%`], ["Rating", `★ ${c.rating}`], ["Clases este mes", String(12 + c.idx)]];
  const team0 = c.teams[0]?.name ?? "Equipo A";

  return (
    <div>
      <TopBar section="Entrenadores" name={c.name} onBack={onBack} notify={notify} menu={["Editar perfil", "Desactivar", "Eliminar"]} />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, padding: "0 32px 32px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ ...card, padding: 20, textAlign: "center" }}>
            <div style={{ margin: "0 auto 12px", width: 72 }}><Avatar name={c.name} size={72} radius={14} /></div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{c.spec}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.active ? "#22C55E" : "#E2E8F0" }} />
              <span style={{ fontSize: 12, color: "#374151" }}>{c.active ? "Activo" : "Inactivo"}</span>
            </div>
            <div style={{ height: 1, background: "#F1F5F9", margin: "14px 0" }} />
            <InfoRows rows={rows} />
          </div>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ ...h13, marginBottom: 12 }}>Rendimiento</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.map(([l, v]) => (
                <div key={l} style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#94A3B8", flex: 1 }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={cardHead}>
              <span style={{ ...h13, flex: 1 }}>{club ? "Equipos asignados" : "Atletas asignados"}</span>
              <button onClick={() => notify(club ? `Asignar equipo a ${c.name}` : `Asignar atleta a ${c.name}`)} style={{ fontSize: 11, color: "#3B82F6", background: "none", border: 0, cursor: "pointer" }}>＋ {club ? "Asignar equipo" : "Asignar atleta"}</button>
            </div>
            {club ? (
              c.teams.length ? c.teams.map((t) => (
                <div key={t.name} style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid #F8FAFC", gap: 10 }}>
                  <span style={{ width: 4, height: 28, borderRadius: 2, background: t.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.name}</span>
                  <span style={{ fontSize: 11, color: "#94A3B8", flex: 1 }}>{t.ath} atletas</span>
                  <span style={{ fontSize: 10, borderRadius: 20, padding: "2px 8px", background: `${t.color}1A`, color: t.color }}>{t.sport}</span>
                  <ChevronRight size={12} color="#CBD5E1" />
                </div>
              )) : <div style={{ padding: "16px 20px", fontSize: 12, color: "#94A3B8" }}>Sin equipos asignados</div>
            ) : (
              c.members.length ? c.members.map((m) => {
                const p = PLAN[m.plan] ?? PLAN["Mensual"]!;
                return (
                  <div key={m.name} style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid #F8FAFC", gap: 10 }}>
                    <Avatar name={m.name} size={28} radius="50%" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#111827", flex: 1 }}>{m.name}</span>
                    <span style={{ fontSize: 10, borderRadius: 20, padding: "2px 8px", background: p[0], color: p[1] }}>{m.plan}</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.active ? "#22C55E" : "#E2E8F0" }} />
                    <ChevronRight size={12} color="#CBD5E1" />
                  </div>
                );
              }) : <div style={{ padding: "16px 20px", fontSize: 12, color: "#94A3B8" }}>Sin atletas asignados</div>
            )}
          </div>
          <Activity items={c.active ? [
            { kind: "ok", text: `Publicó 3 sesiones para ${team0}`, when: "Hace 1 día" },
            { kind: "cal", text: "Completó asistencia de la práctica del martes", when: "Hace 2 días" },
            { kind: "msg", text: "Respondió mensaje de Santiago Pérez", when: "Hace 3 días" },
          ] : [{ kind: "warn", text: "Sin actividad registrada", when: "Más de 7 días" }]} />
        </div>
      </div>
    </div>
  );
}
