import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrandLogo } from "@/components/togo/BrandLogo";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlignCenter,
  Check,
  CheckCircle,
  ChevronUp,
  Circle,
  Dumbbell,
  Eye,
  EyeOff,
  Hexagon,
  Home,
  Minus,
  Settings2,
  Sprout,
  Square,
  Trophy,
  Waves,
} from "lucide-react";

export const Route = createFileRoute("/ingresar")({
  head: () => ({
    meta: [
      { title: "Ingresar · TOGO" },
      {
        name: "description",
        content:
          "Ingresá a TOGO y completá tu onboarding: perfil, equipamiento y código de coach para empezar a entrenar.",
      },
      { property: "og:title", content: "Ingresar · TOGO" },
      {
        property: "og:description",
        content:
          "Login y onboarding del atleta: creá tu perfil y conectate con tu coach en TOGO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginOnboarding,
});

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  height: 48,
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: "0 16px",
  fontSize: 14,
  color: "#111827",
  backgroundColor: "#FFFFFF",
  outline: "none",
};

const PRIMARY_BUTTON: React.CSSProperties = {
  width: "100%",
  height: 52,
  borderRadius: 14,
  backgroundColor: "#111827",
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: 600,
};

function AppleLogo() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.12 3-.77.9-2.03 1.6-3.06 1.52a3.3 3.3 0 0 1 1.14-2.93c.74-.8 2.03-1.4 3.04-1.44zM20.5 17.1c-.55 1.27-.82 1.84-1.53 2.97-.99 1.57-2.39 3.53-4.12 3.54-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.79-4.04-3.36C.05 16.03-.24 10.9 1.46 8.2c1.2-1.93 3.1-3.06 4.89-3.06 1.82 0 2.96 1 4.47 1 1.46 0 2.35-1 4.46-1 1.59 0 3.28.87 4.48 2.37-3.94 2.16-3.3 7.8.74 9.59z" />
    </svg>
  );
}

function GoogleG() {
  return (
    <svg width={18} height={18} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.7c-.3 2.1-1.6 5.3-4.7 7.4l7.6 5.9c4.5-4.2 6.9-10.3 6.9-17.6z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7A14.6 14.6 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.2 0 11.5-2 15.6-5.9l-7.6-5.9c-2.1 1.4-4.8 2.4-8 2.4-6.3 0-11.7-3.8-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

function Logo() {
  return <BrandLogo className="h-16 w-16" />;
}

function ProgressDots({ active }: { active: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center justify-center" style={{ gap: 6 }}>
      {[0, 1, 2].map((i) => {
        const on = i === active;
        return (
          <span
            key={i}
            style={{
              width: on ? 8 : 6,
              height: on ? 8 : 6,
              borderRadius: 999,
              backgroundColor: on ? "#111827" : "transparent",
              border: on ? "none" : "1px solid #E2E8F0",
              display: "inline-block",
            }}
          />
        );
      })}
    </div>
  );
}

const LEVELS = [
  { id: "principiante", Icon: Sprout, label: "Principiante", sub: "Menos de 2 años" },
  { id: "intermedio", Icon: Dumbbell, label: "Intermedio", sub: "De 2 a 5 años" },
  { id: "avanzado", Icon: Trophy, label: "Avanzado", sub: "Más de 5 años" },
];

const EQUIPMENT = [
  { id: "mancuernas", Icon: Dumbbell, label: "Mancuernas" },
  { id: "barra", Icon: Minus, label: "Barra + discos" },
  { id: "kettlebell", Icon: Hexagon, label: "Kettlebell" },
  { id: "maquinas", Icon: Settings2, label: "Máquinas" },
  { id: "anillas", Icon: Circle, label: "Anillas / TRX" },
  { id: "banco", Icon: AlignCenter, label: "Banco" },
  { id: "rack", Icon: Square, label: "Rack / Jaula" },
  { id: "cardio", Icon: Activity, label: "Cardio" },
  { id: "cajon", Icon: ChevronUp, label: "Cajón pliométrico" },
  { id: "bandas", Icon: Waves, label: "Bandas elásticas" },
  { id: "casa", Icon: Home, label: "Sin equipo / Casa" },
];

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "#374151",
  marginBottom: 6,
};

function LoginOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [level, setLevel] = useState<string | null>(null);

  const [equipment, setEquipment] = useState<string[]>([]);

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);
  const codeComplete = code.every((c) => c !== "");

  const [checkIn, setCheckIn] = useState(false);
  useEffect(() => {
    if (step === 5) {
      setCheckIn(false);
      const t = setTimeout(() => setCheckIn(true), 40);
      return () => clearTimeout(t);
    }
    return undefined;

  }, [step]);

  const toggleEquipment = (id: string) => {
    setEquipment((prev) => {
      if (id === "casa") return prev.includes("casa") ? [] : ["casa"];
      const without = prev.filter((e) => e !== "casa");
      return without.includes(id)
        ? without.filter((e) => e !== id)
        : [...without, id];
    });
  };

  const onCodeChange = (index: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    if (char && index < 5) boxRefs.current[index + 1]?.focus();
  };

  const onCodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      boxRefs.current[index - 1]?.focus();
      setCode((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
    }
  };

  const profileValid = name.trim() !== "" && level !== null;
  const bg = step === 1 ? "#F8FAFC" : "#FFFFFF";

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
          backgroundColor: bg,
          borderRadius: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        {step === 1 && (
          <div
            className="flex flex-1 flex-col justify-center overflow-y-auto"
            style={{ padding: "48px 28px 32px" }}
          >
            <div className="flex justify-center" style={{ marginBottom: 48 }}>
              <Logo />
            </div>

            <div className="flex flex-col" style={{ gap: 12 }}>
              <input type="email" placeholder="tu@email.com" style={INPUT_STYLE} />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  style={{ ...INPUT_STYLE, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Mostrar contraseña"
                  className="absolute"
                  style={{ right: 14, top: 16 }}
                >
                  {showPassword ? (
                    <EyeOff size={16} color="#CBD5E1" />
                  ) : (
                    <Eye size={16} color="#CBD5E1" />
                  )}
                </button>
              </div>
              <button
                type="button"
                style={{ fontSize: 12, color: "#94A3B8", textAlign: "right" }}
              >
                Olvidé mi contraseña
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              style={{ ...PRIMARY_BUTTON, marginTop: 4 }}
            >
              Ingresar
            </button>

            <p
              style={{
                fontSize: 12,
                color: "#CBD5E1",
                textAlign: "center",
                margin: "20px 0",
              }}
            >
              — o —
            </p>

            <div className="flex flex-col" style={{ gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center justify-center"
                style={{
                  width: "100%",
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: "#111827",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 500,
                  gap: 10,
                }}
              >
                <AppleLogo />
                Continuar con Apple
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center justify-center"
                style={{
                  width: "100%",
                  height: 52,
                  borderRadius: 14,
                  border: "1.5px solid #E2E8F0",
                  backgroundColor: "#FFFFFF",
                  color: "#374151",
                  fontSize: 14,
                  fontWeight: 500,
                  gap: 10,
                }}
              >
                <GoogleG />
                Continuar con Google
              </button>
            </div>

            <p
              style={{
                fontSize: 13,
                color: "#94A3B8",
                textAlign: "center",
                marginTop: 24,
              }}
            >
              ¿No tenés cuenta?{" "}
              <span style={{ color: "#111827", fontWeight: 600 }}>Registrate</span>
            </p>
          </div>
        )}

        {step === 2 && (
          <div
            className="flex flex-1 flex-col overflow-y-auto"
            style={{ padding: "32px 28px" }}
          >
            <ProgressDots active={0} />

            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
                marginTop: 20,
              }}
            >
              Contanos un poco de vos
            </h1>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>
              Tu coach va a usar esto para personalizar tus entrenamientos.
            </p>

            <div className="flex flex-col" style={{ gap: 20, marginTop: 24 }}>
              <div>
                <label style={LABEL_STYLE}>Nombre completo</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre y apellido"
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>Unidad de peso</label>
                <div className="flex" style={{ gap: 8 }}>
                  {(["kg", "lb"] as const).map((u) => {
                    const on = unit === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnit(u)}
                        style={{
                          flex: 1,
                          height: 44,
                          borderRadius: 10,
                          border: `1px solid ${on ? "#111827" : "#E2E8F0"}`,
                          backgroundColor: on ? "#111827" : "#FFFFFF",
                          color: on ? "#FFFFFF" : "#374151",
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        {u}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={LABEL_STYLE}>Nivel de experiencia entrenando</label>
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {LEVELS.map(({ id, Icon, label, sub }) => {
                    const on = level === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLevel(id)}
                        className="flex items-center"
                        style={{
                          width: "100%",
                          height: 60,
                          border: on ? "1.5px solid #111827" : "1px solid #E2E8F0",
                          borderRadius: 12,
                          backgroundColor: on ? "#F8FAFC" : "#FFFFFF",
                          padding: "0 16px",
                          gap: 12,
                        }}
                      >
                        <Icon size={20} color={on ? "#111827" : "#94A3B8"} />
                        <span
                          style={{
                            flex: 1,
                            fontSize: 14,
                            fontWeight: on ? 600 : 500,
                            color: on ? "#111827" : "#374151",
                            textAlign: "left",
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#CBD5E1",
                            textAlign: "right",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!profileValid}
              onClick={() => setStep(3)}
              style={{
                ...PRIMARY_BUTTON,
                marginTop: 28,
                marginBottom: 8,
                backgroundColor: profileValid ? "#111827" : "#E2E8F0",
                color: profileValid ? "#FFFFFF" : "#94A3B8",
              }}
            >
              Continuar →
            </button>
          </div>
        )}

        {step === 3 && (
          <div
            className="flex flex-1 flex-col overflow-y-auto"
            style={{ padding: "32px 28px" }}
          >
            <ProgressDots active={1} />

            <div
              className="flex items-center"
              style={{ gap: 12, marginTop: 20 }}
            >
              <h1
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                ¿Con qué entrenás?
              </h1>
              <button
                type="button"
                onClick={() => setStep(4)}
                style={{ fontSize: 13, color: "#94A3B8" }}
              >
                Saltar
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>
              Tu coach va a adaptar los ejercicios a lo que tenés disponible.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginTop: 24,
              }}
            >
              {EQUIPMENT.map(({ id, Icon, label }) => {
                const on = equipment.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleEquipment(id)}
                    className="flex flex-col items-center justify-center"
                    style={{
                      height: 100,
                      borderRadius: 14,
                      border: `1.5px solid ${on ? "#111827" : "#E2E8F0"}`,
                      backgroundColor: on ? "#F8FAFC" : "#FFFFFF",
                      padding: "14px 8px",
                      gap: 8,
                    }}
                  >
                    <Icon size={28} color={on ? "#111827" : "#94A3B8"} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: on ? 600 : 500,
                        color: on ? "#111827" : "#374151",
                        textAlign: "center",
                        lineHeight: 1.3,
                      }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto" style={{ paddingTop: 28 }}>
              <button
                type="button"
                onClick={() => setStep(4)}
                style={PRIMARY_BUTTON}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div
            className="flex flex-1 flex-col overflow-y-auto"
            style={{ padding: "32px 28px" }}
          >
            <ProgressDots active={2} />

            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
                marginTop: 20,
              }}
            >
              Conectate con tu coach
            </h1>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>
              Tu coach te compartió un código de 6 dígitos.
            </p>

            <div
              className="flex items-center justify-center"
              style={{ gap: 8, marginTop: 36 }}
            >
              {code.map((char, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    boxRefs.current[i] = el;
                  }}
                  value={char}
                  onChange={(e) => onCodeChange(i, e.target.value)}
                  onKeyDown={(e) => onCodeKeyDown(i, e)}
                  inputMode="numeric"
                  aria-label={`Dígito ${i + 1} del código`}
                  style={{
                    width: 44,
                    height: 56,
                    border: `1.5px solid ${char ? "#111827" : "#E2E8F0"}`,
                    borderRadius: 10,
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#111827",
                    textAlign: "center",
                    backgroundColor: "#FFFFFF",
                    outline: "none",
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={!codeComplete}
              onClick={() => setStep(5)}
              style={{
                ...PRIMARY_BUTTON,
                marginTop: 28,
                backgroundColor: codeComplete ? "#111827" : "#E2E8F0",
                color: codeComplete ? "#FFFFFF" : "#94A3B8",
              }}
            >
              Ir a mi panel →
            </button>

            <div
              style={{
                height: 1,
                width: "100%",
                backgroundColor: "#E2E8F0",
                margin: "24px 0",
              }}
            />

            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
                textAlign: "center",
              }}
            >
              ¿Todavía no tenés coach?
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/hoy" })}
              className="flex items-center justify-center"
              style={{
                width: "100%",
                height: 48,
                borderRadius: 14,
                border: "1.5px solid #E2E8F0",
                backgroundColor: "#FFFFFF",
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
                marginTop: 8,
              }}
            >
              Buscar un coach en el marketplace
            </button>
          </div>
        )}

        {step === 5 && (
          <div
            className="flex flex-1 flex-col items-center overflow-y-auto"
            style={{ padding: "48px 28px 32px" }}
          >
            <Logo />

            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#111827",
                textAlign: "center",
                marginTop: 28,
              }}
            >
              ¡Todo listo{name.trim() ? `, ${name.trim()}` : ""}!
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "#64748B",
                textAlign: "center",
                lineHeight: 1.6,
                marginTop: 8,
                maxWidth: 280,
                marginInline: "auto",
              }}
            >
              Tu coach ya está esperándote. Lográ tus metas. Disfrutá el proceso.
            </p>

            <div
              className="flex items-center justify-center"
              style={{
                width: 260,
                height: 160,
                backgroundColor: "#F1F5F9",
                borderRadius: 16,
                marginTop: 32,
              }}
            >
              <div
                style={{
                  transform: checkIn ? "scale(1)" : "scale(0)",
                  transition:
                    "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <CheckCircle size={52} color="#111827" strokeWidth={1.75} />
              </div>
            </div>

            <div
              className="flex w-full flex-col"
              style={{ gap: 10, marginTop: 32 }}
            >
              {[
                "Sesiones personalizadas por tu coach",
                "Seguimiento de tu progreso en tiempo real",
                "Comunicación directa con tu coach",
              ].map((t) => (
                <div key={t} className="flex items-center" style={{ gap: 8 }}>
                  <Check size={14} color="#16A34A" />
                  <span style={{ fontSize: 13, color: "#374151" }}>{t}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto w-full" style={{ paddingTop: 28 }}>
              <button
                type="button"
                onClick={() => navigate({ to: "/hoy" })}
                style={PRIMARY_BUTTON}
              >
                Empezar →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
