import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { LabCanvas, type CanvasDoc } from "../LabCanvas";
import { LookOnly } from "./LookOnly";

/**
 * The real Lab canvas (LabCanvas in demo mode) inside a desktop-window frame, scaled to fit the column.
 * Look-only: hover effects still react, but clicks, double-clicks, drags, right-clicks and keys are
 * swallowed in the capture phase before they reach the canvas.
 */

let n = 0;
const ex = (name: string, sets: string, reps: string, weight = "", chained = false) => ({
  id: `demo-ex-${++n}`,
  name,
  sets,
  reps,
  weight,
  chained,
});

const DEMO_PROGRAM: CanvasDoc = {
  id: "demo-10k",
  name: "Preparación 10K",
  weeks: 2,
  sessions: {
    // Semana 1
    "0-0-0": { name: "Fuerza tren inferior", exercises: [ex("Sentadilla con barra", "5", "5", "80"), ex("RDL con barra", "4", "8", "60")] },
    "0-0-1": { name: "Movilidad", exercises: [ex("Movilidad de cadera 90-90", "2", "8")] },
    "0-1-0": { name: "Rodaje Z2", exercises: [ex("Rodaje suave", "1", "45'")] },
    "0-2-0": {
      name: "Fuerza tren superior",
      exercises: [ex("Press banca", "4", "6", "70", true), ex("Remo con barra", "4", "8", "50"), ex("Plancha", "3", "45\"")],
    },
    "0-3-0": { name: "Pasadas 6×400", exercises: [ex("Pasadas 400 m", "6", "1"), ex("Trote de recuperación", "6", "200 m")] },
    "0-4-0": { name: "EMOM 20'", exercises: [ex("Burpees", "20", "10", "", true), ex("Swing con KB", "20", "15", "16")] },
    "0-5-0": { name: "Fondo largo", exercises: [ex("Rodaje largo", "1", "90'")] },
    // Semana 2
    "1-0-0": { name: "Fuerza tren inferior", exercises: [ex("Sentadilla con barra", "5", "5", "82.5"), ex("RDL con barra", "4", "8", "62.5")] },
    "1-1-0": { name: "Rodaje Z2", exercises: [ex("Rodaje suave", "1", "50'")] },
    "1-1-1": { name: "Core", exercises: [ex("Plancha lateral", "3", "30\""), ex("Dead bug", "3", "10")] },
    "1-2-0": { name: "Fuerza tren superior", exercises: [ex("Press banca", "4", "6", "72.5", true), ex("Remo con barra", "4", "8", "52.5")] },
    "1-3-0": { name: "Fartlek", exercises: [ex("Fartlek 1' rápido / 1' suave", "10", "1")] },
    "1-5-0": { name: "Fondo largo", exercises: [ex("Rodaje largo", "1", "100'")] },
  },
};

const DEMO_ATHLETES = [
  { id: "demo-a1", name: "Martina López" },
  { id: "demo-a2", name: "Juan Pérez" },
  { id: "demo-a3", name: "Sofía Díaz" },
];

/** Width the canvas is laid out at before scaling, close to how coaches see it on a laptop. */
const DESIGN_W = 880;

export function LabMockup() {
  const wrap = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [20, -20]);

  return (
    <motion.div
      ref={wrap}
      style={{ y }}
      className="overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white shadow-[0_24px_60px_rgba(2,114,183,0.14)]"
    >
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate text-[11px] font-medium text-[#6B7280]">TOGO · Lab · Lienzo</span>
      </div>
      <LookOnly designW={DESIGN_W}>
        <div style={{ padding: "20px 24px" }}>
          <LabCanvas coachId={null} demoCanvases={[DEMO_PROGRAM]} athletes={DEMO_ATHLETES} />
        </div>
      </LookOnly>
    </motion.div>
  );
}
