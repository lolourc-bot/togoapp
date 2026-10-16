import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Edit2, Search } from "lucide-react";
import { ATHLETE_CHATS, type AConv } from "@/lib/athlete-chats";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "Mensajes · TOGO" },
      { name: "description", content: "Tus conversaciones con coaches, equipos y soporte de TOGO." },
      { property: "og:title", content: "Mensajes · TOGO" },
      { property: "og:description", content: "Revisá tus conversaciones con tus coaches y equipos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatListScreen,
});

export function ChatAvatar({ c, size }: { c: AConv; size: number }) {
  if (c.group) {
    const s = Math.round(size * 0.73);
    const circ = (t: string, z: number, left: number) => (
      <span className="absolute flex items-center justify-center rounded-full" style={{ width: s, height: s, left, top: (size - s) / 2, zIndex: z, background: "#F1F5F9", border: "2px solid #FFFFFF", fontSize: 10, fontWeight: 600, color: "#94A3B8" }}>{t}</span>
    );
    return <span className="relative shrink-0" style={{ width: size, height: size }}>{circ(c.group.a, 2, 0)}{circ(c.group.b, 1, size - s)}</span>;
  }
  const logo = c.id === "togo";
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: logo ? "#111827" : "#F1F5F9", color: logo ? "#FFFFFF" : "#94A3B8", fontSize: 13, fontWeight: 700 }}>{c.initials}</span>
  );
}

function ChatListScreen() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const list = ATHLETE_CHATS.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div className="relative flex flex-col" style={{ width: 375, height: 812, backgroundColor: "#FFFFFF", borderRadius: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div className="flex shrink-0 items-center" style={{ padding: "28px 20px 8px" }}>
          <span className="flex-1" style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Mensajes</span>
          <button type="button" aria-label="Nueva conversación"><Edit2 size={18} color="#94A3B8" /></button>
        </div>
        <div className="flex shrink-0 items-center" style={{ margin: "8px 16px 0", height: 40, borderRadius: 10, background: "#F1F5F9", padding: "0 14px", gap: 8 }}>
          <Search size={14} color="#CBD5E1" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="flex-1 bg-transparent outline-none" style={{ fontSize: 13, color: "#111827" }} />
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto" style={{ marginTop: 8 }}>
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => navigate({ to: "/chat/$coachId", params: { coachId: c.id } })} className="flex w-full items-center text-left" style={{ gap: 12, padding: "14px 16px", borderBottom: "1px solid #F8FAFC" }}>
              <ChatAvatar c={c} size={44} />
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="flex items-center" style={{ gap: 6 }}>
                  <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>{c.time}</span>
                </div>
                <div className="flex items-center" style={{ gap: 6, marginTop: 3 }}>
                  <span className="flex-1 truncate" style={{ fontSize: 12, color: "#94A3B8" }}>{c.preview}</span>
                  {c.unread > 0 && <span style={{ background: "#111827", color: "#FFFFFF", fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 20, padding: "0 5px", textAlign: "center", lineHeight: "18px" }}>{c.unread}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
        <AthleteBottomNav active="Mensajes" />
      </div>
    </div>
  );
}
