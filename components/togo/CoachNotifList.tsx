import type { Notif } from "@/lib/notifications";
import { NotifIcon } from "@/components/togo/NotifIcon";

export function CoachNotifList({ list, onRead }: { list: Notif[]; onRead: (id: string) => void }) {
  const days = [...new Set(list.map((n) => n.day))];
  return (
    <>
      {days.map((d) => (
        <div key={d}>
          <div style={{ padding: "8px 16px", background: "#F8FAFC", fontSize: 10, fontWeight: 600, color: "#94A3B8" }}>{d}</div>
          {list.filter((n) => n.day === d).map((n) => (
            <button key={n.id} onClick={() => onRead(n.id)} className="flex items-start hover:!bg-[#F8FAFC]" style={{ width: "100%", textAlign: "left", gap: 10, padding: "12px 16px", border: 0, borderBottom: "1px solid #F8FAFC", cursor: "pointer", background: n.unread ? "#FAFAFE" : "#FFF" }}>
              <NotifIcon kind={n.kind} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: n.unread ? 600 : 400, color: "#111827" }}>{n.title}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.body}</div>
                <div style={{ fontSize: 10, color: "#CBD5E1", marginTop: 2 }}>{n.time}</div>
              </div>
              {n.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#111827", flexShrink: 0, alignSelf: "center" }} />}
            </button>
          ))}
        </div>
      ))}
    </>
  );
}
