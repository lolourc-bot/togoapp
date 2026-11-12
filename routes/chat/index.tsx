import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMyCoachLinks, fetchMessages, type ChatMessage } from "@/lib/chat";
import { fetchMyTeamLinks, fetchTeamMessages, type TeamMessage } from "@/lib/team-chat";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "Mensajes · TOGO" },
      { name: "description", content: "Tus conversaciones con coaches y equipos en TOGO." },
      { property: "og:title", content: "Mensajes · TOGO" },
      { property: "og:description", content: "Revisá tus conversaciones con tus coaches y equipos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatListScreen,
});

type Item = {
  key: string;
  name: string;
  initials: string;
  isTeam: boolean;
  preview: string;
  lastAt: string | null;
  unread: number;
  nav: { coachId: string; athleteId: string; teamId?: string };
};

export function ChatAvatar({ name, isTeam, size }: { name: string; isTeam?: boolean; size: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: isTeam ? "#EEF2FF" : "#F1F5F9", color: isTeam ? "#6366F1" : "#94A3B8", fontSize: 13, fontWeight: 700 }}>{initials}</span>
  );
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function ChatListScreen() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) { if (!cancelled) setLoading(false); return; }

      const coachLinks = await fetchMyCoachLinks(userId);
      const athleteIds = coachLinks.map((l) => l.athleteId);
      const teamLinks = await fetchMyTeamLinks(athleteIds);
      const myAthleteIdByCoach = new Map(coachLinks.map((l) => [l.coachId, l.athleteId]));

      const [coachMsgs, teamMsgs] = await Promise.all([
        Promise.all(coachLinks.map((l) => fetchMessages(l.coachId, l.athleteId))),
        Promise.all(teamLinks.map((t) => fetchTeamMessages(t.teamId, new Map(t.members.map((m) => [m.id, m.name])), coachLinks.find((l) => l.coachId === t.coachId)?.coachName ?? "Coach"))),
      ]);

      const coachItems: Item[] = coachLinks.map((l, i) => {
        const msgs: ChatMessage[] = coachMsgs[i] ?? [];
        const last = msgs[msgs.length - 1];
        return {
          key: `coach-${l.coachId}`,
          name: l.coachName,
          initials: l.coachName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(),
          isTeam: false,
          preview: last?.body ?? "Todavía no hay mensajes",
          lastAt: last?.createdAt ?? null,
          unread: msgs.filter((m) => m.sender === "coach" && !m.readAt).length,
          nav: { coachId: l.coachId, athleteId: l.athleteId },
        };
      });
      const teamItems: Item[] = teamLinks.map((t, i) => {
        const msgs: TeamMessage[] = teamMsgs[i] ?? [];
        const last = msgs[msgs.length - 1];
        const myAthleteId = myAthleteIdByCoach.get(t.coachId) ?? "";
        return {
          key: `team-${t.teamId}`,
          name: t.name,
          initials: t.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(),
          isTeam: true,
          preview: last?.body ?? "Todavía no hay mensajes",
          lastAt: last?.createdAt ?? null,
          unread: 0,
          nav: { coachId: t.coachId, athleteId: myAthleteId, teamId: t.teamId },
        };
      });

      const all = [...coachItems, ...teamItems].sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
      if (!cancelled) { setItems(all); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const list = items.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div className="relative flex flex-col" style={{ width: 375, height: 812, backgroundColor: "#FFFFFF", borderRadius: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div className="flex shrink-0 items-center" style={{ padding: "28px 20px 8px" }}>
          <span className="flex-1" style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Mensajes</span>
        </div>
        <div className="flex shrink-0 items-center" style={{ margin: "8px 16px 0", height: 40, borderRadius: 10, background: "#F1F5F9", padding: "0 14px", gap: 8 }}>
          <Search size={14} color="#CBD5E1" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="flex-1 bg-transparent outline-none" style={{ fontSize: 13, color: "#111827" }} />
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto" style={{ marginTop: 8 }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: 24 }}>Cargando...</p>
          ) : list.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: 24 }}>Todavía no tenés conversaciones.</p>
          ) : (
            list.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => navigate({ to: "/chat/$coachId", params: { coachId: c.nav.coachId }, search: { athleteId: c.nav.athleteId, ...(c.nav.teamId ? { teamId: c.nav.teamId } : {}) } })}
                className="flex w-full items-center text-left"
                style={{ gap: 12, padding: "14px 16px", borderBottom: "1px solid #F8FAFC" }}
              >
                <ChatAvatar name={c.name} isTeam={c.isTeam} size={44} />
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{c.name}</span>
                    <span style={{ fontSize: 10, color: "#94A3B8" }}>{c.lastAt ? timeLabel(c.lastAt) : ""}</span>
                  </div>
                  <div className="flex items-center" style={{ gap: 6, marginTop: 3 }}>
                    <span className="flex-1 truncate" style={{ fontSize: 12, color: "#94A3B8" }}>{c.preview}</span>
                    {c.unread > 0 && <span style={{ background: "#111827", color: "#FFFFFF", fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 20, padding: "0 5px", textAlign: "center", lineHeight: "18px" }}>{c.unread}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        <AthleteBottomNav active="Mensajes" />
      </div>
    </div>
  );
}
