import { NewCoachGate } from "@/components/togo/EmptyStates";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckCheck,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  UserCheck,
  Users2,
} from "lucide-react";
import { Dumbbell } from "@/components/togo/icons/Dumbbell";
import { Sidebar } from "@/components/togo/Sidebar";
import { toast } from "sonner";
import { getCoachId } from "@/lib/programs";
import { fetchCoachConversations, sendMessage, markRead as markReadApi } from "@/lib/chat";
import { useProfile } from "@/hooks/useProfile";
import { fetchTeamConversations, sendTeamMessage } from "@/lib/team-chat";

export const Route = createFileRoute("/mensajes")({
  validateSearch: (search: Record<string, unknown>): { atleta?: string; athleteId?: string; teamId?: string } => ({
    ...(typeof search["atleta"] === "string" ? { atleta: search["atleta"] as string } : {}),
    ...(typeof search["athleteId"] === "string" ? { athleteId: search["athleteId"] as string } : {}),
    ...(typeof search["teamId"] === "string" ? { teamId: search["teamId"] as string } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Mensajes · TOGO" },
      { name: "description", content: "Chateá con tus atletas y equipos, compartí sesiones y programas desde TOGO." },
      { property: "og:title", content: "Mensajes · TOGO" },
      { property: "og:description", content: "Conversaciones del coach con atletas y equipos en un solo lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <NewCoachGate section="mensajes"><CoachMessages /></NewCoachGate>,
});

type Msg =
  | { kind: "date"; text: string }
  | { kind: "in"; text: string; time: string; sender?: string }
  | { kind: "out"; text: string; time: string; read: boolean }
  | { kind: "session"; name: string; exercises: number; minutes: number; time: string };

type Conv = {
  id: string;
  name: string;
  initials: string;
  group?: { a: string; b: string };
  context: string;
  preview: string;
  fromCoach?: boolean | undefined;
  time: string;
  unread: number;
  messages: Msg[];
};

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function toConv(c: { athleteId: string; name: string; messages: { id: string; sender: "coach" | "athlete"; body: string; createdAt: string; readAt: string | null }[] }): Conv {
  const last = c.messages[c.messages.length - 1];
  const unread = c.messages.filter((m) => m.sender === "athlete" && !m.readAt).length;
  return {
    id: c.athleteId,
    name: c.name,
    initials: initialsOf(c.name),
    context: "Atleta",
    preview: last ? last.body : "Todavía no hay mensajes",
    fromCoach: last ? last.sender === "coach" : undefined,
    time: last ? timeLabel(last.createdAt) : "",
    unread,
    messages: c.messages.map((m): Msg => {
      const time = `${String(new Date(m.createdAt).getHours()).padStart(2, "0")}:${String(new Date(m.createdAt).getMinutes()).padStart(2, "0")}`;
      return m.sender === "coach" ? { kind: "out", text: m.body, time, read: !!m.readAt } : { kind: "in", text: m.body, time };
    }),
  };
}

function toTeamConv(t: { teamId: string; name: string; memberNames: string[]; messages: { id: string; senderAthleteId: string | null; senderName: string; body: string; createdAt: string }[] }): Conv {
  const last = t.messages[t.messages.length - 1];
  return {
    id: t.teamId,
    name: t.name,
    initials: initialsOf(t.name),
    group: { a: t.memberNames[0] ? initialsOf(t.memberNames[0]) : initialsOf(t.name), b: t.memberNames[1] ? initialsOf(t.memberNames[1]) : initialsOf(t.name) },
    context: `Equipo · ${t.memberNames.length} ${t.memberNames.length === 1 ? "atleta" : "atletas"}`,
    preview: last ? last.body : "Todavía no hay mensajes",
    fromCoach: last ? last.senderAthleteId === null : undefined,
    time: last ? timeLabel(last.createdAt) : "",
    unread: 0,
    messages: t.messages.map((m): Msg =>
      m.senderAthleteId === null
        ? { kind: "out", text: m.body, time: `${String(new Date(m.createdAt).getHours()).padStart(2, "0")}:${String(new Date(m.createdAt).getMinutes()).padStart(2, "0")}`, read: true }
        : { kind: "in", text: m.body, time: `${String(new Date(m.createdAt).getHours()).padStart(2, "0")}:${String(new Date(m.createdAt).getMinutes()).padStart(2, "0")}`, sender: m.senderName },
    ),
  };
}

const C = { border: "#E2E8F0", text: "#111827", muted: "#94A3B8", faint: "#CBD5E1" };

function Avatar({ c, size = 38 }: { c: Conv; size?: number }) {
  if (c.group) {
    const s = Math.round(size * 0.68);
    const circle = (t: string, z: number, left: number) => (
      <span className="absolute flex items-center justify-center rounded-full" style={{ width: s, height: s, left, top: (size - s) / 2, zIndex: z, background: "#F1F5F9", border: "2px solid #FFFFFF", fontSize: 9, fontWeight: 600, color: C.muted }}>{t}</span>
    );
    return (
      <span className="relative shrink-0" style={{ width: size, height: size }}>
        {circle(c.group.a, 2, 0)}
        {circle(c.group.b, 1, s - 8)}
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: "#F1F5F9", fontSize: 13, fontWeight: 600, color: C.muted, border: c.unread ? "2px solid #111827" : "none" }}>
      {c.initials}
    </span>
  );
}

function CoachMessages() {
  const { atleta, athleteId, teamId } = Route.useSearch();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"Todos" | "Atletas" | "Equipos">("Todos");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    getCoachId().then(async (cid) => {
      if (!cid) return;
      setCoachId(cid);
      const [athleteConvs, teamConvs] = await Promise.all([
        fetchCoachConversations(cid),
        fetchTeamConversations(cid, profile?.full_name ?? "Vos"),
      ]);
      setConvs([...athleteConvs.map(toConv), ...teamConvs.map(toTeamConv)]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.full_name]);

  useEffect(() => {
    if (teamId) { open(teamId); return; }
    if (athleteId) { open(athleteId); return; }
    if (!atleta) return;
    const m = convs.find((c) => c.name.toLowerCase().includes(atleta.toLowerCase()));
    if (m) open(m.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atleta, athleteId, teamId, convs.length]);

  const list = useMemo(
    () => convs.filter((c) => (tab === "Todos" || (tab === "Equipos" ? !!c.group : !c.group)) && c.name.toLowerCase().includes(q.toLowerCase())),
    [convs, q, tab],
  );
  const active = convs.find((c) => c.id === activeId) ?? null;

  function open(id: string) {
    setActiveId(id);
    const conv = convs.find((c) => c.id === id);
    setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    if (coachId && !conv?.group) markReadApi(coachId, id, "coach").then(() => window.dispatchEvent(new Event("togo:messages-read"))).catch(() => {});
  }

  function send(text: string) {
    if (!active) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setConvs((cs) => cs.map((c) => (c.id === active.id ? { ...c, preview: text, fromCoach: true, time: "Ahora", messages: [...c.messages, { kind: "out", text, time, read: false }] } : c)));
    if (!coachId) return;
    if (active.group) {
      sendTeamMessage(coachId, active.id, null, text).catch(() => toast.error("No se pudo enviar el mensaje"));
    } else {
      sendMessage(coachId, active.id, "coach", text).catch(() => toast.error("No se pudo enviar el mensaje"));
    }
  }
  function shareSession() {
    if (!active) return;
    setConvs((cs) => cs.map((c) => (c.id === active.id ? { ...c, preview: "Sesión compartida", fromCoach: true, time: "Ahora", messages: [...c.messages, { kind: "session", name: "Sesión del jueves", exercises: 4, minutes: 50, time: "Ahora" }] } : c)));
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#F8FAFC" }}>
      <Sidebar active="Mensajes" />
      <main className="flex flex-1" style={{ height: "100vh", overflow: "hidden" }}>
        {/* LEFT */}
        <section className="flex shrink-0 flex-col" style={{ width: 300, borderRight: `1px solid ${C.border}`, background: "#FFFFFF" }}>
          <div className="shrink-0" style={{ padding: "20px 16px 12px" }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Mensajes</h1>
            <div className="relative" style={{ marginTop: 10 }}>
              <Search size={13} color={C.faint} className="absolute" style={{ left: 12, top: 11.5 }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="w-full outline-none" style={{ height: 36, border: `1px solid ${C.border}`, borderRadius: 9, padding: "0 12px 0 34px", fontSize: 12, color: C.text }} />
            </div>
          </div>
          <div className="flex shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
            {(["Todos", "Atletas", "Equipos"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} style={{ padding: "8px 16px", fontSize: 12, color: tab === t ? C.text : C.muted, borderBottom: tab === t ? "2px solid #111827" : "2px solid transparent", marginBottom: -1 }}>{t}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {list.map((c) => (
              <button key={c.id} type="button" onClick={() => open(c.id)} className="flex w-full items-center text-left hover:bg-[#F8FAFC]" style={{ gap: 10, padding: "12px 16px", borderBottom: "1px solid #F8FAFC", background: c.id === activeId ? "#F1F5F9" : undefined }}>
                <Avatar c={c} />
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <span className="flex-1 truncate" style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</span>
                    <span className="shrink-0" style={{ fontSize: 10, color: C.muted }}>{c.time}</span>
                  </div>
                  {c.group && <span className="inline-block" style={{ fontSize: 9, color: "#3B82F6", background: "#EFF6FF", borderRadius: 4, padding: "1px 5px", marginTop: 2 }}>Equipo</span>}
                  <div className="flex items-center" style={{ gap: 6, marginTop: 2 }}>
                    <span className="flex-1 truncate" style={{ fontSize: 11, color: C.muted }}>
                      {c.fromCoach && <span style={{ color: C.faint }}>Vos: </span>}{c.preview}
                    </span>
                    {c.unread > 0 && <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 16, height: 16, background: "#111827", color: "#FFFFFF", fontSize: 9, fontWeight: 700 }}>{c.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => toast("Elegí un atleta o equipo para iniciar la conversación")} className="flex shrink-0 items-center hover:bg-[#F8FAFC]" style={{ gap: 8, padding: "12px 16px", borderTop: `1px solid ${C.border}`, fontSize: 12, color: "#374151" }}>
            <Plus size={13} color={C.muted} /> Nueva conversación
          </button>
        </section>

        {/* RIGHT */}
        <section className="flex flex-1 flex-col" style={{ minWidth: 0, background: "#FFFFFF" }}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center" style={{ gap: 6 }}>
              <MessageCircle size={40} color={C.border} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginTop: 6 }}>Seleccioná una conversación</p>
              <p style={{ fontSize: 12, color: C.muted }}>o iniciá una nueva.</p>
            </div>
          ) : (
            <ActiveChat key={active.id} c={active} onSend={send} onShareSession={shareSession} onView={() => (active.group ? navigate({ to: "/equipos" }) : navigate({ to: "/atletas/$athleteId", params: { athleteId: active.id } }))} />
          )}
        </section>
      </main>
    </div>
  );
}

function ActiveChat({ c, onSend, onShareSession, onView }: { c: Conv; onSend: (t: string) => void; onShareSession: () => void; onView: () => void }) {
  const [menu, setMenu] = useState(false);
  const [attach, setAttach] = useState(false);
  const [text, setText] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView(); }, [c.messages.length]);
  useEffect(() => {
    const el = ta.current; if (!el) return;
    el.style.height = "auto"; el.style.height = `${Math.min(120, Math.max(40, el.scrollHeight))}px`;
  }, [text]);
  const submit = () => { const t = text.trim(); if (!t) return; onSend(t); setText(""); };

  return (
    <>
      <header className="flex shrink-0 items-center" style={{ gap: 12, padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: "#FFFFFF" }}>
        <Avatar c={c} />
        <div className="flex flex-col">
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{c.name}</span>
          <span style={{ fontSize: 11, color: C.muted }}>{c.context}</span>
        </div>
        <div className="relative flex items-center" style={{ marginLeft: "auto", gap: 8 }}>
          <button type="button" onClick={onView} className="flex items-center" style={{ border: `1px solid ${C.border}`, borderRadius: 8, height: 32, padding: "0 12px", fontSize: 11, color: "#374151", gap: 5 }}>
            {c.group ? <Users2 size={12} color={C.muted} /> : <UserCheck size={12} color={C.muted} />}
            {c.group ? "Ver equipo" : "Ver atleta"}
          </button>
          <button type="button" aria-label="Más opciones" onClick={() => setMenu((m) => !m)}><MoreHorizontal size={16} color={C.faint} /></button>
          {menu && (
            <div className="absolute" style={{ right: 0, top: 38, background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: 6, zIndex: 10, minWidth: 140 }}>
              {["Silenciar", "Archivar"].map((o) => (
                <button key={o} type="button" onClick={() => { setMenu(false); toast(`${o}: ${c.name}`); }} className="block w-full text-left hover:bg-[#F8FAFC]" style={{ padding: "8px 12px", fontSize: 12, color: "#374151", borderRadius: 8 }}>{o}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: "16px 20px", gap: 6 }}>
        {c.messages.map((m, i) => {
          if (m.kind === "date") return (
            <div key={i} className="flex items-center" style={{ gap: 10, margin: "8px 0" }}>
              <span className="flex-1" style={{ height: 1, background: "#F1F5F9" }} />
              <span style={{ fontSize: 10, color: C.faint }}>{m.text}</span>
              <span className="flex-1" style={{ height: 1, background: "#F1F5F9" }} />
            </div>
          );
          if (m.kind === "in") return (
            <div key={i} style={{ alignSelf: "flex-start", maxWidth: "70%" }}>
              {m.sender && <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 3 }}>{m.sender}</div>}
              <div style={{ background: "#F1F5F9", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", fontSize: 13, color: C.text, lineHeight: 1.5 }}>{m.text}</div>
              <div style={{ fontSize: 9, color: C.faint, marginTop: 2, marginLeft: 4 }}>{m.time}</div>
            </div>
          );
          if (m.kind === "out") return (
            <div key={i} style={{ alignSelf: "flex-end", maxWidth: "70%" }}>
              <div style={{ background: "#111827", borderRadius: "14px 4px 14px 14px", padding: "10px 14px", fontSize: 13, color: "#FFFFFF", lineHeight: 1.5 }}>{m.text}</div>
              <div className="flex items-center justify-end" style={{ gap: 4, marginTop: 2 }}>
                <CheckCheck size={10} color={m.read ? "#22C55E" : C.muted} />
                <span style={{ fontSize: 9, color: C.faint }}>{m.time}</span>
              </div>
            </div>
          );
          return (
            <div key={i} style={{ alignSelf: "flex-end", maxWidth: "70%" }}>
              <div style={{ background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div className="flex items-center" style={{ gap: 4, fontSize: 10, fontWeight: 600, color: C.muted }}><Dumbbell size={10} /> Sesión compartida</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginTop: 4 }}>{m.name}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{m.exercises} ejercicios · {m.minutes} min</div>
                <button type="button" onClick={() => toast(`Abriendo ${m.name}`)} style={{ fontSize: 11, color: "#3B82F6", marginTop: 6 }}>Ver sesión →</button>
              </div>
              <div style={{ fontSize: 9, color: C.faint, marginTop: 2, textAlign: "right" }}>{m.time}</div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      <div className="shrink-0" style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, background: "#FFFFFF" }}>
        <div className="relative flex items-end" style={{ gap: 10 }}>
          <button type="button" aria-label="Adjuntar" onClick={() => setAttach((a) => !a)} style={{ paddingBottom: 11 }}><Paperclip size={18} color={C.faint} /></button>
          {attach && (
            <div className="absolute" style={{ left: 0, bottom: 48, background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: 6, zIndex: 10, minWidth: 190 }}>
              {[
                { icon: Calendar, label: "Compartir sesión", fn: onShareSession },
                { icon: BookOpen, label: "Compartir programa", fn: () => toast("Programa compartido") },
                { icon: ImageIcon, label: "Imagen", fn: () => toast("Imagen adjunta") },
              ].map(({ icon: I, label, fn }) => (
                <button key={label} type="button" onClick={() => { setAttach(false); fn(); }} className="flex w-full items-center hover:bg-[#F8FAFC]" style={{ gap: 8, padding: "8px 12px", fontSize: 12, color: "#374151", borderRadius: 8 }}>
                  <I size={13} color={C.muted} /> {label}
                </button>
              ))}
            </div>
          )}
          <textarea ref={ta} rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="Escribí un mensaje…" className="flex-1 outline-none" style={{ minHeight: 40, maxHeight: 120, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: C.text, resize: "none" }} />
          <button type="button" aria-label="Enviar" disabled={!text.trim()} onClick={submit} className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 32, height: 32, background: "#111827", opacity: text.trim() ? 1 : 0.3, marginBottom: 4 }}>
            <Send size={14} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </>
  );
}
