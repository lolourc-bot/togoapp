import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, Building2, CalendarClock, Receipt, Users } from "lucide-react";
import { PRICING_TIERS, monthlyPriceArs, monthlyPriceUsd, resolveTier, type PricingTier } from "@/lib/billing-pricing";
import { BrandLogo } from "./BrandLogo";
import { INSTITUTION_PRICING_TIERS } from "@/lib/institution-billing-pricing";
import { FeatureLab } from "./landing/FeatureLab";
import { HeroPhone } from "./landing/HeroPhone";
import { HoyPhone } from "./landing/HoyPhone";
import { LabMockup } from "./landing/LabMockup";
import { LoadMockup } from "./landing/LoadMockup";
import { ToguitoChat, type ToguitoQA } from "./landing/Interactive";
import { ToguitoBubble } from "./landing/ToguitoBubble";
import { BeforeAfter } from "./landing/BeforeAfter";
import { TryEditor } from "./landing/TryEditor";

/**
 * Public landing for logged-out visitors at "/". Light, matching the app. All colors go through
 * Tailwind classes, never inline style colors: theme-brand.css remaps inline legacy colors (e.g. #111827)
 * app-wide. Prices come straight from the billing tables so the page can't drift from what's charged.
 */

const ars = (n: number) => `$${n.toLocaleString("es-AR")}`;
const usd = (n: number) => `USD ${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

const DISCIPLINES = [
  "Running", "CrossFit", "Funcional", "Fútbol", "Natación", "Ciclismo", "Triatlón", "Rugby",
  "Hockey", "Básquet", "Tenis", "Powerlifting", "Fuerza", "Vóley", "Boxeo", "Pádel",
];

const INSTITUTION_FEATURES = [
  { Icon: CalendarClock, title: "Clases y horarios", desc: "Grilla semanal de clases con cupos y reservas de socios." },
  { Icon: Users, title: "Socios y entrenadores", desc: "Todo tu staff y tus socios en un solo lugar, con sus planes y su historial." },
  { Icon: Receipt, title: "Cuotas y caja", desc: "Cuotas cobradas online y una caja para registrar cada movimiento del día." },
];

const firstPaid = PRICING_TIERS.find((t) => (t.flatPriceArs ?? 0) > 0)!;
const TOGUITO_QA: ToguitoQA[] = [
  {
    q: "¿Cuánto cuesta?",
    a: `Es gratis hasta 3 atletas. Después pagás según cuántos entrenás: desde ${ars(firstPaid.flatPriceArs!)} por mes para ${firstPaid.minAthletes} a ${firstPaid.maxAthletes} atletas. Podés pagar en pesos o en dólares.`,
  },
  {
    q: "¿Cómo funciona?",
    a: "Armás tus programas en el Lab arrastrando sesiones, se los asignás a tus atletas y ellos ven cada día qué les toca. Vos seguís cómo vienen y les cobrás la cuota desde el mismo lugar.",
  },
  {
    q: "¿Hay app para el celular?",
    a: "Sí. Tus atletas entrenan con TOGO desde el celular: ven su sesión, la registran y te dejan comentarios. Vos también podés seguirlos desde el teléfono.",
  },
  {
    q: "¿Puedo probarlo gratis?",
    a: "Mejor que una prueba: con hasta 3 atletas es gratis para siempre y no te pedimos tarjeta. Cuando sumes más, elegís tu plan.",
  },
  {
    q: "¿Sirve para un club o gimnasio?",
    a: "Sí. Las instituciones tienen su propio panel con clases, cupos, socios, entrenadores, cuotas y caja. Tus entrenadores planifican con las mismas herramientas del Lab.",
  },
];

function coachTierLabel(t: PricingTier) {
  if (t.key === "free") return "Hasta 3 atletas";
  if (t.maxAthletes === null) return `Más de ${t.minAthletes - 1}`;
  return `${t.minAthletes} a ${t.maxAthletes} atletas`;
}
function coachTierPrice(t: PricingTier) {
  if (t.flatPriceArs === 0) return "Gratis";
  if (t.flatPriceArs !== null) return ars(t.flatPriceArs);
  return `${ars(t.perAthleteArs!)} c/u`;
}
function range(min: number, max: number | null, noun: string) {
  if (max === null) return `Más de ${min - 1} ${noun}`;
  return min === 0 ? `Hasta ${max} ${noun}` : `${min} a ${max} ${noun}`;
}

/** Fades a section up the first time it scrolls into view. */
function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-[680px] text-center">
      <span className="text-[13px] font-semibold uppercase tracking-wider text-[#0272B7]">{kicker}</span>
      <h2 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight text-[#011726] md:text-[42px]">{title}</h2>
      {sub ? <p className="mt-3 text-[16px] text-[#6B7280] md:text-[17px]">{sub}</p> : null}
    </div>
  );
}

/** Headline animated letter by letter; words stay unbroken so lines wrap naturally. */
function AnimatedHeadline({ lines }: { lines: { text: string; className?: string }[] }) {
  return (
    <motion.h1
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.03 } } }}
      className="text-[40px] font-extrabold leading-[1.05] tracking-tight text-[#011726] sm:text-[56px] lg:text-[62px]"
      aria-label={lines.map((l) => l.text).join(" ")}
    >
      {lines.map((line) => (
        <span key={line.text} className={`block ${line.className ?? ""}`} aria-hidden>
          {line.text.split(" ").map((word, wi) => (
            <span key={wi} className="inline-block whitespace-nowrap">
              {word.split("").map((ch, ci) => (
                <motion.span
                  key={ci}
                  className="inline-block"
                  variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.35 }}
                >
                  {ch}
                </motion.span>
              ))}
              {" "}
            </span>
          ))}
        </span>
      ))}
    </motion.h1>
  );
}

function FeatureBlock({
  kicker, title, desc, bullets, mockup, flip,
}: { kicker: string; title: string; desc: string; bullets: string[]; mockup: ReactNode; flip?: boolean }) {
  return (
    <Reveal className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      <div className={flip ? "md:order-2" : ""}>
        <span className="text-[13px] font-semibold uppercase tracking-wider text-[#0272B7]">{kicker}</span>
        <h3 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight text-[#011726] md:text-[36px]">{title}</h3>
        <p className="mt-4 text-[16px] leading-relaxed text-[#6B7280]">{desc}</p>
        <ul className="mt-6 flex flex-col gap-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-[15px] text-[#011726]">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0272B7]" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={flip ? "md:order-1" : ""}>{mockup}</div>
    </Reveal>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const [pricingTab, setPricingTab] = useState<"coach" | "institution">("coach");
  const [athletes, setAthletes] = useState(15);
  const [compact, setCompact] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setCompact(y > 80));

  // The desktop sign-in screen is desktop-only; phones get the dedicated coach-app sign-in.
  const signUpCoach = () =>
    isMobile()
      ? navigate({ to: "/coach-app/ingresar", search: { modo: "registro" } })
      : navigate({ to: "/ingresar", search: { modo: "registro" } });
  const signUpInstitution = () => navigate({ to: "/ingresar", search: { modo: "registro", rol: "institucion" } });
  const logIn = () => (isMobile() ? navigate({ to: "/coach-app/ingresar" }) : navigate({ to: "/ingresar" }));
  const athlete = () => navigate({ to: "/ingresar-atleta" });
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const tier = resolveTier(athletes);
  const priceArs = monthlyPriceArs(athletes);
  const priceUsd = monthlyPriceUsd(athletes);

  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#0272B7] px-6 font-semibold text-white shadow-[0_8px_24px_rgba(2,114,183,0.25)] transition hover:brightness-110";
  const ghostBtn =
    "inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#E2E8F0] bg-white px-6 font-semibold text-[#011726] shadow-[0_1px_2px_rgba(1,23,38,0.06)] transition hover:bg-[#F8FAFC] hover:shadow-[0_6px_16px_rgba(1,23,38,0.08)]";

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#011726]">
      {/* NAVBAR */}
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-all duration-300 ${
          compact ? "border-b border-[#E2E8F0] bg-white/80 py-2 backdrop-blur-md" : "py-4"
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="h-9 w-9" />
            <span className="text-[20px] font-extrabold tracking-tight">TOGO</span>
          </div>
          <nav className="hidden flex-1 items-center justify-center gap-7 text-[14px] text-[#6B7280] md:flex">
            <button type="button" onClick={() => scrollTo("funciones")} className="hover:text-[#011726]">Funciones</button>
            <button type="button" onClick={() => scrollTo("demo")} className="hover:text-[#011726]">Probalo</button>
            <button type="button" onClick={() => scrollTo("instituciones")} className="hover:text-[#011726]">Clubes y gimnasios</button>
            <button type="button" onClick={() => scrollTo("precios")} className="hover:text-[#011726]">Precios</button>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <button type="button" onClick={athlete} className="hidden px-2 text-[14px] text-[#6B7280] hover:text-[#011726] lg:block">
              Soy atleta
            </button>
            <button type="button" onClick={logIn} className={`${ghostBtn} h-10 px-4 text-[14px]`}>Ingresar</button>
            <button type="button" onClick={signUpCoach} className="hidden h-10 items-center justify-center whitespace-nowrap rounded-[8px] bg-[#0272B7] px-4 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(2,114,183,0.25)] transition hover:brightness-110 sm:inline-flex">
              Empezar gratis
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden pb-24 pt-32 md:pt-40 lg:pb-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(2,114,183,0.14),transparent_65%)]" />
        <div className="pointer-events-none absolute -right-40 top-20 hidden h-[760px] w-[760px] rounded-full bg-[radial-gradient(circle,rgba(2,114,183,0.18),transparent_62%)] lg:block" />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-16 px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        <div className="text-center lg:-mt-24 lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block rounded-full border border-[#E2E8F0] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#0272B7]"
          >
            El sistema operativo para entrenadores y clubes
          </motion.span>
          <div className="mt-6">
            <AnimatedHeadline
              lines={[{ text: "Entrenar a tus atletas" }, { text: "nunca fue tan fácil.", className: "text-[#0272B7]" }]}
            />
          </div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="mx-auto mt-6 max-w-[620px] text-[18px] leading-relaxed text-[#6B7280] md:text-[20px] lg:mx-0"
          >
            Planificá, seguí y cobrá — todo desde un solo lugar. Para coaches, clubes y gimnasios.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
          >
            <button type="button" onClick={signUpCoach} className={`${primaryBtn} h-12 text-[15px]`}>
              Empezar gratis <ArrowRight size={17} />
            </button>
            <button type="button" onClick={() => scrollTo("funciones")} className={`${ghostBtn} h-12 text-[15px]`}>
              Ver cómo funciona
            </button>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-4 text-[13px] text-[#6B7280]"
          >
            Gratis hasta 3 atletas · Sin tarjeta de crédito
          </motion.p>
        </div>
        <HeroPhone />
        </div>
      </section>

      {/* DISCIPLINES TICKER */}
      <section className="border-y border-[#E2E8F0] bg-[#F8FAFC] py-5">
        <div className="flex items-center gap-6">
          <span className="hidden shrink-0 pl-6 text-[12px] font-semibold uppercase tracking-wider text-[#6B7280] md:block">
            Para coaches de
          </span>
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
            <motion.div
              className="flex w-max gap-10"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 40, ease: "linear", repeat: Infinity }}
            >
              {[...DISCIPLINES, ...DISCIPLINES].map((d, i) => (
                <span key={i} className="whitespace-nowrap text-[18px] font-bold text-[#011726]/60">{d}</span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* WHY TOGO: differentiators laid out as a Lab week */}
      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <Reveal>
          <SectionTitle
            kicker="Por qué TOGO"
            title="Lo que nos hace distintos"
            sub="Una semana en el Lab, con todo lo que no vas a encontrar en otro lado."
          />
        </Reveal>
        <div className="mt-12">
          <FeatureLab />
        </div>
      </section>

      {/* FEATURES WITH MOCKUPS */}
      <section id="funciones" className="scroll-mt-20">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-28 px-6 py-16">
          <Reveal>
            <SectionTitle
              kicker="Para coaches"
              title="Todo tu trabajo con atletas, en una sola app"
              sub="Dejá de saltar entre planillas, chats y transferencias."
            />
          </Reveal>
          <FeatureBlock
            kicker="Lab de programas"
            title="Planificá semanas enteras en minutos"
            desc="Arrastrá sesiones a la grilla, duplicá semanas y asigná el mismo programa a todo un grupo."
            bullets={[
              "Sesiones de fuerza y de campo: correr, bici, natación y remo",
              "Varias sesiones en un mismo día",
              "Superseries y circuitos AMRAP, EMOM y TABATA",
              "Un programa, muchos atletas",
            ]}
            mockup={<LabMockup />}
          />
          <FeatureBlock
            flip
            kicker="App para tus atletas"
            title="Tus atletas saben qué hacer cada día"
            desc="Cada atleta abre la app y ve su semana y la sesión del día, lista para empezar."
            bullets={["Su semana de un vistazo", "La sesión del día lista para empezar", "Lo que necesita llevar, como barra o discos", "Comentarios directos al coach"]}
            mockup={<HoyPhone />}
          />
          <FeatureBlock
            kicker="Carga y bienestar"
            title="Controlá las cargas, monitoreá la fatiga"
            desc="Antes de entrenar, cada atleta cuenta cómo llega: energía, sueño y cuerpo. Vos ves al instante quién está en forma y a quién conviene bajarle la carga."
            bullets={["Check-in de bienestar antes de cada sesión", "Alertas de quién necesita atención", "Historial de los últimos 7 días de cada atleta", "Actividades de Strava conectadas"]}
            mockup={<LoadMockup />}
          />
        </div>
      </section>

      {/* INTERACTIVE DEMO */}
      <section id="demo" className="scroll-mt-20 border-y border-[#E2E8F0] bg-[#F8FAFC] py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <SectionTitle
              kicker="Demo"
              title="Probalo ahora, sin registrarte."
              sub="Este es el editor de sesiones de TOGO. Buscá ejercicios en la biblioteca, cargá series y kilos, y armá superseries y circuitos. No se guarda nada."
            />
          </Reveal>
          <Reveal className="mt-12">
            <TryEditor />
          </Reveal>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="mx-auto max-w-[1100px] px-6 pb-12 pt-20 md:py-24">
        <Reveal>
          <SectionTitle kicker="Antes y después" title="Del caos al control" sub="Deslizá para ver la diferencia." />
        </Reveal>
        <Reveal className="mt-12">
          <BeforeAfter />
        </Reveal>
      </section>

      {/* INSTITUTIONS */}
      <section id="instituciones" className="scroll-mt-20 pb-20 pt-8 md:py-20">
        <Reveal className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <span className="text-[13px] font-semibold uppercase tracking-wider text-[#0272B7]">Para clubes y gimnasios</span>
            <h2 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight md:text-[42px]">
              Tu institución entera, ordenada
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#6B7280]">
              Clases, socios, entrenadores y cuotas en un mismo panel. Tus entrenadores planifican con las mismas
              herramientas que usan los coaches en TOGO.
            </p>
            <button type="button" onClick={signUpInstitution} className={`${primaryBtn} mt-8 h-12 text-[15px]`}>
              <Building2 size={17} /> Registrar mi institución
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {INSTITUTION_FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 rounded-[14px] border border-[#e2e8f0] bg-white p-5 text-[#011726] shadow-[0_1px_2px_rgba(1,23,38,0.04),0_8px_24px_rgba(1,23,38,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(2,114,183,0.14)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#E8F3FA]">
                  <Icon size={19} className="text-[#0272B7]" />
                </span>
                <div>
                  <h3 className="text-[16px] font-bold">{title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#6B7280]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* TOGUITO */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="pointer-events-none absolute right-0 top-1/2 h-[500px] w-[600px] -translate-y-1/2 bg-[radial-gradient(circle,rgba(2,114,183,0.1),transparent_65%)]" />
        <Reveal className="relative mx-auto grid max-w-[1100px] items-center gap-12 px-6 md:grid-cols-[1fr_1.1fr]">
          <div className="text-center md:text-left">
            <img src="/toguito.png" alt="Toguito" className="mx-auto h-[110px] w-auto md:mx-0" />
            <h2 className="mt-6 text-[30px] font-extrabold leading-tight tracking-tight md:text-[42px]">
              Conocé a Toguito, tu asistente
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#6B7280]">
              Un asistente con IA dentro de TOGO que te responde dudas de la plataforma, de cobros y del armado de
              programas. Probalo con una pregunta.
            </p>
          </div>
          <ToguitoChat qa={TOGUITO_QA} />
        </Reveal>
      </section>

      {/* PRICING */}
      <section id="precios" className="scroll-mt-20 border-t border-[#E2E8F0] bg-[#F8FAFC] py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <SectionTitle
              kicker="Precios"
              title="Pagás según cuántos entrenás"
              sub="Sin contratos: cambiás de plan o cancelás cuando quieras."
            />
          </Reveal>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-[10px] border border-[#E2E8F0] bg-white p-1 shadow-[0_1px_2px_rgba(1,23,38,0.04),0_8px_24px_rgba(1,23,38,0.06)]">
              {(
                [
                  ["coach", "Coaches"],
                  ["institution", "Clubes y gimnasios"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPricingTab(id)}
                  className={`rounded-[8px] px-4 py-2 text-[14px] font-semibold transition ${
                    pricingTab === id ? "bg-[#0272B7] text-white" : "text-[#6B7280] hover:text-[#011726]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {pricingTab === "coach" ? (
            <Reveal className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="flex flex-col rounded-[16px] border-2 border-[#0272B7] bg-white p-6 text-[#011726] shadow-[0_2px_4px_rgba(2,114,183,0.06),0_24px_60px_rgba(2,114,183,0.18)] md:p-8">
                <span className="text-[14px] font-semibold text-[#6B7280]">¿Cuántos atletas entrenás?</span>
                <span className="mt-1 text-[44px] font-extrabold leading-none tracking-tight">{athletes}</span>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={athletes}
                  onChange={(e) => setAthletes(Number(e.target.value))}
                  aria-label="Cantidad de atletas"
                  className="mt-5 w-full"
                />
                <div className="mt-1 flex justify-between text-[11px] text-[#6B7280]">
                  <span>1</span>
                  <span>200</span>
                </div>
                <div className="mt-6 border-t border-[#e2e8f0] pt-6">
                  <span className="text-[13px] text-[#6B7280]">Pagarías por mes</span>
                  <motion.div
                    key={priceArs}
                    initial={{ opacity: 0.4, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[40px] font-extrabold leading-tight tracking-tight"
                  >
                    {priceArs === 0 ? "Gratis" : ars(priceArs)}
                  </motion.div>
                  <span className="text-[13px] text-[#6B7280]">
                    {priceArs === 0 ? "Para siempre, sin tarjeta" : `o ${usd(priceUsd)} · ${coachTierLabel(tier)}`}
                  </span>
                </div>
                <button type="button" onClick={signUpCoach} className={`${primaryBtn} mt-6 h-12 text-[15px]`}>
                  Empezar gratis <ArrowRight size={17} />
                </button>
                <span className="mt-3 text-center text-[12px] text-[#6B7280]">Todas las funciones incluidas en todos los planes.</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                {PRICING_TIERS.map((t) => {
                  const active = t.key === tier.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setAthletes(t.maxAthletes ?? Math.max(t.minAthletes, 150))}
                      className={`relative flex flex-col ${t.maxAthletes == null ? "col-span-2 sm:col-span-3 lg:col-span-2" : ""} rounded-[14px] border bg-white p-4 text-left text-[#011726] transition duration-200 ${
                        active ? "border-[#0272B7] ring-2 ring-[#0272B7] shadow-[0_16px_40px_rgba(2,114,183,0.22)]" : "border-[#e2e8f0] shadow-[0_1px_2px_rgba(1,23,38,0.04),0_8px_24px_rgba(1,23,38,0.06)] hover:-translate-y-0.5 hover:border-[#0272B7]/50 hover:shadow-[0_16px_40px_rgba(2,114,183,0.14)]"
                      }`}
                    >
                      {active ? (
                        <span className="absolute -top-2.5 right-3 rounded-full bg-[#0272B7] px-2 py-0.5 text-[10px] font-bold text-white">
                          Tu plan
                        </span>
                      ) : null}
                      <span className="text-[12px] font-semibold text-[#6B7280]">{coachTierLabel(t)}</span>
                      <span className="mt-1 text-[20px] font-extrabold tracking-tight">{coachTierPrice(t)}</span>
                      <span className="text-[11px] text-[#6B7280]">{t.flatPriceArs === 0 ? "para siempre" : "por mes"}</span>
                    </button>
                  );
                })}
              </div>
            </Reveal>
          ) : (
            <Reveal className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {INSTITUTION_PRICING_TIERS.map((t) => (
                <div key={t.key} className="flex flex-col rounded-[14px] border border-[#e2e8f0] bg-white p-5 text-[#011726] shadow-[0_1px_2px_rgba(1,23,38,0.04),0_8px_24px_rgba(1,23,38,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(2,114,183,0.14)]">
                  <span className="text-[28px] font-extrabold tracking-tight">{ars(t.monthlyPriceArs)}</span>
                  <span className="text-[12px] text-[#6B7280]">{`por mes · o ${usd(t.monthlyPriceUsd)}`}</span>
                  <div className="mt-4 flex flex-col gap-2 border-t border-[#e2e8f0] pt-4 text-[13px]">
                    <div>
                      <span className="font-semibold">Club: </span>
                      <span className="text-[#6B7280]">{`${range(t.clubMinMembers, t.clubMaxMembers, "miembros")}, entrenadores ilimitados`}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Gimnasio: </span>
                      <span className="text-[#6B7280]">
                        {`${range(t.gymMinMembers, t.gymMaxMembers, "socios")}, ${
                          t.gymMaxCoaches === null ? "entrenadores ilimitados" : `hasta ${t.gymMaxCoaches} entrenadores`
                        }`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </Reveal>
          )}
          <p className="mt-8 text-center text-[13px] text-[#6B7280]">Pagás en pesos con Mercado Pago o en dólares con Stripe.</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(2,114,183,0.14),transparent_65%)]" />
        <Reveal className="relative mx-auto flex max-w-[760px] flex-col items-center px-6 text-center">
          <h2 className="text-[36px] font-extrabold leading-[1.05] tracking-tight text-[#011726] md:text-[60px]">
            Empezá hoy. Tus primeros 3 atletas van por nuestra cuenta.
          </h2>
          <button type="button" onClick={signUpCoach} className={`${primaryBtn} mt-10 h-14 px-8 text-[16px]`}>
            Empezar gratis <ArrowRight size={18} />
          </button>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 px-6 py-10 text-[13px] text-[#6B7280] md:flex-row">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-7 w-7" />
            <span className="font-bold text-[#011726]">TOGO</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <button type="button" onClick={() => scrollTo("funciones")} className="hover:text-[#011726]">Funciones</button>
            <button type="button" onClick={() => scrollTo("precios")} className="hover:text-[#011726]">Precios</button>
            <button type="button" onClick={athlete} className="hover:text-[#011726]">Soy atleta</button>
            <button type="button" onClick={logIn} className="hover:text-[#011726]">Ingresar</button>
            <button type="button" onClick={() => navigate({ to: "/legal" })} className="hover:text-[#011726]">
              Términos y privacidad
            </button>
          </nav>
          <span>© TOGO {new Date().getFullYear()}</span>
        </div>
      </footer>
      <ToguitoBubble qa={TOGUITO_QA} onSignUp={signUpCoach} />
    </div>
  );
}
