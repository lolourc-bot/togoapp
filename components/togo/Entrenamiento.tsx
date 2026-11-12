import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, Dumbbell, Search, X, Zap } from "lucide-react";
import { EMPTY_FILTERS, FilterSheet, FiltersButton, activeChips, matchFilters, sortCoaches, type MktCoach, type MktFilters } from "./MarketFilters";
import { AthleteBottomNav } from "./AthleteBottomNav";
import { CoachPlanSheet, useMyCoachRequest } from "./CoachPlanRequest";
import { setUserContext, useUserContext } from "@/lib/user-context";

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="togo-phone-frame-wrap flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div className="togo-phone-frame relative flex flex-col" style={{ width: 375, height: 812, backgroundColor: "#F8FAFC", borderRadius: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

/* ───────── Coached / mixed ───────── */
type Ex = { name: string; sets: string };
type Sess = { name: string; min: number; status: "draft" | "published" | "completed"; ex: Ex[] };
const TODAY_SESSION: Sess = {
  name: "Fuerza — Martes", min: 55, status: "published",
  ex: [{ name: "Sentadilla", sets: "4 × 10" }, { name: "Press de banca", sets: "4 × 8" }, { name: "Remo con barra", sets: "4 × 10" }, { name: "Curl de bíceps", sets: "3 × 12" }, { name: "Plancha", sets: "3 × 45 s" }],
};
const UPCOMING = [
  { day: "Mié 30", name: "Tren superior", ex: 5 },
  { day: "Jue 1", name: "Descanso activo", ex: 2 },
  { day: "Vie 2", name: "Acondicionamiento", ex: 4 },
];
const BORDER = { draft: "#E2E8F0", published: "#22C55E", completed: "#111827" };
const cap: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 };

function CoachedView() {
  const [s, setS] = useState(TODAY_SESSION);
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<Record<string, string>>({});
  const rest = false;
  return (
    <div className="flex-1 overflow-y-auto" style={{ paddingTop: 36 }}>
      <div className="flex items-center" style={{ padding: "16px 20px 0" }}>
        <div style={{ flex: 1, fontSize: 22, fontWeight: 800, color: "#111827" }}>Entrenamiento</div>
        <button className="flex items-center" style={{ gap: 4 }} aria-label="Cambiar coach o programa">
          <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "50%", background: "#111827", color: "#FFF", fontSize: 11, fontWeight: 700 }}>PR</span>
          <ChevronDown size={12} color="#CBD5E1" />
        </button>
      </div>
      <div style={{ padding: "12px 16px" }}>
        <div style={cap}>Hoy · martes 29 sep</div>
        {rest ? (
          <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 20, textAlign: "center", marginTop: 8 }}>
            <Zap size={24} color="#CBD5E1" style={{ margin: "0 auto" }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginTop: 8 }}>Día de descanso</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>Aprovechá para recuperarte.</div>
          </div>
        ) : (
          <div style={{ position: "relative", background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", borderLeft: `4px solid ${BORDER[s.status]}`, padding: 16, marginTop: 8 }}>
            {s.status === "completed" && <span style={{ position: "absolute", top: 14, right: 14, fontSize: 11, fontWeight: 600, color: "#16A34A", background: "#F0FDF4", borderRadius: 20, padding: "3px 8px" }}>Completada ✓</span>}
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{s.ex.length} ejercicios · {s.min} min</div>
            {!open && (
              <div className="flex flex-wrap" style={{ gap: 6, marginTop: 10 }}>
                {s.ex.slice(0, 3).map((e) => <span key={e.name} style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#374151" }}>{e.name}</span>)}
              </div>
            )}
            {open && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {s.ex.map((e, i) => (
                  <div key={e.name} className="flex items-center" style={{ gap: 8, borderTop: i ? "1px solid #F1F5F9" : "none", paddingTop: i ? 8 : 0 }}>
                    <span style={{ width: 18, fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>{String.fromCharCode(65 + i)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>{e.sets}</div>
                    </div>
                    <input value={log[e.name] ?? ""} onChange={(ev) => setLog({ ...log, [e.name]: ev.target.value })} placeholder="kg" inputMode="decimal" style={{ width: 56, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 8px", fontSize: 12 }} />
                  </div>
                ))}
                {s.status !== "completed" && (
                  <button onClick={() => setS({ ...s, status: "completed" })} style={{ marginTop: 6, height: 42, borderRadius: 12, background: "#111827", color: "#FFF", fontSize: 13, fontWeight: 700 }}>Marcar como completada</button>
                )}
              </div>
            )}
            <button onClick={() => setOpen(!open)} style={{ display: "block", fontSize: 12, color: "#3B82F6", marginTop: 10 }}>{open ? "Ocultar sesión" : "Ver sesión completa"}</button>
          </div>
        )}
      </div>
      <div style={{ ...cap, margin: "16px 16px 8px" }}>Próximas sesiones</div>
      {UPCOMING.map((u) => (
        <div key={u.day} className="flex items-center" style={{ gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #E2E8F0", margin: "0 16px 6px", background: "#FFF" }}>
          <span style={{ background: "#F1F5F9", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, color: "#374151", width: 56, textAlign: "center", flexShrink: 0 }}>{u.day}</span>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#111827" }}>{u.name}</span>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>{u.ex} ej.</span>
        </div>
      ))}
      <div style={{ height: 16 }} />
    </div>
  );
}

/* ───────── Gym member without coach ───────── */
const BENEFITS = [
  ["Plan diseñado para tus objetivos", "Semanas de entrenamiento estructuradas para vos."],
  ["Seguimiento de tu progreso", "Tu coach ve cómo avanzás y ajusta el plan."],
  ["Comunicación directa", "Consultá dudas y recibí feedback de tu coach."],
  ["Historial y registros", "Todo tu historial en un solo lugar."],
];

function GymUpsellView() {
  const req = useMyCoachRequest();
  const pending = !!req && !req.coach;
  const [sheet, setSheet] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [code, setCode] = useState("");
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col items-center" style={{ background: "linear-gradient(180deg, #111827 0%, #1F2937 100%)", padding: "72px 24px 32px", gap: 12 }}>
        <span className="flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(255,255,255,0.10)" }}><Dumbbell size={40} color="#FFFFFF" /></span>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#FFF", textAlign: "center", lineHeight: 1.2 }}>Tu entrenamiento personalizado</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 1.6 }}>Pedile a CrossFit Palermo que te asigne un coach y empezá a entrenar con un plan diseñado para vos.</div>
      </div>
      <div className="flex flex-col" style={{ padding: "28px 24px", gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>¿Qué incluye?</div>
        {BENEFITS.map(([t, d]) => (
          <div key={t} className="flex items-start" style={{ gap: 12 }}>
            <CheckCircle2 size={16} color="#22C55E" style={{ flexShrink: 0, marginTop: 1 }} />
            <div><div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{d}</div></div>
          </div>
        ))}
      </div>
      <div style={{ padding: "0 24px 32px", marginTop: "auto" }}>
        {pending && <div style={{ fontSize: 12, color: "#D97706", background: "#FFFBEB", borderRadius: 20, padding: "6px 14px", textAlign: "center", marginBottom: 12 }}>⏳ Solicitud enviada · Esperando asignación</div>}
        {pending ? (
          <button onClick={() => setSheet(true)} style={{ width: "100%", height: 48, borderRadius: 14, border: "1.5px solid #E2E8F0", color: "#374151", fontSize: 14, fontWeight: 600, background: "#FFF" }}>Ver estado de mi solicitud</button>
        ) : (
          <button onClick={() => setSheet(true)} className="flex items-center justify-center" style={{ width: "100%", height: 56, borderRadius: 14, background: "#111827", color: "#FFF", fontSize: 15, fontWeight: 700, gap: 8 }}><Dumbbell size={16} color="#FFFFFF" />Solicitar coach</button>
        )}
        <button onClick={() => setLinkOpen(!linkOpen)} style={{ display: "block", margin: "12px auto 0", fontSize: 12, color: "#94A3B8" }}>Ya tengo un coach</button>
        {linkOpen && (
          <div className="flex" style={{ gap: 8, marginTop: 10 }}>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código o email de tu coach" style={{ flex: 1, height: 42, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13, background: "#FFF" }} />
            <button disabled={!code.trim()} onClick={() => setUserContext({ type: "gym_member", alsoCoached: true })} style={{ background: code.trim() ? "#111827" : "#CBD5E1", color: "#FFF", borderRadius: 10, padding: "0 14px", fontSize: 13, fontWeight: 600 }}>Vincular</button>
          </div>
        )}
      </div>
      {sheet && <CoachPlanSheet onClose={() => setSheet(false)} />}
    </div>
  );
}

/* ───────── Explorer (marketplace) ───────── */
const CATS = ["Todos", "Fuerza", "Running", "CrossFit", "Natación", "Yoga", "Nutrición"];
const COACHES: MktCoach[] = [
  { name: "Pablo Rodríguez", spec: "Fuerza e hipertrofia", athletes: 34, online: true, tags: ["Fuerza", "Hipertrofia", "CrossFit"], mod: "Online", price: 8500, years: 3, days: ["Lun", "Mar", "Jue", "Vie"] },
  { name: "Laura Méndez", spec: "Running y resistencia", athletes: 52, online: true, tags: ["Running", "Nutrición", "Rendimiento deportivo"], mod: "Ambas", price: 12000, years: 6, days: ["Lun", "Mié", "Vie", "Sáb"] },
  { name: "Diego Romero", spec: "Natación y triatlón", athletes: 21, online: false, tags: ["Natación", "Running"], mod: "Presencial", price: 18000, years: 8, days: ["Mar", "Mié", "Jue", "Sáb"] },
  { name: "Camila Sosa", spec: "Yoga y movilidad", athletes: 40, online: true, tags: ["Yoga", "Pérdida de peso"], mod: "Online", price: 6000, years: 4, days: ["Lun", "Mar", "Mié", "Jue", "Vie"] },
];
const COACH_SPECS = [...new Set(COACHES.flatMap((c) => c.tags))];

export function ExploreView() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const [f, setF] = useState<MktFilters>(EMPTY_FILTERS);
  const [open, setOpen] = useState(false);
  const list = sortCoaches(COACHES.filter((c) => (cat === "Todos" || c.tags.includes(cat)) && (c.name + c.spec).toLowerCase().includes(q.toLowerCase()) && matchFilters(c, f)), f.sort);
  const chips = activeChips(f, setF);
  return (
    <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: "16px 0 16px" }}>
      <div style={{ padding: "36px 20px 0" }}><div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Explorar</div>
      <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Encontrá tu coach o programa ideal.</div></div>
      <div className="flex items-center" style={{ margin: "14px 16px", gap: 8, flexShrink: 0 }}>
      <div className="flex items-center" style={{ flex: 1, minWidth: 0, border: "1px solid #E2E8F0", borderRadius: 12, height: 46, padding: "0 14px", gap: 10, background: "#FFF", flexShrink: 0 }}>
        <Search size={16} color="#CBD5E1" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" style={{ flex: 1, minWidth: 0, border: 0, outline: "none", fontSize: 13, background: "transparent" }} />
      </div>
      <FiltersButton count={chips.length} onClick={() => setOpen(true)} />
      </div>
      {chips.length > 0 && (
        <div className="flex overflow-x-auto" style={{ gap: 6, padding: "0 16px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
          {chips.map((ch) => (
            <button key={ch.label} onClick={ch.remove} className="flex items-center" style={{ flexShrink: 0, gap: 6, background: "#111827", color: "#FFF", borderRadius: 20, padding: "5px 10px", fontSize: 11 }}>{ch.label}<X size={10} color="#FFF" /></button>
          ))}
        </div>
      )}
      <div className="flex overflow-x-auto" style={{ gap: 8, marginBottom: 14, flexShrink: 0, padding: "0 16px", whiteSpace: "nowrap" }}>
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: cat === c ? "#111827" : "#FFF", color: cat === c ? "#FFF" : "#374151", border: cat === c ? "1px solid #111827" : "1px solid #E2E8F0" }}>{c}</button>
        ))}
      </div>
      <div className="flex flex-col" style={{ gap: 10, padding: "0 16px" }}>
        {list.map((c) => (
          <div key={c.name} className="flex" style={{ background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: 14, gap: 12 }}>
            <span className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 12, background: "#F1F5F9", fontSize: 14, fontWeight: 600, color: "#94A3B8", flexShrink: 0 }}>{c.name.split(" ").map((p) => p[0]).join("")}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{c.spec}</div>
              <div style={{ fontSize: 11, marginTop: 2 }}><span style={{ color: "#94A3B8" }}>{c.athletes} atletas</span>{c.online && <span style={{ color: "#22C55E" }}> · Online</span>}</div>
              <div className="flex" style={{ gap: 4, marginTop: 6 }}>
                {c.tags.slice(0, 2).map((t) => <span key={t} style={{ fontSize: 10, color: "#374151", border: "1px solid #E2E8F0", borderRadius: 20, padding: "2px 8px" }}>{t}</span>)}
              </div>
            </div>
            <div className="flex flex-col" style={{ gap: 6, alignSelf: "flex-start" }}>
              <Link to="/perfil-coach/$coachId" params={{ coachId: c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-") }} style={{ fontSize: 12, fontWeight: 600, color: "#111827", border: "1px solid #E2E8F0", borderRadius: 8, padding: "5px 12px", textAlign: "center" }}>Ver</Link>
              <Link to="/hoy" onClick={() => setUserContext({ type: "coached_athlete" })} style={{ fontSize: 12, fontWeight: 600, color: "#FFF", background: "#111827", borderRadius: 8, padding: "5px 12px", textAlign: "center" }}>Conectar</Link>
            </div>
          </div>
        ))}
        {list.length === 0 && <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: 24 }}>No encontramos resultados.</div>}
      </div>
      {open && <FilterSheet value={f} specs={COACH_SPECS} onClose={() => setOpen(false)} onApply={(v) => { setF(v); setOpen(false); }} countFor={(v) => COACHES.filter((c) => (cat === "Todos" || c.tags.includes(cat)) && matchFilters(c, v)).length} />}
      <Link to="/marketplace" style={{ display: "block", fontSize: 12, color: "#3B82F6", textAlign: "center", padding: "12px 0" }}>Ver todos los coaches</Link>
    </div>
  );
}

export function EntrenamientoScreen({ hasCoach }: { hasCoach: boolean }) {
  const ctx = useUserContext();
  return (
    <PhoneFrame>
      {ctx.type === "explorer" ? <ExploreView /> : ctx.type === "gym_member" && !hasCoach ? <GymUpsellView /> : <CoachedView />}
      <AthleteBottomNav active="Entrenamiento" />
    </PhoneFrame>
  );
}
