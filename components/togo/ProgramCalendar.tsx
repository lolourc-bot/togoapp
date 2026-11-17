import { sessionTitle } from "@/lib/session-title";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, Layers, Link2 as LinkIcon, Plus, Trash2, X } from "lucide-react";
import { fetchLibraryExercises, type LibraryExercise } from "@/lib/exercise-data";
import { getCoachId } from "@/lib/programs";
import { CircuitModal, circuitTimerLabel, type CircuitConfig } from "@/components/togo/CircuitModal";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export type CalExercise = {
  id: string;
  label: string;
  name: string;
  detail: string;
  circuit?: boolean;
  circuitType?: string;
  circuitExercises?: { name: string; reps: string }[];
};

export type CalSession = { id: string; name: string; minutes: number; exercises: CalExercise[] };

const LIBRARY: { name: string; minutes: number; exercises: CalExercise[] }[] = [
  {
    name: "Fuerza tren superior",
    minutes: 55,
    exercises: [
      { id: "l1", label: "A1", name: "Press de banca", detail: "60kg · 4×8" },
      { id: "l2", label: "B1", name: "Remo con barra", detail: "50kg · 4×8" },
      { id: "l3", label: "B2", name: "Curl bíceps", detail: "12kg · 3×10" },
    ],
  },
  {
    name: "Fuerza tren inferior",
    minutes: 50,
    exercises: [
      { id: "l4", label: "A1", name: "Sentadilla con barra", detail: "80kg · 4×6" },
      { id: "l5", label: "B1", name: "Peso muerto rumano", detail: "60kg · 3×10" },
      { id: "l6", label: "B2", name: "Curl femoral", detail: "30kg · 3×12" },
    ],
  },
  {
    name: "Full body",
    minutes: 60,
    exercises: [
      { id: "l7", label: "A1", name: "Peso muerto", detail: "90kg · 4×5" },
      { id: "l8", label: "B1", name: "Press militar", detail: "35kg · 4×8" },
      {
        id: "l9",
        label: "C1",
        name: "Circuito metabólico",
        detail: "AMRAP 10'",
        circuit: true,
        circuitType: "AMRAP",
        circuitExercises: [
          { name: "Burpees", reps: "10" },
          { name: "Kettlebell swing", reps: "15" },
          { name: "Remo en máquina", reps: "20" },
        ],
      },
    ],
  },
  { name: "Core y movilidad", minutes: 30, exercises: [] },
  { name: "Técnica y movilidad", minutes: 35, exercises: [] },
];

type Grid = Record<string, CalSession>;

const key = (w: number, d: number) => `${w}-${d}`;
const uid = () => Math.random().toString(36).slice(2, 9);

const clone = (name: string): CalSession => {
  const lib = LIBRARY.find((l) => l.name === name);
  return {
    id: uid(),
    name,
    minutes: lib?.minutes ?? 45,
    exercises: (lib?.exercises ?? []).map((e) => ({ ...e, id: uid() })),
  };
};

function buildInitial(): Grid {
  const g: Grid = {};
  g[key(0, 0)] = clone("Fuerza tren superior");
  g[key(0, 2)] = clone("Fuerza tren inferior");
  g[key(0, 4)] = clone("Full body");
  for (let w = 1; w < 12; w++) {
    g[key(w, 0)] = clone("Fuerza tren superior");
    g[key(w, 2)] = clone("Fuerza tren inferior");
    g[key(w, 4)] = clone("Full body");
    if (w % 2 === 0) g[key(w, 5)] = clone("Core y movilidad");
  }
  return g;
}

const css = `
.pc-empty:hover{background:#F1F5F9 !important}
.pc-row:hover{background:#F8FAFC}
.pc-row .pc-del{opacity:0}
.pc-row:hover .pc-del{opacity:1}
.pc-del:hover svg{color:#EF4444;stroke:#EF4444}
.pc-add:hover{background:#F8FAFC}
.pc-add:hover span,.pc-add:hover svg{color:#111827;stroke:#111827}
.pc-lib-row:hover{background:#F8FAFC}
.pc-week-del:hover svg{color:#EF4444;stroke:#EF4444}
.pc-chain:hover svg{color:#111827;stroke:#111827}
.pc-row .pc-chain{opacity:.6}
.pc-row:hover .pc-chain{opacity:1}
`;

const nextLabel = (s: CalSession) => {
  const letters = "ABCDEFGH";
  return `${letters[Math.min(s.exercises.length, 7)]}1`;
};

function parseDetail(detail: string) {
  const m = /(\d+)\s*×\s*(\d+)/.exec(detail);
  const w = /(\d+(?:[.,]\d+)?)\s*kg/i.exec(detail);
  return { sets: m?.[1] ?? "", reps: m?.[2] ?? "", weight: w?.[1] ?? "" };
}

function buildDetail(v: { sets: string; reps: string; weight: string }) {
  const base = v.sets || v.reps ? `${v.sets || "-"}×${v.reps || "-"}` : "";
  return `${base}${v.weight ? `${base ? " · " : ""}${v.weight}kg` : ""}`;
}

function chainWithNext(list: CalExercise[], id: string): CalExercise[] {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0 || i === list.length - 1) return list;
  const letter = (list[i]?.label ?? "A1").charAt(0);
  return list.map((x, idx) =>
    idx === i
      ? { ...x, label: `${letter}1` }
      : idx === i + 1
        ? { ...x, label: `${letter}2` }
        : x,
  );
}

function isChained(list: CalExercise[], ex: CalExercise) {
  if (ex.circuit) return false;
  const letter = ex.label.charAt(0);
  return list.filter((x) => !x.circuit && x.label.charAt(0) === letter).length > 1;
}

function unchain(list: CalExercise[], id: string): CalExercise[] {
  const target = list.find((x) => x.id === id);
  if (!target) return list;
  const letter = target.label.charAt(0);
  const members = list.filter((x) => !x.circuit && x.label.charAt(0) === letter);
  const used = new Set(list.filter((x) => x.label.charAt(0) !== letter).map((x) => x.label.charAt(0)));
  let out = [...list];
  members.forEach((m, i) => {
    if (i === 0) {
      out = out.map((x) => (x.id === m.id ? { ...x, label: `${letter}1` } : x));
      return;
    }
    const free = "ABCDEFGHIJ".split("").find((L) => !used.has(L) && L !== letter) ?? letter;
    used.add(free);
    out = out.map((x) => (x.id === m.id ? { ...x, label: `${free}1` } : x));
  });
  return out;
}

function groupExercises(list: CalExercise[]): CalExercise[][] {
  const groups: CalExercise[][] = [];
  list.forEach((ex) => {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    if (
      last &&
      prev &&
      !prev.circuit &&
      !ex.circuit &&
      prev.label.charAt(0) === ex.label.charAt(0)
    ) {
      last.push(ex);
    } else {
      groups.push([ex]);
    }
  });
  return groups;
}

export function ProgramCalendar({
  programName,
  onBack,
}: {
  programName: string;
  onBack: () => void;
}) {
  const [weeks, setWeeks] = useState(12);
  const [grid, setGrid] = useState<Grid>(buildInitial);
  const [showRests, setShowRests] = useState(true);
  const [picker, setPicker] = useState<string | null>(null);
  const [exPicker, setExPicker] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [exQuery, setExQuery] = useState("");
  const [circuitFor, setCircuitFor] = useState<string | null>(null);
  const [openCircuits, setOpenCircuits] = useState<Record<string, boolean>>({});
  const [pickedEx, setPickedEx] = useState<string | null>(null);
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [library, setLibrary] = useState<LibraryExercise[]>([]);

  useEffect(() => {
    getCoachId().then((cid) => {
      if (cid) fetchLibraryExercises(cid).then(setLibrary);
    });
  }, []);

  const resetExForm = () => {
    setPickedEx(null);
    setSets("");
    setReps("");
    setWeight("");
  };

  const filteredExercises = library.filter((ex) =>
    ex.name.toLowerCase().includes(exQuery.toLowerCase()),
  );

  const addPicked = (k: string) => {
    const name = pickedEx;
    if (!name) return;
    const nSets = sets.trim() || "4";
    const nReps = reps.trim() || "8";
    const w = weight.trim();
    setSession(k, (cur) => ({
      ...cur,
      exercises: [
        ...cur.exercises,
        {
          id: uid(),
          label: nextLabel(cur),
          name,
          detail: `${nSets}×${nReps}${w ? ` · ${w}kg` : ""}`,
        },
      ],
    }));
    setExPicker(null);
    setExQuery("");
    resetExForm();
  };

  const inputStyle = {
    height: 34,
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    textAlign: "center" as const,
    fontSize: 13,
    color: "#374151",
    outline: "none",
  };

  const stats = useMemo(() => {
    const list = Object.values(grid);
    const minutes = list.reduce((a, s) => a + s.minutes, 0);
    return { sessions: list.length, hours: Math.round(minutes / 60) };
  }, [grid]);

  const filtered = LIBRARY.filter((s) =>
    s.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const setSession = (k: string, fn: (s: CalSession) => CalSession) =>
    setGrid((g) => {
      const cur = g[k];
      if (!cur) return g;
      return { ...g, [k]: fn(cur) };
    });

  const removeKey = (k: string) =>
    setGrid((g) => {
      const next = { ...g };
      delete next[k];
      return next;
    });

  const weekStats = (w: number) => {
    const list = DAYS.map((_, d) => grid[key(w, d)]).filter(Boolean) as CalSession[];
    const min = list.reduce((a, s) => a + s.minutes, 0);
    const h = Math.floor(min / 60);
    return `${list.length} sesiones · ~${h > 0 ? `${h}h ` : ""}${min % 60}min`;
  };

  return (
    <div
      style={{ flex: 1, background: "#FFFFFF", minWidth: 0 }}
      onClick={() => {
        setPicker(null);
        setExPicker(null);
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {expanded ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(null);
            setExPicker(null);
            setPicker(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.15)",
            zIndex: 10,
          }}
        />
      ) : null}
      <div
        style={{
          padding: "16px 40px",
          borderBottom: "1px solid #E2E8F0",
          background: "#FFFFFF",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            onClick={onBack}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
          >
            <ChevronLeft size={20} color="#94A3B8" />
            <span style={{ fontSize: 13, color: "#94A3B8" }}>Volver al programa</span>
          </button>
          <span style={{ flex: 1 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{programName}</span>{" "}
            <span style={{ fontSize: 18, fontWeight: 400, color: "#94A3B8" }}>· Calendario</span>
          </span>
          <button
            type="button"
            onClick={() => setWeeks(weeks + 1)}
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              padding: "6px 14px",
              fontSize: 13,
              color: "#374151",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={14} color="#374151" /> Agregar semana
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "#111827",
              color: "#FFFFFF",
              borderRadius: 10,
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 500,
              marginLeft: 10,
            }}
          >
            Guardar
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          {[`${weeks} semanas`, `${stats.sessions} sesiones`, `~${stats.hours}h total`].map((c) => (
            <span
              key={c}
              style={{
                fontSize: 12,
                color: "#94A3B8",
                background: "#F8FAFC",
                borderRadius: 6,
                padding: "3px 10px",
              }}
            >
              {c}
            </span>
          ))}
          <label
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#94A3B8",
            }}
          >
            <input
              type="checkbox"
              checked={showRests}
              onChange={(e) => setShowRests(e.target.checked)}
            />
            Mostrar descansos
          </label>
        </div>
      </div>

      <div style={{ overflowY: "auto", height: "calc(100vh - 120px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {Array.from({ length: weeks }, (_, w) => (
            <div key={w}>
              <div
                style={{
                  padding: "10px 40px",
                  background: "#F8FAFC",
                  borderTop: "1px solid #E2E8F0",
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                  Semana {w + 1}
                </span>
                <span style={{ fontSize: 12, color: "#94A3B8" }}>{weekStats(w)}</span>
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setGrid((g) => {
                        const next = { ...g };
                        DAYS.forEach((_, d) => {
                          const s = g[key(w, d)];
                          if (s)
                            next[key(weeks, d)] = {
                              ...s,
                              id: uid(),
                              exercises: s.exercises.map((e) => ({ ...e, id: uid() })),
                            };
                        });
                        return next;
                      });
                      setWeeks(weeks + 1);
                    }}
                    style={{ fontSize: 12, color: "#94A3B8", cursor: "pointer" }}
                  >
                    Duplicar semana
                  </button>
                  <button
                    type="button"
                    className="pc-week-del"
                    aria-label="Eliminar semana"
                    onClick={() => {
                      setGrid((g) => {
                        const next: Grid = {};
                        Object.entries(g).forEach(([k, v]) => {
                          const [wi, di] = k.split("-").map(Number);
                          if (wi === w) return;
                          next[key((wi as number) > w ? (wi as number) - 1 : (wi as number), di as number)] = v;
                        });
                        return next;
                      });
                      setWeeks((n) => Math.max(1, n - 1));
                    }}
                  >
                    <Trash2 size={16} color="#CBD5E1" />
                  </button>
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderBottom: "2px solid #E2E8F0",
                }}
              >
                {DAYS.map((dayName, d) => {
                  const k = key(w, d);
                  const s = grid[k];
                  return (
                    <div
                      key={k}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        borderRight: d === 6 ? undefined : "1px solid #F1F5F9",
                        minHeight: 180,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 12px",
                          borderBottom: "1px solid #F1F5F9",
                          background: "#FFFFFF",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#94A3B8",
                          textTransform: "uppercase",
                        }}
                      >
                        {dayName}
                      </div>
                      <div
                        style={{
                          padding: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          background: "#FFFFFF",
                          flex: 1,
                          position: "relative",
                        }}
                      >
                        {s && expanded !== k ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExPicker(null);
                              setPicker(null);
                              setExpanded(k);
                            }}
                            style={{
                              background: "#FFFFFF",
                              borderRadius: 10,
                              border: "1px solid #E2E8F0",
                              padding: "10px 12px",
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                          >
                            <span
                              style={{
                                display: "block",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#111827",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {sessionTitle(s)}
                            </span>
                            <span style={{ display: "block", fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                              {s.exercises.length} ejercicios · ~{s.minutes} min
                            </span>
                          </button>
                        ) : s ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              background: "#FFFFFF",
                              borderRadius: 10,
                              border: "1px solid #111827",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                              position: "absolute",
                              top: 8,
                              left: 8,
                              minWidth: 320,
                              zIndex: 20,
                              overflow: "visible",
                            }}
                          >
                            <div
                              style={{
                                padding: "8px 10px",
                                borderBottom: "1px solid #F8FAFC",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <input
                                value={s.name}
                                aria-label="Nombre de la sesión"
                                onChange={(e) =>
                                  setSession(k, (cur) => ({ ...cur, name: e.target.value }))
                                }
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  border: "none",
                                  outline: "none",
                                  background: "transparent",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#111827",
                                }}
                              />
                              <Link
                                to="/sesiones/$sessionId"
                                params={{ sessionId: s.id }}
                                search={{
                                  programa: programName,
                                  sesion: `${s.name} — Sem ${w + 1}, Día ${d + 1}`,
                                  ejercicios: s.exercises.map((x) => x.name).join("|"),
                                }}
                                style={{
                                  fontSize: 10,
                                  color: "#94A3B8",
                                  border: "1px solid #E2E8F0",
                                  borderRadius: 6,
                                  padding: "2px 7px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Editar en detalle
                              </Link>
                              <button
                                type="button"
                                className="pc-del"
                                aria-label="Quitar sesión"
                                style={{ opacity: 1 }}
                                onClick={() => removeKey(k)}
                              >
                                <Trash2 size={12} color="#CBD5E1" />
                              </button>
                              <button
                                type="button"
                                aria-label="Contraer sesión"
                                onClick={() => setExpanded(null)}
                              >
                                <X size={14} color="#94A3B8" />
                              </button>
                            </div>

                            <div style={{ padding: "4px 0", display: "flex", flexDirection: "column" }}>
                              {groupExercises(s.exercises).map((group) => {
                                const chained = group.length > 1;
                                return (
                                  <div
                                    key={group[0]!.id}
                                    style={
                                      chained
                                        ? {
                                            background: "#FAFAFA",
                                            borderRadius: 8,
                                            borderLeft: "2px solid #3B82F6",
                                            margin: "4px 6px",
                                          }
                                        : undefined
                                    }
                                  >
                                    {group.map((ex) =>
                                      ex.circuit ? (
                                        <div
                                          key={ex.id}
                                          style={{
                                            padding: "8px 10px",
                                            borderBottom: "1px solid #F8FAFC",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 0,
                                          }}
                                        >
                                          <div
                                            style={{ display: "flex", alignItems: "center", gap: 8 }}
                                          >
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: "#D97706",
                                                width: 20,
                                              }}
                                            >
                                              {ex.label}
                                            </span>
                                            {ex.circuitType ? (
                                              <span
                                                style={{
                                                  fontSize: 9,
                                                  fontWeight: 700,
                                                  background: "#FFFBEB",
                                                  color: "#D97706",
                                                  borderRadius: 4,
                                                  padding: "1px 6px",
                                                }}
                                              >
                                                {ex.circuitType}
                                              </span>
                                            ) : null}
                                            <span
                                              style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: "#111827",
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {ex.name}
                                            </span>
                                            <span style={{ fontSize: 10, color: "#D97706" }}>
                                              {ex.detail}
                                            </span>
                                            <button
                                              type="button"
                                              aria-label="Ver ejercicios del circuito"
                                              onClick={() =>
                                                setOpenCircuits((o) => ({
                                                  ...o,
                                                  [ex.id]: !o[ex.id],
                                                }))
                                              }
                                            >
                                              <ChevronDown size={12} color="#CBD5E1" />
                                            </button>
                                            <button
                                              type="button"
                                              className="pc-del"
                                              aria-label="Quitar circuito"
                                              style={{ opacity: 1 }}
                                              onClick={() =>
                                                setSession(k, (cur) => ({
                                                  ...cur,
                                                  exercises: cur.exercises.filter(
                                                    (x) => x.id !== ex.id,
                                                  ),
                                                }))
                                              }
                                            >
                                              <Trash2 size={11} color="#CBD5E1" />
                                            </button>
                                          </div>
                                          {openCircuits[ex.id] ? (
                                            <div
                                              style={{
                                                paddingLeft: 20,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 4,
                                                marginTop: 6,
                                              }}
                                            >
                                              {(ex.circuitExercises ?? []).map((ce, ci) => (
                                                <div
                                                  key={`${ex.id}-${ci}`}
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                  }}
                                                >
                                                  <span style={{ fontSize: 10, color: "#94A3B8" }}>
                                                    E{ci + 1}
                                                  </span>
                                                  <span
                                                    style={{
                                                      fontSize: 11,
                                                      color: "#374151",
                                                      flex: 1,
                                                      minWidth: 0,
                                                      overflow: "hidden",
                                                      textOverflow: "ellipsis",
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    {ce.name || "Ejercicio"}
                                                  </span>
                                                  <span style={{ fontSize: 10, color: "#94A3B8" }}>
                                                    {ce.reps ? `${ce.reps}rep` : "—"}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <div
                                          key={ex.id}
                                          className="pc-row"
                                          style={{
                                            padding: "5px 10px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            borderBottom: chained
                                              ? undefined
                                              : "1px solid #F8FAFC",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              color: chained ? "#3B82F6" : "#94A3B8",
                                              width: 18,
                                            }}
                                          >
                                            {ex.label}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: 11,
                                              color: "#374151",
                                              flex: 1,
                                              minWidth: 0,
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {ex.name}
                                          </span>
                                          {(() => {
                                            const p = parseDetail(ex.detail);
                                            const cell = {
                                              height: 26,
                                              border: "1px solid #E2E8F0",
                                              borderRadius: 6,
                                              textAlign: "center" as const,
                                              fontSize: 11,
                                              color: "#374151",
                                              outline: "none",
                                            };
                                            const upd = (patch: Partial<typeof p>) =>
                                              setSession(k, (cur) => ({
                                                ...cur,
                                                exercises: cur.exercises.map((x) =>
                                                  x.id === ex.id
                                                    ? { ...x, detail: buildDetail({ ...p, ...patch }) }
                                                    : x,
                                                ),
                                              }));
                                            return (
                                              <>
                                                <input
                                                  aria-label="Series"
                                                  placeholder="4"
                                                  value={p.sets}
                                                  onChange={(e) => upd({ sets: e.target.value })}
                                                  style={{ ...cell, width: 36 }}
                                                />
                                                <span style={{ fontSize: 10, color: "#94A3B8" }}>×</span>
                                                <input
                                                  aria-label="Repeticiones"
                                                  placeholder="8"
                                                  value={p.reps}
                                                  onChange={(e) => upd({ reps: e.target.value })}
                                                  style={{ ...cell, width: 36 }}
                                                />
                                                <input
                                                  aria-label="Peso"
                                                  placeholder="kg"
                                                  value={p.weight}
                                                  onChange={(e) => upd({ weight: e.target.value })}
                                                  style={{ ...cell, width: 48 }}
                                                />
                                              </>
                                            );
                                          })()}
                                          <button
                                            type="button"
                                            className="pc-chain"
                                            title={chained ? "Desencadenar" : "Encadenar"}
                                            aria-label="Encadenar"
                                            onClick={() =>
                                              setSession(k, (cur) => ({
                                                ...cur,
                                                exercises: isChained(cur.exercises, ex)
                                                  ? unchain(cur.exercises, ex.id)
                                                  : chainWithNext(cur.exercises, ex.id),
                                              }))
                                            }
                                          >
                                            <LinkIcon
                                              size={12}
                                              color={chained ? "#3B82F6" : "#CBD5E1"}
                                            />
                                          </button>
                                          <button
                                            type="button"
                                            className="pc-del"
                                            aria-label="Quitar ejercicio"
                                            onClick={() =>
                                              setSession(k, (cur) => ({
                                                ...cur,
                                                exercises: cur.exercises.filter((x) => x.id !== ex.id),
                                              }))
                                            }
                                          >
                                            <Trash2 size={10} color="#CBD5E1" />
                                          </button>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div style={{ position: "relative" }}>
                              <button
                                type="button"
                                className="pc-add"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExQuery("");
                                  resetExForm();
                                  setPicker(null);
                                  setExPicker(exPicker === k ? null : k);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  cursor: "pointer",
                                }}
                              >
                                <Plus size={12} color="#CBD5E1" />
                                <span style={{ fontSize: 11, color: "#CBD5E1" }}>Ejercicio</span>
                              </button>
                              {exPicker === k ? (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    ...(d >= 4 ? { right: 0 } : { left: 0 }),
                                    zIndex: 30,
                                    minWidth: 280,
                                    background: "#FFFFFF",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: 12,
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                                    padding: 16,
                                  }}
                                >
                                  {pickedEx ? (
                                    <div style={{ padding: 4 }}>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                          marginBottom: 10,
                                        }}
                                      >
                                        <button
                                          type="button"
                                          aria-label="Volver a elegir ejercicio"
                                          onClick={() => resetExForm()}
                                        >
                                          <ChevronLeft size={14} color="#94A3B8" />
                                        </button>
                                        <span
                                          style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}
                                        >
                                          {pickedEx}
                                        </span>
                                      </div>
                                      <div style={{ display: "flex", gap: 8, flexWrap: "nowrap" }}>
                                        <input
                                          autoFocus
                                          aria-label="Series"
                                          value={sets}
                                          onChange={(e) => setSets(e.target.value)}
                                          placeholder="4"
                                          style={{ ...inputStyle, width: 72 }}
                                        />
                                        <input
                                          aria-label="Reps"
                                          value={reps}
                                          onChange={(e) => setReps(e.target.value)}
                                          placeholder="8"
                                          style={{ ...inputStyle, width: 72 }}
                                        />
                                        <input
                                          aria-label="Peso ref."
                                          value={weight}
                                          onChange={(e) => setWeight(e.target.value)}
                                          placeholder="kg"
                                          style={{ ...inputStyle, width: 88 }}
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => addPicked(k)}
                                        style={{
                                          width: "100%",
                                          height: 34,
                                          background: "#111827",
                                          color: "#FFFFFF",
                                          borderRadius: 8,
                                          fontSize: 13,
                                          fontWeight: 500,
                                          marginTop: 8,
                                          cursor: "pointer",
                                        }}
                                      >
                                        Agregar
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <input
                                        autoFocus
                                        value={exQuery}
                                        onChange={(e) => setExQuery(e.target.value)}
                                        placeholder="Buscar ejercicio..."
                                        style={{
                                          width: "100%",
                                          height: 32,
                                          border: "1px solid #E2E8F0",
                                          borderRadius: 8,
                                          padding: "0 10px",
                                          fontSize: 12,
                                          outline: "none",
                                        }}
                                      />
                                      <div style={{ maxHeight: 180, overflowY: "auto", marginTop: 6 }}>
                                        {filteredExercises.map((lib) => (
                                          <button
                                            key={lib.name}
                                            type="button"
                                            className="pc-lib-row"
                                            onClick={() => setPickedEx(lib.name)}
                                            style={{
                                              display: "block",
                                              width: "100%",
                                              textAlign: "left",
                                              padding: "7px 10px",
                                              borderRadius: 6,
                                              fontSize: 12,
                                              color: "#374151",
                                              cursor: "pointer",
                                            }}
                                          >
                                            <span style={{ display: "block" }}>{lib.name}</span>
                                            <span style={{ fontSize: 11, color: "#94A3B8" }}>
                                              {lib.pattern} · {lib.equipment}
                                            </span>
                                          </button>
                                        ))}
                                        {filteredExercises.length === 0 ? (
                                          <div style={{ padding: "10px 6px" }}>
                                            <p
                                              style={{
                                                fontSize: 12,
                                                color: "#94A3B8",
                                                textAlign: "center",
                                              }}
                                            >
                                              Sin resultados
                                            </p>
                                            <button
                                              type="button"
                                              className="pc-lib-row"
                                              onClick={() =>
                                                setPickedEx(exQuery.trim() || "Nuevo ejercicio")
                                              }
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 6,
                                                width: "100%",
                                                marginTop: 6,
                                                padding: "7px 10px",
                                                borderRadius: 6,
                                                fontSize: 12,
                                                color: "#374151",
                                                cursor: "pointer",
                                              }}
                                            >
                                              <Plus size={13} color="#374151" /> Crear ejercicio
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              className="pc-add"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExPicker(null);
                                setPicker(null);
                                setCircuitFor(k);
                              }}
                              style={{
                                width: "100%",
                                padding: "6px 10px",
                                borderTop: "1px solid #F8FAFC",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                cursor: "pointer",
                              }}
                            >
                              <Layers size={12} color="#CBD5E1" />
                              <span style={{ fontSize: 11, color: "#CBD5E1" }}>
                                Bloque / Circuito
                              </span>
                            </button>

                            <div
                              style={{
                                padding: "8px 10px",
                                borderTop: "1px solid #F1F5F9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ fontSize: 11, color: "#94A3B8" }}>
                                ~{Math.max(10, s.exercises.length * 8)} min
                              </span>
                              <button
                                type="button"
                                onClick={() => setExpanded(null)}
                                style={{
                                  background: "#111827",
                                  color: "#FFFFFF",
                                  borderRadius: 8,
                                  padding: "4px 12px",
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: "pointer",
                                }}
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="pc-empty"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearch("");
                              setExPicker(null);
                              setPicker(picker === k ? null : k);
                            }}
                            style={{
                              border: "1px dashed #E2E8F0",
                              borderRadius: 10,
                              height: "100%",
                              minHeight: 80,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4,
                              cursor: "pointer",
                              background: "#FAFAFA",
                            }}
                          >
                            <Plus size={16} color="#CBD5E1" />
                            <span style={{ fontSize: 11, color: "#CBD5E1" }}>
                              {showRests ? "Agregar sesión" : ""}
                            </span>
                          </button>
                        )}

                        {picker === k ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              zIndex: 30,
                              width: 240,
                              background: "#FFFFFF",
                              border: "1px solid #E2E8F0",
                              borderRadius: 12,
                              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                              padding: 8,
                            }}
                          >
                            <input
                              autoFocus
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              placeholder="Buscar sesión..."
                              style={{
                                width: "100%",
                                height: 32,
                                border: "1px solid #E2E8F0",
                                borderRadius: 8,
                                padding: "0 10px",
                                fontSize: 12,
                                outline: "none",
                              }}
                            />
                            <div style={{ maxHeight: 180, overflowY: "auto", marginTop: 6 }}>
                              {filtered.map((lib) => (
                                <button
                                  key={lib.name}
                                  type="button"
                                  className="pc-lib-row"
                                  onClick={() => {
                                    setGrid((g) => ({ ...g, [k]: clone(lib.name) }));
                                    setPicker(null);
                                    setSearch("");
                                  }}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "7px 10px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                  }}
                                >
                                  <span style={{ display: "block", fontSize: 12, color: "#374151" }}>
                                    {lib.name}
                                  </span>
                                  <span style={{ fontSize: 11, color: "#94A3B8" }}>
                                    ~{lib.minutes} min
                                  </span>
                                </button>
                              ))}
                            </div>
                            <div style={{ height: 1, background: "#F1F5F9", margin: "6px 0" }} />
                            <button
                              type="button"
                              className="pc-lib-row"
                              onClick={() => {
                                setGrid((g) => ({
                                  ...g,
                                  [k]: { id: uid(), name: "Nueva sesión", minutes: 0, exercises: [] },
                                }));
                                setPicker(null);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                width: "100%",
                                padding: "7px 10px",
                                borderRadius: 6,
                                fontSize: 12,
                                color: "#94A3B8",
                                cursor: "pointer",
                              }}
                            >
                              <Plus size={14} color="#94A3B8" /> Crear sesión nueva
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {circuitFor ? (
        <div onClick={(e) => e.stopPropagation()}>
          <CircuitModal
            open
            onClose={() => setCircuitFor(null)}
            onSubmit={(cfg: CircuitConfig) => {
              const target = circuitFor;
              if (target) {
                setSession(target, (cur) => ({
                  ...cur,
                  exercises: [
                    ...cur.exercises,
                    {
                      id: uid(),
                      label: nextLabel(cur),
                      name: cfg.name || "Circuito",
                      detail: circuitTimerLabel(cfg),
                      circuit: true,
                      circuitType: cfg.type,
                      circuitExercises: cfg.exercises.map((e) => ({
                        name: e.name,
                        reps: e.reps,
                      })),
                    },
                  ],
                }));
              }
              setCircuitFor(null);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
