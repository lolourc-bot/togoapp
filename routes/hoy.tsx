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
import { DayColumn, HoyTopBar, SessionPreviewCard, type BlockPreview, type Day, type Session } from "@/components/togo/AthleteHomeParts";
import WellnessSheet from "@/components/togo/WellnessSheet";
import { fetchAthleteSessions } from "@/lib/athlete-sessions";
import type { DaySession } from "@/components/togo/AthleteSessionCard";
import { fetchAthleteCoachId, saveWellnessCheckin } from "@/lib/wellness";
import { fetchLibraryExercises } from "@/lib/exercise-data";
import { toast } from "sonner";
import { useAthleteAuth } from "@/hooks/useAthleteAuth";
import { supabase } from "@/lib/supabase";
import { NOTIF_STYLE, type Notif } from "@/lib/notifications";

type Notification = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const NOTIF_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  session: Calendar,
  message: MessageCircle,
  done: CheckCircle,
  reminder: BellRing,
};

function notifToDisplay(n: Notif): Notification {
  const style = NOTIF_STYLE[n.kind] ?? NOTIF_STYLE["reminder"]!;
  return {
    icon: NOTIF_ICON[n.kind] ?? BellRing,
    iconBg: style.bg,
    iconColor: style.fg,
    title: n.title,
    body: n.body,
    time: `${n.day} · ${n.time}`,
    unread: n.unread,
  };
}

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
  validateSearch: (search: Record<string, unknown>): { athleteId?: string } =>
    typeof search["athleteId"] === "string" ? { athleteId: search["athleteId"] as string } : {},
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

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

// ----- real athlete data -----
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

function buildRealWeek(offset: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const base = startOfWeek(today);
  base.setDate(base.getDate() + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return { key: dateKey(d), date: d, letter: LETTERS[i] ?? "", number: d.getDate() };
  });
  const todayIndex = days.findIndex((d) => d.date.getTime() === today.getTime());
  return {
    days,
    startDay: days[0]!.date.getDate(),
    startMonth: days[0]!.date.getMonth() + 1,
    endDay: days[6]!.date.getDate(),
    endMonth: days[6]!.date.getMonth() + 1,
    todayIndex: todayIndex === -1 ? null : todayIndex,
  };
}

function daySessionToPreview(ds: DaySession, coachName: string, equipmentByExercise: Record<string, string>): Session {
  const blocks: BlockPreview[] = ds.items.map((item, i) => ({
    label: String.fromCharCode(65 + i),
    content: item.name,
    right: `${item.sets} × ${item.reps}`,
  }));
  ds.circuits.forEach((c, i) => {
    blocks.push({ label: String.fromCharCode(65 + ds.items.length + i), content: c.name || c.type, right: null });
  });
  const exerciseNames = [...ds.items.map((it) => it.name), ...ds.circuits.flatMap((c) => c.exercises.map((e) => e.name))];
  const equipment = Array.from(
    new Set(
      exerciseNames
        .map((name) => equipmentByExercise[name.toLowerCase()])
        .filter((eq): eq is string => !!eq && eq !== "Peso corporal"),
    ),
  );
  return { id: ds.id, title: ds.name, minutes: ds.minutes, coach: coachName, blocks, equipment };
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

function AthleteHome() {
  const navigate = useNavigate();
  const { athleteId: athleteIdParam } = Route.useSearch();
  const { athlete, loading: authLoading } = useAthleteAuth();
  const athleteId = athleteIdParam ?? athlete?.id;
  useEffect(() => {
    if (authLoading) return;
    if (!athlete && !readUserContext()) navigate({ to: "/conectar" });
  }, [authLoading, athlete]); // eslint-disable-line react-hooks/exhaustive-deps
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<{ offset: number; index: number }>({
    offset: 0,
    index: buildRealWeek(0).todayIndex ?? 0,
  });
  const [showWellness, setShowWellness] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const userCtx = useUserContext();
  const { list: athleteNotifs, markAll: markAllNotifsRead } = useNotifs("athlete", athleteId);
  const displayNotifs = forUser(athleteNotifs, userCtx.type).map(notifToDisplay);
  const athleteUnread = displayNotifs.some((n) => n.unread);
  const [pendingSessionId, setPendingSessionId] = useState<string | undefined>(undefined);
  const [realSessions, setRealSessions] = useState<Record<string, DaySession[]>>({});
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState("Tu coach");
  const [equipmentByExercise, setEquipmentByExercise] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!athleteId) return;
    fetchAthleteSessions(athleteId).then(setRealSessions);
    fetchAthleteCoachId(athleteId).then((cid) => {
      setCoachId(cid);
      if (cid) {
        supabase.from("profiles").select("full_name").eq("id", cid).maybeSingle()
          .then(({ data }) => setCoachName(data?.full_name ?? "Tu coach"));
        fetchLibraryExercises(cid).then((lib) => {
          setEquipmentByExercise(Object.fromEntries(lib.map((e) => [e.name.toLowerCase(), e.equipment])));
        });
      }
    });
  }, [athleteId]);

  const realWeek = buildRealWeek(weekOffset);
  const week = realWeek;
  const days: Day[] = realWeek.days.map((d, i) => {
    const sessions = (realSessions[d.key] ?? []).filter((s) => s.status !== "draft");
    return {
      letter: d.letter,
      number: d.number,
      key: d.key,
      past: realWeek.todayIndex !== null ? i < realWeek.todayIndex : weekOffset < 0,
      session: sessions.length ? sessions.map((s) => daySessionToPreview(s, coachName, equipmentByExercise)) : null,
    };
  });

  const selectedSessions = (() => {
    const w = buildRealWeek(selected.offset);
    const key = w.days[selected.index]?.key;
    const sessions = key ? (realSessions[key] ?? []).filter((s) => s.status !== "draft") : [];
    return sessions.length ? sessions.map((s) => daySessionToPreview(s, coachName, equipmentByExercise)) : null;
  })();

  const range = `${week.startDay}/${week.startMonth} – ${week.endDay}/${week.endMonth}`;

  const goWeek = (delta: number) => {
    setWeekOffset(weekOffset + delta);
  };

  const startWellness = (sessionId?: string) => {
    setPendingSessionId(sessionId);
    setShowWellness(true);
  };

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
          <HoyTopBar
            range={range}
            unread={athleteUnread}
            onPrevWeek={() => goWeek(-1)}
            onNextWeek={() => goWeek(1)}
            onNotifications={() => navigate({ to: "/notificaciones", search: athleteId ? { athleteId } : {} })}
            onMarketplace={() => navigate({ to: "/marketplace" })}
          />

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
                  key={session.id ?? session.title}
                  session={session}
                  onStart={() => startWellness(session.id)}
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
          onStart={(answers) => {
            setShowWellness(false);
            if (athleteId && coachId && Object.keys(answers).length > 0) {
              saveWellnessCheckin(coachId, athleteId, pendingSessionId ?? null, {
                energy: answers["energia"],
                sleep: answers["sueno"],
                body: answers["cuerpo"],
              }).catch(() => toast.error("No se pudo guardar el check-in"));
            }
            navigate({ to: "/sesion-atleta", search: pendingSessionId ? { sessionId: pendingSessionId } : {} });
          }}
        />

        {/* NOTIFICATIONS SHEET */}
        {showNotifs && (
          <NotificationsSheet
            notifs={displayNotifs}
            onMarkAllRead={markAllNotifsRead}
            onClose={() => setShowNotifs(false)}
          />
        )}
      </div>
    </div>
  );
}
