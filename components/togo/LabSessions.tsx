import { useEffect, useMemo, useState } from "react";
import { NAME_TAKEN_MSG, isNameTaken, uniqueName } from "@/lib/unique-name";
import { toast } from "sonner";
import {
  Clock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Link2,
} from "lucide-react";
import { Dumbbell } from "@/components/togo/icons/Dumbbell";
import { fetchLibraryExercises, type LibraryExercise } from "@/lib/exercise-data";
import { getCoachId } from "@/lib/programs";
import {
  CircuitModal,
  circuitTimerLabel,
  type CircuitConfig,
} from "@/components/togo/CircuitModal";
import {
  fetchSessionTemplates,
  createSessionTemplate,
  updateSessionTemplate,
  deleteSessionTemplate,
} from "@/lib/session-templates";

export type SessionCategory = "Fuerza" | "Cardio" | "Movilidad" | "Circuito";

/** "New" card label for each Lab filter. */
const NEW_LABEL: Record<string, string> = {
  Fuerza: "Nueva sesión de fuerza",
  Cardio: "Nueva sesión de cardio",
  Movilidad: "Nueva rutina de movilidad",
  Circuito: "Nuevo circuito",
};

export type Ex = {
  id: string;
  group: "A" | "B";
  name: string;
  sets: string;
  reps: string;
  weight: string;
  series?: { weight: string; reps: string }[];
  notes?: string;
  rest?: string;
  microRest?: string | null;
  repsUnit?: string;
  weightUnit?: string;
  extras?: { name: string; values: string[] }[];
};

export type LabSession = {
  id: string;
  name: string;
  category: SessionCategory;
  minutes: number;
  exercises: Ex[];
  circuits: CircuitConfig[];
};

let uid = 0;
const nid = () => `le${++uid}`;

const ex = (group: "A" | "B", name: string, sets: string, reps: string): Ex => ({
  id: nid(),
  group,
  name,
  sets,
  reps,
  weight: "",
});

const SESSION_MENU = ["Duplicar", "Agregar a programa", "Eliminar"];

const numInput: React.CSSProperties = {
  width: 44,
  height: 28,
  border: "1px solid #E2E8F0",
  borderRadius: 6,
  textAlign: "center",
  fontSize: 12,
  color: "#111827",
  outline: "none",
};

function ExerciseSearchPopup({
  onPick,
  onClose,
}: {
  onPick: (name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [library, setLibrary] = useState<LibraryExercise[]>([]);

  useEffect(() => {
    getCoachId().then((cid) => {
      if (cid) fetchLibraryExercises(cid).then(setLibrary);
    });
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter(
      (e) =>
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.pattern.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query, library]);

  return (
    <>
      <div className="fixed inset-0" style={{ zIndex: 15 }} onClick={onClose} />
      <div
        className="absolute rounded-[12px] border bg-white"
        style={{
          left: 0,
          top: 30,
          zIndex: 20,
          width: 280,
          padding: 8,
          borderColor: "#E2E8F0",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        }}
      >
        <div className="relative" style={{ marginBottom: 6 }}>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#CBD5E1" }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio…"
            aria-label="Buscar ejercicio"
            className="w-full rounded-[8px] border pl-8 pr-2 text-[12px] outline-none"
            style={{ height: 32, borderColor: "#E2E8F0", color: "#111827" }}
          />
        </div>
        <div className="flex flex-col">
          {list.map((e) => (
            <button
              key={e.name}
              type="button"
              onClick={() => onPick(e.name)}
              className="flex flex-col rounded-[8px] text-left hover:bg-[#F8FAFC]"
              style={{ padding: "7px 10px" }}
            >
              <span className="text-[12px]" style={{ color: "#111827" }}>
                {e.name}
              </span>
              <span className="text-[10px]" style={{ color: "#94A3B8" }}>
                {`${e.pattern} · ${e.equipment}`}
              </span>
            </button>
          ))}
          {list.length === 0 ? (
            <span className="text-[12px]" style={{ color: "#94A3B8", padding: "8px 10px" }}>
              Sin resultados
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}

function SessionBigCard({
  session,
  onChange,
  onDelete,
  onDuplicate,
  onEditDetail,
  takenNames,
}: {
  session: LabSession;
  onChange: (s: LabSession) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditDetail: () => void;
  /** Names of the coach's other Lab sessions. */
  takenNames: string[];
}) {
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState(session.name);
  const draftTaken = isNameTaken(nameDraft, takenNames);
  const commitName = () => {
    const next = nameDraft.trim();
    if (!next || draftTaken) {
      if (draftTaken) toast.error(NAME_TAKEN_MSG);
      setNameDraft(session.name);
    } else if (next !== session.name) {
      onChange({ ...session, name: next });
    }
    setEditName(false);
  };
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [circuitModal, setCircuitModal] = useState<{ index: number | null } | null>(null);

  const groups: ("A" | "B")[] = ["A", "B"];
  const count = session.exercises.length + session.circuits.reduce((n, c) => n + c.exercises.length, 0);

  const patchEx = (id: string, patch: Partial<Ex>) =>
    onChange({
      ...session,
      exercises: session.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });

  const removeEx = (id: string) =>
    onChange({ ...session, exercises: session.exercises.filter((e) => e.id !== id) });

  const toggleChain = (id: string) => {
    const target = session.exercises.find((e) => e.id === id);
    if (!target) return;
    patchEx(id, { group: target.group === "A" ? "B" : "A" });
  };

  const row = (e: Ex, label: string, labelColor: string) => (
    <div
      key={e.id}
      className="flex flex-row items-center gap-2.5"
      style={{ padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}
    >
      <span className="text-[10px] font-bold" style={{ color: labelColor, width: 22 }}>
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: "#111827" }}>
        {e.name}
      </span>
      <input
        value={e.sets}
        onChange={(ev) => patchEx(e.id, { sets: ev.target.value })}
        aria-label="Series"
        style={numInput}
      />
      <span className="text-[12px]" style={{ color: "#94A3B8" }}>
        ×
      </span>
      <input
        value={e.reps}
        onChange={(ev) => patchEx(e.id, { reps: ev.target.value })}
        aria-label="Repeticiones"
        style={numInput}
      />
      <span className="text-[12px]" style={{ color: "#94A3B8" }}>
        ×
      </span>
      <input
        value={e.weight}
        placeholder="—"
        onChange={(ev) => patchEx(e.id, { weight: ev.target.value })}
        aria-label="Peso"
        style={numInput}
      />
      <button
        type="button"
        aria-label={e.group === "A" ? "Encadenar ejercicio" : "Desencadenar ejercicio"}
        onClick={() => toggleChain(e.id)}
        className={e.group === "B" ? "text-[#3B82F6]" : "text-[#CBD5E1] hover:text-[#3B82F6]"}
      >
        <Link2 size={11} />
      </button>
      <button
        type="button"
        aria-label="Eliminar ejercicio"
        onClick={() => removeEx(e.id)}
        className="text-[#CBD5E1] hover:text-[#EF4444]"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );

  return (
    <div
      className="flex flex-col rounded-[14px] bg-white"
      style={{ border: "1px solid #E2E8F0", padding: 20 }}
    >
      {/* HEADER */}
      <div className="flex flex-row items-center gap-2.5" style={{ marginBottom: 16 }}>
        <span
          className="whitespace-nowrap rounded-[6px] text-[11px] font-medium"
          style={{ backgroundColor: "#F1F5F9", color: "#374151", padding: "3px 8px" }}
        >
          {session.category}
        </span>
        {editName ? (
          <span className="flex min-w-0 flex-1 flex-col">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setNameDraft(session.name);
                  setEditName(false);
                }
              }}
              aria-label="Nombre de la sesión"
              aria-invalid={draftTaken}
              className="min-w-0 bg-transparent text-[15px] font-bold outline-none"
              style={{ color: "#111827", border: "none", borderBottom: `1.5px solid ${draftTaken ? "#EF4444" : "#111827"}`, paddingBottom: 2 }}
            />
            {draftTaken ? <span className="text-[11px]" style={{ color: "#DC2626", marginTop: 3 }}>Ese nombre ya está en uso</span> : null}
          </span>
        ) : (
          <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold" style={{ color: "#111827" }}>
            {session.name}
          </h3>
        )}
        <button type="button" aria-label="Editar nombre" onClick={() => { setNameDraft(session.name); setEditName(true); }}>
          <Pencil size={14} style={{ color: "#CBD5E1" }} />
        </button>
        <div className="relative">
          <button type="button" aria-label="Más opciones" onClick={() => setMenu((v) => !v)}>
            <MoreHorizontal size={15} style={{ color: "#CBD5E1" }} />
          </button>
          {menu ? (
            <>
              <div className="fixed inset-0" style={{ zIndex: 5 }} onClick={() => setMenu(false)} />
              <div
                className="absolute rounded-[10px] border bg-white"
                style={{
                  right: 0,
                  top: 22,
                  zIndex: 10,
                  minWidth: 180,
                  padding: 4,
                  borderColor: "#E2E8F0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                {SESSION_MENU.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      if (m === "Eliminar") onDelete();
                      if (m === "Duplicar") onDuplicate();
                    }}
                    className="flex w-full whitespace-nowrap rounded-[6px] text-left text-[12px] hover:bg-[#F8FAFC]"
                    style={{ padding: "8px 12px", color: "#374151" }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* META */}
      <div className="flex flex-row gap-3" style={{ marginBottom: 16 }}>
        <span className="flex flex-row items-center gap-1">
          <Clock size={11} style={{ color: "#CBD5E1" }} />
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>
            {`${session.minutes} min estimados`}
          </span>
        </span>
        <span className="flex flex-row items-center gap-1">
          <Dumbbell size={11} style={{ color: "#CBD5E1" }} />
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>
            {`${count} ejercicios`}
          </span>
        </span>
      </div>

      {/* BLOCKS */}
      <div className="flex flex-col gap-2">
        {groups.map((g) => {
          const items = session.exercises.filter((e) => e.group === g);
          if (items.length === 0) return null;
          if (g === "A") return <div key={g}>{items.map((e, i) => row(e, `A${i + 1}`, "#94A3B8"))}</div>;
          return (
            <div
              key={g}
              style={{
                borderLeft: "2px solid #3B82F6",
                backgroundColor: "#FAFAFA",
                borderRadius: 8,
                padding: "4px 8px",
              }}
            >
              {items.map((e, i) => row(e, `B${i + 1}`, "#3B82F6"))}
            </div>
          );
        })}

        {session.circuits.map((c, ci) => (
          <div
            key={`${c.name}-${ci}`}
            className="rounded-[10px]"
            style={{ borderLeft: "3px solid #D97706", backgroundColor: "#FFFDF7", padding: "6px 10px" }}
          >
            <div className="flex flex-row items-center gap-2" style={{ padding: "6px 0" }}>
              <span className="text-[10px] font-bold" style={{ color: "#D97706", width: 22 }}>
                {`C${ci + 1}`}
              </span>
              <span
                className="rounded-[4px] text-[9px] font-bold"
                style={{ backgroundColor: "#FFFBEB", color: "#D97706", padding: "2px 6px" }}
              >
                {c.type}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: "#111827" }}>
                {c.name || "Circuito"}
              </span>
              <span className="whitespace-nowrap text-[11px]" style={{ color: "#D97706" }}>
                {circuitTimerLabel(c)}
              </span>
              <button
                type="button"
                aria-label={`Editar circuito ${c.name}`}
                onClick={() => setCircuitModal({ index: ci })}
                className="text-[#CBD5E1] hover:text-[#111827]"
              >
                <Settings2 size={12} />
              </button>
              <button
                type="button"
                aria-label={`Eliminar circuito ${c.name}`}
                onClick={() =>
                  onChange({ ...session, circuits: session.circuits.filter((_, i) => i !== ci) })
                }
                className="text-[#CBD5E1] hover:text-[#EF4444]"
              >
                <Trash2 size={12} />
              </button>
              <button
                type="button"
                aria-label="Ver ejercicios del circuito"
                onClick={() => setExpanded(expanded === ci ? null : ci)}
              >
                {expanded === ci ? (
                  <ChevronUp size={12} style={{ color: "#CBD5E1" }} />
                ) : (
                  <ChevronDown size={12} style={{ color: "#CBD5E1" }} />
                )}
              </button>
            </div>
            {expanded === ci ? (
              <div className="flex flex-col" style={{ padding: "4px 0 8px 22px" }}>
                <div className="flex flex-row items-center gap-2" style={{ paddingBottom: 4 }}>
                  <span className="min-w-0 flex-1" />
                  <span className="text-right text-[10px] font-semibold" style={{ color: "#D97706", width: 40 }}>
                    Reps
                  </span>
                  <span className="text-right text-[10px] font-semibold" style={{ color: "#D97706", width: 40 }}>
                    Kg
                  </span>
                </div>
                {c.exercises.map((e, ei) => (
                  <div key={`${c.name}-${ci}-${ei}`} className="flex flex-row items-center gap-2" style={{ padding: "2px 0" }}>
                    <span className="text-[10px] font-bold" style={{ color: "#D97706", width: 22 }}>
                      {`E${ei + 1}`}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: "#374151" }}>
                      {e.name}
                    </span>
                    <span className="text-right text-[11px]" style={{ color: "#94A3B8", width: 40 }}>
                      {e.reps || "—"}
                    </span>
                    <span className="text-right text-[11px]" style={{ color: "#94A3B8", width: 40 }}>
                      {e.weight || "—"}
                    </span>
                  </div>
                ))}
                {c.description ? (
                  <p className="text-[11px]" style={{ color: "#94A3B8", marginTop: 6 }}>
                    {c.description}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="flex flex-row items-center gap-1.5 text-[#94A3B8] hover:text-[#111827]"
            style={{ padding: "8px 0" }}
          >
            <Plus size={13} />
            <span className="text-[12px]">Agregar ejercicio</span>
          </button>
          {picker ? (
            <ExerciseSearchPopup
              onClose={() => setPicker(false)}
              onPick={(name) => {
                setPicker(false);
                onChange({
                  ...session,
                  exercises: [...session.exercises, ex("A", name, "3", "10")],
                });
              }}
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setCircuitModal({ index: null })}
          className="flex flex-row items-center gap-1.5 text-[#94A3B8] hover:text-[#111827]"
          style={{ padding: "8px 0" }}
        >
          <Plus size={13} />
          <span className="text-[12px]">Agregar circuito</span>
        </button>
      </div>

      {/* FOOTER */}
      <div
        className="flex flex-row gap-2"
        style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #F1F5F9" }}
      >
        <button
          type="button"
          onClick={onEditDetail}
          className="flex flex-1 items-center justify-center rounded-[8px] border text-[12px] font-medium hover:bg-[#F8FAFC]"
          style={{ height: 36, borderColor: "#E2E8F0", color: "#374151" }}
        >
          Editar en detalle
        </button>
        <button
          type="button"
          className="flex items-center justify-center rounded-[8px] border text-[12px] hover:bg-[#F8FAFC]"
          style={{ height: 36, padding: "0 14px", borderColor: "#E2E8F0", color: "#374151" }}
        >
          Agregar a programa
        </button>
      </div>

      <CircuitModal
        open={circuitModal !== null}
        mode={circuitModal?.index === null ? "create" : "edit"}
        initial={circuitModal && circuitModal.index !== null ? session.circuits[circuitModal.index] ?? null : null}
        onClose={() => setCircuitModal(null)}
        takenNames={session.circuits.map((c) => c.name)}
        onSubmit={(cfg) => {
          const idx = circuitModal?.index ?? null;
          onChange({
            ...session,
            circuits:
              idx === null
                ? [...session.circuits, cfg]
                : session.circuits.map((c, i) => (i === idx ? cfg : c)),
          });
          setCircuitModal(null);
        }}
      />
    </div>
  );
}

export function LabSessions({
  coachId,
  query,
  filter,
  onEditDetail,
}: {
  coachId: string | null;
  query: string;
  filter: string;
  onEditDetail: (id: string) => void;
}) {
  const [sessions, setSessions] = useState<LabSession[]>([]);

  useEffect(() => {
    if (!coachId) return;
    fetchSessionTemplates(coachId).then(setSessions);
  }, [coachId]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.exercises.some((e) => e.name.toLowerCase().includes(q)) ||
        s.circuits.some((c) => c.name.toLowerCase().includes(q));
      const matchF = filter === "Todos" || s.category === filter;
      return matchQ && matchF;
    });
  }, [sessions, query, filter]);

  const update = (next: LabSession) => {
    setSessions((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    updateSessionTemplate(next).catch(() => toast.error("No se pudo guardar la sesión"));
  };

  const remove = (id: string) => {
    setSessions((prev) => prev.filter((x) => x.id !== id));
    deleteSessionTemplate(id).catch(() => toast.error("No se pudo eliminar la sesión"));
  };

  const duplicate = (s: LabSession) => {
    if (!coachId) return;
    const clone: Omit<LabSession, "id"> = {
      name: uniqueName(`${s.name} (copia)`, sessions.map((x) => x.name)),
      category: s.category,
      minutes: s.minutes,
      exercises: s.exercises.map((e) => ({ ...e, id: nid() })),
      circuits: s.circuits.map((c) => ({ ...c })),
    };
    createSessionTemplate(coachId, clone)
      .then((id) => setSessions((prev) => [...prev, { id, ...clone }]))
      .catch(() => toast.error("No se pudo duplicar la sesión"));
  };

  // With a category filter on, the new card is born in that category (so it stays visible) and says what it is.
  const blankCategory: SessionCategory =
    filter === "Cardio" || filter === "Movilidad" || filter === "Circuito" ? filter : "Fuerza";
  const blankLabel = NEW_LABEL[filter] ?? "Nueva sesión";

  const createBlank = () => {
    if (!coachId) return;
    const blank: Omit<LabSession, "id"> = { name: uniqueName(blankLabel, sessions.map((x) => x.name)), category: blankCategory, minutes: 45, exercises: [], circuits: [] };
    createSessionTemplate(coachId, blank)
      .then((id) => setSessions((prev) => [...prev, { id, ...blank }]))
      .catch(() => toast.error("No se pudo crear la sesión"));
  };

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
      {list.map((s) => (
        <SessionBigCard
          key={s.id}
          session={s}
          onChange={update}
          onDelete={() => remove(s.id)}
          onDuplicate={() => duplicate(s)}
          onEditDetail={() => onEditDetail(s.id)}
          takenNames={sessions.filter((x) => x.id !== s.id).map((x) => x.name)}
        />
      ))}
      <button
        type="button"
        onClick={createBlank}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] p-5"
        style={{ border: "1.5px dashed #E2E8F0", backgroundColor: "#FFFFFF", minHeight: 180 }}
      >
        <Plus size={20} style={{ color: "#CBD5E1" }} />
        <span className="text-[13px]" style={{ color: "#94A3B8" }}>{blankLabel}</span>
      </button>
    </div>
  );
}
