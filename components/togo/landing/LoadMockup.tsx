import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { WellnessSummary, WellnessTable } from "../WellnessOverview";
import type { WellnessOverviewRow } from "@/lib/wellness";
import { LookOnly } from "./LookOnly";

/**
 * "Carga y bienestar" mockup built from the coach's real screens: the Bienestar page's counters and
 * check-in table, the dashboard's "Control de carga" card, and an animated weekly-load chart. Look-only.
 */

const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Option indexes follow the real check-in questions (energía, sueño, cuerpo: 0 = worst … 4 = best).
const ROWS: WellnessOverviewRow[] = [
  { athleteId: "d1", athleteName: "Martina López", date: daysAgo(0), energy: 3, sleep: 3, body: 3, state: "ok" },
  { athleteId: "d2", athleteName: "Juan Pérez", date: daysAgo(0), energy: 1, sleep: 1, body: 1, state: "warn" },
  { athleteId: "d3", athleteName: "Sofía Díaz", date: daysAgo(1), energy: 4, sleep: 4, body: 4, state: "ok" },
  { athleteId: "d4", athleteName: "Tomás Ruiz", date: daysAgo(0), energy: 2, sleep: 1, body: 0, state: "warn" },
  { athleteId: "d5", athleteName: "Lucía Fernández", date: daysAgo(2), energy: 3, sleep: 4, body: 3, state: "ok" },
];




export function LoadMockup() {
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
        <span className="ml-2 truncate text-[11px] font-medium text-[#6B7280]">TOGO · Bienestar</span>
      </div>
      <LookOnly designW={980}>
        {/* Same markup as the <main> of /bienestar (without the sidebar), so it looks exactly like the app. */}
        <div className="bg-background p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Bienestar de tus atletas</h1>
            <p className="text-sm text-muted-foreground mt-1">Último check-in de cada atleta, últimos 7 días.</p>
          </div>
          <WellnessSummary rows={ROWS} />
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <WellnessTable rows={ROWS} linkRows={false} />
          </div>
        </div>
      </LookOnly>
    </motion.div>
  );
}
