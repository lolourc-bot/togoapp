import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, MoreHorizontal, Paperclip, Send } from "lucide-react";
import { ATHLETE_CHATS, ensureChat, type AMsg } from "@/lib/athlete-chats";
import { ChatAvatar } from "./index";

export const Route = createFileRoute("/chat/$coachId")({
  validateSearch: (s: Record<string, unknown>): { nombre?: string | undefined } => ({ nombre: typeof s["nombre"] === "string" ? (s["nombre"] as string) : undefined }),
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

function ChatScreen() {
  const navigate = useNavigate();
  const { coachId } = Route.useParams();
  const { nombre } = Route.useSearch();
  const conv = ATHLETE_CHATS.find((c) => c.id === coachId) ?? (nombre ? ensureChat(coachId, nombre) : ATHLETE_CHATS[0]!);
  const [msgs, setMsgs] = useState<AMsg[]>(conv.messages);
  const [text, setText] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView(); }, [msgs.length]);
  useEffect(() => {
    const el = ta.current; if (!el) return;
    el.style.height = "auto"; el.style.height = `${Math.min(100, Math.max(40, el.scrollHeight))}px`;
  }, [text]);
  const submit = () => {
    const t = text.trim(); if (!t) return;
    const d = new Date();
    setMsgs((m) => [...m, { kind: "out", text: t, time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }]);
    toast.success("Mensaje enviado ✓", { duration: 1500 });
    setText("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div className="relative flex flex-col" style={{ width: 375, height: 812, backgroundColor: "#FFFFFF", borderRadius: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div className="flex shrink-0 items-center" style={{ gap: 10, padding: "28px 16px 12px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
          <button type="button" aria-label="Volver" onClick={() => navigate({ to: "/chat" })}><ChevronLeft size={22} color="#111827" /></button>
          <ChatAvatar c={conv} size={36} />
          <div className="flex flex-col" style={{ minWidth: 0 }}>
            <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{conv.name}</span>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>{conv.context}</span>
          </div>
          <MoreHorizontal size={20} color="#CBD5E1" style={{ marginLeft: "auto" }} />
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: "12px 16px", gap: 6 }}>
          {msgs.map((m, i) => {
            if (m.kind === "date") return (
              <div key={i} className="flex items-center" style={{ gap: 10, margin: "8px 0" }}>
                <span className="flex-1" style={{ height: 1, background: "#F1F5F9" }} />
                <span style={{ fontSize: 10, color: "#CBD5E1" }}>{m.text}</span>
                <span className="flex-1" style={{ height: 1, background: "#F1F5F9" }} />
              </div>
            );
            if (m.kind === "in") return (
              <div key={i} style={{ alignSelf: "flex-start", maxWidth: "80%" }}>
                {m.sender && <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", marginBottom: 3 }}>{m.sender}</div>}
                <div style={{ background: "#F1F5F9", borderRadius: "4px 16px 16px 16px", padding: "10px 14px", fontSize: 14, color: "#111827", lineHeight: 1.5 }}>{m.text}</div>
                <div style={{ fontSize: 9, color: "#CBD5E1", marginTop: 2, marginLeft: 4 }}>{m.time}</div>
              </div>
            );
            if (m.kind === "out") return (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
                <div style={{ background: "#111827", borderRadius: "16px 4px 16px 16px", padding: "10px 14px", fontSize: 14, color: "#FFFFFF", lineHeight: 1.5 }}>{m.text}</div>
                <div style={{ fontSize: 9, color: "#CBD5E1", marginTop: 2, textAlign: "right" }}>{m.time}</div>
              </div>
            );
            return (
              <button key={i} type="button" onClick={() => navigate({ to: "/hoy" })} className="text-left" style={{ alignSelf: "flex-start", maxWidth: "80%", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8" }}>Sesión compartida</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginTop: 4 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{m.exercises} ejercicios</div>
                <div style={{ fontSize: 12, color: "#3B82F6", marginTop: 6 }}>Abrir sesión</div>
              </button>
            );
          })}
          <div ref={end} />
        </div>

        <div className="flex shrink-0 items-end" style={{ padding: "10px 14px 24px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF", gap: 8 }}>
          <button type="button" aria-label="Adjuntar" style={{ paddingBottom: 10 }}><Paperclip size={20} color="#CBD5E1" /></button>
          <textarea ref={ta} rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Mensaje…" className="flex-1 outline-none" style={{ minHeight: 40, maxHeight: 100, border: "1px solid #E2E8F0", borderRadius: 20, padding: "10px 16px", fontSize: 14, color: "#111827", resize: "none" }} />
          <button type="button" aria-label="Enviar" disabled={!text.trim()} onClick={submit} className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 40, height: 40, background: "#111827", opacity: text.trim() ? 1 : 0.3 }}>
            <Send size={16} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </div>
  );
}
