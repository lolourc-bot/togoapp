import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useUserContext } from "@/lib/user-context";
import { useHasCoach } from "@/components/togo/AthleteBottomNav";
import { useAthleteAuth } from "@/hooks/useAthleteAuth";
import { fetchNotificationPrefs, setNotificationPrefOff } from "@/lib/notification-prefs";

export const Route = createFileRoute("/ajustes-notificaciones")({
  head: () => ({
    meta: [
      { title: "Ajustes de notificaciones · TOGO" },
      { name: "description", content: "Elegí qué avisos querés recibir en TOGO." },
      { property: "og:title", content: "Ajustes de notificaciones · TOGO" },
      { property: "og:description", content: "Elegí qué avisos querés recibir en TOGO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotifSettings,
});

type Row = [string, string];
const card: React.CSSProperties = { background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", margin: "0 16px 12px", overflow: "hidden" };

function NotifSettings() {
  const navigate = useNavigate();
  const ctx = useUserContext();
  const hasCoach = useHasCoach();
  const { athlete } = useAthleteAuth();
  const [off, setOff] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!athlete) { setOff(new Set()); return; }
    fetchNotificationPrefs(athlete.id).then(setOff);
  }, [athlete]);

  const toggle = (k: string) => {
    setOff((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      if (athlete) setNotificationPrefOff(athlete.id, [...n]);
      return n;
    });
  };

  const inst: Row[] = [];
  if (ctx.type === "gym_member") inst.push(["Clases disponibles", "Cuando haya un lugar libre en una clase llena."]);
  if (ctx.type === "club_athlete") inst.push(["Prácticas del equipo", "Recordatorio de práctica 2 horas antes."]);
  if (ctx.type === "gym_member") inst.push(["Vencimiento de membresía", "3 días antes de que venza tu cuota."]);
  void hasCoach;

  const sections: [string, Row[]][] = [
    ["Entrenamiento", [["Nueva sesión publicada", "Cuando tu entrenador publique algo nuevo."], ["Recordatorio de sesión", "1 hora antes de tu sesión programada."], ["Semana sin sesión", "Si llega el domingo sin sesiones completadas."]]],
    ["Social", [["Mensajes nuevos", "Cuando recibas un mensaje de tu entrenador."], ["Menciones en equipo", "Cuando alguien te mencione en un chat grupal."]]],
    ...(inst.length ? [["Institución", inst] as [string, Row[]]] : []),
  ];

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div className="relative flex flex-col" style={{ width: 375, height: 812, backgroundColor: "#F8FAFC", borderRadius: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div className="flex items-center" style={{ padding: "44px 20px 16px", gap: 8 }}>
          <button aria-label="Volver" onClick={() => navigate({ to: "/perfil" })} style={{ background: "none", border: 0, cursor: "pointer", display: "flex" }}><ChevronLeft size={22} color="#111827" /></button>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Notificaciones</span>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {sections.map(([t, rows]) => (
            <div key={t}>
              <div style={{ padding: "4px 20px 8px", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>{t}</div>
              <div style={card}>
                {rows.map(([l, d], i) => {
                  const on = !off.has(l);
                  return (
                    <button key={l} onClick={() => toggle(l)} role="switch" aria-checked={on} className="flex items-center" style={{ width: "100%", textAlign: "left", gap: 12, padding: "14px 16px", background: "none", border: 0, borderBottom: i < rows.length - 1 ? "1px solid #F8FAFC" : "none", cursor: "pointer" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "#374151" }}>{l}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{d}</div>
                      </div>
                      <span style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#111827" : "#E2E8F0", position: "relative", flexShrink: 0, transition: "background .2s" }}>
                        <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#FFF", transition: "left .2s", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
