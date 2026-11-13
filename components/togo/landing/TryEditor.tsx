import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { SessionEditor, type LoadedExercise } from "../SessionEditor";
import { fetchTogoLibrary, type LibraryExercise } from "@/lib/exercise-data";
import { LookOnly } from "./LookOnly";

/**
 * "Probalo ahora": the real session editor in demo mode, planning for a sample athlete (week view, exercise
 * history, load suggestion). Visitors can search TOGO's exercise library, add exercises, sets, loads,
 * supersets and circuits; there's no save, publish or assign, and nothing hits the database except reading
 * the public library. Phones get a look-only preview (the editor needs ~1100px).
 */

const HEIGHT = 640;

const ex = (
  id: string,
  name: string,
  series: [string, string][],
  notes = "",
  rest = "90s",
  chain = false,
): LoadedExercise => ({
  id,
  name,
  chain,
  series: series.map(([reps, weight]) => ({ reps, weight })),
  notes,
  rest,
  microRest: null,
  repsUnit: "Reps",
  weightUnit: "kg",
  extras: [],
});

const START: LoadedExercise[] = [
  ex("demo-1", "Sentadilla con barra", [["5", "80"], ["5", "80"], ["5", "82.5"], ["5", "82.5"], ["5", "85"]], "Bajá controlado, 3 segundos en la excéntrica.", "120s"),
  ex("demo-2", "RDL con barra", [["8", "60"], ["8", "60"], ["8", "60"], ["8", "60"]], "Cadera atrás, espalda neutra y la barra pegada a las piernas."),
];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A sample athlete planned like a real one: this week's statuses, plus history for the two lifts. */
function sampleAthlete() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekStatus: Record<string, "draft" | "published" | "done"> = {};
  const plan: Record<number, "draft" | "published" | "done"> = { 0: "done", 1: "done", 3: "published", 4: "published", 5: "draft" };
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const st = plan[i];
    if (st) weekStatus[dayKey(d)] = d < today && st !== "done" ? "done" : st;
  }
  const ago = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };
  return {
    name: "Martina López",
    date: dayKey(today),
    weekStatus,
    history: {
      "sentadilla con barra": { last: { date: ago(4), weight: "80", reps: "5" }, pr: { date: ago(25), weight: "90", reps: "3" } },
      "rdl con barra": { last: { date: ago(4), weight: "60", reps: "8" }, pr: { date: ago(40), weight: "70", reps: "6" } },
    },
  };
}

/**
 * Keeps the editor's pop-ups (exercise library, circuit builder, new-exercise and video dialogs) inside the
 * card: a transform makes the card the containing block for their `position: fixed`, and their
 * viewport-sized heights are capped to the card.
 */
const CONTAIN_CSS = `
.togo-try-frame { transform: translateZ(0); }
.togo-try-frame .togo-panel-slide { height: 100% !important; }
.togo-try-frame [style*="85vh"], .togo-try-frame [style*="90vh"] { max-height: calc(100% - 32px) !important; }
`;

function useIsDesktop() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

export function TryEditor() {
  const [library, setLibrary] = useState<LibraryExercise[] | null>(null);
  const desktop = useIsDesktop();

  useEffect(() => {
    fetchTogoLibrary()
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, []);

  const frame = "togo-try-frame overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white shadow-[0_24px_60px_rgba(2,114,183,0.12)]";
  const [athlete] = useState(sampleAthlete);

  if (!library || desktop === null) {
    return (
      <div className={`${frame} flex items-center justify-center text-[14px] text-[#6B7280]`} style={{ height: HEIGHT }}>
        Cargando el editor…
      </div>
    );
  }

  const editor = (
    <SessionEditor
      search={{}}
      sessionId="demo"
      demo={{ name: "Fuerza tren inferior", exercises: START, library, height: HEIGHT, athlete }}
    />
  );

  if (!desktop) {
    return (
      <div className="flex flex-col gap-3">
        <div className={frame}>
          <LookOnly designW={1100}>{editor}</LookOnly>
        </div>
        <p className="flex items-center justify-center gap-2 text-center text-[13px] text-[#6B7280]">
          <Monitor size={15} className="shrink-0 text-[#0272B7]" />
          Abrí esta página en la compu para armar tu propia sesión.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{CONTAIN_CSS}</style>
      <div className={frame}>{editor}</div>
    </>
  );
}
