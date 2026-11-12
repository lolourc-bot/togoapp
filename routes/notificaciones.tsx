import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { CoachNotifList } from "@/components/togo/CoachNotifList";
import { useNotifs } from "@/lib/notifications";

export const Route = createFileRoute("/notificaciones")({
  validateSearch: (search: Record<string, unknown>): { athleteId?: string } =>
    typeof search["athleteId"] === "string" ? { athleteId: search["athleteId"] as string } : {},
  head: () => ({
    meta: [
      { title: "Notificaciones · TOGO" },
      { name: "description", content: "Tus notificaciones: sesiones publicadas, mensajes y más." },
      { property: "og:title", content: "Notificaciones · TOGO" },
      { property: "og:description", content: "Historial de notificaciones del atleta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AthleteNotificaciones,
});

function AthleteNotificaciones() {
  const { athleteId } = Route.useSearch();
  const { list, markAll, markRead } = useNotifs("athlete", athleteId);
  const unread = list.filter((n) => n.unread).length;

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div className="relative flex flex-col" style={{ width: 375, height: 812, backgroundColor: "#FFFFFF", borderRadius: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div className="flex shrink-0 items-center" style={{ gap: 10, padding: "28px 16px 12px", borderBottom: "1px solid #E2E8F0" }}>
          <Link to="/hoy" search={athleteId ? { athleteId } : {}} aria-label="Volver">
            <ChevronLeft size={22} color="#111827" />
          </Link>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#111827", flex: 1 }}>Notificaciones</span>
          {unread > 0 ? (
            <button type="button" onClick={markAll} style={{ fontSize: 12, color: "#3B82F6", background: "none", border: 0, cursor: "pointer" }}>
              Marcar todo
            </button>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <p style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
              Todavía no tenés notificaciones.
            </p>
          ) : (
            <CoachNotifList list={list} onRead={markRead} />
          )}
        </div>
      </div>
    </div>
  );
}
