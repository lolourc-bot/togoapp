import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Info } from "lucide-react";
import { useUserContext } from "@/lib/user-context";
import { useAthleteAuth } from "@/hooks/useAthleteAuth";
import { supabase } from "@/lib/supabase";
import { fetchMyCoachLinks } from "@/lib/chat";
import { fetchMyTeamLinks, type MyTeamLink } from "@/lib/team-chat";

export type MyTeam = { id: string; name: string; club: string; coach: string; members: string[] };

export const MY_TEAMS: MyTeam[] = [
  {
    id: "sub-16-masculino",
    name: "Sub-16 Masculino",
    club: "CrossFit Palermo",
    coach: "Martín Gutiérrez",
    members: ["Lucas Ramírez", "Tomás Díaz", "Joaquín Pérez", "Nicolás Romero", "Bruno Silva", "Mateo López"],
  },
];

const ini = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2);

export function TeamBlocks() {
  const ctx = useUserContext();
  const { athlete, loading } = useAthleteAuth();
  const [realTeams, setRealTeams] = useState<MyTeamLink[] | null>(null);

  useEffect(() => {
    if (!athlete) { setRealTeams(null); return; }
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) { if (!cancelled) setRealTeams([]); return; }
      const coachLinks = await fetchMyCoachLinks(userId);
      const teams = await fetchMyTeamLinks(coachLinks.map((l) => l.athleteId));
      if (!cancelled) setRealTeams(teams);
    })();
    return () => { cancelled = true; };
  }, [athlete]);

  if (!loading && athlete) {
    if (realTeams === null) return null;
    if (realTeams.length === 0) {
      return (
        <div className="flex items-center" style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", gap: 10, margin: "12px 16px 0" }}>
          <Info size={13} color="#CBD5E1" />
          <span style={{ fontSize: 11, color: "#94A3B8" }}>Todavía no estás en ningún equipo.</span>
        </div>
      );
    }
    return (
      <>
        {realTeams.map((t) => (
          <Link
            key={t.teamId}
            to="/mi-equipo/$teamId"
            params={{ teamId: t.teamId }}
            className="flex items-center"
            style={{ background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 16px", gap: 12, margin: "12px 16px 0" }}
          >
            <span className="flex">
              {t.members.slice(0, 3).map((m, i) => (
                <span key={m.id} className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: "50%", background: "#F1F5F9", color: "#94A3B8", fontSize: 9, fontWeight: 600, border: "2px solid #FFF", marginLeft: i ? -6 : 0 }}>{ini(m.name)}</span>
              ))}
            </span>
            <span className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{t.name}</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{t.members.length} integrantes</span>
            </span>
            <ChevronRight size={14} color="#CBD5E1" />
          </Link>
        ))}
      </>
    );
  }

  if (ctx.type !== "club_athlete") return null;
  if (MY_TEAMS.length === 0) {
    return (
      <div className="flex items-center" style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", gap: 10, margin: "12px 16px 0" }}>
        <Info size={13} color="#CBD5E1" />
        <span style={{ fontSize: 11, color: "#94A3B8" }}>Todavía no estás asignado a un equipo. Tu entrenador lo hará pronto.</span>
      </div>
    );
  }
  return (
    <>
      {MY_TEAMS.map((t) => (
        <Link
          key={t.id}
          to="/mi-equipo/$teamId"
          params={{ teamId: t.id }}
          className="flex items-center"
          style={{ background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 16px", gap: 12, margin: "12px 16px 0" }}
        >
          <span className="flex">
            {t.members.slice(0, 3).map((m, i) => (
              <span key={m} className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: "50%", background: "#F1F5F9", color: "#94A3B8", fontSize: 9, fontWeight: 600, border: "2px solid #FFF", marginLeft: i ? -6 : 0 }}>{ini(m)}</span>
            ))}
          </span>
          <span className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{t.name}</span>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>{t.club} · {t.coach}</span>
          </span>
          <ChevronRight size={14} color="#CBD5E1" />
        </Link>
      ))}
    </>
  );
}
