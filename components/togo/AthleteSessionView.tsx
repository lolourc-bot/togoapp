import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  BarChart3,
  Calculator,
  CheckCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  MessageSquare,
  Pause,
  MoreHorizontal,
  MoreVertical,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { syncExerciseSets, completeSessionExecution } from "@/lib/session-execution";
import { youtubeVideoId } from "@/lib/exercise-data";
import { loadYoutubeIframeApi } from "@/lib/youtube-player";

export type SetRow = {
  reps: string;
  weight: string;
  done: boolean;
  note: string;
  noteOpen: boolean;
  manual?: boolean;
};
export type Exercise = { id: string; label: string; name: string; note?: string; suggestion: string; videoUrl?: string; sets: SetRow[] };
type CircuitType = "AMRAP" | "EMOM" | "TABATA" | "ASAP" | "Custom";
type CircuitItem = { name: string; reps: string };
type Circuit = {
  type: CircuitType;
  name: string;
  rounds: number;
  minutes: number;
  items: CircuitItem[];
};
export type Block = { letter: string; exercises: Exercise[]; circuit?: Circuit };

const CIRCUIT_HELP: Record<CircuitType, string> = {
  AMRAP: "Completá la mayor cantidad de rondas posibles. Anotá cuántas lográs.",
  EMOM: "Al inicio de cada minuto, completá los ejercicios. Descansá el tiempo que sobre.",
  TABATA: "20 seg de trabajo, 10 seg de descanso. 8 rondas en total.",
  ASAP: "Completá todas las rondas lo más rápido que puedas. El tiempo corre.",
  Custom: "Seguí las indicaciones de tu coach para este bloque.",
};


const s = (reps: string, weight: string, done = false): SetRow => ({
  reps,
  weight,
  done,
  note: "",
  noteOpen: false,
});


const REST_SECONDS = 90;

const HISTORY = [
  { date: "07 ago", weight: "70 kg", reps: "10, 10, 10, 8" },
  { date: "31 jul", weight: "67.5 kg", reps: "10, 10, 10, 10" },
  { date: "24 jul", weight: "65 kg", reps: "10, 10, 10, 9" },
  { date: "17 jul", weight: "65 kg", reps: "10, 10, 9, 9" },
  { date: "10 jul", weight: "62.5 kg", reps: "10, 10, 10, 10" },
];

const PERCENTS = [50, 60, 65, 70, 75, 80, 85, 90, 95, 100];

function BlockDots({
  total,
  current,
  done,
  onSelect,
}: {
  total: number;
  current: number;
  done: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ gap: 2, padding: "0 20px" }}
      aria-label="Progreso de bloques"
    >
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        const isDone = !isActive && i < done;
        return (
          // Transparent hit area around the dot; the dot itself stays a span so the brand layer's
          // button styles (shadow, radius) don't apply to it. Active block = short pill, others = small dots.
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Ir al bloque ${String.fromCharCode(65 + i)}`}
            aria-current={isActive ? "step" : undefined}
            className="flex items-center justify-center"
            style={{ minWidth: 14, height: 16, padding: "0 2px", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <span
              style={{
                width: isActive ? 14 : 6,
                height: 6,
                borderRadius: 999,
                backgroundColor: isActive ? "#111827" : isDone ? "#94A3B8" : "#E2E8F0",
                transition: "width 0.2s, background-color 0.2s",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

function SetRowView({
  index,
  row,
  onChange,
  onToggleDone,
  onDelete,
}: {
  index: number;
  row: SetRow;
  onChange: (patch: Partial<SetRow>) => void;
  onToggleDone: () => void;
  onDelete: () => void;
}) {
  const palette = row.done
    ? { bg: "#F0FDF4", border: "1px solid #BBF7D0", text: "#16A34A" }
    : { bg: "#F8FAFC", border: "1px solid #E2E8F0", text: "#0F172A" };

  return (
    <div
      className="flex items-center"
      style={{
        gap: 10,
        backgroundColor: palette.bg,
        border: palette.border,
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <button
        type="button"
        onClick={onToggleDone}
        aria-label={row.done ? `Desmarcar serie ${index + 1}` : `Marcar serie ${index + 1}`}
        className="flex shrink-0 items-center"
      >
        {row.done ? (
          <CheckCircle size={18} color="#16A34A" />
        ) : (
          <Circle size={18} color="#CBD5E1" />
        )}
      </button>
      <span
        className="text-[12px]"
        style={{
          color: palette.text,
          fontWeight: 600,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Serie {index + 1}
      </span>

      <input
        aria-label={`Reps serie ${index + 1}`}
        value={row.reps}
        onChange={(e) => onChange({ reps: e.target.value })}
        className="shrink-0 outline-none"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 6,
          width: 52,
          height: 32,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 600,
          color: "#0F172A",
        }}
      />
      <span className="shrink-0 text-[11px]" style={{ color: "#94A3B8" }}>
        reps
      </span>
      <span className="shrink-0 text-[12px]" style={{ color: "#CBD5E1" }}>
        ×
      </span>
      <input
        aria-label={`Peso serie ${index + 1}`}
        value={row.weight}
        onChange={(e) => onChange({ weight: e.target.value })}
        className="shrink-0 outline-none"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 6,
          width: 60,
          height: 32,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 600,
          color: "#0F172A",
        }}
      />
      <span className="shrink-0 text-[11px]" style={{ color: "#94A3B8" }}>
        kg
      </span>

      {/* Fixed 28px slot: keeps every row aligned whether deletable or not */}
      <div
        className="ml-auto flex shrink-0 items-center justify-center"
        style={{ width: 28, height: 28 }}
      >
        {row.manual && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Eliminar serie ${index + 1}`}
            className="flex h-full w-full items-center justify-center"
          >
            <X size={12} color="#CBD5E1" />
          </button>
        )}
      </div>
    </div>
  );
}

function ExerciseComment({
  note,
  open,
  onToggle,
  onChange,
}: {
  note: string;
  open: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  if (open) {
    return (
      <textarea
        autoFocus
        rows={3}
        placeholder="Añadir nota al ejercicio..."
        value={note}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onToggle}
        className="w-full outline-none"
        style={{
          marginTop: 8,
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 12,
          color: "#64748B",
          resize: "none",
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center"
      style={{ gap: 8, marginTop: 8, padding: "6px 0" }}
    >
      <MessageSquare size={14} color={note ? "#64748B" : "#CBD5E1"} className="shrink-0" />
      <span
        className="text-[12px] italic"
        style={{ color: note ? "#64748B" : "#CBD5E1", textAlign: "left" }}
      >
        {note || "Añadir nota al ejercicio..."}
      </span>
    </button>
  );
}


function RestButton({
  resting,
  remaining,
  onStart,
  onSkip,
}: {
  resting: boolean;
  remaining: number;
  onStart: () => void;
  onSkip: () => void;
}) {
  if (!resting) {
    return (
      <button
        type="button"
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 text-[15px] font-medium"
        style={{
          height: 56,
          borderRadius: 14,
          backgroundColor: "#F8FAFC",
          border: "1.5px solid #E2E8F0",
          color: "#0F172A",
          marginBottom: 10,
        }}
      >
        <Clock size={16} color="#94A3B8" />
        Iniciar descanso · {REST_SECONDS}s
      </button>
    );
  }

  const finished = remaining <= 0;
  const size = 140;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const left = Math.max(0, Math.min(1, remaining / REST_SECONDS));
  const mm = Math.floor(Math.max(0, remaining) / 60);
  const ss = String(Math.max(0, remaining) % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center" style={{ marginBottom: 10 }}>
      <button
        type="button"
        onClick={onSkip}
        aria-label="Saltar descanso"
        className="relative flex items-center justify-center"
        style={{ width: size, height: size, background: "transparent" }}
      >
        <svg width={size} height={size} className="absolute inset-0" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={finished ? "#16A34A" : "#111827"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={finished ? 0 : circumference * (1 - left)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 0.9s linear" }}
          />
        </svg>
        {finished ? (
          <span
            style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 400, color: "#16A34A" }}
          >
            ¡Listo!
          </span>
        ) : (
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 28,
              fontWeight: 300,
              lineHeight: 1,
              color: "#0F172A",
            }}
          >
            {mm}:{ss}
          </span>
        )}
      </button>
      <span
        className="mt-2 text-[11px]"
        style={{ color: "#CBD5E1", letterSpacing: "0.3px" }}
      >
        Toca para saltar
      </span>
    </div>
  );
}


function CircuitRow({ item, index }: { item: CircuitItem; index: number }) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");

  return (
    <div style={{ borderBottom: "1px solid #F1F5F9" }}>
      <div className="flex items-center" style={{ gap: 10, height: 64 }}>
        <span
          className="text-[13px] font-semibold"
          style={{ width: 20, color: "#94A3B8", flexShrink: 0 }}
        >
          {index + 1}.
        </span>
        {!open && (
          <button
            type="button"
            aria-label={`Ver video de ${item.name}`}
            onClick={() => setOpen(true)}
            className="flex shrink-0 items-center justify-center"
            style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: "#F1F5F9" }}
          >
            <Play size={20} color="#94A3B8" />
          </button>
        )}
        <span
          className="flex-1 text-[13px] font-medium"
          style={{ color: "#111827", minWidth: 0 }}
        >
          {item.name}
        </span>
        <span className="text-[12px] shrink-0" style={{ color: "#64748B" }}>
          {item.reps}
        </span>
        <input
          aria-label={`Peso ${item.name}`}
          inputMode="numeric"
          placeholder="— kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))}
          className="shrink-0 outline-none"
          style={{
            width: 52,
            height: 32,
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            textAlign: "center",
            fontSize: 13,
            color: "#0F172A",
          }}
        />
      </div>

      {open && (
        <button
          type="button"
          aria-label={`Cerrar video de ${item.name}`}
          onClick={() => setOpen(false)}
          className="flex w-full flex-col items-center justify-center gap-1"
          style={{
            height: 200,
            backgroundColor: "#F1F5F9",
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <Play size={40} color="#94A3B8" />
          <span className="text-[12px]" style={{ color: "#94A3B8" }}>
            {item.name}
          </span>
        </button>
      )}
    </div>
  );
}

function CircuitTimer({ type, minutes }: { type: CircuitType; minutes: number }) {
  const preset =
    type === "AMRAP"
      ? minutes * 60
      : type === "EMOM"
        ? 60
        : type === "TABATA"
          ? 20
          : 0;
  const mode: "up" | "down" | "none" =
    type === "Custom" ? "none" : type === "ASAP" ? "up" : "down";

  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(preset);
  const [phase, setPhase] = useState<"work" | "rest">("work");

  useEffect(() => {
    setRunning(false);
    setSeconds(preset);
    setPhase("work");
  }, [preset, type]);

  useEffect(() => {
    if (!running || mode === "none") return;
    const id = window.setInterval(() => {
      setSeconds((v) => {
        if (mode === "up") return v + 1;
        if (v > 1) return v - 1;
        // reached zero
        if (type === "EMOM") return 60;
        if (type === "TABATA") {
          setPhase((p) => (p === "work" ? "rest" : "work"));
          return phase === "work" ? 10 : 20;
        }
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, mode, type, phase]);

  if (mode === "none") return null;

  const finished = mode === "down" && type !== "EMOM" && type !== "TABATA" && seconds <= 0;
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  const accent = finished
    ? "#16A34A"
    : type === "TABATA" && phase === "rest"
      ? "#94A3B8"
      : "#D97706";

  return (
    <div className="flex flex-col items-center" style={{ marginTop: 16, gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#D97706", letterSpacing: "1px" }}>
        TIEMPO
      </span>
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 40,
          fontWeight: 300,
          lineHeight: 1,
          color: accent,
          animation: finished ? "pulse 1.2s ease-in-out infinite" : undefined,
        }}
      >
        {mm}:{ss}
      </span>
      {finished && (
        <span className="text-[12px]" style={{ color: "#16A34A" }}>
          ¡Tiempo!
        </span>
      )}
      <button
        type="button"
        onClick={() => setRunning((v) => !v)}
        aria-label={running ? "Pausar tiempo" : "Iniciar tiempo"}
        className="flex items-center justify-center"
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: `1.5px solid ${accent}`,
        }}
      >
        {running ? <Pause size={22} color={accent} /> : <Play size={22} color={accent} />}
      </button>
    </div>
  );
}


function CircuitComment() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (open) {
    return (
      <textarea
        autoFocus
        rows={3}
        placeholder="Agregar comentario al bloque..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => setOpen(false)}
        className="w-full outline-none"
        style={{
          marginTop: 12,
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 12,
          color: "#64748B",
          resize: "none",
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center"
      style={{ gap: 8, marginTop: 12, padding: "8px 0" }}
    >
      <MessageSquare size={14} color={note ? "#64748B" : "#CBD5E1"} />
      <span
        className="text-[12px] italic"
        style={{ color: note ? "#64748B" : "#CBD5E1", textAlign: "left" }}
      >
        {note || "Agregar comentario al bloque..."}
      </span>
    </button>
  );
}

function CircuitView({ circuit }: { circuit: Circuit }) {
  return (
    <div style={{ paddingTop: 8 }}>
      <div className="flex items-center" style={{ gap: 8 }}>
        <span
          className="text-[12px] font-bold"
          style={{
            backgroundColor: "#FFFBEB",
            color: "#D97706",
            borderRadius: 6,
            padding: "3px 10px",
          }}
        >
          {circuit.type}
        </span>
        <span className="text-[17px] font-semibold" style={{ color: "#111827" }}>
          {circuit.name}
        </span>
      </div>
      <div className="text-[13px] italic" style={{ color: "#64748B", marginTop: 4 }}>
        {CIRCUIT_HELP[circuit.type]}
      </div>

      <div style={{ marginTop: 12 }}>
        {circuit.items.map((item, i) => (
          <CircuitRow key={item.name} item={item} index={i} />
        ))}
      </div>

      <CircuitComment />
      <CircuitTimer type={circuit.type} minutes={circuit.minutes} />

    </div>
  );
}



function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(15,23,42,0.35)" }}
      />
      <div
        className="relative flex max-h-[70%] flex-col overflow-y-auto"
        style={{
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 16,
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[14px] font-semibold" style={{ color: "#0F172A" }}>
            {title}
          </span>
          <button type="button" onClick={onClose} aria-label="Cerrar hoja">
            <X size={16} color="#94A3B8" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}


/**
 * Exercise video slot. With a YouTube video: its thumbnail in a 16:9 frame (nothing cropped); tapping plays
 * it right there, muted, once, never leaving the app; tapping again stops it. Without a video: the
 * grey placeholder.
 *
 * Uses the IFrame Player API (same as the session editor) so captions can be unloaded, and keeps the
 * thumbnail over the player until YouTube's start-up logo has faded. The channel watermark can't be
 * removed from here; it's set per channel in YouTube Studio.
 */
function ExerciseVideo({ name, url }: { name: string; url?: string | undefined }) {
  const id = url ? youtubeVideoId(url) : null;
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing || !id || !holder.current) { setVisible(false); return; }
    // YT.Player swaps its target for an <iframe>; give it a node React doesn't manage.
    const mount = document.createElement("div");
    holder.current.appendChild(mount);
    let cancelled = false;
    let revealTimer = 0;
    let player: any = null;
    const hideCaptions = (p: any) => {
      try { p.unloadModule?.("captions"); p.unloadModule?.("cc"); } catch { /* not loaded yet */ }
    };
    loadYoutubeIframeApi().then((YT) => {
      if (cancelled) return;
      player = new YT.Player(mount, {
        videoId: id,
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, rel: 0, fs: 0, disablekb: 1, playsinline: 1,
          iv_load_policy: 3, cc_load_policy: 0, start: 2,
        },
        events: {
          onReady: (e: any) => {
            if (cancelled) return;
            const iframe = e.target.getIframe?.();
            if (iframe) { iframe.style.width = "100%"; iframe.style.height = "100%"; }
            e.target.mute();
            hideCaptions(e.target);
            e.target.playVideo();
          },
          onStateChange: (e: any) => {
            if (cancelled) return;
            if (e.data === 1) {
              hideCaptions(e.target);
              // Let YouTube's start-up logo fade before uncovering the player.
              if (!revealTimer) revealTimer = window.setTimeout(() => !cancelled && setVisible(true), 2600);
            }
            // Ended: back to the thumbnail (tearing the player down also keeps YouTube's end screen away).
            if (e.data === 0) setPlaying(false);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      setVisible(false);
      player?.destroy?.();
      mount.remove();
    };
  }, [playing, id]);

  if (!id || !url) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1"
        style={{ width: "100%", height: 160, backgroundColor: "#F1F5F9", borderRadius: 12, marginBottom: 12 }}
      >
        <Play size={32} color="#94A3B8" />
        <span className="text-[12px]" style={{ color: "#94A3B8" }}>
          Ver video
        </span>
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label={playing ? `Frenar video: ${name}` : `Reproducir video: ${name}`}
      onClick={() => setPlaying((p) => !p)}
      className="relative block w-full overflow-hidden"
      style={{ aspectRatio: "16 / 9", borderRadius: 12, marginBottom: 12, backgroundColor: "#0F172A", padding: 0, border: "none" }}
    >
      {/* player lives under the thumbnail; pointer-events off so it never opens YouTube or shows hover UI */}
      <div ref={holder} aria-hidden="true" className="absolute inset-0" style={{ pointerEvents: "none" }} />
      <img
        src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
        onError={(e) => {
          e.currentTarget.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        }}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: visible ? 0 : 1, transition: "opacity 0.4s" }}
      />
      {playing ? (
        visible ? null : (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
          </span>
        )
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-black/15">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
            <Play size={22} className="ml-0.5 text-[#011726]" fill="currentColor" />
          </span>
        </span>
      )}
    </button>
  );
}

export type AthleteSessionMeta = { id: string; coachId: string; name: string };

/**
 * The athlete's live session screen (sets, weights, rest timer). Fills its parent; the route wraps it in
 * a 375×812 card. With `demo`, nothing is saved and nothing navigates, so the landing can embed the
 * real screen with sample data.
 */
export function AthleteSessionView({
  meta: sessionMeta,
  initialBlocks,
  demo = false,
}: {
  meta: AthleteSessionMeta;
  initialBlocks: Block[];
  demo?: boolean;
}) {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [current, setCurrent] = useState(0);
  const [resting, setResting] = useState(false);
  const [remaining, setRemaining] = useState(REST_SECONDS);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [sheet, setSheet] = useState<null | { kind: "swap" | "history" | "calc"; exIdx: number }>(
    null,
  );
  const [allDoneFor, setAllDoneFor] = useState<Record<string, boolean>>({});
  const [exNotes, setExNotes] = useState<Record<string, string>>({});
  const [exNoteOpen, setExNoteOpen] = useState<Record<string, boolean>>({});
  const [oneRm, setOneRm] = useState("100");
  const touchX = useRef<number | null>(null);


  useEffect(() => {
    if (!resting) return;
    const id = window.setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [resting]);

  const block = blocks[current]!;
  const doneBlocks = blocks.findIndex((b) => b.exercises.some((e) => e.sets.some((x) => !x.done)));

  const go = (dir: 1 | -1) => setCurrent((c) => Math.min(blocks.length - 1, Math.max(0, c + dir)));

  const patchBlock = (fn: (b: Block) => Block) =>
    setBlocks((prev) => prev.map((b, bi) => (bi !== current ? b : fn(b))));

  const patchExercise = (exIdx: number, fn: (e: Exercise) => Exercise) =>
    patchBlock((b) => {
      const exercises = b.exercises.map((e, ei) => (ei === exIdx ? fn(e) : e));
      const changed = exercises[exIdx]!;
      if (!demo) {
        syncExerciseSets(sessionMeta.coachId, sessionMeta.id, changed.id, changed.sets).catch(() =>
          toast.error("No se pudo guardar"),
        );
      }
      return { ...b, exercises };
    });

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<SetRow>) =>
    patchExercise(exIdx, (e) => ({
      ...e,
      sets: e.sets.map((x, si) => (si === setIdx ? { ...x, ...patch } : x)),
    }));

  const addSet = (exIdx: number) =>
    patchExercise(exIdx, (e) => ({ ...e, sets: [...e.sets, { ...s("", ""), manual: true }] }));

  const deleteSet = (exIdx: number, setIdx: number) =>
    patchExercise(exIdx, (e) => ({ ...e, sets: e.sets.filter((_, si) => si !== setIdx) }));


  const toggleAll = (exIdx: number) => {
    const key = `${current}-${exIdx}`;
    const allDone = block.exercises[exIdx]?.sets.every((x) => x.done) ?? false;
    if (allDone) {
      patchExercise(exIdx, (e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, done: false })) }));
      setAllDoneFor((prev) => ({ ...prev, [key]: false }));
      return;
    }
    patchExercise(exIdx, (e) => {
      const first = e.sets[0];
      return {
        ...e,
        sets: e.sets.map((x) => ({
          ...x,
          reps: x.reps || first?.reps || "",
          weight: x.weight || first?.weight || "",
          done: true,
        })),
      };
    });
    setAllDoneFor((prev) => ({ ...prev, [key]: true }));
  };


  const completeBlock = () => {
    patchBlock((b) => ({
      ...b,
      exercises: b.exercises.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, done: true })) })),
    }));
    if (current === blocks.length - 1) {
      if (demo) return;
      completeSessionExecution(sessionMeta.coachId, sessionMeta.id)
        .catch(() => toast.error("No se pudo marcar la sesión como completada"))
        .finally(() => navigate({ to: "/celebracion", search: { sessionId: sessionMeta.id } }));
      return;
    }
    setCurrent((c) => Math.min(blocks.length - 1, c + 1));
  };

  const oneRmNum = Number(oneRm) || 0;

  return (
      <div
        className="relative flex h-full flex-col"
        style={{ backgroundColor: "#FFFFFF", overflow: "hidden" }}
      >
        {/* TOP BAR */}
        <div className="flex items-center justify-between" style={{ padding: "16px 20px" }}>
          {demo ? (
            <X size={18} color="#94A3B8" />
          ) : (
            <Link to="/hoy" aria-label="Cerrar sesión de entrenamiento">
              <X size={18} color="#94A3B8" />
            </Link>
          )}
          <div className="flex flex-col items-center">
            <span className="text-[13px] font-normal" style={{ color: "#64748B" }}>
              {sessionMeta.name}
            </span>
            <span
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 15,
                fontWeight: 400,
                color: "#64748B",
              }}
            >
              00:34:22
            </span>
          </div>
          <MoreHorizontal size={18} color="#94A3B8" />
        </div>

        <BlockDots
          total={blocks.length}
          current={current}
          done={doneBlocks === -1 ? blocks.length : doneBlocks}
          onSelect={setCurrent}
        />

        {/* SWIPEABLE CONTENT */}
        <div
          className="relative flex-1 overflow-y-auto"
          style={{
            // Room for the home indicator, and a soft fade at the bottom edge so content scrolling under the
            // screen's rounded corners (or the nav bar) fades out instead of being cut off.
            padding: "0 20px calc(32px + env(safe-area-inset-bottom))",
            WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 28px), transparent)",
            maskImage: "linear-gradient(to bottom, #000 calc(100% - 28px), transparent)",
          }}
          onTouchStart={(e) => {
            touchX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchX.current;
            const end = e.changedTouches[0]?.clientX ?? null;
            if (start == null || end == null) return;
            const dx = end - start;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <button
            type="button"
            aria-label="Bloque anterior"
            onClick={() => go(-1)}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2"
            style={{ padding: 2 }}
          >
            <ChevronLeft size={18} color="#CBD5E1" />
          </button>
          <button
            type="button"
            aria-label="Bloque siguiente"
            onClick={() => go(1)}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2"
            style={{ padding: 2 }}
          >
            <ChevronRight size={18} color="#CBD5E1" />
          </button>

          {block.circuit && <CircuitView circuit={block.circuit} />}

          {block.exercises.map((ex, exIdx) => (

            <div key={ex.label}>
              {exIdx > 0 && (
                <div style={{ height: 1, backgroundColor: "#F1F5F9", margin: "16px 0" }} />
              )}

              <div
                className="sticky top-0 z-[5]"
                style={{ backgroundColor: "#FFFFFF", padding: "8px 0" }}
              >
                <span className="font-mono text-[11px] font-bold" style={{ color: "#94A3B8" }}>
                  {ex.label}
                </span>
                <div className="flex items-center" style={{ gap: 6 }}>
                  <span className="text-[12px] font-semibold" style={{ color: "#0F172A" }}>
                    {ex.name}
                  </span>
                  <button
                    type="button"
                    aria-label="Cambiar ejercicio"
                    onClick={() => setSheet({ kind: "swap", exIdx })}
                    className="flex items-center"
                  >
                    <ArrowLeftRight size={13} color="#CBD5E1" />
                  </button>
                  <div className="relative ml-auto flex items-center" style={{ gap: 8 }}>

                    <button
                      type="button"
                      aria-label="Más opciones"
                      onClick={() => setMenuFor(menuFor === exIdx ? null : exIdx)}
                    >
                      <MoreVertical size={16} color="#CBD5E1" />
                    </button>
                    {menuFor === exIdx && (
                      <div
                        className="absolute right-0 top-full z-20 flex flex-col"
                        style={{
                          marginTop: 6,
                          minWidth: 210,
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: 10,
                          boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                          padding: 4,
                        }}
                      >
                        <button
                          type="button"
                          className="flex items-center gap-2 text-left text-[12px]"
                          style={{ padding: "8px 10px", color: "#0F172A" }}
                          onClick={() => {
                            setMenuFor(null);
                            setSheet({ kind: "history", exIdx });
                          }}
                        >
                          <BarChart3 size={13} color="#94A3B8" />
                          Historial del ejercicio
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 text-left text-[12px]"
                          style={{ padding: "8px 10px", color: "#0F172A" }}
                          onClick={() => {
                            setMenuFor(null);
                            setSheet({ kind: "calc", exIdx });
                          }}
                        >
                          <Calculator size={13} color="#94A3B8" />
                          Calculador de porcentajes
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {ex.suggestion ? (
                  <div className="text-[11px] italic" style={{ color: "#64748B", marginTop: 4 }}>
                    💡 Sugerencia: {ex.suggestion}
                  </div>
                ) : null}
              </div>

              <ExerciseVideo name={ex.name} url={ex.videoUrl} />

              {ex.note && (
                <div
                  className="flex items-center gap-2"
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginBottom: 12,
                  }}
                >
                  <MessageSquare size={13} color="#94A3B8" className="shrink-0" />
                  <span className="text-[12px] italic" style={{ color: "#64748B" }}>
                    {ex.note}
                  </span>
                </div>
              )}

              <button
                type="button"
                aria-label="Marcar todas las series"
                onClick={() => toggleAll(exIdx)}
                className="flex items-center justify-center"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: `1.5px solid ${allDoneFor[`${current}-${exIdx}`] ? "#16A34A" : "#CBD5E1"}`,
                  backgroundColor: allDoneFor[`${current}-${exIdx}`] ? "#F0FDF4" : "#FFFFFF",
                  marginLeft: 11,
                  marginBottom: 6,
                }}
              >
                <CheckCheck
                  size={12}
                  color={allDoneFor[`${current}-${exIdx}`] ? "#16A34A" : "#CBD5E1"}
                />
              </button>

              <div className="flex flex-col" style={{ gap: 8 }}>
                {ex.sets.map((row, si) => (
                  <SetRowView
                    key={si}
                    index={si}
                    row={row}
                    onChange={(patch) => updateSet(exIdx, si, patch)}
                    onToggleDone={() => updateSet(exIdx, si, { done: !row.done })}
                    onDelete={() => deleteSet(exIdx, si)}
                  />
                ))}
              </div>

              <ExerciseComment
                note={exNotes[`${current}-${exIdx}`] ?? ""}
                open={Boolean(exNoteOpen[`${current}-${exIdx}`])}
                onToggle={() =>
                  setExNoteOpen((prev) => ({
                    ...prev,
                    [`${current}-${exIdx}`]: !prev[`${current}-${exIdx}`],
                  }))
                }
                onChange={(v) =>
                  setExNotes((prev) => ({ ...prev, [`${current}-${exIdx}`]: v }))
                }
              />




              <button
                type="button"
                onClick={() => addSet(exIdx)}
                className="flex items-center gap-1 text-[12px]"
                style={{ color: "#94A3B8", marginTop: 8 }}
              >
                <Plus size={12} color="#94A3B8" />
                Serie
              </button>
            </div>
          ))}

          {/* BLOCK ACTIONS — part of the scroll, after the last exercise */}
          <div style={{ paddingTop: 20 }}>
          <RestButton
            resting={resting}
            remaining={remaining}
            onStart={() => {
              setRemaining(REST_SECONDS);
              setResting(true);
            }}
            onSkip={() => setResting(false)}
          />
          <button
            type="button"
            onClick={completeBlock}
            className="w-full text-[16px] font-semibold text-white"
            style={{ backgroundColor: "#111827", borderRadius: 12, height: 52 }}
          >
            Completar bloque
          </button>
          </div>
        </div>

        {sheet?.kind === "swap" && (
          <Sheet title="Cambiar ejercicio" onClose={() => setSheet(null)}>
            <div
              className="mb-3 flex items-center gap-2"
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <Search size={13} color="#94A3B8" />
              <input
                placeholder="Buscar ejercicio..."
                className="w-full text-[12px] outline-none"
                style={{ color: "#0F172A" }}
              />
            </div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {["Alternativa 1", "Alternativa 2", "Alternativa 3"].map((alt) => (
                <div
                  key={alt}
                  className="flex items-center justify-between"
                  style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px" }}
                >
                  <span className="text-[12px]" style={{ color: "#94A3B8" }}>
                    {alt}
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[11px] font-medium"
                    style={{
                      color: "#0F172A",
                      border: "1px solid #E2E8F0",
                      borderRadius: 6,
                      padding: "4px 8px",
                    }}
                  >
                    <ArrowLeftRight size={12} color="#94A3B8" />
                    Cambiar
                  </button>
                </div>
              ))}
            </div>
          </Sheet>
        )}

        {sheet?.kind === "history" && (
          <Sheet title="Historial del ejercicio" onClose={() => setSheet(null)}>
            <svg viewBox="0 0 300 90" width="100%" height="90" aria-hidden="true">
              <polyline
                points="10,70 80,58 150,44 220,38 290,22"
                fill="none"
                stroke="#111827"
                strokeWidth="2"
              />
              {[
                [10, 70],
                [80, 58],
                [150, 44],
                [220, 38],
                [290, 22],
              ].map(([x, y]) => (
                <circle key={`${x}`} cx={x} cy={y} r="3" fill="#111827" />
              ))}
            </svg>
            <div className="mt-2 flex flex-col">
              {HISTORY.map((h) => (
                <div
                  key={h.date}
                  className="flex items-center justify-between"
                  style={{ padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}
                >
                  <span className="text-[12px]" style={{ color: "#64748B" }}>
                    {h.date}
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: "#0F172A" }}>
                    {h.weight}
                  </span>
                  <span className="text-[11px]" style={{ color: "#94A3B8" }}>
                    {h.reps}
                  </span>
                </div>
              ))}
            </div>
          </Sheet>
        )}

        {sheet?.kind === "calc" && (
          <Sheet title="Calculador de porcentajes" onClose={() => setSheet(null)}>
            <div className="mb-3 flex items-center gap-2">
              <input
                aria-label="1RM en kg"
                value={oneRm}
                onChange={(e) => setOneRm(e.target.value.replace(/[^\d.]/g, ""))}
                className="outline-none"
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                  width: 90,
                  height: 36,
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0F172A",
                }}
              />
              <span className="text-[12px]" style={{ color: "#64748B" }}>
                kg (1RM)
              </span>
            </div>
            <div className="flex flex-col">
              {PERCENTS.map((p) => (
                <div
                  key={p}
                  className="flex items-center justify-between"
                  style={{ padding: "7px 0", borderBottom: "1px solid #F1F5F9" }}
                >
                  <span className="text-[12px]" style={{ color: "#64748B" }}>
                    {p}%
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: "#0F172A" }}>
                    {((oneRmNum * p) / 100).toFixed(1)} kg
                  </span>
                </div>
              ))}
            </div>
          </Sheet>
        )}
      </div>
  );
}
