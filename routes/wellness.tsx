import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import WellnessSheet from "@/components/togo/WellnessSheet";

export const Route = createFileRoute("/wellness")({
  head: () => ({
    meta: [
      { title: "Check-in · TOGO" },
      {
        name: "description",
        content:
          "Check-in rápido de wellness antes de empezar la sesión: energía, sueño y cuerpo.",
      },
      { property: "og:title", content: "Check-in · TOGO" },
      {
        property: "og:description",
        content: "Check-in de wellness del atleta antes de entrenar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WellnessCheckIn,
});

function WellnessCheckIn() {
  const navigate = useNavigate();
  const [show, setShow] = useState(true);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#F1F5F9", padding: 24 }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: 375,
          height: 812,
          backgroundColor: "#F8FAFC",
          borderRadius: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        {/* Standalone fallback — no Home behind, just a dimmed backdrop */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            backgroundColor: "#F8FAFC",
          }}
        />
        <WellnessSheet
          show={show}
          onClose={() => {
            setShow(false);
            navigate({ to: "/hoy" });
          }}
          onStart={() => {
            setShow(false);
            navigate({ to: "/sesion-atleta" });
          }}
        />
      </div>
    </div>
  );
}
