import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Building2,
  Camera,
  ChevronLeft,
  Eye,
  EyeOff,
  Instagram,
  Linkedin,
  Music2,
  Shield,
  Star,
  User,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/coach-acceso")({
  head: () => ({
    meta: [
      { title: "Acceso coaches · TOGO" },
      {
        name: "description",
        content:
          "Ingresá o creá tu cuenta de coach en TOGO: perfil profesional, moneda de cobro y configuración inicial en pocos pasos.",
      },
      { property: "og:title", content: "Acceso coaches · TOGO" },
      {
        property: "og:description",
        content:
          "Ingresá o registrate como coach en TOGO y configurá tu perfil profesional en minutos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoachAccessFlow,
});

const BORDER = "#E2E8F0";
const INK = "#111827";
const MUTED = "#94A3B8";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "0 14px",
  fontSize: 14,
  color: INK,
  background: "#FFFFFF",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "#374151",
  marginBottom: 6,
};

const primaryButton: React.CSSProperties = {
  width: "100%",
  height: 46,
  background: INK,
  color: "#FFFFFF",
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
};

const cardBase: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 20,
  border: `1px solid ${BORDER}`,
  padding: 40,
  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label="Mostrar contraseña"
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#CBD5E1",
            display: "flex",
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "20px 0",
      }}
    >
      <div style={{ flex: 1, height: 1, background: BORDER }} />
      <span style={{ fontSize: 12, color: MUTED }}>o</span>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

function SocialButtons() {
  const base: React.CSSProperties = {
    width: "100%",
    height: 44,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "#FFFFFF",
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    cursor: "pointer",
    marginBottom: 10,
  };
  return (
    <>
      <button type="button" style={base}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.1 17.6 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.8c4.3-4 6.8-9.9 6.8-17.3z"
          />
          <path
            fill="#FBBC05"
            d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6.1z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.2 0 11.5-2 15.3-5.5l-7.4-5.8c-2 1.4-4.7 2.3-7.9 2.3-6.4 0-11.7-3.6-13.6-8.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
          />
        </svg>
        Continuar con Google
      </button>
      <button type="button" style={base}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={INK} aria-hidden="true">
          <path d="M16.4 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7 2-1.1 2.7-2.1c.8-1.2 1.2-2.4 1.2-2.5-.1 0-2.3-.9-2.3-3.6zM14.2 5.9c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.7-.9 2.8 1 0 2-.5 2.6-1.3z" />
        </svg>
        Continuar con Apple
      </button>
    </>
  );
}


function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
      <button
        type="button"
        aria-label={label}
        onClick={() => onChange(!on)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          border: "none",
          background: on ? INK : BORDER,
          position: "relative",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#FFFFFF",
            transition: "left .15s ease",
          }}
        />
      </button>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "auto",
};

/* --- Web split-screen onboarding primitives --- */

const inputLg: React.CSSProperties = {
  width: "100%",
  height: 48,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: "0 16px",
  fontSize: 14,
  color: INK,
  background: "#FFFFFF",
  outline: "none",
};

const selectLg: React.CSSProperties = { ...inputLg, appearance: "auto" };

const labelLg: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#374151",
  marginBottom: 8,
};

const primaryLg: React.CSSProperties = {
  width: "100%",
  height: 50,
  borderRadius: 12,
  background: INK,
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  marginTop: 32,
};

function FieldLg({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelLg}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputLg}
      />
    </div>
  );
}

function PasswordFieldLg({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelLg}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputLg, paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label="Mostrar contraseña"
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#CBD5E1",
            display: "flex",
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {

  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        padding: 0,
        fontSize: 13,
        color: hover ? INK : MUTED,
        cursor: "pointer",
        marginBottom: 32,
      }}
    >
      <ChevronLeft size={16} /> Atrás
    </button>
  );
}

function OnboardingLayout({
  step,
  title,
  subtitle,
  onBack,
  children,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      <aside
        style={{
          width: "40%",
          minWidth: 380,
          background: INK,
          height: "100vh",
          position: "sticky",
          top: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 48,
          boxSizing: "border-box",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-0.5px",
              marginBottom: 48,
            }}
          >
            TOGO
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.2,
              maxWidth: 280,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#94A3B8",
              marginTop: 12,
              maxWidth: 280,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>
            Paso {step} de 3
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background:
                    i === step ? "#FFFFFF" : i < step ? "#374151" : "#1F2937",
                }}
              />
            ))}
          </div>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "48px 64px",
          background: "#F8FAFC",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <div style={{ width: "100%" }}>
          <BackButton onClick={onBack} />
          {children}
        </div>
      </main>
    </div>
  );
}

function passwordScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}


function CoachAccessFlow() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(1);
  const [authTab, setAuthTab] = useState<"Ingresar" | "Registrarse">("Ingresar");


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<string | null>(null);

  const [profileName, setProfileName] = useState("");
  const [specialty, setSpecialty] = useState("Fuerza e hipertrofia");
  const [experience, setExperience] = useState("1–3");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [timezone, setTimezone] = useState("América/Buenos Aires (UTC-3)");
  const [source, setSource] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [newsNotif, setNewsNotif] = useState(true);

  const displayName = (profileName || name || "coach").split(" ")[0];
  const score = passwordScore(regPassword);
  const scoreColors = ["#EF4444", "#F97316", "#EAB308", "#22C55E"];

  const wide = screen === 1 || screen >= 3;

  const page: React.CSSProperties = wide
    ? {
        minHeight: "100vh",
        background: screen === 6 ? "#FFFFFF" : "#F8FAFC",
        fontFamily: "Inter, sans-serif",
      }
    : {
        minHeight: "100vh",
        background: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Inter, sans-serif",
      };


  return (
    <div style={page}>
      {screen === 1 && (
        <div style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
          <aside
            style={{
              width: "40%",
              minWidth: 380,
              maxWidth: 480,
              background: INK,
              minHeight: "100vh",
              position: "sticky",
              top: 0,
              alignSelf: "flex-start",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 48,
              boxSizing: "border-box",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#FFFFFF",
                  letterSpacing: "-0.5px",
                  marginBottom: 56,
                }}
              >
                TOGO
              </div>
              <h1
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  lineHeight: 1.15,
                  maxWidth: 300,
                }}
              >
                La plataforma para coaches que quieren crecer.
              </h1>
              <p
                style={{
                  fontSize: 15,
                  color: "#94A3B8",
                  marginTop: 16,
                  maxWidth: 280,
                  lineHeight: 1.6,
                }}
              >
                Gestioná atletas, publicá programas y hacé crecer tu negocio.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { Icon: Users, text: "Miles de atletas en LATAM" },
                { Icon: Star, text: "4.9 estrellas de promedio" },
                { Icon: Shield, text: "Pagos seguros y sin comisiones ocultas" },
              ].map(({ Icon, text }) => (
                <div
                  key={text}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} color="#FFFFFF" />
                  </span>
                  <span style={{ fontSize: 13, color: "#94A3B8" }}>{text}</span>
                </div>
              ))}
            </div>
          </aside>

          <main
            style={{
              flex: 1,
              overflowY: "auto",
              background: "#F8FAFC",
              padding: "48px 64px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: "100vh",
              boxSizing: "border-box",
            }}
          >
            <div style={{ maxWidth: 400, width: "100%" }}>
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: INK,
                  marginBottom: 4,
                }}
              >
                Bienvenido a TOGO
              </h2>
              <p style={{ fontSize: 14, color: MUTED, marginBottom: 28 }}>
                Ingresá a tu cuenta o creá una nueva.
              </p>

              <div
                style={{
                  display: "flex",
                  background: "#F1F5F9",
                  borderRadius: 12,
                  padding: 4,
                  gap: 4,
                  marginBottom: 28,
                }}
              >
                {(["Ingresar", "Registrarse"] as const).map((t) => {
                  const active = authTab === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAuthTab(t)}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 9,
                        border: "none",
                        fontSize: 14,
                        fontWeight: active ? 600 : 500,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: active ? INK : MUTED,
                        background: active ? "#FFFFFF" : "transparent",
                        boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                        transition: "background .15s ease, color .15s ease",
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              <div key={authTab} style={{ animation: "togoFade .18s ease-out" }}>
                <style>{`@keyframes togoFade { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: none; } }`}</style>

                {authTab === "Ingresar" ? (
                  <>
                    <FieldLg label="Email" value={email} onChange={setEmail} type="email" />
                    <PasswordFieldLg
                      label="Contraseña"
                      value={password}
                      onChange={setPassword}
                    />
                    <div
                      style={{
                        fontSize: 12,
                        color: MUTED,
                        textAlign: "right",
                        marginTop: 6,
                        cursor: "pointer",
                      }}
                    >
                      ¿Olvidaste tu contraseña?
                    </div>

                    <button
                      type="button"
                      style={{ ...primaryLg, marginTop: 24 }}
                      onClick={() => navigate({ to: "/" })}
                    >
                      Ingresar
                    </button>
                  </>
                ) : (
                  <>
                    <FieldLg label="Nombre completo" value={name} onChange={setName} />
                    <FieldLg label="Email" value={email} onChange={setEmail} type="email" />
                    <PasswordFieldLg
                      label="Contraseña"
                      value={regPassword}
                      onChange={setRegPassword}
                      hint={
                        <>
                          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                            {[0, 1, 2, 3].map((i) => (
                              <span
                                key={i}
                                style={{
                                  flex: 1,
                                  height: 3,
                                  borderRadius: 2,
                                  background: i < score ? scoreColors[score - 1] : BORDER,
                                }}
                              />
                            ))}
                          </div>
                          <p style={{ fontSize: 11, color: "#CBD5E1", marginTop: 6 }}>
                            Mínimo 8 caracteres
                          </p>
                        </>
                      }
                    />
                    <PasswordFieldLg
                      label="Confirmar contraseña"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                    />

                    <button
                      type="button"
                      style={{ ...primaryLg, marginTop: 24 }}
                      onClick={() => {
                        setProfileName(name);
                        setScreen(3);
                      }}
                    >
                      Crear cuenta
                    </button>
                  </>
                )}

                <Divider />
                <SocialButtons />
              </div>
            </div>
          </main>
        </div>

      )}


      {screen === 2 && (
        <div style={{ ...cardBase, width: 420 }}>
          <button
            type="button"
            onClick={() => setScreen(1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              padding: 0,
              color: MUTED,
              fontSize: 12,
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            <ChevronLeft size={18} /> Iniciar sesión
          </button>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 4 }}>
            Creá tu cuenta
          </h2>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>
            Empezá gratis. Sin tarjeta requerida.
          </p>

          <Field label="Nombre completo" value={name} onChange={setName} />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <PasswordField
            label="Contraseña"
            value={regPassword}
            onChange={setRegPassword}
          />
          <div style={{ display: "flex", gap: 4, marginTop: -8, marginBottom: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i < score ? scoreColors[score - 1] : BORDER,
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 10, color: "#CBD5E1", marginBottom: 12 }}>
            Mínimo 8 caracteres
          </p>
          <PasswordField
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

          <button
            type="button"
            style={{ ...primaryButton, marginTop: 8 }}
            onClick={() => {
              setProfileName(name);
              setScreen(3);
            }}
          >
            Crear cuenta
          </button>

          <Divider />
          <SocialButtons />

          <p style={{ fontSize: 13, textAlign: "center", color: MUTED, marginTop: 14 }}>
            ¿Ya tenés cuenta?{" "}
            <span
              onClick={() => setScreen(1)}
              style={{ color: INK, fontWeight: 600, cursor: "pointer" }}
            >
              Iniciá sesión
            </span>
          </p>
        </div>
      )}

      {screen === 3 && (
        <OnboardingLayout
          step={1}
          title="¿Cómo vas a usar TOGO?"
          subtitle="Elegí el perfil que mejor te describe."
          onBack={() => setScreen(1)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              {
                id: "coach",
                Icon: User,
                title: "Coach independiente",
                desc: "Trabajo con mis propios atletas.",
              },
              {
                id: "marca",
                Icon: Building2,
                title: "Marca o emprendimiento",
                desc: "Tengo una marca de entrenamiento.",
              },
              {
                id: "club",
                Icon: Users,
                title: "Club o institución",
                desc: "Gestiono un equipo de coaches y atletas.",
              },
            ].map(({ id, Icon, title, desc }) => {
              const selected = accountType === id;
              return (
                <div
                  key={id}
                  onClick={() => setAccountType(id)}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 14,
                    border: selected
                      ? `2px solid ${INK}`
                      : `1px solid ${BORDER}`,
                    boxShadow: selected
                      ? "0 0 0 3px rgba(17,24,39,0.08)"
                      : "none",
                    padding: selected ? "19px 23px" : "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: selected ? INK : "#F1F5F9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} color={selected ? "#FFFFFF" : MUTED} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 13, color: MUTED }}>{desc}</div>
                  </div>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: `2px solid ${selected ? INK : BORDER}`,
                      background: selected ? INK : "transparent",
                      flexShrink: 0,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!accountType}
            onClick={() => setScreen(4)}
            style={{
              ...primaryLg,
              opacity: accountType ? 1 : 0.4,
              cursor: accountType ? "pointer" : "not-allowed",
            }}
          >
            Siguiente →
          </button>
        </OnboardingLayout>
      )}

      {screen === 4 && (
        <OnboardingLayout
          step={2}
          title="Tu perfil público."
          subtitle="Así te van a conocer tus futuros atletas."
          onBack={() => setScreen(3)}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 20,
            }}
          >
            <div
              onClick={() => fileRef.current?.click()}
              style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#F1F5F9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Foto de perfil del coach"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <User size={26} color="#CBD5E1" />
                )}
              </div>
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: INK,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={13} color="#FFFFFF" />
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setAvatar(URL.createObjectURL(f));
                }}
              />
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <label style={{ ...labelLg, marginBottom: 0 }}>
                Nombre del perfil
              </label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                style={inputLg}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={labelLg}>Especialidad principal</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                style={selectLg}
              >
                {[
                  "Fuerza e hipertrofia",
                  "Cardio y resistencia",
                  "Movilidad y flexibilidad",
                  "CrossFit",
                  "Rehabilitación",
                  "Nutrición deportiva",
                  "Otro",
                ].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelLg}>Años de experiencia</label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                style={selectLg}
              >
                {["Menos de 1", "1–3", "3–5", "5–10", "+10"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelLg}>Bio breve</label>
              <textarea
                value={bio}
                maxLength={200}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Contá en pocas palabras qué hacés y a quién ayudás."
                style={{
                  ...inputLg,
                  height: 110,
                  borderRadius: 12,
                  padding: "14px 16px",
                  resize: "none",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ fontSize: 11, color: "#CBD5E1", textAlign: "right" }}>
                {bio.length}/200
              </div>
            </div>

            <div>
              <label style={labelLg}>Redes sociales (opcional)</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}
              >
                {[
                  {
                    Icon: Instagram,
                    value: instagram,
                    set: setInstagram,
                    ph: "@tuusuario",
                  },
                  { Icon: Music2, value: tiktok, set: setTiktok, ph: "@tuusuario" },
                  {
                    Icon: Linkedin,
                    value: linkedin,
                    set: setLinkedin,
                    ph: "linkedin.com/in/tuperfil",
                  },
                ].map(({ Icon, value, set, ph }, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <Icon
                      size={16}
                      color="#CBD5E1"
                      style={{
                        position: "absolute",
                        left: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    />
                    <input
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={ph}
                      style={{ ...inputLg, paddingLeft: 38 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button type="button" style={primaryLg} onClick={() => setScreen(5)}>
            Siguiente →
          </button>
          <div
            onClick={() => setScreen(5)}
            style={{
              fontSize: 13,
              color: MUTED,
              textAlign: "center",
              marginTop: 12,
              cursor: "pointer",
            }}
          >
            Omitir por ahora
          </div>
        </OnboardingLayout>
      )}

      {screen === 5 && (
        <OnboardingLayout
          step={3}
          title="Casi listo."
          subtitle="Configurá los últimos detalles de tu cuenta."
          onBack={() => setScreen(4)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={labelLg}>Moneda de cobro</label>
              <div style={{ display: "flex", gap: 12 }}>
                {(
                  [
                    ["ARS", "ARS $"],
                    ["USD", "USD $"],
                  ] as const
                ).map(([c, label]) => {
                  const selected = currency === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      style={{
                        flex: 1,
                        height: 52,
                        borderRadius: 12,
                        border: selected
                          ? `2px solid ${INK}`
                          : `1px solid ${BORDER}`,
                        background: "#FFFFFF",
                        color: selected ? INK : "#64748B",
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={labelLg}>Zona horaria</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={selectLg}
              >
                {[
                  "América/Buenos Aires (UTC-3)",
                  "América/Santiago (UTC-4)",
                  "América/Montevideo (UTC-3)",
                  "América/Ciudad de México (UTC-6)",
                  "Europa/Madrid (UTC+1)",
                ].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelLg}>¿Cómo llegaste a TOGO?</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={selectLg}
              >
                <option value="">Seleccionar (opcional)</option>
                {[
                  "Por un amigo",
                  "Redes sociales",
                  "Google",
                  "Evento o conferencia",
                  "Otro",
                ].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ padding: "16px 0", borderBottom: "1px solid #F8FAFC" }}>
                <Toggle
                  on={emailNotif}
                  onChange={setEmailNotif}
                  label="Recibir notificaciones por email"
                />
              </div>
              <div style={{ padding: "16px 0", borderBottom: "1px solid #F8FAFC" }}>
                <Toggle
                  on={newsNotif}
                  onChange={setNewsNotif}
                  label="Novedades y tips de TOGO"
                />
              </div>
            </div>
          </div>

          <button type="button" style={primaryLg} onClick={() => setScreen(6)}>
            Crear mi cuenta →
          </button>
        </OnboardingLayout>
      )}

      {screen === 6 && (
        <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
          <div
            style={{
              padding: "32px 48px",
              fontSize: 20,
              fontWeight: 800,
              color: INK,
              letterSpacing: "-0.5px",
            }}
          >
            TOGO
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 80,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 20 }}>🎉</div>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: INK,
                textAlign: "center",
              }}
            >
              ¡Bienvenido, {displayName}!
            </h1>
            <p
              style={{
                fontSize: 16,
                color: "#64748B",
                textAlign: "center",
                maxWidth: 480,
                lineHeight: 1.6,
                marginTop: 12,
                marginBottom: 40,
              }}
            >
              Tu cuenta está lista. Empezá a crear sesiones, gestionar atletas y
              hacer crecer tu negocio.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              style={{
                background: INK,
                color: "#FFFFFF",
                borderRadius: 14,
                height: 52,
                padding: "0 48px",
                fontSize: 15,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Ir al dashboard
            </button>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 24,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {[
                { label: "Crear primera sesión", to: "/sesiones/$sessionId" },
                { label: "Explorar biblioteca", to: "/biblioteca" },
                { label: "Publicar programa", to: "/marketplace-coach" },
              ].map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() =>
                    c.to === "/sesiones/$sessionId"
                      ? navigate({
                          to: "/sesiones/$sessionId",
                          params: { sessionId: "1" },
                        })
                      : navigate({ to: c.to })
                  }
                  style={{
                    border: `1px solid ${BORDER}`,
                    borderRadius: 20,
                    padding: "10px 20px",
                    fontSize: 13,
                    color: "#374151",
                    background: "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
