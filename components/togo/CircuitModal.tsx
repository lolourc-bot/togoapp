import { useEffect, useState } from "react";
import { Check, GripVertical, Link, Play, Trash2 } from "lucide-react";
import { fetchLibraryExercises, type LibraryExercise } from "@/lib/exercise-data";
import { getCoachId } from "@/lib/programs";

export type CircuitType = "AMRAP" | "EMOM" | "TABATA" | "ASAP" | "Custom";

export type CircuitExercise = {
  name: string;
  reps: string;
  weight: string;
  unit: "kg" | "lb";
  video?: string;
};

export type CircuitConfig = {
  name: string;
  type: CircuitType;
  summary: string;
  description: string;
  /** AMRAP / ASAP list, or EMOM interval slots, or TABATA series slots. */
  exercises: CircuitExercise[];
  tabataAlternate: boolean;
  emomRepeat: boolean;
  tabataRepeat: boolean;
  amrapSeconds: number;
  emomInterval: number;
  emomRounds: number;
  work: number;
  rest: number;
  tabataRounds: number;
};

const TYPES: CircuitType[] = ["AMRAP", "EMOM", "TABATA", "ASAP", "Custom"];

const fmt = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const ex = (name: string, reps: string): CircuitExercise => ({
  name,
  reps,
  weight: "",
  unit: "kg",
});

const DEFAULTS: Record<CircuitType, CircuitExercise[]> = {
  AMRAP: [ex("Sentadilla con barra", "10"), ex("Press de banca", "8")],
  ASAP: [ex("Thruster", "21"), ex("Pull-up", "21"), ex("Thruster", "15")],
  EMOM: [ex("Pull-up", "5"), ex("Kettlebell swing", "15"), ex("Box jump", "10")],
  TABATA: [ex("Burpee", "5"), ex("Sentadilla", "10")],
  Custom: [],
};

const TYPE_INSTRUCTIONS: Record<CircuitType, string> = {
  AMRAP:
    "Completá tantas rondas como puedas de la secuencia de ejercicios dentro del tiempo total. Cuidá la técnica y anotá las rondas terminadas.",
  EMOM:
    "Cada intervalo arranca con el reloj: hacé las repeticiones indicadas y descansá el tiempo que sobre hasta el próximo intervalo.",
  TABATA:
    "Trabajá a máxima intensidad durante el tiempo de trabajo y descansá lo indicado. Repetí hasta completar todas las rondas.",
  ASAP:
    "Completá todos los ejercicios en el menor tiempo posible, en el orden indicado. Registrá el tiempo final.",
  Custom: "",
};

const isAutoInstruction = (text: string) =>
  text.trim() === "" || Object.values(TYPE_INSTRUCTIONS).some((t) => t === text);


export const emptyCircuitConfig = (): CircuitConfig => ({
  name: "",
  type: "AMRAP",
  summary: "",
  description: TYPE_INSTRUCTIONS.AMRAP,
  exercises: DEFAULTS.AMRAP.map((e) => ({ ...e })),
  tabataAlternate: true,
  emomRepeat: true,
  tabataRepeat: true,
  amrapSeconds: 20 * 60,
  emomInterval: 60,
  emomRounds: 10,
  work: 20,
  rest: 10,
  tabataRounds: 8,
});

export const circuitTimerLabel = (c: CircuitConfig) => {
  if (c.type === "AMRAP") return fmt(c.amrapSeconds);
  if (c.type === "EMOM") return `${fmt(c.emomInterval)} × ${c.emomRounds}`;
  if (c.type === "TABATA") return `${c.work}s / ${c.rest}s × ${c.tabataRounds}`;
  return "";
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#374151",
};

const textInput: React.CSSProperties = {
  height: 36,
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  padding: "0 12px",
  fontSize: 13,
  color: "#374151",
  outline: "none",
};

function Stepper({
  label,
  display,
  onDec,
  onInc,
}: {
  label: string;
  display: string;
  onDec: () => void;
  onInc: () => void;
}) {
  const btn: React.CSSProperties = {
    width: 32,
    height: 32,
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    color: "#374151",
    cursor: "pointer",
    fontSize: 15,
    lineHeight: 1,
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...labelStyle, marginBottom: 6 }}>{label}</div>
      <div className="flex items-center" style={{ gap: 10 }}>
        <button type="button" aria-label={`Reducir ${label}`} onClick={onDec} style={btn}>
          –
        </button>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#111827",
            minWidth: 56,
            textAlign: "center",
          }}
        >
          {display}
        </span>
        <button type="button" aria-label={`Aumentar ${label}`} onClick={onInc} style={btn}>
          +
        </button>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Alternar ejercicios entre series"
      onClick={() => onChange(!on)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        backgroundColor: on ? "#D97706" : "#E2E8F0",
        position: "relative",
        transition: "background-color 150ms",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          transition: "left 150ms",
        }}
      />
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center"
      style={{ gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer" }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          border: "1px solid #E2E8F0",
          borderRadius: 4,
          backgroundColor: checked ? "#111827" : "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {checked && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
      </span>
      <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
    </button>
  );
}

export function CircuitModal({
  open,
  onClose,
  onSubmit,
  initial,
  mode = "create",
  demoLibrary,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: CircuitConfig) => void;
  initial?: CircuitConfig | null;
  mode?: "create" | "edit";
  /** Landing demo: search this library instead of loading the coach's. */
  demoLibrary?: LibraryExercise[] | undefined;
}) {
  const [cfg, setCfg] = useState<CircuitConfig>(initial ?? emptyCircuitConfig());
  const [videoOpen, setVideoOpen] = useState<number | null>(null);
  const [videoDraft, setVideoDraft] = useState("");
  const [searchOpen, setSearchOpen] = useState<number | null>(null);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);

  useEffect(() => {
    if (demoLibrary) {
      setLibrary(demoLibrary);
      return;
    }
    getCoachId().then((cid) => {
      if (cid) fetchLibraryExercises(cid).then(setLibrary);
    });
  }, [demoLibrary]);

  useEffect(() => {
    if (open)
      setCfg(
        initial
          ? { ...initial, exercises: initial.exercises.map((e) => ({ ...e })) }
          : emptyCircuitConfig(),
      );
  }, [open, initial]);

  if (!open) return null;

  const set = <K extends keyof CircuitConfig>(key: K, value: CircuitConfig[K]) =>
    setCfg((p) => ({ ...p, [key]: value }));

  const setType = (t: CircuitType) =>
    setCfg((p) => ({
      ...p,
      type: t,
      exercises: p.exercises.length ? p.exercises : DEFAULTS[t].map((e) => ({ ...e })),
      description: isAutoInstruction(p.description) ? TYPE_INSTRUCTIONS[t] : p.description,
    }));

  const updateEx = (i: number, key: keyof CircuitExercise, value: string) =>
    setCfg((p) => ({
      ...p,
      exercises: p.exercises.map((e, x) => (x === i ? { ...e, [key]: value } : e)),
    }));

  const toggleUnit = (i: number) =>
    setCfg((p) => ({
      ...p,
      exercises: p.exercises.map((e, x) =>
        x === i ? { ...e, unit: e.unit === "kg" ? "lb" : "kg" } : e,
      ),
    }));

  const removeEx = (i: number) =>
    setCfg((p) => ({ ...p, exercises: p.exercises.filter((_, x) => x !== i) }));

  const addEx = () => setCfg((p) => ({ ...p, exercises: [...p.exercises, ex("", "")] }));

  const desc: React.CSSProperties = { fontSize: 11, color: "#94A3B8" };
  const note: React.CSSProperties = { fontSize: 11, color: "#94A3B8", fontStyle: "italic" };
  const warn: React.CSSProperties = { fontSize: 11, color: "#D97706", fontStyle: "italic" };

  const summary = () => {
    if (cfg.type === "AMRAP") return `AMRAP · ${fmt(cfg.amrapSeconds)}`;
    if (cfg.type === "EMOM") return `EMOM · ${fmt(cfg.emomInterval)} × ${cfg.emomRounds} rondas`;
    if (cfg.type === "TABATA")
      return `TABATA · ${fmt(cfg.work)}/${fmt(cfg.rest)} × ${cfg.tabataRounds}`;
    if (cfg.type === "ASAP") return "ASAP · tiempo hacia arriba";
    return "Custom · sin temporizador";
  };

  const trashBtn = (onClick: () => void, label: string, disabled = false) => (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={
        disabled
          ? "text-[#E2E8F0]"
          : "cursor-pointer text-[#CBD5E1] transition-colors hover:text-[#EF4444]"
      }
      style={{ background: "none", border: "none", padding: 0 }}
    >
      <Trash2 size={14} />
    </button>
  );

  const repsInput = (i: number, ariaSuffix: string) => (
    <input
      value={cfg.exercises[i]?.reps ?? ""}
      onChange={(e) => updateEx(i, "reps", e.target.value)}
      placeholder="10"
      aria-label={`Reps ${ariaSuffix}`}
      style={{ ...textInput, width: 72, textAlign: "center", padding: 0 }}
    />
  );

  const weightField = (i: number, ariaSuffix: string) => (
    <div className="flex flex-col items-center" style={{ gap: 2 }}>
      <input
        value={cfg.exercises[i]?.weight ?? ""}
        onChange={(e) => updateEx(i, "weight", e.target.value)}
        placeholder="Peso"
        aria-label={`Peso ${ariaSuffix}`}
        style={{
          ...textInput,
          width: 80,
          height: 36,
          padding: "0 10px",
          textAlign: "center",
        }}
      />
      <button
        type="button"
        onClick={() => toggleUnit(i)}
        aria-label={`Cambiar unidad ${ariaSuffix}`}
        className="cursor-pointer transition-colors hover:text-[#111827]"
        style={{ background: "none", border: "none", padding: 0, fontSize: 10, color: "#94A3B8" }}
      >
        {cfg.exercises[i]?.unit === "lb" ? "lb / kg" : "kg / lb"}
      </button>
    </div>
  );

  const exerciseRow = (i: number, ariaSuffix: string, _disabledTrash = false) => {
    const video = cfg.exercises[i]?.video ?? "";
    const open = videoOpen === i;
    const name = cfg.exercises[i]?.name ?? "";
    const q = name.trim().toLowerCase();
    const matches =
      searchOpen === i && q.length > 0
        ? library.filter(
            (e) =>
              e.name.toLowerCase() !== q &&
              (e.name.toLowerCase().includes(q) ||
                e.pattern.toLowerCase().includes(q) ||
                e.equipment.toLowerCase().includes(q)),
          ).slice(0, 6)
        : [];
    return (
      <div className="flex flex-col" style={{ marginBottom: 10 }}>
        <div className="flex items-start" style={{ gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#D97706",
              width: 22,
              paddingTop: 11,
            }}
          >
            E{i + 1}
          </span>
          <div style={{ paddingTop: 10 }}>
            <GripVertical size={14} color="#CBD5E1" />
          </div>
          <div className="relative flex flex-col" style={{ flex: 1, gap: 4 }}>
            <input
              value={name}
              onChange={(e) => {
                updateEx(i, "name", e.target.value);
                setSearchOpen(i);
              }}
              onFocus={() => setSearchOpen(i)}
              onBlur={() => window.setTimeout(() => setSearchOpen((s) => (s === i ? null : s)), 150)}
              placeholder="Buscar ejercicio..."
              aria-label={`Ejercicio ${ariaSuffix}`}
              style={{ ...textInput, width: "100%" }}
            />
            {matches.length ? (
              <div
                className="absolute"
                style={{
                  top: 40,
                  left: 0,
                  right: 0,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  padding: 4,
                  zIndex: 40,
                }}
              >
                {matches.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      updateEx(i, "name", m.name);
                      setSearchOpen(null);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between rounded-[8px] transition-colors hover:bg-[#F8FAFC]"
                    style={{
                      background: "none",
                      border: "none",
                      padding: "7px 10px",
                      fontSize: 13,
                      color: "#374151",
                      textAlign: "left",
                    }}
                  >
                    <span>{m.name}</span>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>{m.equipment}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {video ? (
              <a
                href={video}
                target="_blank"
                rel="noreferrer"
                className="self-start rounded-[4px]"
                style={{
                  fontSize: 10,
                  color: "#3B82F6",
                  backgroundColor: "#EFF6FF",
                  padding: "1px 6px",
                  cursor: "pointer",
                }}
              >
                ▶ Ver video
              </a>
            ) : null}
          </div>
          {repsInput(i, ariaSuffix)}
          {weightField(i, ariaSuffix)}
          <div style={{ paddingTop: 10 }}>
            <button
              type="button"
              title="Agregar video de referencia"
              aria-label={`Agregar video de referencia ${ariaSuffix}`}
              onClick={() => {
                setVideoDraft(video);
                setVideoOpen(open ? null : i);
              }}
              className="cursor-pointer"
              style={{ background: "none", border: "none", padding: 0 }}
            >
              <Link size={14} color={video ? "#3B82F6" : "#CBD5E1"} />
            </button>
          </div>
          <div style={{ paddingTop: 10 }}>
            {trashBtn(() => removeEx(i), `Eliminar ejercicio ${ariaSuffix}`, false)}
          </div>
        </div>
        {open ? (
          <div className="relative" style={{ marginTop: 6 }}>
            <Play
              size={13}
              color="#CBD5E1"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              autoFocus
              value={videoDraft}
              onChange={(e) => setVideoDraft(e.target.value)}
              placeholder="https://youtube.com/... o enlace al video"
              aria-label={`Enlace de video ${ariaSuffix}`}
              style={{
                width: "100%",
                height: 36,
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                padding: "0 70px 0 32px",
                fontSize: 12,
                color: "#374151",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => {
                updateEx(i, "video", videoDraft.trim());
                setVideoOpen(null);
              }}
              className="cursor-pointer transition-colors hover:text-[#111827]"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                padding: 0,
                fontSize: 10,
                color: "#94A3B8",
              }}
            >
              Guardar
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const repeatBlock = (
    checked: boolean,
    onChange: (v: boolean) => void,
    okNote: string,
  ) => (
    <div style={{ marginTop: 12 }}>
      <Checkbox
        checked={checked}
        onChange={onChange}
        label="Repetir patrón hasta completar las rondas"
      />
      <p style={{ ...(checked ? note : warn), marginTop: 6 }}>
        {checked ? okNote : "Definí manualmente cada intervalo."}
      </p>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.35)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={mode === "edit" ? "Editar circuito" : "Nuevo circuito"}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          width: 520,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 28,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
            {mode === "edit" ? "Editar circuito" : "Nuevo circuito"}
          </div>
          <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Configurá tipo, ejercicios y temporizador.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Nombre del circuito</div>
          <input
            value={cfg.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ej: Circuito metabólico A"
            aria-label="Nombre del circuito"
            style={{
              ...textInput,
              width: "100%",
              height: 40,
              borderRadius: 10,
              padding: "0 14px",
              color: "#111827",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>Tipo</div>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {TYPES.map((t) => {
              const selected = t === cfg.type;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    height: 34,
                    borderRadius: 8,
                    padding: "0 16px",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    border: "none",
                    backgroundColor: selected ? "#D97706" : "#F1F5F9",
                    color: selected ? "#FFFFFF" : "#64748B",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* TIMER CONFIG */}
        <div style={{ marginBottom: cfg.type === "ASAP" || cfg.type === "Custom" ? 0 : 16 }}>
          {cfg.type === "AMRAP" && (
            <>
              <Stepper
                label="Duración total"
                display={fmt(cfg.amrapSeconds)}
                onDec={() => set("amrapSeconds", Math.max(60, cfg.amrapSeconds - 60))}
                onInc={() => set("amrapSeconds", cfg.amrapSeconds + 60)}
              />
              <p style={desc}>El atleta completa tantas rondas como pueda en el tiempo.</p>
            </>
          )}
          {cfg.type === "EMOM" && (
            <>
              <Stepper
                label="Duración por intervalo"
                display={fmt(cfg.emomInterval)}
                onDec={() => set("emomInterval", Math.max(30, cfg.emomInterval - 30))}
                onInc={() => set("emomInterval", cfg.emomInterval + 30)}
              />
              <Stepper
                label="Rondas"
                display={String(cfg.emomRounds)}
                onDec={() => set("emomRounds", Math.max(1, cfg.emomRounds - 1))}
                onInc={() => set("emomRounds", cfg.emomRounds + 1)}
              />
            </>
          )}
          {cfg.type === "TABATA" && (
            <>
              <Stepper
                label="Trabajo"
                display={fmt(cfg.work)}
                onDec={() => set("work", Math.max(5, cfg.work - 5))}
                onInc={() => set("work", cfg.work + 5)}
              />
              <Stepper
                label="Descanso"
                display={fmt(cfg.rest)}
                onDec={() => set("rest", Math.max(5, cfg.rest - 5))}
                onInc={() => set("rest", cfg.rest + 5)}
              />
              <Stepper
                label="Rondas"
                display={String(cfg.tabataRounds)}
                onDec={() => set("tabataRounds", Math.max(1, cfg.tabataRounds - 1))}
                onInc={() => set("tabataRounds", cfg.tabataRounds + 1)}
              />
            </>
          )}
        </div>

        {/* EXERCISES */}
        <div>
          <div className="flex items-center" style={{ marginBottom: 10 }}>
            <div style={{ ...labelStyle, flex: 1 }}>Ejercicios</div>
            <div
              style={{ fontSize: 11, color: "#94A3B8", width: 72, textAlign: "center" }}
            >
              Reps
            </div>
            <div
              style={{ fontSize: 11, color: "#94A3B8", width: 80, textAlign: "center" }}
            >
              Kg
            </div>
            <div style={{ width: 58 }} />
          </div>

          {cfg.exercises.map((_, i) => (
            <div key={i}>{exerciseRow(i, `${i + 1}`)}</div>
          ))}
          <button
            type="button"
            onClick={addEx}
            className="cursor-pointer text-[12px] text-[#94A3B8] transition-colors hover:text-[#111827]"
            style={{ background: "none", border: "none", padding: 0 }}
          >
            + Agregar ejercicio al circuito
          </button>

          {cfg.type === "EMOM" &&
            repeatBlock(
              cfg.emomRepeat,
              (v) => set("emomRepeat", v),
              `El patrón de ${cfg.exercises.length} intervalos se repite en cada ronda.`,
            )}

          {cfg.type === "TABATA" && (
            <>
              <div className="flex items-center" style={{ gap: 12, marginTop: 16 }}>
                <span style={{ fontSize: 13, color: "#374151" }}>Alternar ejercicios</span>
                <Toggle
                  on={cfg.tabataAlternate}
                  onChange={(v) => set("tabataAlternate", v)}
                />
              </div>
              {repeatBlock(
                cfg.tabataRepeat,
                (v) => set("tabataRepeat", v),
                `El patrón de ${cfg.exercises.length} series se alterna en cada ronda.`,
              )}
            </>
          )}
        </div>


        {/* DESCRIPTION */}
        <div style={{ marginTop: 16 }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Instrucciones</div>
          <textarea
            value={cfg.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Instrucciones, referencias, notas para el atleta..."
            aria-label="Descripción del circuito"
            style={{
              width: "100%",
              height: 72,
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: "#374151",
              resize: "none",
              outline: "none",
            }}
          />
        </div>

        <div className="flex items-center justify-end" style={{ gap: 10, marginTop: 24 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              backgroundColor: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              onSubmit({
                ...cfg,
                name: cfg.name.trim() || "Circuito",
                summary: summary(),
              })
            }
            style={{
              backgroundColor: "#111827",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {mode === "edit" ? "Guardar cambios" : "Crear circuito"}
          </button>
        </div>
      </div>
    </div>
  );
}
