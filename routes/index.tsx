import { NewCoachGate, markNewCoach } from "@/components/togo/EmptyStates";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CoachOnboarding } from "@/components/togo/Onboarding";
import { RoleGate } from "@/components/togo/RoleGate";
import { Sidebar } from "@/components/togo/Sidebar";
import { TopBar } from "@/components/togo/TopBar";
import { ActivityFeed } from "@/components/togo/ActivityFeed";
import { LoadControlCard } from "@/components/togo/LoadControlCard";
import { UrgentCard } from "@/components/togo/RightPanel";
import { getCoachId } from "@/lib/programs";
import { fetchDashboard, type DashboardData } from "@/lib/dashboard";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TOGO · Panel de entrenamiento para coaches" },
      {
        name: "description",
        content:
          "TOGO App: gestioná tus atletas, carga de entrenamiento, planificación y actividad diaria desde un solo panel.",
      },
      { property: "og:title", content: "TOGO · Panel de entrenamiento para coaches" },
      {
        property: "og:description",
        content:
          "Gestioná atletas, carga de entrenamiento y planificación semanal desde un panel profesional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const EMPTY_DASHBOARD: DashboardData = { feed: [], unplanned: [], loadGroups: { atencion: [], precaucion: [], enForma: [] } };

function Index() {
  const navigate = useNavigate();
  const [onb, setOnb] = useState<boolean | null>(null);
  const [coachIdForOnb, setCoachIdForOnb] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  useEffect(() => {
    (async () => {
      // roleChecked siempre tiene que terminar en true pase lo que pase acá adentro —
      // si algún `navigate()` tarda o se cancela, el componente no puede quedar colgado
      // para siempre mostrando el placeholder en blanco.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from("profiles").select("role, onboarded").eq("id", session.user.id).maybeSingle();
        if (profile?.role === "institution") { navigate({ to: "/institucion" }); return; }
        // No hay profiles.role para atletas — se resuelven vía su propia fila en athletes
        // (mismo chequeo que hooks/useAthleteAuth.ts).
        const { data: athleteRow } = await supabase
          .from("athletes")
          .select("id")
          .eq("auth_user_id", session.user.id)
          .limit(1)
          .maybeSingle();
        if (athleteRow) { navigate({ to: "/hoy" }); return; }
        // En celular, el panel de coach es la app mobile (/coach-app), no el panel grande de
        // escritorio — el panel grande sigue existiendo tal cual para usar desde una compu.
        if (window.innerWidth < 768) { navigate({ to: "/coach-app" }); return; }
        setCoachIdForOnb(session.user.id);
        setOnb(profile?.onboarded ?? false);
        setHasSession(true);
      } finally {
        setRoleChecked(true);
      }
    })();
  }, [navigate]);
  useEffect(() => {
    getCoachId().then((cid) => {
      if (cid) fetchDashboard(cid).then(setDashboard);
    });
  }, []);
  if (!roleChecked || (hasSession && onb === null)) return <div style={{ minHeight: "100vh", background: "#FFF" }} />;
  if (!hasSession) return <RoleGate />;
  if (!onb) return (
    <CoachOnboarding
      onFinish={async (to) => {
        if (coachIdForOnb) await supabase.from("profiles").update({ onboarded: true }).eq("id", coachIdForOnb);
        markNewCoach();
        setOnb(true);
        if (to === "invite") navigate({ to: "/atletas" });
      }}
    />
  );
  return (
    <NewCoachGate section="dashboard">
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-background">
      <Sidebar />

      <div className="flex min-h-screen flex-col">
        <TopBar title="Inicio" />

        <main className="grid flex-1 grid-cols-[1fr_380px] gap-5 bg-background p-6">
          <ActivityFeed items={dashboard.feed} />

          <aside className="flex flex-col gap-4">
            <UrgentCard unplanned={dashboard.unplanned} />
            <LoadControlCard loadGroups={dashboard.loadGroups} />
          </aside>
        </main>
      </div>
    </div>
    </NewCoachGate>
  );
}
