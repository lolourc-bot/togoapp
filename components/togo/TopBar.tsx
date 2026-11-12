import { Search, Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useNotifs } from "@/lib/notifications";
import { CoachNotifList } from "@/components/togo/CoachNotifList";

export function TopBar({ title }: { title: string }) {
  const { list, markAll, markRead } = useNotifs("coach");
  const unread = list.filter((n) => n.unread).length;
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const today = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <h1 className="text-[1.25rem] font-bold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="relative w-[220px]">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
          />
          <input
            type="search"
            placeholder="Buscar atleta..."
            aria-label="Buscar atleta"
            className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-[0.8125rem] text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none"
          />
        </div>

        <div ref={wrap} className="relative">
          <button type="button" aria-label="Notificaciones" className="relative flex" onClick={() => setOpen((o) => !o)}>
            <Bell size={18} className="text-muted-foreground" />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.5625rem] font-bold text-primary-foreground">{unread}</span>
            )}
          </button>
          {open && (
            <div style={{ position: "absolute", top: 48, right: 0, width: 360, background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 50, overflow: "hidden" }}>
              <div className="flex items-center" style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", flex: 1 }}>Notificaciones</span>
                {unread > 0 && <button onClick={markAll} style={{ fontSize: 11, color: "#3B82F6", background: "none", border: 0, cursor: "pointer" }}>Marcar todo leído</button>}
              </div>
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                <CoachNotifList list={list} onRead={markRead} />
              </div>
              <div style={{ padding: "12px 16px", borderTop: "1px solid #E2E8F0", textAlign: "center" }}>
                <Link to="/coach-notificaciones" onClick={() => setOpen(false)} style={{ fontSize: 12, color: "#3B82F6" }}>Ver todas las notificaciones</Link>
              </div>
            </div>
          )}
        </div>

        <span className="chip bg-surface-hover text-muted-foreground">{today}</span>
      </div>
    </header>
  );
}
