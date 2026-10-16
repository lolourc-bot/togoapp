import { NewCoachGate, markNewCoach } from "@/components/togo/EmptyStates";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CoachOnboarding } from "@/components/togo/Onboarding";
import { Sidebar } from "@/components/togo/Sidebar";
import { TopBar } from "@/components/togo/TopBar";
import { ActivityFeed } from "@/components/togo/ActivityFeed";
import { LoadControlCard } from "@/components/togo/LoadControlCard";
import { UrgentCard } from "@/components/togo/RightPanel";

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

function Index() {
  const navigate = useNavigate();
  const [onb, setOnb] = useState<boolean | null>(null);
  useEffect(() => { setOnb(localStorage.getItem("togo-coach-onboarded") === "1"); }, []);
  if (onb === null) return <div style={{ minHeight: "100vh", background: "#FFF" }} />;
  if (!onb) return <CoachOnboarding onFinish={(to) => { localStorage.setItem("togo-coach-onboarded", "1"); markNewCoach(); setOnb(true); if (to === "invite") navigate({ to: "/atletas" }); }} />;
  return (
    <NewCoachGate section="dashboard">
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-background">
      <Sidebar />

      <div className="flex min-h-screen flex-col">
        <TopBar title="Inicio" />

        <main className="grid flex-1 grid-cols-[1fr_380px] gap-5 bg-background p-6">
          <ActivityFeed />

          <aside className="flex flex-col gap-4">
            <UrgentCard />
            <LoadControlCard />
          </aside>
        </main>
      </div>
    </div>
    </NewCoachGate>
  );
}
