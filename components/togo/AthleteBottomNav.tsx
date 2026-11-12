import { Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck, MessageCircle, Clock, Compass, Dumbbell, TrendingUp, User } from "lucide-react";
import { useTimerRunning } from "./AthleteTimer";
import { useUserContext } from "@/lib/user-context";
import { ME, useCoachRequests } from "@/lib/coach-requests";
import { hasUnreadMessages } from "@/lib/chat";
import { useAthleteAuth } from "@/hooks/useAthleteAuth";
import { useInstitutionMemberAuth } from "@/hooks/useInstitutionMemberAuth";

export type AthleteTab = "Training" | "Mensajes" | "Marketplace" | "Entrenamiento" | "Clases" | "Timer" | "Progreso" | "Perfil" | "Inicio" | "Calendario";

const ALL = {
  Training: { icon: Dumbbell, to: "/hoy" },
  Marketplace: { icon: Compass, to: "/explorar" },
  Mensajes: { icon: MessageCircle, to: "/chat" },
  Clases: { icon: CalendarCheck, to: "/clases" },
  Timer: { icon: Clock, to: "/timer" },
  Progreso: { icon: TrendingUp, to: "/progreso" },
  Perfil: { icon: User, to: "/perfil" },
} as const;
type NavTab = keyof typeof ALL;

/** True when the gym member has a coach (chosen at onboarding or assigned by the gym). */
export function useHasCoach() {
  const { athlete, loading } = useAthleteAuth();
  const ctx = useUserContext();
  const requests = useCoachRequests();
  if (!loading && athlete) return true;
  if (ctx.type === "coached_athlete" || ctx.type === "club_athlete") return true;
  if (ctx.type === "gym_member") return !!ctx.alsoCoached || requests.some((r) => r.member === ME && r.coach);
  return false;
}

export function AthleteBottomNav({ active }: { active?: AthleteTab }) {
  const running = useTimerRunning();
  const ctx = useUserContext();
  const hasCoach = useHasCoach();
  const { athlete } = useAthleteAuth();
  const { member } = useInstitutionMemberAuth();
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    if (!athlete) { setUnread(false); return; }
    hasUnreadMessages(athlete.coach_id, athlete.id).then(setUnread);
  }, [athlete]);
  const search = useSearch({ strict: false }) as { athleteId?: string };
  const athleteId = search.athleteId;
  const current: AthleteTab | undefined = active === "Inicio" || active === "Calendario" || active === "Entrenamiento" ? "Training" : active;
  const isGymMember = !!member || ctx.type === "gym_member";
  const base: NavTab[] =
    isGymMember
      ? hasCoach ? ["Training", "Clases", "Timer", "Progreso", "Perfil"] : ["Training", "Clases", "Timer", "Perfil"]
      : ctx.type === "explorer"
        ? ["Marketplace", "Timer", "Perfil"]
        : ["Training", "Timer", "Progreso", "Perfil"];
  const labels: NavTab[] = [base[0]!, "Mensajes", ...base.slice(1)];
  return (
    <nav
      className="grid shrink-0 items-center"
      style={{ height: 64, backgroundColor: "#FFFFFF", borderTop: "1px solid #E2E8F0", gridTemplateColumns: `repeat(${labels.length}, 1fr)`, zIndex: 100, position: "relative" }}
    >
      {labels.map((label) => {
        const { icon: Icon, to } = ALL[label];
        const on = label === current;
        return (
          <Link key={label} to={to} search={athleteId ? { athleteId } : {}} aria-label={label} aria-current={on ? "page" : undefined} className="flex flex-col items-center" style={{ gap: 3, padding: "8px 0" }}>
            <span className="relative" style={{ lineHeight: 0 }}>
              <Icon size={22} color={on ? "#111827" : "#CBD5E1"} />
              {label === "Timer" && running ? (
                <span style={{ position: "absolute", top: -1, right: -2, width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22C55E" }} />
              ) : null}
              {label === "Mensajes" && unread ? (
                <span style={{ position: "absolute", top: -2, right: -3, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#DC2626" }} />
              ) : null}
            </span>
            <span style={{ fontSize: on ? 10 : 9, fontWeight: on ? 600 : 500, color: on ? "#111827" : "#94A3B8" }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
