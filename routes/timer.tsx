import { createFileRoute } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { setTimerSlot } from "@/components/togo/AthleteTimer";

export const Route = createFileRoute("/timer")({
  head: () => ({
    meta: [
      { title: "Temporizador · TOGO" },
      { name: "description", content: "Cronómetro, cuenta regresiva, AMRAP, TABATA y EMOM para tu entrenamiento." },
      { property: "og:title", content: "Temporizador · TOGO" },
      { property: "og:description", content: "Cronómetro, cuenta regresiva, AMRAP, TABATA y EMOM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TimerScreen,
});

function TimerScreen() {
  return (
    <PhoneFrame>
      <div ref={(el) => setTimerSlot(el)} className="flex flex-1 flex-col" style={{ minHeight: 0 }} />
      <AthleteBottomNav active="Timer" />
    </PhoneFrame>
  );
}
