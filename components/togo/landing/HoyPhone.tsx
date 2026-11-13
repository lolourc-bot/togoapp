import { useMemo, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { DayColumn, HoyTopBar, SessionPreviewCard, type Day, type Session } from "../AthleteHomeParts";
import { AthleteNavBar } from "../AthleteBottomNav";
import { PhoneScreen, PhoneShell } from "./HeroPhone";

/**
 * The athlete's real "Hoy" screen (top bar, week strip, today's session card, tab bar) built from the same
 * components routes/hoy.tsx uses, filled with a sample week around today. Look-only: nothing responds.
 */

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];
const COACH = "Martín Ruiz";
const noop = () => {};

const session = (title: string, minutes: number, blocks: [string, string | null][], equipment: string[] = []): Session => ({
  title,
  minutes,
  coach: COACH,
  equipment,
  blocks: blocks.map(([content, right], i) => ({ label: String.fromCharCode(65 + i), content, right })),
});

const TODAY = session(
  "Fuerza tren inferior",
  50,
  [
    ["Sentadilla con barra", "5 × 5"],
    ["RDL con barra", "4 × 8"],
    ["Plancha", "3 × 45\""],
  ],
  ["Barra", "Discos"],
);

/** Sessions by day offset from today (0 = today). */
const PLAN: Record<number, Session> = {
  [-3]: session("Rodaje Z2", 45, [["Rodaje suave", "1 × 45'"]]),
  [-2]: session("Fuerza tren superior", 45, [["Press banca", "4 × 6"], ["Remo con barra", "4 × 8"]]),
  [-1]: session("Pasadas 6×400", 50, [["Pasadas 400 m", "6 × 1"]]),
  0: TODAY,
  1: session("Movilidad", 25, [["Movilidad de cadera 90-90", "2 × 8"]]),
  2: session("Fondo largo", 90, [["Rodaje largo", "1 × 90'"]]),
  4: session("Fartlek", 40, [["Fartlek 1' rápido / 1' suave", "10 × 1"]]),
};

function buildWeek() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIndex = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - todayIndex);
  const days: Day[] = LETTERS.map((letter, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const s = PLAN[i - todayIndex];
    return { letter, number: d.getDate(), key: String(i), past: i < todayIndex, session: s ? [s] : null };
  });
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const range = `${monday.getDate()}/${monday.getMonth() + 1} – ${sunday.getDate()}/${sunday.getMonth() + 1}`;
  return { days, todayIndex, range };
}

export function HoyPhone() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rotateY = useTransform(scrollYProgress, [0, 1], [-8, 8]);
  const { days, todayIndex, range } = useMemo(buildWeek, []);

  return (
    <div className="relative mx-auto w-[280px] [perspective:1600px] sm:w-[300px]">
      <div className="absolute -bottom-10 left-1/2 h-10 w-[80%] -translate-x-1/2 rounded-[50%] bg-[#011726]/20 blur-2xl" />
      <motion.div ref={ref} style={{ rotateY }} className="relative">
        <PhoneShell>
          <PhoneScreen lookOnly>
            <div className="min-h-0 flex-1 overflow-hidden" style={{ backgroundColor: "#F8FAFC" }}>
              <div style={{ backgroundColor: "#FFFFFF", boxShadow: "0 1px 0 #E2E8F0" }}>
                <HoyTopBar
                  range={range}
                  unread
                  onPrevWeek={noop}
                  onNextWeek={noop}
                  onNotifications={noop}
                  onMarketplace={noop}
                />
                <div className="flex" style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "12px 20px 14px" }}>
                  {days.map((d, i) => (
                    <DayColumn key={d.key} day={d} isToday={i === todayIndex} isSelected={i === todayIndex} onSelect={noop} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
                <SessionPreviewCard session={TODAY} onStart={noop} />
              </div>
            </div>
            <AthleteNavBar labels={["Training", "Mensajes", "Timer", "Progreso", "Perfil"]} current="Training" demo />
          </PhoneScreen>
        </PhoneShell>
      </motion.div>
    </div>
  );
}
