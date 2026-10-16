import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { useNotifs, forUser } from "@/lib/notifications";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CoachPlanBanner, CoachPlanSheet } from "@/components/togo/CoachPlanRequest";
import { readUserContext, useUserContext } from "@/lib/user-context";
import { TeamBlocks } from "@/components/togo/TeamBlocks";
import {
  BellRing,
  Calendar,
  CheckCircle,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  PlayCircle,
  ShoppingBag,
  TrendingUp,
  User,
} from "lucide-react";
import { EntrenamientoScreen } from "@/components/togo/Entrenamiento";
import { useHasCoach } from "@/components/togo/AthleteBottomNav";
import WellnessSheet from "@/components/togo/WellnessSheet";

type Notification = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const NOTIFICATIONS: Notification[] = [
  {
    icon: Calendar,
    iconBg: "#F0FDF4",
    iconColor: "#16A34A",
    title: "Nueva sesión publicada",
    body: "Coach Pablo publicó tu sesión del jueves. Ya podés verla.",
    time: "Hace 10 min",
    unread: true,
  },
  {
    icon: MessageCircle,
    iconBg: "#FFFBEB",
    iconColor: "#D97706",
    title: "Nuevo mensaje de Coach Pablo",
    body: "Te mandé la sesión del jueves. Revisala cuando puedas...",
    time: "Hace 1 hora",
    unread: true,
  },
  {
    icon: TrendingUp,
    iconBg: "#F1F5F9",
    iconColor: "#94A3B8",
    title: "Nuevo récord personal",
    body: "Superaste tu RM en Sentadilla. Ahora es 97 kg.",
    time: "Ayer",
    unread: false,
  },
  {
    icon: CheckCircle,
    iconBg: "#F1F5F9",
    iconColor: "#94A3B8",
    title: "Sesión completada",
    body: "Completaste Fuerza del lunes. ¡Buen trabajo!",
    time: "Lun 18/8",
    unread: false,
  },
];

function NotificationsSheet({
  notifs,
  onMarkAllRead,
  onClose,
}: {
  notifs: Notification[];
  onMarkAllRead: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col justify-end"
      style={{ backgroundColor: "rgba(17,24,39,0.5)", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{
          height: "65%",
          backgroundColor: "#FFFFFF",
          borderRadius: "20px 20px 0 0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* SHEET HEADER */}
        <div style={{ padding: "20px 20px 12px" }}>
          <div
            style={{
              width: 36,
              height: 4,
              backgroundColor: "#E2E8F0",
              borderRadius: 2,
              margin: "0 auto 16px",
            }}
          />
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
              Notificaciones
            </span>
            <button
              type="button"
              onClick={onMarkAllRead}
              style={{ fontSize: 12, color: "#94A3B8" }}
            >
              Marcar todo como leído
            </button>
          </div>
        </div>

        {/* NOTIFICATION LIST */}
        <div className="flex-1 overflow-y-auto" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {notifs.map((n, i) => {
            const Icon = n.icon;
            return (
              <div
                key={i}
                className="flex"
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid #F8FAFC",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    backgroundColor: n.iconBg,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} color={n.iconColor} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: n.unread ? "#111827" : "#94A3B8",
                    }}
                  >
                    {n.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4, marginTop: 2 }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: 11, color: "#CBD5E1", marginTop: 4 }}>
                    {n.time}
                  </div>
                </div>
                {n.unread && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: "#111827",
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/hoy")({
  head: () => ({
    meta: [
      { title: "Entrenamiento · TOGO" },
      {
        name: "description",
        content:
          "Pantalla de inicio del atleta: calendario semanal, sesión de hoy y acceso directo a empezar el entrenamiento.",
      },
      { property: "og:title", content: "Entrenamiento · TOGO" },
      {
        property: "og:description",
        content: "El atleta ve su sesión de hoy, su semana y empieza a entrenar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AthleteHome,
});

// ----- placeholder data -----
type BlockPreview = {
  label: string;
  content: React.ReactNode;
  right?: React.ReactNode;
};

type Day = {
  letter: string;
  number: number;
  /** ISO-ish key unique across weeks */
  key: string;
  past: boolean;
  session: Session[] | null;
};

type Session = {
  title: string;
  minutes: number;
  coach: string;
  blocks: BlockPreview[];
};

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

const AMRAP_CHIP = (
  <span className="flex items-center" style={{ gap: 6 }}>
    <span>Finisher ·</span>
    <span
      style={{
        fontSize: 10,
        color: "#D97706",
        backgroundColor: "#FFFBEB",
        borderRadius: 4,
        padding: "1px 5px",
        fontWeight: 700,
      }}
    >
      AMRAP 8 min
    </span>
  </span>
);

function strength(
  title: string,
  minutes: number,
  blocks: BlockPreview[],
  coach = "Coach Pablo",
): Session {
  return { title, minutes, coach, blocks };
}

const FULL_BLOCKS: BlockPreview[] = [
  { label: "A", content: "Sentadilla", right: "4 × 10" },
  { label: "B", content: "Curl de bíceps + Martillo", right: "3 × 12–15" },
  { label: "C", content: "Press de banca", right: "4 × 8" },
  { label: "D", content: AMRAP_CHIP, right: null },
];

const UPPER_BLOCKS: BlockPreview[] = [
  { label: "A", content: "Press militar", right: "4 × 8" },
  { label: "B", content: "Remo con barra", right: "4 × 10" },
  { label: "C", content: "Face pull", right: "3 × 15" },
];

const LOWER_BLOCKS: BlockPreview[] = [
  { label: "A", content: "Peso muerto", right: "5 × 5" },
  { label: "B", content: "Zancadas", right: "3 × 12" },
  { label: "C", content: "Elevación de gemelos", right: "3 × 20" },
];

const CONDI_BLOCKS: BlockPreview[] = [
  { label: "A", content: "Movilidad + entrada en calor", right: "10 min" },
  { label: "B", content: AMRAP_CHIP, right: null },
];

const MOBILITY_BLOCKS: BlockPreview[] = [
  { label: "A", content: "Movilidad y recuperación", right: "20 min" },
];

// weekOffset -> week definition. Current week: 18/8 – 24/8 (Thursday 21 = today).
type WeekDef = {
  startDay: number;
  startMonth: number;
  endDay: number;
  endMonth: number;
  numbers: number[];
  todayIndex: number | null;
  sessions: Record<number, Session[]>;
};

const WEEKS: Record<number, WeekDef> = {
  [-1]: {
    startDay: 11,
    startMonth: 8,
    endDay: 17,
    endMonth: 8,
    numbers: [11, 12, 13, 14, 15, 16, 17],
    todayIndex: null,
    sessions: {
      0: [strength("Fuerza — Lunes", 50, LOWER_BLOCKS)],
      1: [strength("Tren superior — Martes", 45, UPPER_BLOCKS)],
      3: [strength("Fuerza — Jueves", 55, FULL_BLOCKS)],
    },
  },
  0: {
    startDay: 18,
    startMonth: 8,
    endDay: 24,
    endMonth: 8,
    numbers: [18, 19, 20, 21, 22, 23, 24],
    todayIndex: 3,
    sessions: {
      0: [strength("Tren inferior — Lunes", 50, LOWER_BLOCKS)],
      2: [strength("Tren superior — Miércoles", 45, UPPER_BLOCKS)],
      3: [
        strength("Fuerza — Jueves", 55, FULL_BLOCKS),
        strength("Movilidad — Jueves", 20, MOBILITY_BLOCKS, "Coach Laura"),
      ],
      5: [strength("Acondicionamiento — Sábado", 35, CONDI_BLOCKS)],
    },
  },
  1: {
    startDay: 25,
    startMonth: 8,
    endDay: 31,
    endMonth: 8,
    numbers: [25, 26, 27, 28, 29, 30, 31],
    todayIndex: null,
    sessions: {
      1: [strength("Tren superior — Martes", 45, UPPER_BLOCKS)],
      3: [strength("Fuerza — Jueves", 55, FULL_BLOCKS)],
      4: [strength("Acondicionamiento — Viernes", 35, CONDI_BLOCKS)],
    },
  },
};

function getWeek(offset: number): WeekDef {
  return WEEKS[offset] ?? (WEEKS[0] as WeekDef);
}

function buildWeek(offset: number): Day[] {
  const w = getWeek(offset);
  return w.numbers.map((n, i) => ({
    letter: LETTERS[i] ?? "",
    number: n,
    key: `${offset}-${i}`,
    past: offset < 0 || (offset === 0 && w.todayIndex !== null && i < w.todayIndex),
    session: w.sessions[i] ?? null,
  }));
}

function DayColumn({
  day,
  isToday,
  isSelected,
  onSelect,
}: {
  day: Day;
  isToday: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const hasSession = day.session !== null;

  const numberColor = isSelected
    ? "#FFFFFF"
    : day.past || !hasSession
      ? "#CBD5E1"
      : "#111827";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Día ${day.number}`}
      aria-pressed={isSelected}
      className="flex flex-1 flex-col items-center"
      style={{ gap: 4 }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "#94A3B8",
          textTransform: "uppercase",
        }}
      >
        {day.letter}
      </span>

      <div
        className="flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: isSelected ? "#111827" : "transparent",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: isSelected ? 600 : 500,
            color: numberColor,
          }}
        >
          {day.number}
        </span>
      </div>

      {/* today marker when not selected */}
      <span
        style={{
          width: isToday && !isSelected ? 14 : 0,
          height: 3,
          borderRadius: 2,
          backgroundColor: "#111827",
        }}
      />

      {/* session dot */}
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: hasSession ? (day.past ? "#E2E8F0" : "#111827") : "transparent",
        }}
      />
    </button>
  );
}

function SessionPreviewCard({
  session,
  onStart,
}: {
  session: Session;
  onStart: () => void;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        border: "1px solid #E2E8F0",
        padding: 20,
      }}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col" style={{ gap: 6, minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {session.title.replace(/ — .*$/, "")}
          </span>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Clock size={13} color="#94A3B8" />
            <span style={{ fontSize: 13, color: "#64748B" }}>~{session.minutes} min</span>
            <span style={{ fontSize: 13, color: "#64748B" }}>·</span>
            <span style={{ fontSize: 13, color: "#64748B" }}>
              {session.blocks.length} bloques
            </span>
          </div>
        </div>
        <span
          className="flex items-center"
          style={{
            gap: 5,
            backgroundColor: "#F1F5F9",
            borderRadius: 20,
            padding: "4px 10px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <User size={12} color="#64748B" />
          <span style={{ fontSize: 12, color: "#64748B" }}>{session.coach}</span>
        </span>
      </div>

      {/* BLOCK PREVIEW LIST */}
      <div style={{ marginTop: 16 }}>
        {session.blocks.map((block, i) => (
          <div
            key={block.label}
            className="flex items-center"
            style={{
              height: 44,
              gap: 10,
              borderBottom: i < session.blocks.length - 1 ? "1px solid #F8FAFC" : "none",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: "#F1F5F9",
                color: "#64748B",
                borderRadius: 6,
                padding: "2px 7px",
                minWidth: 22,
                textAlign: "center",
              }}
            >
              {block.label}
            </span>
            <span
              className="flex-1"
              style={{ fontSize: 13, fontWeight: 500, color: "#111827", minWidth: 0 }}
            >
              {block.content}
            </span>
            {block.right != null && (
              <span style={{ fontSize: 12, color: "#94A3B8", flexShrink: 0 }}>
                {block.right}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* START BUTTON */}
      <button
        type="button"
        onClick={onStart}
        className="flex w-full items-center justify-center"
        style={{
          marginTop: 20,
          height: 52,
          borderRadius: 14,
          backgroundColor: "#111827",
          color: "#FFFFFF",
          gap: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        <PlayCircle size={18} color="#FFFFFF" />
        <span style={{ fontSize: 15, fontWeight: 600 }}>Empezar sesión</span>
      </button>
    </div>
  );
}

function EmptyStateCard() {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        border: "1px solid #E2E8F0",
        margin: 16,
        padding: 20,
        gap: 16,
      }}
    >
      <div
        style={{ width: 120, height: 80, backgroundColor: "#F1F5F9", borderRadius: 12 }}
      />
      <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
        Hoy es día de descanso
      </span>
      <span style={{ fontSize: 13, color: "#64748B" }}>
        Aprovechá para recuperarte bien.
      </span>
      <Link
        to="/wellness"
        style={{
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: "10px 20px",
          fontSize: 13,
          color: "#64748B",
        }}
      >
        Ver próxima sesión →
      </Link>
    </div>
  );
}

const TABS = [
  { icon: Home, label: "Inicio", active: true, to: "/hoy" },
  { icon: MessageCircle, label: "Chat", active: false, to: "/chat", unread: true },
  { icon: TrendingUp, label: "Progreso", active: false, to: "/progreso" },
  { icon: User, label: "Perfil", active: false, to: "/perfil" },
];

function BottomNav() {
  return <AthleteBottomNav active="Inicio" />;
}

function EntrenamientoPage() {
  const navigate = useNavigate();
  const hasCoach = useHasCoach();
  useEffect(() => { if (!readUserContext()) navigate({ to: "/conectar" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <EntrenamientoScreen hasCoach={hasCoach} />;
}

function AthleteHome() {
  const navigate = useNavigate();
  useEffect(() => { if (!readUserContext()) navigate({ to: "/conectar" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<{ offset: number; index: number }>({
    offset: 0,
    index: getWeek(0).todayIndex ?? 0,
  });
  const [showWellness, setShowWellness] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFICATIONS);
  const hasUnread = notifs.some((n) => n.unread);
  void hasUnread;
  const userCtx = useUserContext();
  const athleteNotifs = useNotifs("athlete").list;
  const athleteUnread = forUser(athleteNotifs, userCtx.type).some((n) => n.unread);

  const week = getWeek(weekOffset);
  const days = buildWeek(weekOffset);
  const selectedSessions =
    getWeek(selected.offset).sessions[selected.index] ?? null;

  const range = `${week.startDay}/${week.startMonth} – ${week.endDay}/${week.endMonth}`;

  const goWeek = (delta: number) => {
    const next = weekOffset + delta;
    if (!WEEKS[next]) return;
    setWeekOffset(next);
  };

  const startWellness = () => setShowWellness(true);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#F1F5F9", padding: 24 }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: 375,
          height: 812,
          backgroundColor: "#F8FAFC",
          borderRadius: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto">
          <TeamBlocks />
          {/* STICKY HEADER — TOP BAR + WEEKLY CALENDAR */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              backgroundColor: "#FFFFFF",
              boxShadow: "0 1px 0 #E2E8F0",
            }}
          >
          {/* SECTION 1 — TOP BAR */}
          <div
            className="flex items-center justify-between"
            style={{ padding: "16px 20px" }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: "#E2E8F0",
              }}
            >
              <span style={{ fontSize: 12, color: "#94A3B8" }}>AT</span>
            </div>

            <div className="flex items-center" style={{ gap: 8 }}>
              <button
                type="button"
                aria-label="Semana anterior"
                onClick={() => goWeek(-1)}
              >
                <ChevronLeft size={16} color="#94A3B8" />
              </button>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                {range}
              </span>
              <button
                type="button"
                aria-label="Semana siguiente"
                onClick={() => goWeek(1)}
              >
                <ChevronRight size={16} color="#94A3B8" />
              </button>
            </div>

            <div className="flex items-center" style={{ gap: 16 }}>
              <button
                type="button"
                aria-label="Notificaciones"
                onClick={() => navigate({ to: "/notificaciones" })}
                style={{ position: "relative" }}
              >
                <BellRing size={20} color="#94A3B8" />
                {athleteUnread && (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: "#EF4444",
                      border: "1.5px solid #FFFFFF",
                    }}
                  />
                )}
              </button>
              <button
                type="button"
                aria-label="Marketplace"
                onClick={() => navigate({ to: "/marketplace" })}
              >
                <ShoppingBag size={20} color="#94A3B8" />
              </button>
            </div>
          </div>

          {/* SECTION 2 — WEEKLY MINI CALENDAR */}
          <div
            className="flex"
            style={{
              backgroundColor: "#FFFFFF",
              borderBottom: "1px solid #E2E8F0",
              padding: "12px 20px 14px",
            }}
          >
            {days.map((d, i) => (
              <DayColumn
                key={d.key}
                day={d}
                isToday={weekOffset === 0 && week.todayIndex === i}
                isSelected={selected.offset === weekOffset && selected.index === i}
                onSelect={() => setSelected({ offset: weekOffset, index: i })}
              />
            ))}
          </div>
          </div>
          <CoachPlanBanner onOpen={() => setShowPlan(true)} />

          {/* SECTION 3 — SELECTED DAY'S SESSION PREVIEW */}
          {selectedSessions && selectedSessions.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 16,
              }}
            >
              {selectedSessions.map((session) => (
                <SessionPreviewCard
                  key={session.title}
                  session={session}
                  onStart={startWellness}
                />
              ))}
            </div>
          ) : (
            <EmptyStateCard />
          )}
        </div>

        {/* BOTTOM NAV */}
        <BottomNav />
        {showPlan && <CoachPlanSheet onClose={() => setShowPlan(false)} />}

        {/* WELLNESS SHEET — renders on top of Home content (which stays mounted) */}
        <WellnessSheet
          show={showWellness}
          onClose={() => setShowWellness(false)}
          onStart={() => {
            setShowWellness(false);
            navigate({ to: "/sesion-atleta" });
          }}
        />

        {/* NOTIFICATIONS SHEET */}
        {showNotifs && (
          <NotificationsSheet
            notifs={notifs}
            onMarkAllRead={() =>
              setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
            }
            onClose={() => setShowNotifs(false)}
          />
        )}
      </div>
    </div>
  );
}
