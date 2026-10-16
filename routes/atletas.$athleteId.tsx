import { toast } from "sonner";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Clock,
  Eye,
  ChevronRight,
  Info,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Smile,
  Zap,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Sidebar } from "@/components/togo/Sidebar";
import { CalendarTopBar, denseCell } from "@/components/togo/DenseSession";
import { SelectionToolbar, Selectable, dayDiff, mapOps, selId, useDragSelect } from "@/components/togo/CalendarSelection";
import { AthleteProgress } from "@/components/togo/AthleteProgress";
import { LAB_SESSIONS } from "@/components/togo/LabSessions";
import {
  AerobicEditor,
  SessionCard,
  SessionTypePicker,
  newEx,
  type DaySession,
} from "@/components/togo/AthleteSessionCard";
import { ATHLETES, type Athlete, type Load } from "@/routes/atletas.index";

export const Route = createFileRoute("/atletas/$athleteId")({
  head: () => ({
    meta: [
      { title: "Calendario del atleta | TOGO" },
      {
        name: "description",
        content:
          "Calendario mensual del atleta, progreso, bienestar y notas privadas del coach en TOGO.",
      },
      { property: "og:title", content: "Calendario del atleta | TOGO" },
      {
        property: "og:description",
        content: "Planificá el mes del atleta, revisá su progreso y bienestar, y guardá notas privadas.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AthleteCalendar,
});


const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const LOAD_DOT: Record<Load, { color: string; label: string }> = {
  ok: { color: "#22C55E", label: "Carga OK" },
  warn: { color: "#F59E0B", label: "En alerta" },
  risk: { color: "#EF4444", label: "Sobrecargado" },
  none: { color: "#CBD5E1", label: "Sin datos" },
  inactive: { color: "#94A3B8", label: "Inactivo" },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function dayKey(day: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const mk = (id: string, name: string, status: DaySession["status"], minutes: number, ex: [string, string, string][]): DaySession => ({
  id,
  name,
  status,
  minutes,
  items: ex.map(([n, se, r], i) => ({ ...newEx(n, se, r), id: `${id}-e${i}` })),
  circuits: [],
});

const INITIAL_SESSIONS: Record<string, DaySession[]> = {
  [dayKey(2)]: [mk("a1", "Fuerza — Lunes", "done", 60, [["Sentadilla trasera", "4", "6"], ["Press banca", "4", "8"], ["Remo con barra", "3", "10"]])],
  [dayKey(4)]: [mk("a2", "Hipertrofia — Miércoles", "done", 55, [["Press inclinado", "3", "10"], ["Aperturas", "3", "12"]])],
  [dayKey(9)]: [mk("a3", "Fuerza — Empuje", "published", 50, [["Press militar", "4", "8"], ["Fondos", "3", "10"]])],
  [dayKey(11)]: [
    mk("a4", "Full body A", "draft", 55, [["Sentadilla trasera", "4", "8"], ["Press militar", "3", "10"], ["Face pull", "3", "15"]]),
    mk("a5", "Movilidad de cadera", "draft", 30, [["Hip 90/90", "3", "60s"], ["Pigeon pose", "3", "45s"]]),
    mk("a6", "Core y abdominales", "draft", 25, [["Plancha", "3", "45s"], ["Dead bug", "3", "12"]]),
  ],
  [dayKey(16)]: [mk("a7", "HIIT cardio 20 min", "draft", 20, [["Burpees", "3", "15"], ["Mountain climbers", "3", "30"]])],
};

const VOLUME = [4200, 4600, 5100, 4900, 5600, 6100, 5800, 6400];
const ONE_RM = [95, 98, 100, 102, 105, 107, 110, 112];

const PRS = [
  { ex: "Sentadilla trasera", value: "132,5 kg", when: "12 sep" },
  { ex: "Press de banca", value: "95 kg", when: "5 sep" },
  { ex: "Peso muerto", value: "165 kg", when: "29 ago" },
];

const WELLNESS_DAYS = [
  { day: "Lun 15", energy: 8, sleep: 7, mood: 8, state: "ok" },
  { day: "Mar 16", energy: 7, sleep: 6, mood: 7, state: "ok" },
  { day: "Mié 17", energy: 6, sleep: 5, mood: 6, state: "warn" },
  { day: "Jue 18", energy: 5, sleep: 5, mood: 6, state: "warn" },
  { day: "Vie 19", energy: 7, sleep: 7, mood: 8, state: "ok" },
  { day: "Sáb 20", energy: null, sleep: null, mood: null, state: "none" },
  { day: "Dom 21", energy: 8, sleep: 8, mood: 8, state: "ok" },
];

const PREV_NOTES = [
  { when: "12 sep", text: "Mostró buena técnica en sentadilla, aumentar peso la próxima semana." },
  { when: "3 sep", text: "Molestia leve en hombro derecho: bajamos volumen de empuje vertical." },
];

const TABS = ["Calendario", "Progreso", "Bienestar", "Notas"] as const;
type Tab = (typeof TABS)[number];

function Chart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const w = 300;
  const h = 110;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 20) + 10;
    const y = h - 16 - ((v - min) / Math.max(1, max - min)) * (h - 36);
    return `${x},${y}`;
  });
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 10 }}>{label}</p>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 110 }} role="img" aria-label={label}>
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={10} x2={w - 10} y1={12 + i * 24} y2={12 + i * 24} stroke="#F1F5F9" strokeWidth={1} />
        ))}
        <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} />
        {pts.map((p) => {
          const [x, y] = p.split(",");
          return <circle key={p} cx={x} cy={y} r={2.5} fill={color} />;
        })}
      </svg>
    </div>
  );
}

function AthleteCalendar() {
  const { athleteId } = Route.useParams();
  const navigate = useNavigate();

  const athlete: Athlete =
    ATHLETES.find((a) => a.id === athleteId) ?? (ATHLETES[0] as Athlete);

  const [tab, setTab] = useState<Tab>("Calendario");
  const [monthOffset, setMonthOffset] = useState(0);
  const [sessions, setSessions] = useState<Record<string, DaySession[]>>(INITIAL_SESSIONS);
  const [picker, setPicker] = useState<string | null>(null);
  const [typePicker, setTypePicker] = useState<string | null>(null);
  const [fieldFor, setFieldFor] = useState<Date | null>(null);
  const [copied, setCopied] = useState<{ key: string; s: DaySession }[]>([]);
  const sel = useDragSelect();
  const [athleteView, setAthleteView] = useState(false);
  const [aerobic, setAerobic] = useState<{ key: string; s: DaySession } | null>(null);
  const [q, setQ] = useState("");
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  const viewMonth = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthCells = useMemo(() => {
    const first = new Date(viewMonth);
    const lead = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(start.getDate() - lead);
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cellKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const monthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  const draftCount = monthCells
    .filter((d) => d.getMonth() === viewMonth.getMonth())
    .flatMap((d) => sessions[cellKey(d)] ?? [])
    .filter((s) => s.status === "draft").length;

  const goMonth = (dir: number) => {
    setMonthOffset((m) => m + dir);
    setPicker(null);
    setExpandedDay(null);
  };

  const onDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, input")) return;
    if (e.pointerType === "mouse") return;
    dragStart.current = e.clientX;
    setDragging(true);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDragX(e.clientX - dragStart.current);
  };
  const onDragEnd = () => {
    if (dragStart.current === null) return;
    const dx = dragX;
    dragStart.current = null;
    setDragging(false);
    setDragX(0);
    if (dx < -60) goMonth(1);
    else if (dx > 60) goMonth(-1);
  };

  const pushSession = (key: string, sess: DaySession) => {
    setSessions((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), sess] }));
    setPicker(null);
    setQ("");
  };
  const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const cloneSession = (s: DaySession, status: DaySession["status"] = "draft"): DaySession => ({
    ...s,
    id: `c${uid()}`,
    status,
    items: s.items.map((e) => ({ ...e, id: `${e.id}-${uid()}` })),
    circuits: s.circuits.map((c) => ({ ...c, exercises: c.exercises.map((e) => ({ ...e })) })),
  });
  const addBlank = (key: string) =>
    pushSession(key, { id: `n${uid()}`, name: "Nueva sesión de fuerza", status: "draft", minutes: 45, items: [], circuits: [] });
  const addFromLab = (key: string, labId: string) => {
    const l = LAB_SESSIONS.find((x) => x.id === labId);
    if (!l) return;
    pushSession(key, {
      id: `l${uid()}`,
      name: l.name,
      status: "draft",
      minutes: l.minutes,
      items: l.exercises.map((e) => ({ ...newEx(e.name, e.sets, e.reps), weight: e.weight })),
      circuits: l.circuits.map((c) => ({ ...c })),
    });
  };
  const updateSession = (key: string, ns: DaySession) =>
    setSessions((prev) => ({ ...prev, [key]: (prev[key] ?? []).map((s) => (s.id === ns.id ? ns : s)) }));
  const ops = mapOps(setSessions, (s: DaySession) => cloneSession(s));
  const pasteSession = (key: string) => {
    if (!copied.length) return;
    const first = copied.reduce((m, c) => (dayDiff(c.key, m) < 0 ? c.key : m), copied[0]!.key);
    ops.place(copied, dayDiff(key, first));
    setCopied([]);
  };
  const selItems = ops.collect(sessions, sel.selected);
  const repeatSession = (from: Date, s: DaySession, every: number, times: number) => {
    setSessions((prev) => {
      const next = { ...prev };
      for (let i = 1; i <= times; i++) {
        const d = new Date(from);
        d.setDate(d.getDate() + 7 * every * i);
        const k = cellKey(d);
        next[k] = [...(next[k] ?? []), cloneSession(s)];
      }
      return next;
    });
  };

  const removeSession = (key: string, id: string) => {
    setSessions((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((s) => s.id !== id) }));
  };

  const publishMonth = () => {
    setSessions((prev) => {
      const next = { ...prev };
      monthCells.forEach((d) => {
        const key = cellKey(d);
        if (next[key]) {
          next[key] = next[key]!.map((s) => (s.status === "draft" ? { ...s, status: "published" as const } : s));
        }
      });
      return next;
    });
    setConfirmPublish(false);
  };

  const dot = LOAD_DOT[athlete.load];
  const borderLeft = (s: DaySession) =>
    s.status === "done" ? "#111827" : s.status === "published" ? "#22C55E" : "#E2E8F0";

  const tabBtn = (t: Tab) => (
    <button
      key={t}
      type="button"
      onClick={() => setTab(t)}
      className="cursor-pointer"
      style={{
        padding: "10px 20px",
        fontSize: 13,
        fontWeight: 500,
        color: tab === t ? "#111827" : "#94A3B8",
        background: "none",
        border: "none",
        borderBottom: tab === t ? "2px solid #111827" : "2px solid transparent",
      }}
    >
      {t}
    </button>
  );

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]" style={{ backgroundColor: "#F8FAFC" }}>
      <Sidebar active="Atletas" />

      <main className="flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>
        {/* BREADCRUMB + HEADER */}
        <div style={{ padding: "20px 32px 0", flexShrink: 0, backgroundColor: "#F8FAFC" }}>
          <div className="flex items-center" style={{ gap: 6, marginBottom: 16 }}>
            <Link
              to="/atletas"
              style={{ fontSize: 12, color: "#94A3B8", textDecoration: "none" }}
              className="transition-colors hover:text-[#111827]"
            >
              Mis atletas
            </Link>
            <ChevronRight size={12} color="#CBD5E1" />
            <span style={{ fontSize: 12, color: "#374151" }}>{athlete.name}</span>
          </div>

          <div
            className="flex items-center"
            style={{ gap: 16, paddingBottom: 20, borderBottom: "1px solid #E2E8F0" }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                backgroundColor: "#F1F5F9",
                color: "#94A3B8",
                fontSize: 18,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {initials(athlete.name)}
            </div>

            <div className="flex flex-1 flex-col" style={{ gap: 4 }}>
              <div className="flex items-center" style={{ gap: 10 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{athlete.name}</h1>
                <span
                  title={dot.label}
                  style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: dot.color }}
                />
              </div>
              <p style={{ fontSize: 13, color: "#94A3B8" }}>
                {athlete.program
                  ? `${athlete.program}${athlete.week ? ` · ${athlete.week}` : ""}`
                  : "Sin programa asignado"}
              </p>
              <div className="flex items-center" style={{ gap: 12, marginTop: 2 }}>
                {[
                  { Icon: Zap, value: athlete.energy },
                  { Icon: Moon, value: athlete.sleep },
                  { Icon: Smile, value: athlete.mood },
                ].map(({ Icon, value }, i) => (
                  <span key={i} className="flex items-center" style={{ gap: 4 }}>
                    <Icon size={11} color="#CBD5E1" />
                    <span style={{ fontSize: 11, color: "#374151" }}>
                      {value === null ? "—" : `${value}/10`}
                    </span>
                  </span>
                ))}
                <span style={{ fontSize: 11, color: "#CBD5E1" }}>· Hoy</span>
              </div>
            </div>

            <div className="flex items-center self-start" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={() => navigate({ to: "/mensajes", search: { atleta: athlete.name } })}
                className="flex cursor-pointer items-center transition-colors hover:bg-[#F8FAFC]"
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 9,
                  height: 36,
                  padding: "0 14px",
                  fontSize: 12,
                  color: "#374151",
                  gap: 6,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <MessageCircle size={13} color="#94A3B8" />
                Mensaje
              </button>
              <button
                type="button"
                onClick={() => setConfirmPublish(true)}
                className="cursor-pointer"
                style={{
                  backgroundColor: "#111827",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 9,
                  height: 36,
                  padding: "0 16px",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Publicar semana
              </button>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Más opciones"
                  onClick={() => setMenu((m) => !m)}
                  className="flex cursor-pointer items-center"
                  style={{ background: "none", border: "none", padding: 4 }}
                >
                  <MoreHorizontal size={18} color="#CBD5E1" />
                </button>
                {menu ? (
                  <>
                    <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
                    <div
                      style={{
                        position: "absolute",
                        top: 30,
                        right: 0,
                        minWidth: 180,
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: 10,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        padding: 4,
                        zIndex: 30,
                      }}
                    >
                      {[
                        { label: "Ver progreso", action: () => setTab("Progreso") },
                        { label: "Ver bienestar", action: () => setTab("Bienestar") },
                        { label: "Cambiar programa", action: () => navigate({ to: "/atletas" }) },
                        { label: "Archivar atleta", action: () => navigate({ to: "/atletas" }) },
                      ].map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          onClick={() => {
                            setMenu(false);
                            o.action();
                          }}
                          className="w-full cursor-pointer rounded-[8px] text-left transition-colors hover:bg-[#F8FAFC]"
                          style={{
                            background: "none",
                            border: "none",
                            padding: "8px 10px",
                            fontSize: 13,
                            color: "#374151",
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div
          className="flex"
          style={{ borderBottom: "1px solid #E2E8F0", padding: "0 32px", flexShrink: 0, backgroundColor: "#F8FAFC" }}
        >
          {TABS.map(tabBtn)}
        </div>

        {/* CALENDARIO */}
        {tab === "Calendario" ? (
          <div className="flex flex-1 flex-col" style={{ overflow: "hidden", padding: "16px 32px 24px" }}>
            <div className="flex flex-1 flex-col" style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", minHeight: 0 }}>
            <CalendarTopBar>
              <button type="button" aria-label="Mes anterior" onClick={() => goMonth(-1)} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0 }}>
                <ChevronLeft size={20} color="#FFFFFF" />
              </button>
              <button type="button" aria-label="Mes siguiente" onClick={() => goMonth(1)} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0 }}>
                <ChevronRight size={20} color="#FFFFFF" />
              </button>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", flex: 1 }}>{monthLabel}</span>
              <div className="flex items-center" style={{ gap: 8 }}>
                <button type="button" onClick={() => navigate({ to: "/mensajes", search: { atleta: athlete.name } })} className="flex items-center" style={{ gap: 6, border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 8, height: 34, padding: "0 14px", fontSize: 12, color: "#FFFFFF", background: "none", cursor: "pointer" }}>
                  <MessageCircle size={13} color="#FFFFFF" />Mensaje atleta
                </button>
                <button type="button" onClick={() => setConfirmPublish(true)} style={{ backgroundColor: "#FFFFFF", color: "#111827", borderRadius: 8, height: 34, padding: "0 14px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
                  Publicar todo
                </button>
                <button type="button" title={athleteView ? "Ver todo" : "Ver como el atleta (sin borradores)"} aria-label="Vista del atleta" onClick={() => setAthleteView((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0, padding: 4 }}>
                  <Eye size={18} color={athleteView ? "#FFFFFF" : "rgba(255,255,255,0.6)"} />
                </button>
                <button type="button" title="Agregar sesión hoy" aria-label="Agregar sesión hoy" onClick={() => { setMonthOffset(0); setTypePicker(cellKey(today)); }} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0, padding: 4 }}>
                  <Plus size={18} color="rgba(255,255,255,0.6)" />
                </button>
                <button type="button" title="Ir a hoy" aria-label="Ir a hoy" onClick={() => setMonthOffset(0)} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0, padding: 4 }}>
                  <Clock size={18} color="rgba(255,255,255,0.6)" />
                </button>
              </div>
            </CalendarTopBar>


            <div
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              className="flex flex-1 flex-col"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                overflow: "hidden",
                touchAction: "pan-y",
              }}
            >
              <div
                className="flex flex-1 flex-col"
                style={{ ...(dragX !== 0 ? { transform: `translateX(${dragX}px)` } : {}), transition: dragging ? "none" : "transform 300ms ease", minHeight: 0 }}
              >
               <div ref={sel.containerRef} onMouseDown={sel.onMouseDown} style={{ flex: 1, minHeight: 0, height: "100%", overflowY: "auto", userSelect: "none" }}>
                <div className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", backgroundColor: "#FFFFFF", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 10, height: 36 }}>
                  {DAYS.map((d) => (
                    <div key={d} style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8", textAlign: "center", padding: "8px 0" }}>{d}</div>
                  ))}
                </div>
                <div>
                  {Array.from({ length: monthCells.length / 7 }, (_, wi) => (
                  <div key={wi} style={denseCell.weekRow}>
                  {monthCells.slice(wi * 7, wi * 7 + 7).map((d, j) => {
                    const idx = wi * 7 + j;
                    const key = cellKey(d);
                    const day = (sessions[key] ?? []).filter((s) => !athleteView || s.status !== "draft");
                    const outside = d.getMonth() !== viewMonth.getMonth();
                    const isToday = d.getTime() === today.getTime();
                    return (
                      <div key={key} className="group/cell" style={denseCell.cell(outside, idx % 7 === 6)}>
                        <div style={denseCell.header}>
                          <span style={denseCell.dayNum(isToday, outside)}>{d.getDate()}</span>
                          <span className="flex-1" />
                          {copied.length ? (
                            <button
                              type="button"
                              onClick={() => pasteSession(key)}
                              className="cursor-pointer opacity-0 group-hover/cell:opacity-100"
                              style={{ fontSize: 10, color: "#3B82F6", background: "none", border: "none", padding: 0 }}
                            >
                              Pegar aquí
                            </button>
                          ) : null}
                        </div>

                        <div style={denseCell.area}>
                          {day.map((s) => (
                            <Selectable key={s.id} id={selId(key, s.id)} selected={sel.selected.has(selId(key, s.id))} onToggle={sel.toggle} radius={4}>
                            <SessionCard
                              session={s}
                              alignRight={idx % 7 >= 4}
                              onChange={(ns) => updateSession(key, ns)}
                              onDelete={() => removeSession(key, s.id)}
                              onCopy={() => setCopied([{ key, s }])}
                              onRepeat={(every, times) => repeatSession(d, s, every, times)}
                              onEditDetail={() => (s.field ? setAerobic({ key, s }) : navigate({ to: "/sesiones/$sessionId", params: { sessionId: s.id } }))}
                            />
                            </Selectable>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setTypePicker(key)}
                          className={denseCell.addBtn}
                          style={denseCell.addStyle}
                        >
                          <Plus size={10} />
                          sesión
                        </button>
                        {typePicker === key ? (
                          <SessionTypePicker
                            alignRight={idx % 7 >= 4}
                            onClose={() => setTypePicker(null)}
                            onStrength={() => {
                              setTypePicker(null);
                              addBlank(key);
                            }}
                            onField={() => {
                              setTypePicker(null);
                              setFieldFor(d);
                            }}
                            onLibrary={() => {
                              setTypePicker(null);
                              setPicker(key);
                              setQ("");
                            }}
                          />
                        ) : null}

                        {picker === key ? (
                          <>
                            <div onClick={() => setPicker(null)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
                            <div
                              style={{
                                position: "absolute",
                                top: 6,
                                left: 6,
                                minWidth: 240,
                                backgroundColor: "#FFFFFF",
                                border: "1px solid #E2E8F0",
                                borderRadius: 12,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                                padding: 8,
                                zIndex: 30,
                              }}
                            >
                              <div className="relative" style={{ marginBottom: 6 }}>
                                <Search size={12} color="#CBD5E1" style={{ position: "absolute", left: 12, top: 11 }} />
                                <input
                                  autoFocus
                                  value={q}
                                  onChange={(e) => setQ(e.target.value)}
                                  placeholder="Buscar sesión…"
                                  aria-label="Buscar sesión"
                                  style={{
                                    width: "100%",
                                    height: 34,
                                    border: "1px solid #E2E8F0",
                                    borderRadius: 8,
                                    padding: "0 10px 0 32px",
                                    fontSize: 12,
                                    color: "#111827",
                                    outline: "none",
                                  }}
                                />
                              </div>
                              {LAB_SESSIONS.filter((s) =>
                                s.name.toLowerCase().includes(q.trim().toLowerCase()),
                              ).map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => addFromLab(key, s.id)}
                                  className="flex w-full cursor-pointer items-center justify-between rounded-[8px] transition-colors hover:bg-[#F8FAFC]"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: "8px 10px",
                                    fontSize: 12,
                                    color: "#374151",
                                    textAlign: "left",
                                  }}
                                >
                                  <span>{s.name}</span>
                                  <span style={{ fontSize: 10, color: "#94A3B8" }}>{s.category}</span>
                                </button>
                              ))}
                              <div style={{ height: 1, backgroundColor: "#F1F5F9", margin: "6px 0" }} />
                              <button
                                type="button"
                                onClick={() => addBlank(key)}
                                className="flex w-full cursor-pointer items-center rounded-[8px] transition-colors hover:bg-[#F8FAFC]"
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "8px 10px",
                                  fontSize: 12,
                                  color: "#374151",
                                  gap: 6,
                                }}
                              >
                                <Plus size={12} color="#94A3B8" />
                                Nueva sesión
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                  </div>
                  ))}
               </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : null}

        {sel.overlay}
        <SelectionToolbar
          count={selItems.length}
          hasDraft={selItems.some((i) => i.s.status === "draft")}
          hasPublished={selItems.some((i) => i.s.status === "published")}
          onCopy={() => setCopied(selItems)}
          onDuplicate={() => ops.place(selItems, 7)}
          onPublish={() => { ops.patch(sel.selected, (s) => (s.status === "draft" ? { ...s, status: "published" } : s)); toast.success("Sesión publicada ✓"); }}
          onUnpublish={() => ops.patch(sel.selected, (s) => (s.status === "published" ? { ...s, status: "draft" } : s))}
          onDelete={() => { ops.remove(sel.selected); sel.clear(); }}
          onCancel={sel.clear}
        />

        {aerobic ? (
          <AerobicEditor
            dateLabel={new Date(`${aerobic.key}T00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long" })}
            initial={aerobic.s}
            onClose={() => setAerobic(null)}
            onSave={(fs) => {
              updateSession(aerobic.key, { ...fs, id: aerobic.s.id });
              toast.success(fs.status === "published" ? "Sesión publicada ✓" : "Sesión guardada como borrador");
              setAerobic(null);
            }}
          />
        ) : null}

        {fieldFor ? (
          <AerobicEditor
            dateLabel={fieldFor.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            onClose={() => setFieldFor(null)}
            onSave={(fs) => {
              pushSession(cellKey(fieldFor), fs);
              toast.success(fs.status === "published" ? "Sesión publicada ✓" : "Sesión guardada como borrador");
              setFieldFor(null);
            }}
          />
        ) : null}

        {/* PROGRESO */}
        {tab === "Progreso" ? <AthleteProgress /> : null}

        {/* BIENESTAR */}
        {tab === "Bienestar" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
            <div
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Últimos 7 días</p>
              <div className="grid" style={{ gridTemplateColumns: "1fr 90px 90px 90px 110px" }}>
                {["Día", "Energía", "Sueño", "Ánimo", "Estado"].map((h, i) => (
                  <div
                    key={h}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      paddingBottom: 8,
                      textAlign: i === 0 ? "left" : "center",
                    }}
                  >
                    {h}
                  </div>
                ))}
                {WELLNESS_DAYS.map((w) => {
                  const st =
                    w.state === "ok"
                      ? { bg: "#DCFCE7", color: "#16A34A", label: "OK" }
                      : w.state === "warn"
                        ? { bg: "#FEF9C3", color: "#854D0E", label: "En alerta" }
                        : { bg: "#F1F5F9", color: "#94A3B8", label: "Sin datos" };
                  return (
                    <div key={w.day} style={{ display: "contents" }}>
                      <div style={{ fontSize: 13, color: "#374151", padding: "9px 0", borderTop: "1px solid #F1F5F9" }}>
                        {w.day}
                      </div>
                      {[w.energy, w.sleep, w.mood].map((v, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 13,
                            color: v === null ? "#94A3B8" : "#374151",
                            textAlign: "center",
                            padding: "9px 0",
                            borderTop: "1px solid #F1F5F9",
                          }}
                        >
                          {v === null ? "—" : `${v}/10`}
                        </div>
                      ))}
                      <div
                        style={{ textAlign: "center", padding: "9px 0", borderTop: "1px solid #F1F5F9" }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            backgroundColor: st.bg,
                            color: st.color,
                            borderRadius: 6,
                            padding: "3px 8px",
                          }}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="flex items-start"
              style={{
                marginTop: 16,
                backgroundColor: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: 12,
                padding: "14px 16px",
                gap: 10,
              }}
            >
              <Info size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#92400E", marginBottom: 4 }}>Sugerencia IA</p>
                <p style={{ fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
                  El sueño bajó a mitad de semana. Sostené la carga actual y sumá una entrada en frío o movilidad
                  antes de aumentar el volumen. Esta sugerencia es orientativa y no reemplaza tu criterio profesional.
                </p>
              </div>
            </div>

          </div>
        ) : null}

        {/* NOTAS */}
        {tab === "Notas" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
            <div
              className="relative"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 20,
                minHeight: 200,
              }}
            >
              {saved ? (
                <span style={{ position: "absolute", top: 12, right: 16, fontSize: 11, color: "#94A3B8" }}>
                  Guardado
                </span>
              ) : null}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => {
                  setSaved(true);
                  window.setTimeout(() => setSaved(false), 2000);
                }}
                placeholder="Anotá observaciones, ajustes de programa, notas de progreso…"
                aria-label="Notas privadas"
                style={{
                  width: "100%",
                  minHeight: 160,
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontSize: 14,
                  color: "#374151",
                  lineHeight: 1.7,
                  backgroundColor: "transparent",
                }}
              />
            </div>

            {PREV_NOTES.map((n) => (
              <div
                key={n.when}
                style={{
                  marginTop: 8,
                  backgroundColor: "#F8FAFC",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#374151",
                }}
              >
                {n.when} · “{n.text}”
              </div>
            ))}
          </div>
        ) : null}

        {/* CONFIRM PUBLISH */}
        {confirmPublish ? (
          <div
            className="flex items-center justify-center"
            style={{ position: "fixed", inset: 0, backgroundColor: "rgba(17,24,39,0.35)", zIndex: 60 }}
            onClick={() => setConfirmPublish(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 400,
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
                ¿Publicar {draftCount} sesiones para {athlete.name}?
              </p>
              <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 18 }}>
                El atleta va a ver estas sesiones en su app apenas las publiques.
              </p>
              <div className="flex" style={{ gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setConfirmPublish(false)}
                  className="flex-1 cursor-pointer"
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    height: 40,
                    fontSize: 13,
                    color: "#374151",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={publishMonth}
                  className="flex-1 cursor-pointer"
                  style={{
                    backgroundColor: "#111827",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 10,
                    height: 40,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

