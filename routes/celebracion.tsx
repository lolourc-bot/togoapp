import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, CloudRain, Frown, Meh, Smile, Flame, Home, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/celebracion")({
  head: () => ({
    meta: [
      { title: "¡Sesión completada! · TOGO" },
      {
        name: "description",
        content:
          "Resumen de la sesión completada por el atleta: duración, bloques, series y check-in post-sesión.",
      },
      { property: "og:title", content: "¡Sesión completada! · TOGO" },
      {
        property: "og:description",
        content: "Celebración y resumen al completar la sesión de entrenamiento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CelebrationScreen,
});

const FEEL_OPTIONS: { icon: LucideIcon; label: string }[] = [
  { icon: CloudRain, label: "Agotado" },
  { icon: Frown, label: "Difícil" },
  { icon: Meh, label: "Ok" },
  { icon: Smile, label: "Bien" },
  { icon: Flame, label: "Excelente" },
];

const STATS = [
  { number: "54:12", label: "Duración" },
  { number: "4", label: "Bloques" },
  { number: "18", label: "Series" },
];

const QUOTES = [
  "Un paso más cerca del objetivo.",
  "El esfuerzo de hoy es el resultado de mañana.",
  "Cada sesión cuenta.",
  "La constancia vence al talento.",
  "No pares. El progreso es progreso.",
  "Hoy entrenaste. Eso ya es una victoria.",
  "Los que no se rinden son los que llegan.",
  "La disciplina es la forma más alta de amor propio.",
  "Pequeñas mejoras, grandes resultados.",
  "El cuerpo logra lo que la mente cree.",
  "Otra sesión. Otra versión mejorada de vos.",
  "Cada repetición importa.",
  "El descanso de mañana lo ganaste hoy.",
  "No busques motivación, construí disciplina.",
  "Vos elegís quién sos en el entrenamiento.",
  "Mejor que ayer. Eso es todo lo que importa.",
  "El proceso es el destino.",
  "Nadie se arrepiente de haber entrenado.",
  "Constancia sobre intensidad.",
  "Lo que hacés hoy define lo que podés hacer mañana.",
  "El músculo se construye en el gimnasio. El carácter, también.",
  "Orgulloso/a de haberlo hecho.",
  "Ganaste el día.",
  "Cada sesión es un voto por la persona que querés ser.",
  "La motivación arranca. La disciplina continúa.",
  "Seguís en carrera.",
  "No fue fácil. Por eso vale.",
  "Un día más de trabajo hecho.",
  "La versión de mañana te lo va a agradecer.",
  "Vas por buen camino.",
  "Cerraste el día bien.",
];

function CelebrationScreen() {
  const navigate = useNavigate();
  const [feel, setFeel] = useState<number | null>(null);

  return (
    <>
      <style>{`
        @keyframes celebrationSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes checkPop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
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
            animation: "celebrationSlideUp 360ms cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          {/* Scrollable content */}
          <div style={{ overflowY: "auto", flex: 1, paddingBottom: 88 }}>
            {/* TOP SECTION */}
            <div
              className="flex flex-col items-center"
              style={{ paddingTop: 48 }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: "#F0FDF4",
                  border: "2px solid #BBF7D0",
                  animation: "checkPop 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <Check size={36} color="#16A34A" strokeWidth={2.5} />
              </div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#111827",
                  margin: "20px 0 0",
                  textAlign: "center",
                }}
              >
                ¡Sesión completada!
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: "#64748B",
                  margin: "4px 0 0",
                  textAlign: "center",
                }}
              >
                Fuerza · Jueves 22/8
              </p>
            </div>

            {/* STATS ROW */}
            <div
              className="flex"
              style={{ margin: "28px 20px 0", gap: 10 }}
            >
              {STATS.map((st) => (
                <div
                  key={st.label}
                  className="flex flex-col items-center justify-center"
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <span
                    style={{ fontSize: 20, fontWeight: 700, color: "#111827", lineHeight: 1.1 }}
                  >
                    {st.number}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginTop: 2,
                    }}
                  >
                    {st.label}
                  </span>
                </div>
              ))}
            </div>

            {/* POST-SESSION WELLNESS */}
            <div
              style={{
                margin: "24px 20px 0",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                  margin: "0 0 12px",
                }}
              >
                ¿Cómo te sentiste?
              </h2>
              <div className="flex" style={{ gap: 6 }}>
                {FEEL_OPTIONS.map((opt, i) => {
                  const selected = feel === i;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFeel(i)}
                      className="flex flex-1 flex-col items-center justify-center"
                      style={{
                        height: 52,
                        borderRadius: 10,
                        backgroundColor: selected ? "#111827" : "#FFFFFF",
                        border: selected
                          ? "1px solid #111827"
                          : "1px solid #E2E8F0",
                        color: selected ? "#FFFFFF" : "#64748B",
                        gap: 2,
                        cursor: "pointer",
                        transition: "all 120ms ease",
                      }}
                    >
                      <Icon size={16} color={selected ? "#FFFFFF" : "#64748B"} />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          lineHeight: 1,
                          color: selected ? "#FFFFFF" : "#64748B",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DAILY MOTIVATIONAL QUOTE */}
            <div style={{ margin: "28px 20px 0", textAlign: "center" }}>
              <div
                style={{
                  fontSize: 24,
                  color: "#E2E8F0",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                “
              </div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 400,
                  color: "#64748B",
                  fontStyle: "italic",
                  textAlign: "center",
                  maxWidth: 260,
                  margin: "0 auto",
                  lineHeight: 1.6,
                }}
              >
                {QUOTES[(new Date().getDate() - 1) % QUOTES.length]}
              </p>
            </div>
          </div>

          {/* CTA BUTTON */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "20px 20px 24px",
              backgroundColor: "#F8FAFC",
            }}
          >
            <button
              type="button"
              onClick={() => navigate({ to: "/hoy" })}
              className="flex w-full items-center justify-center"
              style={{
                height: 52,
                borderRadius: 14,
                backgroundColor: "#111827",
                color: "#FFFFFF",
                gap: 8,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Home size={18} color="#FFFFFF" />
              <span style={{ fontSize: 15, fontWeight: 600 }}>Volver al inicio</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
