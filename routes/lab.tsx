import { NewCoachGate } from "@/components/togo/EmptyStates";
import { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  LayoutTemplate,
  Dumbbell,
  Search,
  MoreHorizontal,
  Edit2,
  Rocket,
  User,
  Copy,
  Archive,
  Calendar,
  Users,
  Clock,
  X,
  Check,
} from "lucide-react";
import { Sidebar } from "@/components/togo/Sidebar";
import { LabCanvas, type LabCanvasHandle } from "@/components/togo/LabCanvas";
import { LabBlocks, type LabBlocksHandle } from "@/components/togo/LabBlocks";
import { LabSessions } from "@/components/togo/LabSessions";



export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "Lab · Crear programas y sesiones | TOGO" },
      {
        name: "description",
        content:
          "El Lab de TOGO es el espacio del coach para crear programas y plantillas de sesiones antes de asignarlas o publicarlas.",
      },
      { property: "og:title", content: "Lab · Crear programas y sesiones | TOGO" },
      {
        property: "og:description",
        content: "Creá programas y sesiones, asignalos a tus atletas o publicalos en el marketplace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <NewCoachGate section="lab"><LabPage /></NewCoachGate>,
});

type ProgramStatus = "En progreso" | "Listo para publicar" | "Archivado";

type Program = {
  id: string;
  name: string;
  description: string;
  weeks: number;
  sessions: number;
  athletes: number;
  status: ProgramStatus;
  progress?: number;
};

const PROGRAMS: Program[] = [
  {
    id: "p1",
    name: "Fuerza base 12 semanas",
    description: "Programa de hipertrofia progresiva para intermedios.",
    weeks: 12,
    sessions: 36,
    athletes: 8,
    status: "En progreso",
    progress: 65,
  },
  {
    id: "p2",
    name: "Cardio y movilidad — 6 semanas",
    description: "Mejorá tu resistencia y amplitud de movimiento.",
    weeks: 6,
    sessions: 18,
    athletes: 3,
    status: "Listo para publicar",
  },
  {
    id: "p3",
    name: "Pérdida de grasa — verano",
    description: "Alta densidad de trabajo, déficit calórico.",
    weeks: 8,
    sessions: 24,
    athletes: 0,
    status: "En progreso",
    progress: 30,
  },
  {
    id: "p4",
    name: "Iniciación al peso libre",
    description: "Para alumnos sin experiencia con barras y mancuernas.",
    weeks: 4,
    sessions: 12,
    athletes: 0,
    status: "Archivado",
  },
  {
    id: "p5",
    name: "Potencia y explosividad",
    description: "Trabajo pliométrico y de velocidad.",
    weeks: 6,
    sessions: 18,
    athletes: 2,
    status: "En progreso",
    progress: 80,
  },
  {
    id: "p6",
    name: "Movilidad para deportistas",
    description: "Rutinas de movilidad activa y pasiva.",
    weeks: 4,
    sessions: 8,
    athletes: 5,
    status: "Listo para publicar",
  },
];

const ATHLETES = [
  { id: "a1", name: "Lucía Fernández", initials: "LF", active: null },
  { id: "a2", name: "Martín Gómez", initials: "MG", active: "Fuerza base 12 semanas" },
  { id: "a3", name: "Camila Suárez", initials: "CS", active: null },
  { id: "a4", name: "Julián Ríos", initials: "JR", active: "Potencia y explosividad" },
  { id: "a5", name: "Sofía Molina", initials: "SM", active: null },
  { id: "a6", name: "Nicolás Paz", initials: "NP", active: "Movilidad para deportistas" },
];

const statusChipStyle: Record<ProgramStatus, { backgroundColor: string; color: string }> = {
  "En progreso": { backgroundColor: "#FEF9C3", color: "#854D0E" },
  "Listo para publicar": { backgroundColor: "#DCFCE7", color: "#166534" },
  Archivado: { backgroundColor: "#F1F5F9", color: "#94A3B8" },
};

const PROGRAM_MENU = [
  { label: "Editar", icon: Edit2 },
  { label: "Publicar en marketplace", icon: Rocket },
  { label: "Asignar a atleta", icon: User },
  { label: "Duplicar", icon: Copy },
  { label: "Archivar", icon: Archive },
];

function FilterChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-row gap-1.5">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="cursor-pointer rounded-full border px-3.5 py-[5px] text-[12px] transition-colors"
            style={
              active
                ? { backgroundColor: "#111827", color: "#FFFFFF", borderColor: "#111827" }
                : { backgroundColor: "#FFFFFF", color: "#374151", borderColor: "#E2E8F0" }
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full" style={{ maxWidth: 280, flex: 1 }}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#CBD5E1" }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-[10px] border bg-white pl-9 pr-3 text-[13px] outline-none"
        style={{ height: 38, borderColor: "#E2E8F0", color: "#111827" }}
      />
    </div>
  );
}

function PlaceholderCard({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] p-5"
      style={{
        border: `1.5px dashed ${hover ? "#CBD5E1" : "#E2E8F0"}`,
        backgroundColor: hover ? "#FAFAFA" : "#FFFFFF",
        minHeight: 180,
      }}
    >
      <Plus size={20} style={{ color: "#CBD5E1" }} />
      <span className="text-[13px]" style={{ color: "#94A3B8" }}>
        {label}
      </span>
    </button>
  );
}

type Tab = "Lienzo" | "Programas" | "Sesiones" | "Bloques";

function LabPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Lienzo");
  const [newOpen, setNewOpen] = useState(false);
  const canvasRef = useRef<LabCanvasHandle>(null);
  const blocksRef = useRef<LabBlocksHandle>(null);


  const [programQuery, setProgramQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("Todos");
  const [sessionQuery, setSessionQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState("Todos");

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [assignProgram, setAssignProgram] = useState<Program | null>(null);
  const [newProgramOpen, setNewProgramOpen] = useState(false);

  const filteredPrograms = useMemo(() => {
    const q = programQuery.trim().toLowerCase();
    return PROGRAMS.filter((p) => {
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchF =
        programFilter === "Todos" ||
        (programFilter === "En progreso" && p.status === "En progreso") ||
        (programFilter === "Listos para publicar" && p.status === "Listo para publicar") ||
        (programFilter === "Archivados" && p.status === "Archivado");
      return matchQ && matchF;
    });
  }, [programQuery, programFilter]);


  const newOptions: { label: string; icon: typeof Plus; onClick: () => void }[] =
    tab === "Lienzo"
      ? [
          { label: "Nueva sesión", icon: Dumbbell, onClick: () => canvasRef.current?.newSession() },
          { label: "Nueva semana", icon: Calendar, onClick: () => canvasRef.current?.addWeek() },
        ]
      : tab === "Programas"
        ? [{ label: "Nuevo programa", icon: LayoutTemplate, onClick: () => setNewProgramOpen(true) }]
        : tab === "Sesiones"
          ? [
              {
                label: "Nueva sesión",
                icon: Dumbbell,
                onClick: () => navigate({ to: "/sesiones/$sessionId", params: { sessionId: "nueva" } }),
              },
            ]
          : [{ label: "Nuevo circuito", icon: Clock, onClick: () => blocksRef.current?.newCircuit() }];


  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      <Sidebar active="Lab" />

      <main className="flex flex-1 flex-col" style={{ overflow: "hidden" }}>
        {/* HEADER */}
        <div
          className="flex shrink-0 flex-row items-center justify-between"
          style={{ height: 52, padding: "0 20px 0 32px", backgroundColor: "#111827" }}
        >
          <h1 className="text-[16px] font-bold" style={{ color: "#FFFFFF" }}>
            Lab
          </h1>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNewOpen((v) => !v)}
              className="flex flex-row items-center gap-1.5 rounded-[10px] text-[13px] font-semibold"
              style={{ backgroundColor: "#FFFFFF", color: "#111827", height: 34, padding: "0 14px", borderRadius: 8, fontSize: 12 }}
            >
              <Plus size={14} />
              Nuevo
            </button>

            {newOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNewOpen(false)} />
                <div
                  className="absolute rounded-[12px] border bg-white"
                  style={{
                    right: 0,
                    top: 46,
                    borderColor: "#E2E8F0",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    padding: 6,
                    minWidth: 200,
                    zIndex: 20,
                  }}
                >
                  {newOptions.map(({ label, icon: Icon, onClick }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setNewOpen(false);
                        onClick();
                      }}
                      className="flex w-full flex-row items-center gap-2 whitespace-nowrap rounded-[8px] text-left text-[13px] hover:bg-[#F8FAFC]"
                      style={{ padding: "10px 14px", color: "#374151" }}
                    >
                      <Icon size={14} style={{ color: "#94A3B8" }} />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* TABS */}
        <div
          className="flex shrink-0 flex-row"
          style={{ borderBottom: "1px solid #E2E8F0", padding: "0 32px", backgroundColor: "#FFFFFF" }}
        >
          {(["Lienzo", "Programas", "Sesiones", "Bloques"] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="cursor-pointer text-[13px] font-medium"
                style={{
                  padding: "10px 20px",
                  color: active ? "#111827" : "#94A3B8",
                  borderBottom: `2px solid ${active ? "#111827" : "transparent"}`,
                  marginBottom: -1,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: "24px 32px" }}>
          {tab === "Lienzo" ? (
            <LabCanvas
              ref={canvasRef}
              programs={PROGRAMS.map((p) => p.name)}
              athletes={ATHLETES.map((a) => ({ id: a.id, name: a.name }))}
              onEditDetail={() => navigate({ to: "/sesiones/$sessionId", params: { sessionId: "s1" } })}
            />
          ) : null}

          {tab === "Bloques" ? <LabBlocks ref={blocksRef} /> : null}

          {tab === "Programas" ? (
            <>
              <div className="flex flex-row items-center gap-3" style={{ marginBottom: 20 }}>
                <SearchInput value={programQuery} onChange={setProgramQuery} placeholder="Buscar programa..." />
                <FilterChips
                  options={["Todos", "En progreso", "Listos para publicar", "Archivados"]}
                  value={programFilter}
                  onChange={setProgramFilter}
                />
              </div>

              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
              >
                {filteredPrograms.map((p) => (
                  <ProgramCard
                    key={p.id}
                    program={p}
                    menuOpen={openMenu === p.id}
                    onToggleMenu={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                    onCloseMenu={() => setOpenMenu(null)}
                    onEdit={() => navigate({ to: "/marketplace-coach" })}
                    onAssign={() => setAssignProgram(p)}
                  />
                ))}
                <PlaceholderCard label="Nuevo programa" onClick={() => setNewProgramOpen(true)} />
              </div>
            </>
          ) : null}

          {tab === "Sesiones" ? (
            <>
              <div className="flex flex-row items-center gap-3" style={{ marginBottom: 20 }}>
                <SearchInput value={sessionQuery} onChange={setSessionQuery} placeholder="Buscar sesión..." />
                <FilterChips
                  options={["Todos", "Fuerza", "Cardio", "Movilidad", "Circuito"]}
                  value={sessionFilter}
                  onChange={setSessionFilter}
                />
              </div>

              <LabSessions
                query={sessionQuery}
                filter={sessionFilter}
                onEditDetail={(id) => navigate({ to: "/sesiones/$sessionId", params: { sessionId: id } })}
              />
            </>
          ) : null}

        </div>
      </main>

      {assignProgram ? (
        <AssignModal program={assignProgram} onClose={() => setAssignProgram(null)} />
      ) : null}

      {newProgramOpen ? (
        <NewProgramModal
          onClose={() => setNewProgramOpen(false)}
          onCreate={() => {
            setNewProgramOpen(false);
            navigate({ to: "/marketplace-coach" });
          }}
        />
      ) : null}
    </div>
  );
}

function NewProgramModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weeks, setWeeks] = useState("8");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.35)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-[16px] bg-white"
        style={{ width: 480, maxWidth: "100%", padding: 28, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
      >
        <div className="flex flex-row items-start justify-between" style={{ marginBottom: 20 }}>
          <h2 className="text-[16px] font-bold" style={{ color: "#111827" }}>
            Nuevo programa
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={18} style={{ color: "#94A3B8" }} />
          </button>
        </div>

        <label className="block text-[12px] font-medium" style={{ color: "#374151", marginBottom: 6 }}>
          Nombre del programa
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Fuerza base 12 semanas"
          className="w-full rounded-[10px] border px-3 text-[13px] outline-none"
          style={{ height: 40, borderColor: "#E2E8F0", color: "#111827", marginBottom: 16 }}
        />

        <label className="block text-[12px] font-medium" style={{ color: "#374151", marginBottom: 6 }}>
          Descripción breve
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contá de qué se trata el programa."
          className="w-full rounded-[10px] border p-3 text-[13px] outline-none"
          style={{ height: 72, borderColor: "#E2E8F0", color: "#111827", marginBottom: 16, resize: "none" }}
        />

        <label className="block text-[12px] font-medium" style={{ color: "#374151", marginBottom: 6 }}>
          Duración
        </label>
        <div className="flex flex-row items-center gap-2" style={{ marginBottom: 24 }}>
          <input
            type="number"
            min={1}
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            className="rounded-[10px] border px-3 text-[13px] outline-none"
            style={{ height: 40, width: 90, borderColor: "#E2E8F0", color: "#111827" }}
          />
          <span className="text-[13px]" style={{ color: "#94A3B8" }}>
            semanas
          </span>
        </div>

        <button
          type="button"
          disabled={!name.trim()}
          onClick={onCreate}
          className="w-full rounded-[10px] text-[13px] font-semibold disabled:opacity-40"
          style={{ height: 42, backgroundColor: "#111827", color: "#FFFFFF" }}
        >
          Crear programa
        </button>
      </div>
    </div>
  );
}


function ProgramCard({
  program,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onAssign,
}: {
  program: Program;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onEdit: () => void;
  onAssign: () => void;
}) {
  const [hover, setHover] = useState(false);
  const chip = statusChipStyle[program.status];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex cursor-pointer flex-col rounded-[14px] bg-white p-5"
      style={{
        border: `1px solid ${hover ? "#CBD5E1" : "#E2E8F0"}`,
        boxShadow: hover ? "0 4px 16px rgba(0,0,0,0.07)" : "none",
      }}
    >
      <div className="flex flex-row items-start justify-between" style={{ marginBottom: 12 }}>
        <span
          className="rounded-[6px] text-[11px] font-medium"
          style={{ ...chip, padding: "3px 8px" }}
        >
          {program.status}
        </span>

        <div className="relative">
          <button type="button" onClick={onToggleMenu} aria-label="Más opciones">
            <MoreHorizontal size={16} style={{ color: "#CBD5E1" }} />
          </button>
          {menuOpen ? (
            <>
              <div className="fixed inset-0" style={{ zIndex: 5 }} onClick={onCloseMenu} />
              <div
                className="absolute rounded-[10px] border bg-white"
                style={{
                  right: 0,
                  top: 22,
                  borderColor: "#E2E8F0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  padding: 4,
                  zIndex: 10,
                  minWidth: 200,
                }}
              >
                {PROGRAM_MENU.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      onCloseMenu();
                      if (label === "Editar") onEdit();
                      if (label === "Asignar a atleta") onAssign();
                    }}
                    className="flex w-full flex-row items-center gap-2 whitespace-nowrap rounded-[6px] text-left text-[12px] hover:bg-[#F8FAFC]"
                    style={{ padding: "8px 12px", color: "#374151" }}
                  >
                    <Icon size={12} style={{ color: "#94A3B8" }} />
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <h3 className="text-[15px] font-bold" style={{ color: "#111827", marginBottom: 4 }}>
        {program.name}
      </h3>
      <p
        className="text-[12px]"
        style={{
          color: "#64748B",
          lineHeight: 1.5,
          marginBottom: 14,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {program.description}
      </p>

      <div className="flex flex-row flex-wrap items-center gap-3" style={{ marginBottom: 14 }}>
        <Meta icon={Calendar} text={`${program.weeks} semanas`} />
        <Meta icon={Dumbbell} text={`${program.sessions} sesiones`} />
        <Meta icon={Users} text={`${program.athletes} atletas asignados`} />
      </div>

      {program.status === "En progreso" && program.progress != null ? (
        <div style={{ marginBottom: 14 }}>
          <div className="flex flex-row items-center justify-between" style={{ marginBottom: 5 }}>
            <span className="text-[11px]" style={{ color: "#94A3B8" }}>
              Completado
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "#111827" }}>
              {program.progress}%
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, backgroundColor: "#F1F5F9" }}>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: "#111827",
                width: `${program.progress}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      <div
        className="flex flex-row gap-2"
        style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid #F8FAFC" }}
      >
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 items-center justify-center rounded-[8px] border text-[12px] font-medium hover:bg-[#F8FAFC]"
          style={{ height: 34, borderColor: "#E2E8F0", color: "#374151" }}
        >
          Editar
        </button>

        {program.status === "Listo para publicar" ? (
          <button
            type="button"
            className="flex flex-1 items-center justify-center rounded-[8px] text-[12px] font-medium"
            style={{ height: 34, backgroundColor: "#111827", color: "#FFFFFF" }}
          >
            Publicar
          </button>
        ) : null}

        {program.status !== "Archivado" ? (
          <button
            type="button"
            onClick={onAssign}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border text-[12px] font-medium hover:bg-[#F8FAFC]"
            style={{ height: 34, borderColor: "#E2E8F0", color: "#374151" }}
          >
            <User size={12} style={{ color: "#94A3B8" }} />
            Asignar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  text,
}: {
  icon: typeof Calendar;
  text: string;
}) {
  return (
    <span className="flex flex-row items-center gap-1">
      <Icon size={12} style={{ color: "#CBD5E1" }} />
      <span className="text-[11px]" style={{ color: "#94A3B8" }}>
        {text}
      </span>
    </span>
  );
}

function AssignModal({ program, onClose }: { program: Program; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");

  const list = ATHLETES.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.35)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-[16px] bg-white"
        style={{ width: 480, maxWidth: "100%", padding: 28, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
      >
        <div className="flex flex-row items-start justify-between">
          <h2 className="text-[16px] font-bold" style={{ color: "#111827" }}>
            Asignar programa
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={18} style={{ color: "#94A3B8" }} />
          </button>
        </div>

        <div
          className="inline-flex rounded-[8px] text-[13px] font-medium"
          style={{ backgroundColor: "#F1F5F9", color: "#374151", padding: "6px 12px", margin: "12px 0 20px" }}
        >
          {program.name}
        </div>

        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#CBD5E1" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar atleta..."
            aria-label="Buscar atleta"
            className="w-full rounded-[10px] border pl-9 pr-3 text-[13px] outline-none"
            style={{ height: 40, borderColor: "#E2E8F0", color: "#111827" }}
          />
        </div>

        <div
          className="mt-3 flex flex-col gap-1 overflow-y-auto"
          style={{ maxHeight: 240 }}
        >
          {list.map((a) => {
            const checked = selected.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  setSelected((prev) => (checked ? prev.filter((x) => x !== a.id) : [...prev, a.id]))
                }
                className="flex flex-row items-center gap-3 rounded-[10px] text-left hover:bg-[#F8FAFC]"
                style={{ padding: "10px 12px" }}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px]"
                  style={{
                    border: `1.5px solid ${checked ? "#111827" : "#E2E8F0"}`,
                    backgroundColor: checked ? "#111827" : "transparent",
                  }}
                >
                  {checked ? <Check size={11} style={{ color: "#FFFFFF" }} /> : null}
                </span>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: "#F1F5F9", color: "#374151" }}
                >
                  {a.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium" style={{ color: "#111827" }}>
                    {a.name}
                  </span>
                  <span className="block text-[11px]" style={{ color: "#94A3B8" }}>
                    {a.active ? `Programa activo: ${a.active}` : "Sin programa activo"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <label className="block text-[12px] font-medium" style={{ color: "#374151", marginBottom: 6 }}>
            Fecha de inicio
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-[10px] border px-3 text-[13px] outline-none"
            style={{ height: 40, borderColor: "#E2E8F0", color: "#111827" }}
          />
          <p className="text-[11px]" style={{ color: "#94A3B8", marginTop: 6 }}>
            El programa empezará en la semana que elijas.
          </p>
        </div>

        <div className="flex flex-row gap-2.5" style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[10px] border text-[13px]"
            style={{ height: 40, borderColor: "#E2E8F0", color: "#374151" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={onClose}
            className="flex-1 rounded-[10px] text-[13px] font-medium disabled:opacity-40"
            style={{ height: 40, backgroundColor: "#111827", color: "#FFFFFF" }}
          >
            {`Asignar a ${selected.length} atleta${selected.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
