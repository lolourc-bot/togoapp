import { motion } from "framer-motion";
import {
  Banknote,
  DollarSign,
  User,
  Building2,
  Sparkles,
  Mic,
  CalendarRange,
  Timer,
  HeartPulse,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * "Why TOGO" laid out as a Lab week: each day is a theme and each session card is a differentiator.
 * Cards drop into the grid one by one when the section scrolls into view, like sessions being dragged in.
 */

type Card = { Icon: LucideIcon; title: string; desc: string };
type Day = { day: string; theme: string; cards: Card[] };

const DAYS: Day[] = [
  {
    day: "Lun",
    theme: "Cobros",
    cards: [
      { Icon: Banknote, title: "Cobrá en pesos", desc: "Con Mercado Pago, sin pensar en el tipo de cambio." },
      { Icon: DollarSign, title: "O en dólares", desc: "Con Stripe, para tus atletas de afuera." },
    ],
  },
  {
    day: "Mar",
    theme: "Para todos",
    cards: [
      { Icon: User, title: "Coaches", desc: "Independientes, con 3 atletas o con 300." },
      { Icon: Building2, title: "Clubes y gimnasios", desc: "Clases, cupos, socios, cuotas y caja." },
    ],
  },
  {
    day: "Mié",
    theme: "Toguito",
    cards: [
      { Icon: Sparkles, title: "Asistente con IA", desc: "Te responde dudas de la plataforma, cobros y programas." },
      { Icon: Mic, title: "Planificá por voz", desc: "Dictale la sesión a Toguito y la arma por vos." },
    ],
  },
  {
    day: "Jue",
    theme: "Planificación",
    cards: [
      { Icon: CalendarRange, title: "Varias sesiones por día", desc: "Doble turno, fuerza a la mañana y fondo a la tarde." },
      { Icon: Timer, title: "Circuitos listos para usar", desc: "AMRAP, EMOM, TABATA y superseries." },
    ],
  },
  {
    day: "Vie",
    theme: "Seguimiento",
    cards: [
      { Icon: HeartPulse, title: "Bienestar y Strava", desc: "Cómo llega cada atleta y lo que hizo afuera." },
      { Icon: MessageCircle, title: "Mensajes", desc: "Hablá con tu equipo sin usar tu WhatsApp." },
    ],
  },
];

export function FeatureLab() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white shadow-[0_24px_60px_rgba(2,114,183,0.12)]">
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate text-[12px] font-medium text-[#6B7280]">Lab · Por qué TOGO · Semana 1</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {DAYS.map((d, di) => (
          <div
            key={d.day}
            className="flex flex-col gap-2.5 border-b border-[#F1F5F9] bg-[#F8FAFC]/60 p-3 last:border-b-0 sm:border-r lg:border-b-0 lg:last:border-r-0"
          >
            <div className="flex items-baseline justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">{d.day}</span>
              <span className="text-[13px] font-bold text-[#011726]">{d.theme}</span>
            </div>
            {d.cards.map(({ Icon, title, desc }, ci) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: -28, rotate: -3, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: (di * 2 + ci) * 0.12, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ y: -3 }}
                className="group rounded-[12px] border border-[#E2E8F0] bg-white p-3 shadow-[0_1px_2px_rgba(1,23,38,0.04),0_4px_12px_rgba(1,23,38,0.04)] transition-shadow hover:border-[#0272B7]/30 hover:shadow-[0_10px_28px_rgba(2,114,183,0.14)]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#E8F3FA] text-[#0272B7] transition-colors group-hover:bg-[#0272B7] group-hover:text-white">
                    <Icon size={16} />
                  </span>
                  <span className="text-[14px] font-bold leading-tight text-[#011726]">{title}</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-snug text-[#6B7280]">{desc}</p>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
