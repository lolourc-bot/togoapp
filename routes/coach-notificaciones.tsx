import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/togo/Sidebar";
import { TopBar } from "@/components/togo/TopBar";
import { CoachNotifList } from "@/components/togo/CoachNotifList";
import { useNotifs } from "@/lib/notifications";

export const Route = createFileRoute("/coach-notificaciones")({
  head: () => ({
    meta: [
      { title: "Notificaciones · TOGO" },
      { name: "description", content: "Todas tus notificaciones: mensajes, sesiones completadas y más." },
      { property: "og:title", content: "Notificaciones · TOGO" },
      { property: "og:description", content: "Historial completo de notificaciones del coach." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoachNotificaciones,
});

function CoachNotificaciones() {
  const { list, markAll, markRead } = useNotifs("coach");
  const unread = list.filter((n) => n.unread).length;

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-background">
      <Sidebar active="Mensajes" />
      <div className="flex min-h-screen flex-col">
        <TopBar title="Notificaciones" />
        <main className="flex-1 overflow-y-auto" style={{ padding: "24px 32px" }}>
          <div
            className="mx-auto"
            style={{ maxWidth: 640, backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}
          >
            <div className="flex items-center" style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", flex: 1 }}>Notificaciones</span>
              {unread > 0 ? (
                <button type="button" onClick={markAll} style={{ fontSize: 12, color: "#3B82F6", background: "none", border: 0, cursor: "pointer" }}>
                  Marcar todo leído
                </button>
              ) : null}
            </div>
            {list.length === 0 ? (
              <p style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
                Todavía no tenés notificaciones.
              </p>
            ) : (
              <CoachNotifList list={list} onRead={markRead} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
