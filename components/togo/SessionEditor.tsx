import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Link2,
  Unlink,
  Pencil,
  Play,
  Plus,
  Settings2,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/togo/Sidebar";
import { ExercisePickerPanel } from "@/components/togo/ExercisePickerPanel";
import {
  CircuitModal,
  circuitTimerLabel,
  emptyCircuitConfig,
  type CircuitConfig,
} from "@/components/togo/CircuitModal";
import { fetchLibraryExercises, youtubeThumbnail, youtubeEmbedUrl, youtubeVideoId, type LibraryExercise } from "@/lib/exercise-data";
import { loadYoutubeIframeApi } from "@/lib/youtube-player";
import { supabase } from "@/lib/supabase";
import { getCoachId } from "@/lib/programs";
import { fetchSessionTemplate, createSessionTemplate, updateSessionTemplate } from "@/lib/session-templates";
import type { LabSession, Ex } from "@/components/togo/LabSessions";
import {
  fetchAthleteSessionById,
  insertAthleteSession,
  updateAthleteSession,
  fetchExerciseHistory,
  fetchAthleteWeekStatus,
  type ExerciseHistoryPoint,
} from "@/lib/athlete-sessions";
import { fetchTeamSessionGroup, addTeamSession, patchTeamSessionGroup, fetchTeamWeekStatus } from "@/lib/team-sessions";
import { fetchProgramSession, fetchProgramMeta, upsertProgramSession, fetchProgramSessionDays } from "@/lib/program-canvas";
import type { DaySession } from "@/components/togo/AthleteSessionCard";


/**
 * Session editor (moved from routes/sesiones.$sessionId.tsx so the landing can embed it). The route passes
 * its URL search/params; the landing passes `demo`, which loads a sample session, hides saving/publishing
 * and never touches the database.
 */

export type SessionSearch = {
  athleteId?: string;
  teamId?: string;
  programId?: string;
  week?: string;
  day?: string;
  slot?: string;
  date?: string;
};

const letterAt = (i: number) => String.fromCharCode(65 + i);

function NumInput({
  value,
  onChange,
  allowMax = false,
  style,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  allowMax?: boolean;
  style?: React.CSSProperties;
  placeholder?: string | undefined;
  "aria-label"?: string | undefined;
}) {
  const isMax = value === "MÁX";
  return (
    <input
      {...rest}
      inputMode="numeric"
      value={value}
      className="outline-none"
      style={{
        ...style,
        ...(isMax ? { fontWeight: 400, color: "#111827" } : null),
      }}
      onKeyDown={(e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key;
        if (k.length > 1) return;
        if (allowMax && (k === "m" || k === "M")) {
          e.preventDefault();
          onChange("MÁX");
          return;
        }
        if (!/[0-9.,]/.test(k)) {
          e.preventDefault();
          return;
        }
        if (isMax) {
          e.preventDefault();
          onChange(k === "," ? "." : k);
        }
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "MÁX") return;
        onChange(v.replace(/,/g, ".").replace(/[^0-9.]/g, ""));
      }}
    />
  );
}

function ExerciseVideoThumb({ name, videoUrl, onPlay }: { name: string; videoUrl: string | undefined; onPlay: (embedUrl: string) => void }) {
  const [hover, setHover] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoId = videoUrl ? youtubeVideoId(videoUrl) : null;

  useEffect(() => {
    if (!hover || !videoId || !containerRef.current) { setReady(false); return; }
    // YT.Player replaces its target element with its own <iframe>, which would otherwise
    // fight React's reconciliation if we handed it our own ref'd node directly — so give it
    // a plain DOM node React never created/tracks, nested inside our real container.
    const mount = document.createElement("div");
    mount.style.width = "100%";
    mount.style.height = "100%";
    containerRef.current.appendChild(mount);
    let cancelled = false;
    let player: any = null;
    loadYoutubeIframeApi().then((YT) => {
      if (cancelled) return;
      player = new YT.Player(mount, {
        width: 120,
        height: 76,
        videoId,
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, modestbranding: 1, rel: 0, fs: 0,
          disablekb: 1, iv_load_policy: 3, start: 3, playsinline: 1,
        },
        events: {
          onReady: (e: any) => {
            if (cancelled) return;
            const iframe = e.target.getIframe?.();
            if (iframe) { iframe.style.width = "100%"; iframe.style.height = "100%"; }
          },
          onStateChange: (e: any) => {
            if (cancelled) return;
            if (e.data === 1) setReady(true); // playing
            if (e.data === 0) { e.target.seekTo(3, true); e.target.playVideo(); } // ended -> manual loop, no YT bumper
          },
        },
      });
    });
    return () => {
      cancelled = true;
      setReady(false);
      player?.destroy?.();
      mount.remove();
    };
  }, [hover, videoId]);

  if (!videoUrl) {
    return (
      <div className="flex shrink-0 flex-col items-center justify-center gap-1" style={{ width: 120, height: 76, borderRadius: 8, backgroundColor: "#E2E8F0" }}>
        <Play size={24} color="#94A3B8" />
        <span className="text-[11px]" style={{ color: "#94A3B8" }}>Sin video</span>
      </div>
    );
  }
  const thumb = youtubeThumbnail(videoUrl);
  const embed = youtubeEmbedUrl(videoUrl);
  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => embed && onPlay(embed)}
      aria-label={`Reproducir video de ${name}`}
      className="relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden"
      style={{ width: 120, height: 76, borderRadius: 8, backgroundColor: "#111827", border: "none", padding: 0 }}
    >
      {hover ? (
        <div ref={containerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: ready ? 1 : 0 }} />
      ) : null}
      {!(hover && ready) ? (
        <>
          <div style={{ position: "absolute", inset: 0, backgroundImage: thumb ? `url(${thumb})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
          <span className="relative flex items-center justify-center rounded-full" style={{ width: 32, height: 32, backgroundColor: "rgba(0,0,0,0.55)" }}>
            <Play size={16} color="#FFFFFF" />
          </span>
        </>
      ) : null}
    </button>
  );
}

function ChainConnector({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center justify-center" style={{ padding: "2px 0" }}>
      <button
        type="button"
        onClick={onClick}
        aria-label="Encadenar ejercicios"
        className="group/chain flex cursor-pointer items-center text-[#CBD5E1] transition-colors hover:text-[#6366F1]"
        style={{ gap: 4 }}
      >
        <Link2 size={14} />
        <span className="text-[11px]">Superset</span>
      </button>
    </div>
  );
}

const repsUnitOptions = ["Reps", "Segundos", "Metros", "Calorías", "Distancia"];
const weightUnitOptions = ["kg", "lb", "% 1RM", "RPE", "Altura (cm)", "Tiempo (min:ss)", "Ninguna"];
const extraVarOptions = [
  { value: "RIR", label: "RIR (Reps en reserva)" },
  { value: "RPE", label: "RPE (Esfuerzo percibido)" },
  { value: "Tempo", label: "Tempo (ej: 3-1-2)" },
  { value: "% 1RM", label: "% 1RM" },
];
const restOptions = ["30s", "60s", "90s", "120s", "Custom"];
const microRestOptions = ["15s", "30s", "45s"];

type ExState = {
  series: { weight: string; reps: string }[];
  notes: string;
  rest: string;
  microRest: string | null;
};
type ExMeta = { id: string; name: string };
type Units = { reps: string; weight: string };
type Extra = { name: string; values: string[] };

function groupsFromChain(chain: boolean[]): number[][] {
  const groups: number[][] = [];
  chain.forEach((c, i) => {
    if (c && groups.length) groups[groups.length - 1]!.push(i);
    else groups.push([i]);
  });
  return groups;
}

function chainFromGroups(groups: number[][], count: number): boolean[] {
  const chain = new Array(count).fill(false);
  groups.forEach((g) => g.forEach((idx, pos) => { if (pos > 0) chain[idx] = true; }));
  return chain;
}

/** Lab templates only support two buckets (A = standalone, B = one shared superset). */
function groupsFromAB(exs: Ex[]): number[][] {
  const groups: number[][] = [];
  let bIdx = -1;
  exs.forEach((e, i) => {
    if (e.group === "B") {
      if (bIdx === -1) { bIdx = groups.length; groups.push([i]); }
      else groups[bIdx]!.push(i);
    } else groups.push([i]);
  });
  return groups;
}
function abFromGroups(groups: number[][], count: number): ("A" | "B")[] {
  const labels: ("A" | "B")[] = new Array(count).fill("A");
  groups.forEach((g) => { if (g.length > 1) g.forEach((i) => { labels[i] = "B"; }); });
  return labels;
}

function blankExState(reps = "10", weight = ""): ExState {
  return { series: [{ reps, weight }, { reps, weight }, { reps, weight }], notes: "", rest: "90s", microRest: null };
}

export type LoadedExercise = {
  id: string;
  name: string;
  chain: boolean;
  series: { weight: string; reps: string }[];
  notes: string;
  rest: string;
  microRest: string | null;
  repsUnit: string;
  weightUnit: string;
  extras: Extra[];
};

function loadedFromCalEx(e: {
  id: string; name: string; chain: boolean; series?: { weight: string; reps: string }[];
  reps?: string; weight?: string; sets?: string; notes?: string; rest?: string;
  microRest?: string | null; repsUnit?: string; weightUnit?: string; extras?: Extra[];
}): LoadedExercise {
  const series = e.series && e.series.length ? e.series : Array.from({ length: Math.max(1, Number(e.sets) || 3) }, () => ({ reps: e.reps ?? "10", weight: e.weight ?? "" }));
  return {
    id: e.id,
    name: e.name,
    chain: e.chain,
    series,
    notes: e.notes ?? "",
    rest: e.rest ?? "90s",
    microRest: e.microRest ?? null,
    repsUnit: e.repsUnit ?? "Reps",
    weightUnit: e.weightUnit ?? "kg",
    extras: e.extras ?? [],
  };
}

function uid() {
  return crypto.randomUUID();
}

const WEEK_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

function weekDates(anchorDate: string): { label: string; dateKey: string; dayNum: number }[] {
  const anchor = new Date(`${anchorDate}T00:00:00`);
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: WEEK_LABELS[i]!,
      dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      dayNum: d.getDate(),
    };
  });
}

function relativeDay(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays <= 0) return "hoy";
  if (diffDays === 1) return "ayer";
  return `hace ${diffDays} días`;
}

/** Simple, real (not AI) progressive-overload nudge: a modest bump on the last top set. */
function suggestNextLoad(last: ExerciseHistoryPoint): string | null {
  const w = Number(last.weight);
  if (Number.isNaN(w) || w <= 0) return null;
  const next = Math.round((w * 1.03) / 2.5) * 2.5;
  if (next <= w) return null;
  return `Tu última serie top fue ${last.weight}kg × ${last.reps}. Podrías probar ${next}kg × ${last.reps} para sobrecarga progresiva.`;
}

/** Sample session for the landing's try-it demo: nothing loads from or saves to the database. */
export type SessionEditorDemo = {
  name: string;
  exercises: LoadedExercise[];
  library: LibraryExercise[];
  /** Height of the editor box; the app version fills the viewport instead. */
  height: number;
  /** Plan for a sample athlete: shows their week, exercise history and load suggestion like the real thing. */
  athlete?: {
    name: string;
    date: string;
    weekStatus: Record<string, DaySession["status"]>;
    history: Record<string, { last: ExerciseHistoryPoint | null; pr: ExerciseHistoryPoint | null }>;
  };
};

export function SessionEditor({
  search,
  sessionId,
  demo,
}: {
  search: SessionSearch;
  sessionId: string;
  demo?: SessionEditorDemo | undefined;
}) {
  const params = { sessionId };
  const navigate = useNavigate();

  const mode: "athlete" | "team" | "program" | "lab" = demo
    ? demo.athlete
      ? "athlete"
      : "lab"
    : search.teamId
    ? "team"
    : search.programId
      ? "program"
      : search.athleteId
        ? "athlete"
        : "lab";
  const isNew = params.sessionId === "nueva" || params.sessionId === "canvas";

  const [coachId, setCoachId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordId, setRecordId] = useState<string | null>(isNew ? null : params.sessionId);

  const [headerLabel, setHeaderLabel] = useState("");
  const [headerSub, setHeaderSub] = useState("");

  const goBack = () => {
    if (mode === "team") navigate({ to: "/equipos", search: { equipo: search.teamId } });
    else if (mode === "athlete") navigate({ to: "/atletas/$athleteId", params: { athleteId: search.athleteId! } });
    else navigate({ to: "/lab" });
  };

  const [sessionName, setSessionName] = useState("Nueva sesión");
  const [status, setStatus] = useState<DaySession["status"]>("draft");
  const [category, setCategory] = useState<LabSession["category"]>("Fuerza");

  const [activeExercise, setActiveExercise] = useState(0);
  const [exercises, setExercises] = useState<ExMeta[]>([]);
  const [exStates, setExStates] = useState<ExState[]>([]);
  const [units, setUnits] = useState<Units[]>([]);
  const [extras, setExtras] = useState<Extra[][]>([]);
  const [groups, setGroups] = useState<number[][]>([]);
  const [customCircuits, setCustomCircuits] = useState<CircuitConfig[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const [editingCircuit, setEditingCircuit] = useState<number | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [confirmDeleteCircuit, setConfirmDeleteCircuit] = useState<number | null>(null);
  const [editingDesc, setEditingDesc] = useState<number | null>(null);
  const circuitRefs = useRef<(HTMLElement | null)[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [history, setHistory] = useState<{ last: ExerciseHistoryPoint | null; pr: ExerciseHistoryPoint | null } | null>(null);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [realDate, setRealDate] = useState<string | null>(null);
  const [weekStatus, setWeekStatus] = useState<Record<string, DaySession["status"]>>({});
  const [programWeeks, setProgramWeeks] = useState(2);
  const [programDays, setProgramDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!coachId) return;
    fetchLibraryExercises(coachId).then(setLibrary);
  }, [coachId]);

  const videoByName = new Map(library.filter((e) => e.videoUrl).map((e) => [e.name.trim().toLowerCase(), e.videoUrl!]));
  const libraryByName = new Map(library.map((e) => [e.name.trim().toLowerCase(), e]));

  const activeExerciseAlternatives = (() => {
    const current = exercises[activeExercise];
    if (!current) return [];
    const lib = libraryByName.get(current.name.trim().toLowerCase());
    if (!lib) return [];
    const seen = new Set([current.name.trim().toLowerCase()]);
    const out: LibraryExercise[] = [];
    for (const e of library) {
      const key = e.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      if (e.pattern === lib.pattern && e.equipment !== lib.equipment) {
        seen.add(key);
        out.push(e);
      }
    }
    return out.sort((a, b) => (a.equipment === "Peso corporal" ? -1 : b.equipment === "Peso corporal" ? 1 : 0)).slice(0, 4);
  })();

  const activeExerciseName = exercises[activeExercise]?.name;
  useEffect(() => {
    if (demo) {
      const h = activeExerciseName ? demo.athlete?.history[activeExerciseName.trim().toLowerCase()] : undefined;
      setHistory(h ?? null);
      return;
    }
    if (mode !== "athlete" || !search.athleteId || !activeExerciseName) { setHistory(null); return; }
    let cancelled = false;
    fetchExerciseHistory(search.athleteId, activeExerciseName, recordId ?? undefined).then((h) => {
      if (!cancelled) setHistory(h);
    });
    return () => { cancelled = true; };
  }, [mode, search.athleteId, activeExerciseName, recordId]);

  const applyLoaded = (name: string, items: LoadedExercise[], circuits: CircuitConfig[]) => {
    setExercises(items.map((e) => ({ id: e.id, name: e.name })));
    setExStates(items.map((e) => ({ series: e.series, notes: e.notes, rest: e.rest, microRest: e.microRest })));
    setUnits(items.map((e) => ({ reps: e.repsUnit, weight: e.weightUnit })));
    setExtras(items.map((e) => e.extras));
    setGroups(groupsFromChain(items.map((e) => e.chain)));
    setCustomCircuits(circuits.map((c) => ({ ...c })));
    setSessionName(name);
    setActiveExercise(0);
  };

  useEffect(() => {
    if (demo) {
      setLibrary(demo.library);
      setHeaderLabel("Fuerza");
      if (demo.athlete) {
        setHeaderSub(demo.athlete.name);
        setRealDate(demo.athlete.date);
        setWeekStatus(demo.athlete.weekStatus);
      }
      applyLoaded(demo.name, demo.exercises, []);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const cid = await getCoachId();
      if (cancelled) return;
      setCoachId(cid);
      if (!cid) { setLoading(false); return; }

      if (mode === "lab") {
        if (!isNew) {
          const tpl = await fetchSessionTemplate(params.sessionId);
          if (tpl) {
            setRecordId(tpl.id);
            setCategory(tpl.category);
            setHeaderLabel(tpl.category);
            applyLoaded(
              tpl.name,
              tpl.exercises.map((e, i, arr) => loadedFromCalEx({ ...e, chain: groupsFromAB(arr).some((g) => g.includes(i) && g[0] !== i) })),
              tpl.circuits,
            );
          }
        } else {
          setHeaderLabel("Fuerza");
          setSessionName("Nueva sesión");
        }
      } else if (mode === "team") {
        const { data: team } = await supabase.from("teams").select("name").eq("id", search.teamId!).single();
        setHeaderSub(team?.name ?? "Equipo");
        let date = search.date ?? new Date().toISOString().slice(0, 10);
        if (!isNew) {
          const group = await fetchTeamSessionGroup(params.sessionId);
          if (group) {
            setRecordId(group.id);
            setStatus(group.status);
            date = group.date;
            applyLoaded(group.name, group.items.map((e) => loadedFromCalEx(e)), group.circuits);
          }
        } else {
          setSessionName("Nueva sesión");
        }
        setRealDate(date);
        fetchTeamWeekStatus(search.teamId!, date).then(setWeekStatus);
      } else if (mode === "athlete") {
        const { data: athlete } = await supabase.from("athletes").select("full_name").eq("id", search.athleteId!).single();
        setHeaderSub(athlete?.full_name ?? "Atleta");
        let date = search.date ?? new Date().toISOString().slice(0, 10);
        if (!isNew) {
          const s = await fetchAthleteSessionById(params.sessionId);
          if (s) {
            setRecordId(s.id);
            setStatus(s.status);
            date = s.date;
            applyLoaded(s.name, s.items.map((e) => loadedFromCalEx(e)), s.circuits);
          }
        } else {
          setSessionName("Nueva sesión");
        }
        setRealDate(date);
        fetchAthleteWeekStatus(search.athleteId!, date).then(setWeekStatus);
      } else if (mode === "program") {
        const meta = await fetchProgramMeta(search.programId!);
        setHeaderSub(meta?.name ?? "Programa");
        setProgramWeeks(meta?.weeks ?? 2);
        const week = Number(search.week ?? 0);
        const day = Number(search.day ?? 0);
        setHeaderLabel(`Semana ${week + 1} · Día ${day + 1}`);
        const [ps, days] = await Promise.all([
          fetchProgramSession(search.programId!, week, day, Number(search.slot ?? 0)),
          fetchProgramSessionDays(search.programId!),
        ]);
        setProgramDays(days);
        if (ps) {
          applyLoaded(
            ps.name || "Nueva sesión",
            ps.exercises.map((e) => loadedFromCalEx({ ...e, chain: e.chained })),
            ps.circuits ?? [],
          );
        } else {
          setSessionName("Nueva sesión");
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blockLabels: string[] = [];
  groups.forEach((g, gi) => g.forEach((exIdx, pos) => { blockLabels[exIdx] = `${letterAt(gi)}${pos + 1}`; }));

  const totalExercises = exercises.length + customCircuits.reduce((acc, c) => acc + c.exercises.length, 0);
  const circuitMinutes = (c: CircuitConfig) => {
    if (c.type === "AMRAP") return c.amrapSeconds / 60;
    if (c.type === "EMOM") return (c.emomInterval * c.emomRounds) / 60;
    if (c.type === "TABATA") return ((c.work + c.rest) * c.tabataRounds * (c.tabataAlternate ? Math.max(1, c.exercises.length) : 1)) / 60;
    return 10;
  };
  const rawMinutes = exStates.reduce((acc, st) => acc + st.series.length * 3, 0) + customCircuits.reduce((acc, c) => acc + circuitMinutes(c), 0);
  const estimatedMinutes = Math.max(5, Math.round(rawMinutes / 5) * 5);

  const chainGroups = (gi: number) => {
    setGroups((prev) => {
      if (gi < 0 || gi + 1 >= prev.length) return prev;
      const next = prev.map((g) => [...g]);
      const merged = [...next[gi]!, ...next[gi + 1]!];
      next.splice(gi, 2, merged);
      return next;
    });
  };
  const unchainGroup = (gi: number) => {
    setGroups((prev) => {
      const next = prev.map((g) => [...g]);
      const singles = next[gi]!.map((i) => [i]);
      next.splice(gi, 1, ...singles);
      return next;
    });
  };

  const addExerciseFromLibrary = (lib: LibraryExercise) => {
    if (activeBlockId?.startsWith("custom-")) {
      const ci = Number(activeBlockId.slice(7));
      setCustomCircuits((prev) =>
        prev.map((c, i) => (i === ci ? { ...c, exercises: [...c.exercises, { name: lib.name, reps: "", weight: "", unit: "kg" as const }] } : c)),
      );
      return;
    }
    setExercises((prev) => [...prev, { id: uid(), name: lib.name }]);
    setExStates((prev) => [...prev, blankExState()]);
    setUnits((prev) => [...prev, { reps: "Reps", weight: "kg" }]);
    setExtras((prev) => [...prev, []]);
    setGroups((prev) => {
      const nextIdx = prev.reduce((acc, g) => acc + g.length, 0);
      const next = prev.map((g) => [...g]);
      const activeGroup = next.findIndex((g) => g.includes(activeExercise));
      if (activeGroup >= 0 && next[activeGroup]!.length > 1) {
        next[activeGroup]!.push(nextIdx);
        return next;
      }
      return [...next, [nextIdx]];
    });
  };

  const defaultCircuitDescription = (c: CircuitConfig): string => {
    switch (c.type) {
      case "AMRAP": return "Completá la mayor cantidad de rondas posibles en el tiempo indicado. Mantené buena técnica en cada rep. Anotá cuántas rondas completás al terminar.";
      case "EMOM": return "Al inicio de cada minuto, completá los ejercicios indicados. El tiempo que sobre en ese minuto es tu descanso. Si no terminás en el minuto, descansá al siguiente y retomá.";
      case "TABATA": return `Trabajá ${c.work}s y descansá ${c.rest}s, alternando los ejercicios durante ${c.tabataRounds} rondas. Mantené intensidad alta en los períodos de trabajo.`;
      case "ASAP": return "Completá todos los ejercicios de la lista lo más rápido posible, sin sacrificar la técnica. Tu tiempo se registra al terminar la última rep.";
      default: return "";
    }
  };

  const submitCircuit = (config: CircuitConfig) => {
    const withDefaults = editingCircuit === null && !config.description ? { ...config, description: defaultCircuitDescription(config) } : config;
    setCustomCircuits((prev) => (editingCircuit === null ? [...prev, withDefaults] : prev.map((c, i) => (i === editingCircuit ? withDefaults : c))));
    setCircuitOpen(false);
    setEditingCircuit(null);
  };
  const setCircuitDescription = (ci: number, description: string) => setCustomCircuits((prev) => prev.map((c, i) => (i === ci ? { ...c, description } : c)));
  const renameCircuit = (ci: number, name: string) => setCustomCircuits((prev) => prev.map((c, i) => (i === ci ? { ...c, name: name.trim() || c.name } : c)));
  const openPickerFor = (blockId: string | null) => { setActiveBlockId(blockId); setPickerOpen(true); };

  const removeExercise = (exIdx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
    setExStates((prev) => prev.filter((_, i) => i !== exIdx));
    setUnits((prev) => prev.filter((_, i) => i !== exIdx));
    setExtras((prev) => prev.filter((_, i) => i !== exIdx));
    setGroups((prev) => prev.map((g) => g.filter((i) => i !== exIdx).map((i) => (i > exIdx ? i - 1 : i))).filter((g) => g.length > 0));
    setActiveExercise((prev) => Math.max(0, Math.min(prev > exIdx ? prev - 1 : prev, exercises.length - 2)));
  };
  const removeCircuit = (ci: number) => {
    setCustomCircuits((prev) => prev.filter((_, i) => i !== ci));
    setConfirmDeleteCircuit(null);
    circuitRefs.current.splice(ci, 1);
  };
  const removeCircuitExercise = (ci: number, i: number) => {
    setCustomCircuits((prev) => prev.map((c, x) => (x === ci ? { ...c, exercises: c.exercises.filter((_, y) => y !== i) } : c)));
  };

  const inputStyle: React.CSSProperties = { backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, height: 34, width: "100%", textAlign: "center", fontSize: 14, color: "#0F172A" };

  const updateSerie = (exIdx: number, i: number, key: "weight" | "reps", value: string) =>
    setExStates((prev) => prev.map((e, ei) => (ei === exIdx ? { ...e, series: e.series.map((s, si) => (si === i ? { ...s, [key]: value } : s)) } : e)));
  const addSerie = (exIdx: number) => setExStates((prev) => prev.map((e, ei) => (ei === exIdx ? { ...e, series: [...e.series, { weight: "", reps: "" }] } : e)));
  const removeSerie = (exIdx: number, i: number) => setExStates((prev) => prev.map((e, ei) => (ei === exIdx ? { ...e, series: e.series.filter((_, si) => si !== i) } : e)));
  const setExField = <K extends keyof ExState>(exIdx: number, key: K, value: ExState[K]) => setExStates((prev) => prev.map((e, ei) => (ei === exIdx ? { ...e, [key]: value } : e)));
  const renameExercise = (exIdx: number, name: string) => setExercises((prev) => prev.map((e, i) => (i === exIdx ? { ...e, name: name.trim() || e.name } : e)));

  const selectExercise = (i: number) => { setActiveExercise(i); sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const renderMenu = (
    key: string,
    options: { value: string; label: string }[],
    current: string,
    onSelect: (v: string) => void,
    trigger: React.ReactNode,
    align: "center" | "right" = "center",
    fixed = false,
  ) => {
    const open = openMenu === key;
    const panelStyle: React.CSSProperties = { minWidth: 170, backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "4px 0" };
    return (
      <span className="relative inline-flex" style={{ overflow: "visible" }}>
        <button
          type="button"
          onClick={(e) => {
            if (open) { setOpenMenu(null); return; }
            if (fixed) { const r = e.currentTarget.getBoundingClientRect(); setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right }); }
            else setMenuPos(null);
            setOpenMenu(key);
          }}
          className="inline-flex cursor-pointer items-center gap-1"
        >
          {trigger}
        </button>
        {open && (
          <div
            className={fixed ? "z-50" : "absolute z-30"}
            style={fixed && menuPos ? { position: "fixed", top: menuPos.top, right: menuPos.right, ...panelStyle } : { top: "100%", ...(align === "center" ? { left: "50%", transform: "translateX(-50%)" } : { right: 0 }), marginTop: 4, ...panelStyle }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onSelect(opt.value); setOpenMenu(null); }}
                className="flex w-full items-center justify-between gap-3 whitespace-nowrap text-[12px] normal-case hover:bg-[#F8FAFC]"
                style={{ padding: "7px 14px", color: "#0F172A", fontWeight: 400 }}
              >
                {opt.label}
                {opt.value === current && <Check size={12} color="#111827" />}
              </button>
            ))}
          </div>
        )}
      </span>
    );
  };

  const unitTrigger = (label: string) => (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase" style={{ color: "#94A3B8" }}>
      {label}
      <ChevronDown size={10} color="#94A3B8" />
    </span>
  );

  const renderUnitHeader = (exIdx: number, col: "reps" | "weight") => {
    const options = (col === "reps" ? repsUnitOptions : weightUnitOptions).map((o) => ({ value: o, label: o }));
    const current = units[exIdx]![col];
    return (
      <span className="flex flex-1 justify-center">
        {renderMenu(`${exIdx}-${col}`, options, current, (v) => setUnits((prev) => prev.map((u, ui) => (ui === exIdx ? { ...u, [col]: v } : u))), unitTrigger(current))}
      </span>
    );
  };

  const addExtra = (exIdx: number, name: string) => setExtras((prev) => prev.map((list, li) => (li === exIdx ? [...list, { name, values: exStates[exIdx]!.series.map(() => "") }] : list)));
  const updateExtraName = (exIdx: number, varIdx: number, name: string) => setExtras((prev) => prev.map((list, li) => (li === exIdx ? list.map((v, vi) => (vi === varIdx ? { ...v, name } : v)) : list)));
  const updateExtraValue = (exIdx: number, varIdx: number, row: number, value: string) =>
    setExtras((prev) => prev.map((list, li) => (li === exIdx ? list.map((v, vi) => (vi === varIdx ? { ...v, values: v.values.map((x, xi) => (xi === row ? value : x)) } : v)) : list)));
  const removeExtra = (exIdx: number, varIdx: number) => setExtras((prev) => prev.map((list, li) => (li === exIdx ? list.filter((_, vi) => vi !== varIdx) : list)));

  const renderExerciseContent = (exIdx: number, blockLabel: string, chained: boolean, lastOfGroup: boolean) => {
    const ex = exercises[exIdx]!;
    const st = exStates[exIdx]!;
    const u = units[exIdx]!;
    const exExtras = extras[exIdx]!;
    return (
      <>
        <div className="group flex items-center justify-between" style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold" style={{ color: chained ? "#6366F1" : "#94A3B8" }}>{blockLabel}</span>
            <h2
              className="text-[17px] font-bold outline-none"
              style={{ color: "#0F172A" }}
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              onBlur={(e) => renameExercise(exIdx, e.currentTarget.textContent ?? ex.name)}
            >
              {ex.name}
            </h2>
            <Pencil size={14} color="#94A3B8" className="opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <button type="button" aria-label={`Eliminar ${ex.name}`} onClick={() => removeExercise(exIdx)} className="cursor-pointer text-[#CBD5E1] transition-colors hover:text-[#EF4444]">
            <Trash2 size={15} />
          </button>
        </div>

        <div className="flex" style={{ gap: 14, marginBottom: 14 }}>
          <ExerciseVideoThumb name={ex.name} videoUrl={videoByName.get(ex.name.trim().toLowerCase())} onPlay={setVideoModal} />
          <div className="min-w-0 flex-1">
            <label htmlFor={`indicaciones-${exIdx}`} className="block text-[12px] font-medium" style={{ color: "#64748B", marginBottom: 4 }}>Indicaciones</label>
            <textarea
              id={`indicaciones-${exIdx}`}
              value={st.notes}
              onChange={(e) => setExField(exIdx, "notes", e.target.value)}
              placeholder="Agregá indicaciones o consejos para esta ejercicio..."
              className="w-full resize-none text-[13px] outline-none"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", color: "#0F172A", minHeight: 56 }}
            />
          </div>
        </div>

        <div className="overflow-visible" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, marginBottom: 12 }}>
          <div className="relative flex items-center text-[11px] font-semibold uppercase" style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", padding: "7px 12px", gap: 12, color: "#94A3B8" }}>
            <span style={{ width: 40 }}>Serie</span>
            {renderUnitHeader(exIdx, "reps")}
            {renderUnitHeader(exIdx, "weight")}
            {exExtras.map((v, vi) => (
              <span key={vi} className="flex flex-1 items-center justify-center gap-1">
                {renderMenu(`${exIdx}-extra-${vi}`, extraVarOptions, v.name, (val) => updateExtraName(exIdx, vi, val), unitTrigger(v.name))}
                <button type="button" aria-label={`Quitar columna ${v.name}`} onClick={() => removeExtra(exIdx, vi)} className="text-[#94A3B8] transition-colors hover:text-[#EF4444]"><X size={10} /></button>
              </span>
            ))}
            <span className="group/add relative flex justify-center" style={{ width: 20 }}>
              {renderMenu(`${exIdx}-addvar`, extraVarOptions, "", (val) => addExtra(exIdx, val), <span title="Agregar variable" aria-label="Agregar variable"><Plus size={11} color="#94A3B8" /></span>, "right")}
            </span>
            <span className="flex-1 text-center">Descanso</span>
            <span style={{ width: 32 }} />
          </div>

          {st.series.map((s, i) => (
            <div key={i} className="flex items-center" style={{ padding: "7px 12px", borderBottom: "1px solid #F8FAFC", gap: 12 }}>
              <span style={{ width: 40 }}>
                <span className="flex items-center justify-center rounded-full text-[12px] font-semibold" style={{ width: 22, height: 22, backgroundColor: "#F1F5F9", color: "#64748B" }}>{i + 1}</span>
              </span>
              <span className="flex-1"><NumInput allowMax aria-label={`${u.reps} serie ${i + 1}`} placeholder={u.reps} value={s.reps} onChange={(v) => updateSerie(exIdx, i, "reps", v)} style={inputStyle} /></span>
              <span className="flex-1">
                {u.weight === "Ninguna" ? (
                  <span style={{ display: "block", height: 34, textAlign: "center", lineHeight: "34px", color: "#CBD5E1", fontSize: 13 }}>—</span>
                ) : (
                  <NumInput aria-label={`${u.weight} serie ${i + 1}`} placeholder={u.weight} value={s.weight} onChange={(v) => updateSerie(exIdx, i, "weight", v)} style={inputStyle} />
                )}
              </span>
              {exExtras.map((v, vi) => (
                <span key={vi} className="flex-1">
                  <input aria-label={`${v.name} serie ${i + 1}`} placeholder={v.name} value={v.values[i] ?? ""} onChange={(e) => updateExtraValue(exIdx, vi, i, e.target.value)} className="outline-none" style={inputStyle} />
                </span>
              ))}
              <span style={{ width: 20 }} />
              <span className="flex flex-1 justify-center">
                <span className="rounded-full text-[11px]" style={{ backgroundColor: "#F1F5F9", color: "#64748B", padding: "3px 8px" }}>{st.rest}</span>
              </span>
              <span className="flex justify-center" style={{ width: 32 }}>
                <button type="button" aria-label={`Eliminar serie ${i + 1}`} className="text-[#CBD5E1] transition-colors hover:text-[#EF4444]" onClick={() => removeSerie(exIdx, i)}><X size={14} /></button>
              </span>
            </div>
          ))}

          <div style={{ padding: "7px 12px", borderTop: "1px solid #F1F5F9" }}>
            <button type="button" onClick={() => addSerie(exIdx)} className="inline-flex items-center gap-1.5 text-[13px] text-[#64748B] transition-colors hover:text-[#111827]"><Plus size={13} />Agregar serie</button>
          </div>
        </div>

        {lastOfGroup && (() => {
          const presets = restOptions.slice(0, -1);
          const isCustom = !presets.includes(st.rest);
          return (
            <div className="flex items-center" style={{ gap: 10 }}>
              <span className="text-[12px]" style={{ color: "#64748B" }}>Descanso entre series</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {presets.map((opt) => {
                  const selected = opt === st.rest;
                  return (
                    <button key={opt} type="button" onClick={() => setExField(exIdx, "rest", opt)} className="rounded-full text-[11px]" style={{ padding: "3px 8px", backgroundColor: selected ? "#111827" : "#F1F5F9", color: selected ? "#FFFFFF" : "#64748B" }}>
                      {opt}
                    </button>
                  );
                })}
                {isCustom ? (
                  <input
                    autoFocus={st.rest === "Custom"}
                    value={st.rest === "Custom" ? "" : st.rest}
                    onChange={(e) => setExField(exIdx, "rest", e.target.value)}
                    placeholder="ej. 75s"
                    aria-label="Descanso personalizado"
                    style={{ width: 64, height: 22, borderRadius: 11, border: "1px solid #111827", fontSize: 11, textAlign: "center", color: "#111827", outline: "none" }}
                  />
                ) : (
                  <button type="button" onClick={() => setExField(exIdx, "rest", "Custom")} className="rounded-full text-[11px]" style={{ padding: "3px 8px", backgroundColor: "#F1F5F9", color: "#64748B" }}>
                    Custom
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </>
    );
  };

  const buildLoadedExercises = (): LoadedExercise[] => {
    const chain = chainFromGroups(groups, exercises.length);
    return exercises.map((e, i) => ({
      id: e.id,
      name: e.name,
      chain: chain[i]!,
      series: exStates[i]!.series,
      notes: exStates[i]!.notes,
      rest: exStates[i]!.rest,
      microRest: exStates[i]!.microRest,
      repsUnit: units[i]!.reps,
      weightUnit: units[i]!.weight,
      extras: extras[i]!,
    }));
  };

  const toCalEx = (e: LoadedExercise) => {
    const first = e.series[0];
    return {
      id: e.id, name: e.name, chain: e.chain,
      sets: String(e.series.length), reps: first?.reps ?? "", weight: first?.weight ?? "",
      series: e.series, notes: e.notes, rest: e.rest, microRest: e.microRest,
      repsUnit: e.repsUnit, weightUnit: e.weightUnit, extras: e.extras,
    };
  };

  const save = async () => {
    if (demo || !coachId) return;
    setSaving(true);
    try {
      const loaded = buildLoadedExercises();
      if (mode === "lab") {
        const exs: Ex[] = loaded.map((e, i) => ({
          id: e.id, group: abFromGroups(groups, loaded.length)[i]!, name: e.name,
          sets: String(e.series.length), reps: e.series[0]?.reps ?? "", weight: e.series[0]?.weight ?? "",
          series: e.series, notes: e.notes, rest: e.rest, microRest: e.microRest, repsUnit: e.repsUnit, weightUnit: e.weightUnit, extras: e.extras,
        }));
        const payload = { name: sessionName, category, minutes: estimatedMinutes, exercises: exs, circuits: customCircuits };
        if (recordId) await updateSessionTemplate({ id: recordId, ...payload });
        else { const id = await createSessionTemplate(coachId, payload); setRecordId(id); }
        toast.success("Plantilla guardada ✓");
        navigate({ to: "/lab" });
      } else if (mode === "team") {
        const items = loaded.map(toCalEx);
        if (recordId) {
          await patchTeamSessionGroup(recordId, { name: sessionName, status, minutes: estimatedMinutes, items, circuits: customCircuits });
        } else {
          const { data: members } = await supabase.from("team_members").select("athlete_id").eq("team_id", search.teamId!);
          const memberIds = (members ?? []).map((m) => m.athlete_id as string);
          const group = await addTeamSession(coachId, search.teamId!, memberIds, search.date ?? new Date().toISOString().slice(0, 10), { name: sessionName, minutes: estimatedMinutes, items, circuits: customCircuits });
          setRecordId(group.id);
        }
        toast.success("Sesión guardada ✓");
        navigate({ to: "/equipos", search: { equipo: search.teamId! } });
      } else if (mode === "athlete") {
        const items = loaded.map(toCalEx);
        const payload: DaySession = { id: recordId ?? uid(), name: sessionName, status, minutes: estimatedMinutes, items, circuits: customCircuits };
        if (recordId) await updateAthleteSession(payload);
        else await insertAthleteSession(coachId, search.athleteId!, search.date ?? new Date().toISOString().slice(0, 10), payload);
        toast.success("Sesión guardada ✓");
        navigate({ to: "/atletas/$athleteId", params: { athleteId: search.athleteId! } });
      } else if (mode === "program") {
        const week = Number(search.week ?? 0);
        const day = Number(search.day ?? 0);
        const exs = loaded.map((e, i) => ({
          id: e.id, name: e.name, sets: String(e.series.length), reps: e.series[0]?.reps ?? "", weight: e.series[0]?.weight ?? "",
          chained: chainFromGroups(groups, loaded.length)[i]!, series: e.series, notes: e.notes, rest: e.rest, microRest: e.microRest, repsUnit: e.repsUnit, weightUnit: e.weightUnit, extras: e.extras,
        }));
        await upsertProgramSession(coachId, search.programId!, week, day, Number(search.slot ?? 0), { name: sessionName, exercises: exs, circuits: customCircuits });
        toast.success("Sesión guardada ✓");
        navigate({ to: "/lab" });
      }
    } catch {
      toast.error("No se pudo guardar la sesión");
    } finally {
      setSaving(false);
    }
  };

  const saveAsTemplate = async () => {
    if (demo || !coachId) return;
    setSavingTemplate(true);
    try {
      const loaded = buildLoadedExercises();
      const exs: Ex[] = loaded.map((e, i) => ({
        id: uid(), group: abFromGroups(groups, loaded.length)[i]!, name: e.name,
        sets: String(e.series.length), reps: e.series[0]?.reps ?? "", weight: e.series[0]?.weight ?? "",
        series: e.series, notes: e.notes, rest: e.rest, microRest: e.microRest, repsUnit: e.repsUnit, weightUnit: e.weightUnit, extras: e.extras,
      }));
      await createSessionTemplate(coachId, {
        name: sessionName, category, minutes: estimatedMinutes,
        exercises: exs, circuits: customCircuits.map((c) => ({ ...c })),
      });
      toast.success("Guardado en Lab ✓");
    } catch {
      toast.error("No se pudo guardar en Lab");
    } finally {
      setSavingTemplate(false);
    }
  };

  const bodyHeight = demo ? `${demo.height - 56}px` : "calc(100vh - 56px)";
  const rootClass = demo
    ? "relative overflow-hidden bg-background"
    : "grid h-screen grid-cols-[240px_1fr] overflow-hidden bg-background";
  const rootStyle = demo ? { height: demo.height } : undefined;

  if (loading) {
    return (
      <div className={rootClass} style={rootStyle}>
        {demo ? null : <Sidebar />}
        <main />
      </div>
    );
  }

  return (
    <div className={rootClass} style={rootStyle}>
      {demo ? null : <Sidebar />}

      <div className={`flex min-w-0 flex-col ${demo ? "h-full" : "h-screen"}`}>
        <header className="flex h-14 shrink-0 items-center justify-between bg-surface" style={{ borderBottom: "1px solid #E2E8F0", padding: "0 20px" }}>
          <div className="flex min-w-0 items-center" style={{ gap: 6 }}>
            <button type="button" className="flex items-center" style={{ gap: 6, cursor: demo ? "default" : "pointer", background: "none", border: "none", padding: 0 }} onClick={demo ? undefined : goBack}>
              <ChevronLeft size={16} color="#64748B" />
              <span className="text-[13px]" style={{ color: "#64748B" }}>{mode === "team" ? "Equipos" : mode === "athlete" ? "Atleta" : "Lab"}</span>
            </button>
            <span className="text-[13px]" style={{ color: "#E2E8F0" }}>/</span>
            {headerSub ? (
              <span className="whitespace-nowrap text-[11px] font-medium" style={{ backgroundColor: "#F1F5F9", color: "#374151", padding: "3px 8px", borderRadius: 6 }}>{headerSub}</span>
            ) : null}
            {mode === "lab" ? (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LabSession["category"])}
                aria-label="Categoría"
                className="whitespace-nowrap text-[11px] font-medium"
                style={{ backgroundColor: "#F1F5F9", color: "#374151", padding: "3px 8px", borderRadius: 6, border: "none" }}
              >
                {["Fuerza", "Cardio", "Movilidad", "Circuito"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : null}
            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              aria-label="Nombre de la sesión"
              className="truncate text-[13px] font-semibold"
              style={{ color: "#0F172A", border: "none", outline: "none", background: "transparent", minWidth: 160 }}
            />
            {headerLabel && mode === "program" ? <span className="whitespace-nowrap text-[12px]" style={{ color: "#94A3B8" }}>· {headerLabel}</span> : null}
          </div>

          <div className="flex items-center" style={{ gap: 10 }}>
            {mode !== "lab" && !demo ? (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DaySession["status"])}
                aria-label="Estado"
                style={{ border: "1px solid #E2E8F0", borderRadius: 6, height: 30, padding: "0 8px", fontSize: 12, color: "#374151", backgroundColor: "#FFFFFF" }}
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicada</option>
                <option value="done">Completada</option>
              </select>
            ) : null}
            {mode === "athlete" && !demo ? (
              <button
                type="button"
                disabled={savingTemplate}
                onClick={saveAsTemplate}
                title="Guarda una copia reutilizable en Lab, sin afectar la sesión de este atleta"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", color: "#374151", borderRadius: 6, padding: "6px 16px", opacity: savingTemplate ? 0.6 : 1, cursor: savingTemplate ? "not-allowed" : "pointer" }}
              >
                {savingTemplate ? "Guardando…" : "Guardar en Lab"}
              </button>
            ) : null}
            {demo ? (
              <span className="whitespace-nowrap text-[12px] font-medium" style={{ backgroundColor: "#FEF9C3", color: "#854D0E", padding: "5px 10px", borderRadius: 6 }}>
                Modo prueba · no se guarda nada
              </span>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white"
                style={{ backgroundColor: "#111827", borderRadius: 6, padding: "6px 16px", opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
              >
                <Upload size={14} />
                {saving ? "Guardando…" : "Guardar sesión"}
              </button>
            )}
          </div>
        </header>

        <div className="grid min-h-0" style={{ gridTemplateColumns: "260px 1fr 240px", height: bodyHeight, overflow: "hidden" }}>
          <aside className="flex min-h-0 flex-col bg-surface" style={{ borderRight: "1px solid #E2E8F0" }}>
            <div style={{ padding: 16, borderBottom: "1px solid #E2E8F0" }}>
              <h2 className="text-[13px] font-semibold" style={{ color: "#0F172A" }}>Ejercicios</h2>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ padding: 8, gap: 4 }}>
              {groups.map((indices) =>
                indices.map((exIdx) => {
                  const ex = exercises[exIdx]!;
                  const st = exStates[exIdx];
                  const active = exIdx === activeExercise;
                  const chained = indices.length > 1;
                  return (
                    <div
                      key={ex.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectExercise(exIdx)}
                      onKeyDown={(e) => { if (e.key === "Enter") selectExercise(exIdx); }}
                      className="flex cursor-pointer items-center text-left"
                      style={{ gap: 8, padding: "8px 10px", borderRadius: 6, backgroundColor: active ? "#F1F5F9" : "transparent" }}
                    >
                      <GripVertical size={14} color="#CBD5E1" />
                      <span className="font-mono text-[11px] font-bold" style={{ color: chained ? "#6366F1" : "#94A3B8" }}>{blockLabels[exIdx]}</span>
                      <span className="flex-1 truncate text-[13px]" style={{ color: "#0F172A", fontWeight: active ? 600 : 400 }}>{ex.name}</span>
                      <span className="text-[11px]" style={{ color: "#94A3B8" }}>{st ? `${st.series.length} series` : ""}</span>
                      <button type="button" aria-label={`Eliminar ${ex.name}`} onClick={(e) => { e.stopPropagation(); removeExercise(exIdx); }} className="cursor-pointer text-[#CBD5E1] transition-colors hover:text-[#EF4444]"><Trash2 size={15} /></button>
                      <ChevronRight size={14} color={active ? "#111827" : "#CBD5E1"} />
                    </div>
                  );
                }),
              )}

              {customCircuits.map((c, i) => {
                const timer = circuitTimerLabel(c);
                return (
                  <button
                    key={`nav-${c.name}-${i}`}
                    type="button"
                    onClick={() => circuitRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="flex cursor-pointer items-center text-left"
                    style={{ gap: 8, padding: "8px 10px", borderRadius: 6 }}
                  >
                    <GripVertical size={14} color="#CBD5E1" />
                    <span className="font-mono text-[11px] font-bold" style={{ color: "#D97706" }}>C{i + 1}</span>
                    <span className="flex-1 truncate text-[13px]" style={{ color: "#0F172A" }}>{c.name}</span>
                    <span className="text-[11px]" style={{ color: "#94A3B8" }}>{timer || c.type.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col" style={{ padding: 12, borderTop: "1px solid #E2E8F0", gap: 8 }}>
              {["Agregar ejercicio", "Agregar circuito"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => (label === "Agregar ejercicio" ? openPickerFor(null) : (setEditingCircuit(null), setCircuitOpen(true)))}
                  className="inline-flex w-full items-center justify-center gap-1.5 text-[13px] transition-colors hover:bg-[#F8FAFC]"
                  style={{ border: "1px dashed #CBD5E1", backgroundColor: "transparent", color: "#64748B", borderRadius: 6, padding: 8 }}
                >
                  <Plus size={14} />{label}
                </button>
              ))}
            </div>

            {(mode === "athlete" || mode === "team") && realDate ? (
              <div className="shrink-0" style={{ borderTop: "1px solid #E2E8F0", padding: 12 }}>
                <h2 className="text-[12px] font-semibold" style={{ color: "#0F172A", marginBottom: 10 }}>Semana</h2>
                <div className="grid grid-cols-7" style={{ gap: 4 }}>
                  {weekDates(realDate).map(({ label, dateKey, dayNum }) => {
                    const st = weekStatus[dateKey];
                    const isCurrent = dateKey === realDate;
                    const bg = st === "done" ? "#111827" : st === "published" ? "#FFFBEB" : st === "draft" ? "#F8FAFC" : "transparent";
                    const border = st === "done" ? "1px solid #111827" : st === "published" ? "1px solid #D97706" : st === "draft" ? "1px dashed #CBD5E1" : "1px dashed #E2E8F0";
                    return (
                      <div key={dateKey} className="flex flex-col items-center" style={{ gap: 4 }}>
                        <span className="text-[9px] font-semibold" style={{ color: "#94A3B8" }}>{label}</span>
                        <span className="text-[11px]" style={{ color: "#64748B" }}>{dayNum}</span>
                        <span
                          title={st ?? "sin sesión"}
                          style={{ width: "100%", height: 20, borderRadius: 5, backgroundColor: bg, border, outline: isCurrent ? "2px solid #111827" : "none", outlineOffset: -1, color: st === "done" ? "#FFFFFF" : "#64748B" }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {mode === "program" ? (
              <div className="shrink-0" style={{ borderTop: "1px solid #E2E8F0", padding: 12 }}>
                <h2 className="text-[12px] font-semibold" style={{ color: "#0F172A", marginBottom: 10 }}>Semanas del programa</h2>
                <div className="grid" style={{ gridTemplateColumns: "24px repeat(7, 1fr)", gap: 3, alignItems: "center" }}>
                  <span />
                  {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                    <span key={d} className="text-center text-[9px] font-semibold" style={{ color: "#94A3B8" }}>{d}</span>
                  ))}
                  {Array.from({ length: programWeeks }, (_, w) => (
                    <Fragment key={`sem-${w}`}>
                      <span className="text-[10px] font-semibold" style={{ color: "#64748B" }}>S{w + 1}</span>
                      {Array.from({ length: 7 }, (_, d) => {
                        const key = `${w}-${d}`;
                        const has = programDays.has(key);
                        const current = String(search.week ?? 0) === String(w) && String(search.day ?? 0) === String(d);
                        return (
                          <span
                            key={key}
                            style={{ height: 18, borderRadius: 4, backgroundColor: current ? "#111827" : has ? "#F1F5F9" : "transparent", border: current ? "1px solid #111827" : has ? "1px solid #E2E8F0" : "1px dashed #E2E8F0" }}
                          />
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="shrink-0" style={{ borderTop: "1px solid #E2E8F0", padding: 12 }}>
              <h2 className="text-[12px] font-semibold" style={{ color: "#0F172A", marginBottom: 8 }}>Resumen</h2>
              <div style={{ fontSize: 12, color: "#64748B", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{totalExercises} {totalExercises === 1 ? "ejercicio" : "ejercicios"}</span>
                <span>~{estimatedMinutes} min estimados</span>
              </div>
            </div>
          </aside>

          <main className="min-h-0 min-w-0" style={{ backgroundColor: "#F8FAFC", overflowY: "scroll", height: "100%", boxSizing: "border-box", padding: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {groups.map((indices, gi) => {
                const groupActive = indices.includes(activeExercise);
                const canChain = gi < groups.length - 1;
                if (indices.length === 1) {
                  const exIdx = indices[0]!;
                  const ex = exercises[exIdx]!;
                  return (
                    <Fragment key={ex.id}>
                      <section
                        ref={(el) => { sectionRefs.current[exIdx] = el; }}
                        style={{ scrollMarginTop: 8, backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px", boxShadow: groupActive ? "0 0 0 2px #111827 inset" : undefined }}
                      >
                        {renderExerciseContent(exIdx, blockLabels[exIdx]!, false, true)}
                      </section>
                      {canChain && <ChainConnector onClick={() => chainGroups(gi)} />}
                    </Fragment>
                  );
                }
                return (
                  <Fragment key={`chained-${gi}`}>
                    <section style={{ backgroundColor: "#FFFFFF", border: "1px solid #DDD6FE", borderLeft: "3px solid #6366F1", borderRadius: 8, overflow: "hidden", boxShadow: groupActive ? "0 0 0 2px #6366F1 inset" : undefined }}>
                      {indices.map((exIdx, pos) => {
                        const ex = exercises[exIdx]!;
                        const st = exStates[exIdx]!;
                        const last = pos === indices.length - 1;
                        return (
                          <div key={ex.id}>
                            <div ref={(el) => { sectionRefs.current[exIdx] = el; }} style={{ scrollMarginTop: 8, padding: "10px 14px" }}>
                              {renderExerciseContent(exIdx, blockLabels[exIdx]!, true, last)}
                            </div>
                            {!last && (
                              <div style={{ position: "relative", height: 1, backgroundColor: "#EEF2FF" }}>
                                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                                  <div className="flex items-center gap-2" style={{ backgroundColor: "#FFFFFF", padding: "0 6px" }}>
                                    {st.microRest === null ? (
                                      <button type="button" aria-label="Agregar micro descanso" onClick={() => setExField(exIdx, "microRest", "15s")} className="flex cursor-pointer items-center justify-center"><Plus size={14} color="#6366F1" /></button>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        {microRestOptions.map((opt) => {
                                          const selected = opt === st.microRest;
                                          return (
                                            <button key={opt} type="button" onClick={() => setExField(exIdx, "microRest", opt)} className="rounded-full text-[10px]" style={{ padding: "2px 7px", backgroundColor: selected ? "#111827" : "#FFFFFF", color: selected ? "#FFFFFF" : "#64748B", border: "1px solid #DDD6FE" }}>{opt}</button>
                                          );
                                        })}
                                        <button type="button" aria-label="Quitar micro descanso" onClick={() => setExField(exIdx, "microRest", null)} className="text-[#CBD5E1] transition-colors hover:text-[#EF4444]"><X size={12} /></button>
                                      </div>
                                    )}
                                    <button type="button" aria-label="Desencadenar ejercicios" onClick={() => unchainGroup(gi)} className="cursor-pointer text-[#CBD5E1] transition-colors hover:text-[#EF4444]"><Unlink size={14} /></button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </section>
                    {canChain && <ChainConnector onClick={() => chainGroups(gi)} />}
                  </Fragment>
                );
              })}

              {customCircuits.map((c, i) => {
                const timer = circuitTimerLabel(c);
                const prefix = c.type === "EMOM" ? "M" : c.type === "TABATA" && c.tabataAlternate ? "S" : "E";
                const colHeadStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.4px", textAlign: "center", width: 64 };
                return (
                  <section
                    key={`${c.name}-${i}`}
                    ref={(el) => { circuitRefs.current[i] = el; }}
                    style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderLeft: "3px solid #D97706", borderRadius: 14, overflow: "hidden" }}
                  >
                    <div className="flex items-center" style={{ padding: "12px 16px", gap: 8, borderBottom: "1px solid #F1F5F9" }}>
                      <input
                        value={c.name}
                        aria-label={`Nombre del circuito ${i + 1}`}
                        onChange={(e) => renameCircuit(i, e.target.value)}
                        className="circuit-name-input text-[14px] font-semibold"
                        style={{ color: "#111827", background: "transparent", border: "1px solid transparent", borderRadius: 6, padding: "2px 6px", outline: "none", minWidth: 0, width: `${Math.max(8, (c.name || "Circuito").length + 1)}ch` }}
                      />
                      <span className="flex-1 truncate text-[12px]" style={{ color: "#94A3B8", whiteSpace: "nowrap" }}>{c.type.toUpperCase()}{timer ? ` · ${timer}` : ""}</span>
                      <button type="button" aria-label={`Editar circuito ${c.name}`} onClick={() => { setEditingCircuit(i); setCircuitOpen(true); }} className="cursor-pointer text-[#CBD5E1] transition-colors hover:text-[#111827]"><Settings2 size={16} /></button>
                      <div style={{ position: "relative" }}>
                        <button type="button" aria-label={`Eliminar circuito ${c.name}`} onClick={() => setConfirmDeleteCircuit(i)} className="cursor-pointer text-[#CBD5E1] transition-colors hover:text-[#111827]"><Trash2 size={16} /></button>
                        {confirmDeleteCircuit === i && (
                          <div style={{ position: "absolute", top: 26, right: 0, zIndex: 20, backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, width: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                            <p className="text-[13px] font-medium" style={{ color: "#111827", marginBottom: 10 }}>¿Eliminar circuito?</p>
                            <div className="flex items-center justify-end" style={{ gap: 8 }}>
                              <button type="button" onClick={() => setConfirmDeleteCircuit(null)} className="cursor-pointer text-[12px]" style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "5px 12px", color: "#374151", backgroundColor: "#FFFFFF" }}>Cancelar</button>
                              <button type="button" onClick={() => removeCircuit(i)} className="cursor-pointer text-[12px] font-semibold" style={{ border: "none", borderRadius: 8, padding: "5px 12px", color: "#FFFFFF", backgroundColor: "#EF4444" }}>Eliminar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center" style={{ backgroundColor: "#FEFCE8", borderBottom: "1px solid #FDE68A", padding: "4px 16px" }}>
                      <span style={{ flex: 1 }} />
                      <span style={colHeadStyle}>Reps</span>
                      <span style={colHeadStyle}>Kg</span>
                      <span style={{ width: 32 }} />
                    </div>

                    <div>
                      {c.exercises.map((ex, xi) => (
                        <div key={`${ex.name}-${xi}`} className="flex items-center" style={{ padding: "10px 16px", borderBottom: "1px solid #F8FAFC" }}>
                          <span className="font-mono text-[11px] font-bold" style={{ color: "#D97706", width: 24 }}>{prefix}{xi + 1}</span>
                          <span className="flex-1 truncate text-[13px] font-medium" style={{ color: "#111827" }}>{ex.name}</span>
                          <span className="text-[13px] text-center" style={{ width: 64, color: "#374151" }}>{ex.reps || "—"}</span>
                          <span className="text-[13px] text-center" style={{ width: 64, color: "#374151" }}>{ex.weight ? `${ex.weight} ${ex.unit}` : "—"}</span>
                          <div style={{ width: 32, display: "flex", justifyContent: "center" }}>
                            <button type="button" aria-label={`Eliminar ${ex.name}`} onClick={() => removeCircuitExercise(i, xi)} className="cursor-pointer text-[#CBD5E1] transition-colors hover:text-[#EF4444]"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {editingDesc === i ? (
                      <textarea
                        autoFocus
                        value={c.description}
                        onChange={(e) => setCircuitDescription(i, e.target.value)}
                        onBlur={() => setEditingDesc(null)}
                        aria-label={`Descripción del circuito ${c.name}`}
                        placeholder="Instrucciones para el atleta..."
                        className="text-[12px] italic"
                        style={{ width: "100%", minHeight: 60, border: "none", borderTop: "1px solid #F8FAFC", padding: "10px 16px", color: "#94A3B8", outline: "none", resize: "vertical", fontFamily: "inherit", backgroundColor: "#FFFFFF" }}
                      />
                    ) : (
                      <p onClick={() => setEditingDesc(i)} className="text-[12px] italic cursor-text" style={{ color: "#94A3B8", padding: "10px 16px", borderTop: "1px solid #F8FAFC", minHeight: 40 }}>
                        {c.description || "Agregar instrucciones para el atleta..."}
                      </p>
                    )}

                    <div className="flex items-center" style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9", gap: 8 }}>
                      <button type="button" onClick={() => openPickerFor(`custom-${i}`)} className="inline-flex cursor-pointer items-center text-[12px] transition-colors hover:text-[#111827]" style={{ color: "#94A3B8", gap: 4 }}>
                        <Plus size={12} />Agregar ejercicio
                      </button>
                    </div>
                  </section>
                );
              })}

              <div className="flex flex-col" style={{ gap: 8 }}>
                {["Agregar ejercicio", "Agregar circuito"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => (label === "Agregar ejercicio" ? openPickerFor(null) : (setEditingCircuit(null), setCircuitOpen(true)))}
                    className="inline-flex w-full items-center justify-center gap-1.5 text-[13px] transition-colors hover:bg-[#F1F5F9]"
                    style={{ border: "1px dashed #CBD5E1", backgroundColor: "transparent", color: "#64748B", borderRadius: 6, padding: 10 }}
                  >
                    <Plus size={14} />{label}
                  </button>
                ))}
              </div>
            </div>
          </main>

          <aside className="min-h-0 overflow-y-auto bg-surface" style={{ borderLeft: "1px solid #E2E8F0", padding: 16 }}>
            {mode === "athlete" ? (
              <>
                <section>
                  <h2 className="text-[12px] font-semibold" style={{ color: "#0F172A", marginBottom: 10 }}>Historial en este ejercicio</h2>
                  {!history || (!history.last && !history.pr) ? (
                    <p style={{ fontSize: 12, color: "#94A3B8" }}>Todavía no hay sesiones anteriores con este ejercicio para este atleta.</p>
                  ) : (
                    <>
                      {history.last ? (
                        <div className="flex items-center justify-between" style={{ padding: "6px 0", borderBottom: "1px solid #F8FAFC" }}>
                          <span className="text-[12px]" style={{ color: "#64748B" }}>Últ. sesión</span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold" style={{ color: "#0F172A" }}>{history.last.weight || "—"}kg × {history.last.reps}</span>
                            <span className="text-[11px]" style={{ color: "#94A3B8" }}>{relativeDay(history.last.date)}</span>
                          </span>
                        </div>
                      ) : null}
                      {history.pr ? (
                        <div className="flex items-center justify-between" style={{ padding: "6px 0", borderBottom: "1px solid #F8FAFC" }}>
                          <span className="text-[12px]" style={{ color: "#64748B" }}>Récord (PR)</span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold" style={{ color: "#0F172A" }}>{history.pr.weight}kg × {history.pr.reps}</span>
                            <Trophy size={12} color="#D97706" />
                          </span>
                        </div>
                      ) : null}
                    </>
                  )}
                </section>

                {history?.last && suggestNextLoad(history.last) ? (
                  <section style={{ marginTop: 20 }}>
                    <h2 className="text-[12px] font-semibold" style={{ color: "#0F172A", marginBottom: 8 }}>Próxima carga sugerida</h2>
                    <div className="text-[12px]" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", color: "#374151", lineHeight: 1.5 }}>
                      {suggestNextLoad(history.last)}
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}

            {exercises[activeExercise] ? (
              <section style={{ marginTop: mode === "athlete" ? 20 : 0 }}>
                <h2 className="text-[12px] font-semibold" style={{ color: "#0F172A", marginBottom: 8 }}>¿No tiene el equipo?</h2>
                {activeExerciseAlternatives.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#94A3B8" }}>
                    {libraryByName.has(exercises[activeExercise]!.name.trim().toLowerCase())
                      ? "No hay otro ejercicio del mismo patrón con otro equipamiento en tu biblioteca todavía."
                      : "Este ejercicio no está en tu biblioteca, así que no puedo sugerir alternativas por patrón de movimiento."}
                  </p>
                ) : (
                  <div className="flex flex-col" style={{ gap: 6 }}>
                    {activeExerciseAlternatives.map((alt) => (
                      <button
                        key={alt.name}
                        type="button"
                        onClick={() => renameExercise(activeExercise, alt.name)}
                        className="flex items-center justify-between text-left transition-colors hover:bg-[#F8FAFC]"
                        style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", background: "none", cursor: "pointer" }}
                      >
                        <span style={{ fontSize: 12, color: "#111827" }}>{alt.name}</span>
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>{alt.equipment}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </aside>
        </div>
      </div>

      {videoModal ? (
        <div role="presentation" onClick={() => setVideoModal(null)} className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 80 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(860px, 92vw)", aspectRatio: "16 / 9", position: "relative" }}>
            <button
              type="button"
              aria-label="Cerrar video"
              onClick={() => setVideoModal(null)}
              style={{ position: "absolute", top: -36, right: 0, background: "none", border: "none", cursor: "pointer", color: "#FFFFFF" }}
            >
              <X size={22} />
            </button>
            <iframe
              src={videoModal}
              title="Video del ejercicio"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: "none", borderRadius: 10 }}
            />
          </div>
        </div>
      ) : null}

      <ExercisePickerPanel
        open={pickerOpen}
        onClose={() => { setPickerOpen(false); setActiveBlockId(null); }}
        onAdd={addExerciseFromLibrary}
        demoLibrary={demo?.library}
      />
      <CircuitModal
        demoLibrary={demo?.library}
        open={circuitOpen}
        mode={editingCircuit === null ? "create" : "edit"}
        initial={editingCircuit === null ? null : (customCircuits[editingCircuit] ?? emptyCircuitConfig())}
        onClose={() => { setCircuitOpen(false); setEditingCircuit(null); }}
        onSubmit={submitCircuit}
      />
    </div>
  );
}
