import { toast as sonnerToast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";
import { GymClasses } from "@/components/togo/GymClasses";
import { PracticeCalendar, BillingScreen } from "@/components/togo/InstCalBilling";
import { InstOnboarding } from "@/components/togo/Onboarding";
import { MembersScreen, CoachesScreen, TeamsScreen, ReportsScreen, SettingsScreen, attColor } from "@/components/togo/InstScreens";
import { useCoachRequests } from "@/lib/coach-requests";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users2, Dumbbell, UserCheck, CalendarDays, BarChart2, CreditCard, Settings2,
  ChevronDown, LogOut, Calendar, Download, TrendingUp, CheckCircle, UserPlus, Activity,
  MoreHorizontal, AlertCircle, AlertTriangle, Info, Check, Trophy, Target, Users, DoorOpen,
  DollarSign, CalendarCheck, CheckCircle2, RefreshCw, XCircle,
} from "lucide-react";

export const Route = createFileRoute("/institucion")({
  head: () => ({
    meta: [
      { title: "Panel Institución — TOGO" },
      { name: "description", content: "Administrá tu club deportivo o gimnasio en TOGO: equipos, clases, entrenadores, atletas y socios." },
      { property: "og:title", content: "Panel Institución — TOGO" },
      { property: "og:description", content: "Panel para clubes deportivos y gimnasios: planificación, asistencia, socios y facturación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstitucionPage,
});

type Mode = "club" | "gym";
type NavItem = { icon: typeof Users2; label: string; badge?: string } | null;

const SEDES = [
  { name: "Sede central", city: "Buenos Aires" },
  { name: "Sede Norte", city: "Vicente López" },
  { name: "Anexo Costanera", city: "Buenos Aires" },
];

type Cat = "sub14" | "sub16" | "sub18" | "senior" | "femenino" | "master";
const CAT_COLOR: Record<Cat, string> = { sub14: "#3B82F6", sub16: "#8B5CF6", sub18: "#EC4899", senior: "#111827", femenino: "#EC4899", master: "#D97706" };
const CAT_GROUP: Record<Cat, string> = { sub14: "Juvenil", sub16: "Juvenil", sub18: "Juvenil", senior: "Adulto", femenino: "Femenino", master: "Adulto" };
const CAT_LABEL: Record<Cat, string> = { sub14: "Sub-14", sub16: "Sub-16", sub18: "Sub-18", senior: "Senior", femenino: "Femenino", master: "Master" };

const TEAMS: { att: number; name: string; coach: string; cat: Cat; ath: number; ses: string; pct: number | null; status: "Activo" | "Sin plan" | "Inactivo" }[] = [
  { att: 16, name: "Sub-14 Masculino", coach: "Martín G.", cat: "sub14", ath: 18, ses: "4/sem", pct: 96, status: "Activo" },
  { att: 18, name: "Sub-16 Masculino", coach: "Diego T.", cat: "sub16", ath: 22, ses: "3/sem", pct: 89, status: "Activo" },
  { att: 11, name: "Sub-18 Masculino", coach: "Lucas F.", cat: "sub18", ath: 19, ses: "3/sem", pct: 58, status: "Activo" },
  { att: 24, name: "Primera División", coach: "Valeria L.", cat: "senior", ath: 26, ses: "5/sem", pct: 97, status: "Activo" },
  { att: 11, name: "Sub-16 Femenino", coach: "Carla M.", cat: "femenino", ath: 15, ses: "3/sem", pct: 78, status: "Activo" },
  { att: 8, name: "Master A", coach: "Rodrigo P.", cat: "master", ath: 12, ses: "2/sem", pct: null, status: "Sin plan" },
  { att: 5, name: "Master B", coach: "Sin asignar", cat: "master", ath: 9, ses: "—", pct: null, status: "Sin plan" },
];

const CLASSES: { name: string; time: string; coach: string; cap: string; att: string; status: "En curso" | "Completada" | "Próxima" }[] = [
  { name: "Funcional", time: "07:00", coach: "Martín Gutiérrez", cap: "18/20", att: "17 presentes", status: "Completada" },
  { name: "Spinning", time: "08:00", coach: "Carla Méndez", cap: "20/20", att: "19 presentes", status: "Completada" },
  { name: "Pilates", time: "10:00", coach: "Julieta Ramos", cap: "12/14", att: "12 presentes", status: "Completada" },
  { name: "CrossFit", time: "15:00", coach: "Diego Torres", cap: "16/18", att: "14 presentes", status: "En curso" },
  { name: "Movilidad", time: "15:30", coach: "Valeria López", cap: "9/12", att: "8 presentes", status: "En curso" },
  { name: "Boxeo", time: "17:00", coach: "Nicolás Paz", cap: "14/16", att: "—", status: "Próxima" },
  { name: "CrossFit", time: "18:00", coach: "Diego Torres", cap: "0/18", att: "—", status: "Próxima" },
];

const ACT = {
  club: [
    [Trophy, "#FFFBEB", "#D97706", "Sub-16 Masculino ganó el torneo regional", "Hace 2 horas"],
    [UserPlus, "#DCFCE7", "#16A34A", "3 nuevos atletas en Primera División", "Hace 4 horas"],
    [CheckCircle, "#F1F5F9", "#94A3B8", "Sofía Rodríguez cargó su sesión de fuerza", "Hace 5 horas"],
    [AlertCircle, "#FEF9C3", "#D97706", "Master B sin sesiones planificadas esta semana", "Hace 6 horas"],
    [CheckCircle, "#F1F5F9", "#94A3B8", "Sub-14 completó todas las sesiones de la semana", "Ayer"],
    [Users2, "#EFF6FF", "#3B82F6", "Sub-18 Femenino creado por Valeria López", "Hace 2 días"],
    [AlertCircle, "#FEF9C3", "#D97706", "Sub-18 Masculino: adherencia por debajo del 75%", "Hace 2 días"],
  ],
  gym: [
    [UserPlus, "#DCFCE7", "#16A34A", "Tomás Herrera se inscribió a CrossFit 15hs", "Hace 10 min"],
    [DoorOpen, "#EFF6FF", "#3B82F6", "17 socios asistieron a Funcional 7hs", "Hace 1 hora"],
    [RefreshCw, "#DCFCE7", "#16A34A", "Valeria Suárez renovó membresía Plan Elite", "Hace 2 horas"],
    [XCircle, "#FFF5F5", "#EF4444", "Pablo Gómez: cuota vencida", "Hace 3 horas"],
    [UserPlus, "#DCFCE7", "#16A34A", "Camila Torres se inscribió a Pilates 10hs", "Hace 5 horas"],
    [DoorOpen, "#EFF6FF", "#3B82F6", "Agustín Ruiz asistió a Spinning 8hs", "Ayer"],
  ],
} as const;

const COACHES = {
  club: [
    ["Martín Gutiérrez", "2 equipos · 40 atletas", true],
    ["Diego Torres", "1 equipo · 22 atletas", true],
    ["Valeria López", "2 equipos · 41 atletas", true],
    ["Lucas Fernández", "1 equipo · 19 atletas", true],
    ["Carla Méndez", "1 equipo · 15 atletas", true],
    ["Rodrigo Pérez", "1 equipo · 12 atletas · sin plan publicado", false],
  ],
  gym: [
    ["Martín Gutiérrez", "3 clases hoy · Funcional", true],
    ["Diego Torres", "2 clases hoy · CrossFit", true],
    ["Carla Méndez", "1 clase hoy · Spinning", true],
    ["Julieta Ramos", "1 clase hoy · Pilates", true],
    ["Valeria López", "1 clase hoy · Movilidad", true],
    ["Nicolás Paz", "1 clase hoy · Boxeo", false],
  ],
} as const;

const ALERTS = {
  club: [
    ["warn", "2 equipos sin sesiones planificadas esta semana", "Master B y Sub-18 Masc.", "Ver"],
    ["warn", "31 atletas no completaron ninguna sesión esta semana", "", "Ver por equipo"],
    ["error", "Sub-18 Masc.: completado en caída (58%, –18% vs semana ant.)", "", "Ver"],
    ["info", "Torneo regional en 5 días · 3 equipos clasificados", "", "Ver calendario"],
    ["warn", "4 atletas sin categoría asignada", "Revisar en Atletas", "Ver"],
  ],
  gym: [
    ["error", "8 socios con cuota vencida · $96.000 pendientes", "", "Ver"],
    ["warn", "Clase de CrossFit 18hs: 0 inscriptos", "", "Cancelar o difundir"],
    ["info", "6 renovaciones de membresía esta semana", "", "Ver"],
    ["warn", "Agustina Peralta: 3 semanas sin asistir", "", "Contactar"],
    ["error", "1 clase sin coach asignado mañana (Yoga 9hs)", "", "Asignar"],
  ],
} as const;

const ALERT_STYLE = {
  warn: { Icon: AlertTriangle, bg: "#FFFBEB", ic: "#D97706", t: "#92400E", s: "#B45309" },
  error: { Icon: AlertCircle, bg: "#FFF5F5", ic: "#EF4444", t: "#7F1D1D", s: "#B91C1C" },
  info: { Icon: Info, bg: "#F0FDF4", ic: "#22C55E", t: "#14532D", s: "#16A34A" },
};

const ini = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");
const card: React.CSSProperties = { background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0" };
const menuBox: React.CSSProperties = { ...card, borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,.08)", padding: 4, zIndex: 20, minWidth: 160 };
const TEAM_COLS = "2fr 80px 80px 100px 90px 36px";
const CLASS_COLS = "1.4fr 70px 1.6fr 70px 100px 90px";
const pctColor = (p: number) => (p >= 85 ? "#22C55E" : p >= 70 ? "#EAB308" : "#EF4444");

function InstitucionPage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState("Resumen");
  const [membersFilter, setMembersFilter] = useState<"Todos" | "Solicitan coach">("Todos");
  const [startAdd, setStartAdd] = useState(false);
  const [gymBilling, setGymBilling] = useState(true);
  const pendingReqs = useCoachRequests().filter((r) => !r.coach).length;
  const [sede, setSede] = useState(SEDES[0]!);
  const [sedeOpen, setSedeOpen] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [menu, setMenu] = useState<string | null>(null);
  const [clubBilling, setClubBilling] = useState(false);
  const [currency, setCurrency] = useState("ARS");
  const [autoRenew, setAutoRenew] = useState(true);
  const [pendingMode, setPendingMode] = useState<Mode | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState(true);
  const [customName, setCustomName] = useState<string | null>(null);

  useEffect(() => {
    const m = localStorage.getItem("togo-inst-mode");
    if (m === "club" || m === "gym") setMode(m);
    setOnboarded(localStorage.getItem("togo-inst-onboarded") === "1");
    try { const pr = JSON.parse(localStorage.getItem("togo-inst-profile") ?? "null"); if (pr?.name) setCustomName(pr.name); } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (!toast) return; sonnerToast.success(toast); setToast(null); }, [toast]);
  useEffect(() => {
    const close = () => { setMenu(null); setSedeOpen(false); };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const choose = (m: Mode) => { setMode(m); localStorage.setItem("togo-inst-mode", m); setActive("Resumen"); };

  if (!ready) return <div style={{ minHeight: "100vh", background: "#F8FAFC" }} />;
  if (!mode) return <TypeSelector onChoose={choose} onHelp={() => setToast("Te contactaremos pronto")} toast={toast} />;
  if (!onboarded) return <InstOnboarding mode={mode} onFinish={(n, to) => {
    localStorage.setItem("togo-inst-onboarded", "1"); setOnboarded(true); setCustomName(n);
    if (to === "add") { setActive(mode === "club" ? "Equipos" : "Socios"); setStartAdd(true); }
  }} />;

  const club = mode === "club";
  const nav: NavItem[] = club
    ? [
        { icon: LayoutDashboard, label: "Resumen" },
        { icon: Users2, label: "Equipos", badge: "12" },
        { icon: Dumbbell, label: "Entrenadores", badge: "8" },
        { icon: UserCheck, label: "Atletas", badge: "231" },
        { icon: CalendarDays, label: "Calendario" },
        { icon: BarChart2, label: "Reportes" },
        null,
        { icon: Settings2, label: "Configuración" },
      ]
    : [
        { icon: LayoutDashboard, label: "Resumen" },
        { icon: Dumbbell, label: "Entrenadores", badge: "6" },
        { icon: CalendarCheck, label: "Clases" },
        { icon: Users, label: "Socios", badge: "342" },
        { icon: CreditCard, label: "Caja" },
        { icon: BarChart2, label: "Reportes" },
        null,
        { icon: Settings2, label: "Configuración" },
      ];

  const instName = customName ?? (club ? "Club Atlético Palermo" : "Palermo Fitness Center");
  const instIni = club ? "CA" : "PF";
  const teams = filter === "Todos" ? TEAMS : TEAMS.filter((t) => CAT_GROUP[t.cat] === filter);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "Inter, sans-serif", color: "#111827" }}>
      <aside style={{ width: 240, position: "fixed", top: 0, left: 0, height: "100vh", background: "#FFFFFF", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", padding: "20px 12px" }}>
        <div style={{ position: "relative", marginBottom: 28 }}>
          <button onClick={(e) => { e.stopPropagation(); setSedeOpen((v) => !v); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", width: "100%", background: "none", border: 0, cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#111827", color: "#FFFFFF", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{instIni}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{instName}</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>{sede.name} · {sede.city}</div>
              <span style={{ display: "inline-block", marginTop: 3, fontSize: 9, borderRadius: 4, padding: "1px 6px", color: club ? "#3B82F6" : "#D97706", background: club ? "#EFF6FF" : "#FFFBEB" }}>{club ? "Club deportivo" : "Gimnasio"}</span>
            </div>
            <ChevronDown size={13} color="#CBD5E1" />
          </button>
          {sedeOpen && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 60, left: 0, right: 0, ...menuBox }}>
              {SEDES.map((s) => (
                <button key={s.name} onClick={() => { setSede(s); setSedeOpen(false); }} className="hover:bg-slate-50" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: 0, background: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#374151", textAlign: "left" }}>
                  <span style={{ flex: 1 }}>{s.name} <span style={{ color: "#94A3B8" }}>· {s.city}</span></span>
                  {s.name === sede.name && <Check size={13} color="#111827" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map((n, i) =>
            n === null ? (
              <div key={i} style={{ height: 1, background: "#F1F5F9", margin: "8px 0" }} />
            ) : (
              <button key={n.label} onClick={() => { setMembersFilter("Todos"); setStartAdd(false); setActive(n.label); }} className={active === n.label ? "" : "hover:bg-slate-50"}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: 0, cursor: "pointer", fontSize: 13, fontWeight: active === n.label ? 600 : 500, color: active === n.label ? "#111827" : "#374151", background: active === n.label ? "#F1F5F9" : "transparent", textAlign: "left" }}>
                <n.icon size={16} />
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.badge && <span style={{ fontSize: 10, color: "#94A3B8", background: "#F1F5F9", borderRadius: 20, padding: "1px 7px" }}>{n.badge}</span>}
              </button>
            ),
          )}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F1F5F9", color: "#94A3B8", fontSize: 11, fontWeight: 600, display: "grid", placeItems: "center" }}>AM</div>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Adolfo Martínez</span>
            <LogOut size={14} color="#CBD5E1" style={{ marginLeft: "auto", cursor: "pointer" }} onClick={() => setToast("Sesión cerrada")} />
          </div>
        </div>
      </aside>

      <main style={{ marginLeft: 240, flex: 1, minWidth: 0 }}>
        {active === "Configuración" ? (
          <SettingsScreen key={mode} mode={mode} notify={setToast} billing={club ? clubBilling : gymBilling} setBilling={club ? setClubBilling : setGymBilling}
            onChangeMode={(m) => { choose(m); setActive("Configuración"); setToast("Tipo de institución actualizado"); }} />
        ) : !club && active === "Clases" ? (
          <GymClasses notify={setToast} />
        ) : active === "Socios" || active === "Atletas" ? (
          <MembersScreen key={`${mode}-${membersFilter}-${startAdd}`} mode={mode} notify={setToast} initialFilter={membersFilter} startAdding={startAdd} />
        ) : active === "Entrenadores" ? (
          <CoachesScreen key={`${mode}-${startAdd}`} mode={mode} notify={setToast} startAdding={startAdd} />
        ) : club && active === "Equipos" ? (
          <TeamsScreen notify={setToast} onCalendar={() => setActive("Calendario")} />
        ) : club && active === "Calendario" ? (
          <PracticeCalendar notify={setToast} />
        ) : active === "Caja" ? (
          <BillingScreen key={mode} mode={mode} notify={setToast} />
        ) : active === "Reportes" ? (
          <ReportsScreen key={mode} mode={mode} notify={setToast} />
        ) : active !== "Resumen" ? (
          <div style={{ padding: "28px 32px" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{active}</h1>
            <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Esta sección estará disponible próximamente.</p>
          </div>
        ) : (
          <>
            <header style={{ padding: "28px 32px 0", display: "flex", alignItems: "flex-start", marginBottom: 22 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>{instName}</h1>
                <span style={{ display: "inline-block", marginTop: 4, background: "#DCFCE7", color: "#16A34A", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 500 }}>{club ? "Temporada 2026 · Activa" : "Plan Pro · activo"}</span>
                <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>{club ? "12 equipos · 8 entrenadores · 231 atletas" : "6 entrenadores · 342 socios"}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#374151", background: "#FFF" }}>
                  <Calendar size={12} color="#94A3B8" /> {club ? "Semana 38 · 2026" : "Lun 28 sep 2026"}
                </div>
                <button onClick={() => setToast("Informe exportado")} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #E2E8F0", borderRadius: 9, height: 36, padding: "0 14px", fontSize: 12, color: "#374151", background: "#FFF", cursor: "pointer" }}>
                  <Download size={12} color="#94A3B8" /> Exportar informe
                </button>
              </div>
            </header>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: "0 32px", marginBottom: 22 }}>
              {club ? (
                <>
                  <Kpi label="Atletas activos" Icon={UserCheck} value="231" color="#22C55E" foot={<><TrendingUp size={11} /> +14 este mes</>} />
                  <Kpi label="Asistencia semanal" Icon={Users} value="87%" foot="1.189 de 1.368 atletas en práctica" />
                  <Kpi label="Adherencia al plan" Icon={Target} value="76%" foot="Atletas que siguen la planificación" tip="% de atletas que completan ≥80% de las sesiones asignadas cada semana." />
                  <Kpi label="Equipos con plan" Icon={Calendar} value="10 / 12" color="#EAB308" foot={<><AlertTriangle size={11} /> 2 equipos sin sesiones esta semana</>} />
                </>
              ) : (
                <>
                  <Kpi label="Socios activos" Icon={Users} value="342" foot={<><span style={{ color: "#22C55E" }}>+23 este mes</span><span style={{ color: "#EF4444" }}>· 8 bajas</span></>} />
                  <Kpi label="Asistencia hoy" Icon={DoorOpen} value="87" foot="de 110 socios con turno · 79%" />
                  <Kpi label="Ingresos septiembre" Icon={DollarSign} value="$2.847.000" color="#22C55E" foot={<><TrendingUp size={11} /> +18% vs agosto</>} />
                  <Kpi label="Clases hoy" Icon={CalendarCheck} value="14" foot="3 en curso · 2 por iniciar · 9 completadas" />
                </>
              )}
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, padding: "0 32px", marginBottom: 18 }}>
              <div style={{ ...card }}>
                {club ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #E2E8F0", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Equipos</span>
                      <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                        {["Todos", "Juvenil", "Adulto", "Femenino"].map((c) => (
                          <button key={c} onClick={() => setFilter(c)} style={{ border: "1px solid", borderColor: filter === c ? "#111827" : "#E2E8F0", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", background: filter === c ? "#111827" : "#FFF", color: filter === c ? "#FFF" : "#374151" }}>{c}</button>
                        ))}
                      </div>
                    </div>
                    <Head cols={TEAM_COLS} labels={["Equipo", "Atletas", "Ses./sem", "Asistencia", "Estado", ""]} />
                    {teams.map((t) => {
                      const st = t.status === "Activo" ? ["#DCFCE7", "#16A34A"] : t.status === "Sin plan" ? ["#FEF9C3", "#D97706"] : ["#F1F5F9", "#94A3B8"];
                      return (
                        <div key={t.name} className="hover:bg-[#FAFAFA]" style={{ display: "grid", gridTemplateColumns: TEAM_COLS, alignItems: "center", padding: "11px 20px", borderBottom: "1px solid #F8FAFC", fontSize: 12, color: "#374151" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLOR[t.cat], flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.name}</div>
                              <div style={{ fontSize: 10, color: "#94A3B8" }}>{t.coach} · {CAT_LABEL[t.cat]}</div>
                            </div>
                          </div>
                          <span>{t.ath}</span>
                          <span>{t.ses}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: attColor((t.att / t.ath) * 100) }}>{t.att}/{t.ath}</span>
                          </div>
                          <span><Chip bg={st[0]!} fg={st[1]!}>{t.status}</Chip></span>
                          <RowMenu id={t.name} menu={menu} setMenu={setMenu} options={["Ver equipo", "Ver entrenador", "Ver atletas", "Asignar entrenador"]} onPick={(o) => setToast(`${o}: ${t.name}`)} />
                        </div>
                      );
                    })}
                    <div onClick={() => setActive("Equipos")} style={{ fontSize: 12, color: "#3B82F6", textAlign: "center", padding: "10px 0", cursor: "pointer" }}>Ver todos los equipos →</div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #E2E8F0", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Clases de hoy</span>
                    </div>
                    <Head cols={CLASS_COLS} labels={["Clase", "Horario", "Coach", "Cupo", "Asistencia", "Estado"]} />
                    {CLASSES.map((c, i) => {
                      const st = c.status === "En curso" ? ["#DCFCE7", "#16A34A"] : c.status === "Próxima" ? ["#EFF6FF", "#3B82F6"] : ["#F1F5F9", "#94A3B8"];
                      return (
                        <div key={i} className="hover:bg-[#FAFAFA]" style={{ display: "grid", gridTemplateColumns: CLASS_COLS, alignItems: "center", padding: "11px 20px", borderBottom: "1px solid #F8FAFC", fontSize: 12, color: "#374151" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.name}</span>
                          <span>{c.time}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F1F5F9", color: "#64748B", fontSize: 9, fontWeight: 600, display: "grid", placeItems: "center", flexShrink: 0 }}>{ini(c.coach)}</div>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.coach}</span>
                          </div>
                          <span style={{ color: c.cap.startsWith("0/") ? "#EF4444" : undefined }}>{c.cap}</span>
                          <span style={{ color: c.att === "—" ? "#94A3B8" : undefined }}>{c.att}</span>
                          <span><Chip bg={st[0]!} fg={st[1]!}>{c.status}</Chip></span>
                        </div>
                      );
                    })}
                    <div onClick={() => setActive("Clases")} style={{ fontSize: 12, color: "#3B82F6", textAlign: "center", padding: "10px 0", cursor: "pointer" }}>Ver todas las clases →</div>
                  </>
                )}
              </div>

              <div style={{ ...card, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #E2E8F0" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Actividad</span>
                  <Activity size={15} color="#CBD5E1" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", maxHeight: 320 }}>
                  {ACT[mode].map(([Icon, bg, fg, text, time], i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "11px 20px", borderBottom: "1px solid #F8FAFC", alignItems: "flex-start" }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: bg, color: fg, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon size={14} /></div>
                      <div>
                        <div style={{ fontSize: 12, color: "#374151" }}>{text}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 32px 32px", marginTop: 4 }}>
              <div style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Entrenadores</span>
                  <span onClick={() => setActive("Entrenadores")} style={{ fontSize: 12, color: "#3B82F6", cursor: "pointer" }}>Ver todos</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {COACHES[mode].map(([name, sub, on]) => (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F1F5F9", color: "#94A3B8", fontSize: 11, fontWeight: 600, display: "grid", placeItems: "center", flexShrink: 0 }}>{ini(name)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8" }}>{sub}</div>
                      </div>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? "#22C55E" : "#E2E8F0", marginLeft: "auto", flexShrink: 0 }} />
                      <RowMenu id={`c-${name}`} menu={menu} setMenu={setMenu} options={["Ver perfil", club ? "Ver equipos" : "Ver clases", "Editar acceso"]} onPick={(o) => setToast(`${o}: ${name}`)} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <AlertCircle size={16} color="#D97706" />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Requiere atención</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {!club && pendingReqs > 0 && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#EFF6FF" }}>
                      <UserPlus size={14} color="#3B82F6" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1E40AF" }}>{pendingReqs} {pendingReqs === 1 ? "socio solicitó" : "socios solicitaron"} planificación personalizada</div>
                        <div style={{ fontSize: 10, color: "#3B82F6", marginTop: 2 }}>Asignales un coach para activar sus planes.</div>
                      </div>
                      <span onClick={() => { setMembersFilter("Solicitan coach"); setActive("Socios"); }} style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", cursor: "pointer", marginLeft: "auto" }}>Asignar</span>
                    </div>
                  )}
                  {ALERTS[mode].map(([t, main, sub, action], i) => {
                    const s = ALERT_STYLE[t];
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: s.bg }}>
                        <s.Icon size={14} color={s.ic} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: s.t }}>{main}</div>
                          {sub && <div style={{ fontSize: 10, color: s.s, marginTop: 2 }}>{sub}</div>}
                        </div>
                        <span onClick={() => (action === "Ver calendario" ? setActive("Calendario") : setToast(`${action}: ${main}`))} style={{ fontSize: 11, color: s.ic, cursor: "pointer", whiteSpace: "nowrap" }}>{action}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {toast && <Toast text={toast} />}
    </div>
  );
}

function TypeSelector({ onChoose, onHelp, toast }: { onChoose: (m: Mode) => void; onHelp: () => void; toast: string | null }) {
  const opts = [
    { m: "club" as Mode, Icon: Trophy, title: "Club deportivo", btn: "Elegir Club",
      desc: "Atletismo, fútbol, natación, remo, rugby… Los entrenadores diseñan planes y los atletas los ejecutan de forma independiente. Sin presencia obligatoria.",
      feats: ["Equipos por categoría y división", "Métricas de completado y adherencia", "Sin módulo de facturación", "Planificación remota"] },
    { m: "gym" as Mode, Icon: Dumbbell, title: "Gimnasio / Centro deportivo", btn: "Elegir Gimnasio",
      desc: "Clases presenciales, membresías, turnos. Los socios asisten físicamente. Necesitás controlar asistencia, cuotas y ocupación de clases.",
      feats: ["Control de asistencia presencial", "Facturación y membresías", "Clases con cupos y horarios", "Múltiples coaches y sedes"] },
  ];
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", textAlign: "center" }}>¿Cómo es tu organización?</h1>
      <p style={{ fontSize: 14, color: "#94A3B8", textAlign: "center", maxWidth: 480, margin: "8px auto 40px" }}>Elegí el tipo que mejor describe cómo trabajás. Podés cambiarlo después en Configuración.</p>
      <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
        {opts.map((o) => (
          <div key={o.m} onClick={() => onChoose(o.m)} className="hover:!border-[#111827]" style={{ background: "#FFF", borderRadius: 16, border: "2px solid #E2E8F0", padding: "32px 28px", width: 280, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, transition: "border-color .15s" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "#F1F5F9", display: "grid", placeItems: "center" }}><o.Icon size={36} color="#111827" /></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", textAlign: "center" }}>{o.title}</div>
            <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", lineHeight: 1.6 }}>{o.desc}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "stretch", marginTop: 4 }}>
              {o.feats.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#374151" }}><CheckCircle2 size={12} color="#22C55E" /> {f}</div>
              ))}
            </div>
            <button style={{ background: "#111827", color: "#FFF", borderRadius: 10, height: 44, width: "100%", fontSize: 13, fontWeight: 600, border: 0, cursor: "pointer", marginTop: 8 }}>{o.btn}</button>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 20 }}>
        ¿No sabés cuál elegir? <span onClick={onHelp} style={{ color: "#3B82F6", cursor: "pointer" }}>Hablá con nosotros</span>
      </p>
      {toast && <Toast text={toast} />}
    </div>
  );
}

function BillingFields({ currency, setCurrency }: { currency: string; setCurrency: (v: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18, paddingTop: 18, borderTop: "1px solid #F1F5F9" }}>
      <label style={{ fontSize: 12, color: "#374151" }}>Moneda
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, height: 36, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 13, background: "#FFF" }}>
          <option>ARS</option><option>USD</option><option>BRL</option>
        </select>
      </label>
      <div style={{ fontSize: 12, color: "#374151" }}>Método de pago
        <div style={{ marginTop: 6, height: 36, border: "1px dashed #E2E8F0", borderRadius: 8, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 12, color: "#94A3B8" }}>Próximamente</div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{ width: 40, height: 22, borderRadius: 11, border: 0, cursor: "pointer", background: on ? "#111827" : "#E2E8F0", position: "relative", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#FFF", transition: "left .15s" }} />
    </button>
  );
}

function Head({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", padding: "8px 20px" }}>
      {labels.map((h, i) => <span key={i} style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>{h}</span>)}
    </div>
  );
}

function Chip({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return <span style={{ background: bg, color: fg, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap" }}>{children}</span>;
}

function RowMenu({ id, menu, setMenu, options, onPick }: { id: string; menu: string | null; setMenu: (v: string | null) => void; options: string[]; onPick: (o: string) => void }) {
  return (
    <div style={{ position: "relative" }}>
      <MoreHorizontal size={13} color="#CBD5E1" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setMenu(menu === id ? null : id); }} />
      {menu === id && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", right: 0, top: 20, ...menuBox }}>
          {options.map((o) => (
            <button key={o} className="hover:bg-slate-50" onClick={() => { setMenu(null); onPick(o); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", border: 0, background: "none", borderRadius: 7, fontSize: 12, cursor: "pointer", color: "#374151" }}>{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Toast({ text }: { text: string }) {
  return <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#111827", color: "#FFF", fontSize: 12, padding: "10px 16px", borderRadius: 10, zIndex: 50 }}>{text}</div>;
}

function Kpi({ label, Icon, value, foot, color, tip }: { label: string; Icon: typeof Users2; value: string; foot: React.ReactNode; color?: string; tip?: string }) {
  return (
    <div style={{ ...card, padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#94A3B8" }}>{label}</span>
        {tip && <span title={tip} style={{ display: "inline-flex", cursor: "help" }}><Info size={11} color="#CBD5E1" /></span>}
        <Icon size={15} color="#CBD5E1" style={{ marginLeft: "auto" }} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: color ?? "#94A3B8", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>{foot}</div>
    </div>
  );
}
