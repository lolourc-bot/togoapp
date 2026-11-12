import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Paperclip, Send } from "lucide-react";
import { fetchMessages, sendMessage, markRead, type ChatMessage } from "@/lib/chat";
import { fetchTeamMessages, sendTeamMessage, type TeamMessage } from "@/lib/team-chat";
import { supabase } from "@/lib/supabase";
import { ChatAvatar } from "./index";

export const Route = createFileRoute("/chat/$coachId")({
  validateSearch: (s: Record<string, unknown>): { athleteId?: string; teamId?: string } => ({
    ...(typeof s["athleteId"] === "string" ? { athleteId: s["athleteId"] as string } : {}),
    ...(typeof s["teamId"] === "string" ? { teamId: s["teamId"] as string } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Chat · TOGO" },
      { name: "description", content: "Conversación con tu coach o equipo: mensajes y sesiones compartidas." },
      { property: "og:title", content: "Chat · TOGO" },
      { property: "og:description", content: "Hablá con tu coach, recibí sesiones y despejá dudas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatScreen,
});

type Bubble = { fromMe: boolean; text: string; time: string; sender?: string | undefined };

function toTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ChatScreen() {
  const navigate = useNavigate();
  const { coachId } = Route.useParams();
  const { athleteId, teamId } = Route.useSearch();
  const isTeam = !!teamId;
  const [name, setName] = useState(isTeam ? "Equipo" : "Tu coach");
  const [loading, setLoading] = useState(true);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [text, setText] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      if (isTeam && teamId) {
        const [{ data: team }, { data: members }] = await Promise.all([
          supabase.from("teams").select("name").eq("id", teamId).single(),
          supabase.from("team_members").select("athlete_id, athletes(full_name)").eq("team_id", teamId),
        ]);
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", coachId).maybeSingle();
        const nameById = new Map((members ?? []).map((m) => [m.athlete_id as string, (m.athletes as unknown as { full_name: string } | null)?.full_name ?? "Atleta"]));
        const msgs: TeamMessage[] = await fetchTeamMessages(teamId, nameById, profile?.full_name ?? "Coach");
        if (cancelled) return;
        setName(team?.name ?? "Equipo");
        setBubbles(msgs.map((m) => ({ fromMe: m.senderAthleteId === athleteId, text: m.body, time: toTime(m.createdAt), sender: m.senderAthleteId === athleteId ? undefined : m.senderName })));
      } else {
        const [{ data: profile }, msgs] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", coachId).maybeSingle(),
          fetchMessages(coachId, athleteId) as Promise<ChatMessage[]>,
        ]);
        if (cancelled) return;
        setName(profile?.full_name ?? "Tu coach");
        setBubbles(msgs.map((m) => ({ fromMe: m.sender === "athlete", text: m.body, time: toTime(m.createdAt) })));
        markRead(coachId, athleteId, "athlete").catch(() => {});
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [coachId, athleteId, teamId, isTeam]);

  useEffect(() => { end.current?.scrollIntoView(); }, [bubbles.length]);
  useEffect(() => {
    const el = ta.current; if (!el) return;
    el.style.height = "auto"; el.style.height = `${Math.min(100, Math.max(40, el.scrollHeight))}px`;
  }, [text]);

  const submit = () => {
    const t = text.trim();
    if (!t || !athleteId) return;
    const time = toTime(new Date().toISOString());
    setBubbles((b) => [...b, { fromMe: true, text: t, time }]);
    setText("");
    const task = isTeam && teamId
      ? sendTeamMessage(coachId, teamId, athleteId, t)
      : sendMessage(coachId, athleteId, "athlete", t);
    task.catch(() => toast.error("No se pudo enviar el mensaje"));
  };

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div className="relative flex flex-col" style={{ width: 375, height: 812, backgroundColor: "#FFFFFF", borderRadius: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div className="flex shrink-0 items-center" style={{ gap: 10, padding: "28px 16px 12px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
          <button type="button" aria-label="Volver" onClick={() => navigate({ to: "/chat" })}><ChevronLeft size={22} color="#111827" /></button>
          <ChatAvatar name={name} isTeam={isTeam} size={36} />
          <div className="flex flex-col" style={{ minWidth: 0 }}>
            <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{name}</span>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>{isTeam ? "Equipo" : "Tu coach"}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: "12px 16px", gap: 6 }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: 24 }}>Cargando...</p>
          ) : bubbles.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: 24 }}>Todavía no hay mensajes.</p>
          ) : (
            bubbles.map((m, i) =>
              m.fromMe ? (
                <div key={i} style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
                  <div style={{ background: "#111827", borderRadius: "16px 4px 16px 16px", padding: "10px 14px", fontSize: 14, color: "#FFFFFF", lineHeight: 1.5 }}>{m.text}</div>
                  <div style={{ fontSize: 9, color: "#CBD5E1", marginTop: 2, textAlign: "right" }}>{m.time}</div>
                </div>
              ) : (
                <div key={i} style={{ alignSelf: "flex-start", maxWidth: "80%" }}>
                  {m.sender && <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", marginBottom: 3 }}>{m.sender}</div>}
                  <div style={{ background: "#F1F5F9", borderRadius: "4px 16px 16px 16px", padding: "10px 14px", fontSize: 14, color: "#111827", lineHeight: 1.5 }}>{m.text}</div>
                  <div style={{ fontSize: 9, color: "#CBD5E1", marginTop: 2, marginLeft: 4 }}>{m.time}</div>
                </div>
              ),
            )
          )}
          <div ref={end} />
        </div>

        <div className="flex shrink-0 items-end" style={{ padding: "10px 14px 24px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF", gap: 8 }}>
          <button type="button" aria-label="Adjuntar" style={{ paddingBottom: 10 }}><Paperclip size={20} color="#CBD5E1" /></button>
          <textarea ref={ta} rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Mensaje…" className="flex-1 outline-none" style={{ minHeight: 40, maxHeight: 100, border: "1px solid #E2E8F0", borderRadius: 20, padding: "10px 16px", fontSize: 14, color: "#111827", resize: "none" }} />
          <button type="button" aria-label="Enviar" disabled={!text.trim()} onClick={submit} className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 40, height: 40, background: "#111827", opacity: text.trim() ? 1 : 0.3, border: "none" }}>
            <Send size={16} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </div>
  );
}
