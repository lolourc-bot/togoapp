import { sessionTitle } from "@/lib/session-title";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { supabase } from "@/lib/supabase";
import { fetchMyCoachLinks } from "@/lib/chat";
import { fetchMyTeamLinks, type MyTeamLink } from "@/lib/team-chat";
import { fetchTeamSessions, type TeamDaySession } from "@/lib/team-sessions";

export const Route = createFileRoute("/mi-equipo/$teamId")({
  head: () => ({
    meta: [
      { title: "Mi equipo · TOGO" },
      { name: "description", content: "Integrantes y calendario compartido de tu equipo." },
      { property: "og:title", content: "Mi equipo · TOGO" },
      { property: "og:description", content: "Integrantes y calendario compartido de tu equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamDetail,
});

function dayLabel(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }).replace(".", "");
}

function TeamDetail() {
  const { teamId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<(MyTeamLink & { photoUrl: string | null }) | null>(null);
  const [myAthleteId, setMyAthleteId] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<{ date: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) { if (!cancelled) setLoading(false); return; }

      const coachLinks = await fetchMyCoachLinks(userId);
      const athleteIds = coachLinks.map((l) => l.athleteId);
      const teamLinks = await fetchMyTeamLinks(athleteIds);
      const mine = teamLinks.find((t) => t.teamId === teamId);
      if (!mine) { if (!cancelled) setLoading(false); return; }

      const [{ data: teamRow }, sessionsByDate] = await Promise.all([
        supabase.from("teams").select("photo_url").eq("id", teamId).maybeSingle(),
        fetchTeamSessions(teamId),
      ]);
      if (cancelled) return;

      setTeam({ ...mine, photoUrl: teamRow?.photo_url ?? null });
      setMyAthleteId(coachLinks.find((l) => l.coachId === mine.coachId)?.athleteId ?? null);

      const today = new Date().toISOString().slice(0, 10);
      const flat: { date: string; sessions: TeamDaySession[] }[] = Object.entries(sessionsByDate)
        .map(([key, sessions]) => ({ date: key.split("|")[1] ?? key, sessions }))
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
      setUpcoming(flat.slice(0, 6).map((e) => ({ date: e.date, name: e.sessions[0]?.name ?? "Sesión" })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [teamId]);

  if (loading) return <PhoneFrame><div className="flex flex-1" /></PhoneFrame>;

  if (!team) {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col items-center justify-center" style={{ padding: 32, gap: 8, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>No encontramos este equipo.</p>
          <Link to="/hoy" style={{ fontSize: 13, color: "#3B82F6" }}>Volver</Link>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="flex-1 overflow-y-auto" style={{ padding: "44px 16px 16px" }}>
        <Link to="/hoy" className="flex items-center" style={{ gap: 4, fontSize: 12, color: "#94A3B8" }}><ChevronLeft size={14} /> Training</Link>
        <div className="flex items-center" style={{ gap: 12, marginTop: 12 }}>
          <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ width: 48, height: 48, background: "#F1F5F9", color: "#94A3B8", fontSize: 16, fontWeight: 700 }}>
            {team.photoUrl ? <img src={team.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : team.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{team.name}</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>{team.members.length} integrantes</div>
          </div>
        </div>

        {myAthleteId ? (
          <Link
            to="/chat/$coachId"
            params={{ coachId: team.coachId }}
            search={{ athleteId: myAthleteId, teamId: team.teamId }}
            className="flex items-center justify-center"
            style={{ gap: 6, marginTop: 16, background: "#111827", color: "#FFF", borderRadius: 10, height: 42, fontSize: 13, fontWeight: 600 }}
          >
            <MessageCircle size={15} /> Chat del equipo
          </Link>
        ) : null}

        <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", margin: "20px 0 8px" }}>Calendario del equipo</div>
        {upcoming.length === 0 ? (
          <p style={{ fontSize: 12, color: "#94A3B8" }}>No hay sesiones programadas todavía.</p>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {upcoming.map((s) => (
              <div key={s.date} className="flex" style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "10px 14px", gap: 12 }}>
                <span style={{ fontSize: 11, color: "#94A3B8", width: 56, textTransform: "capitalize" }}>{dayLabel(s.date)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{sessionTitle(s)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", margin: "20px 0 8px" }}>Integrantes · {team.members.length}</div>
        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12 }}>
          {team.members.map((m, i) => (
            <div key={m.id} className="flex items-center" style={{ padding: "10px 14px", gap: 10, borderTop: i ? "1px solid #F1F5F9" : 0 }}>
              <span className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "50%", background: "#F1F5F9", color: "#94A3B8", fontSize: 10, fontWeight: 600 }}>{m.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
              <span style={{ fontSize: 13, color: "#111827" }}>{m.name}</span>
            </div>
          ))}
        </div>
      </div>
      <AthleteBottomNav active="Training" />
    </PhoneFrame>
  );
}
