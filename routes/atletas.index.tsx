import { toast as sonnerToast } from "sonner";
import { NewCoachGate } from "@/components/togo/EmptyStates";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy,
  LayoutGrid,
  LayoutTemplate,
  List,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Smile,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Sidebar } from "@/components/togo/Sidebar";

export const Route = createFileRoute("/atletas/")({
  head: () => ({
    meta: [
      { title: "Mis atletas · TOGO" },
      {
        name: "description",
        content:
          "Gestioná el progreso y los programas de tus atletas: estado de carga, bienestar, próximas sesiones y acciones rápidas.",
      },
      { property: "og:title", content: "Mis atletas · TOGO" },
      {
        property: "og:description",
        content: "Todos tus atletas con estado, programa y acciones rápidas en una sola pantalla.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <NewCoachGate section="atletas"><AthletesPage /></NewCoachGate>,
});

export type Load = "ok" | "warn" | "risk" | "none" | "inactive";

export type Athlete = {
  id: string;
  name: string;
  months: number;
  program: string | null;
  week: string | null;
  energy: number | null;
  sleep: number | null;
  mood: number | null;
  last: string;
  next: string | null;
  load: Load;
  marketplace?: boolean;
  invited?: boolean;
};

export const ATHLETES: Athlete[] = [
  { id: "santiago-perez", name: "Santiago Pérez", months: 8, program: "Fuerza base 12 sem", week: "Sem 7/12", energy: 8, sleep: 7, mood: 8, last: "ayer", next: "mañana", load: "ok" },
  { id: "valentina-garcia", name: "Valentina García", months: 5, program: "Cardio y movilidad", week: "Sem 3/6", energy: 6, sleep: 5, mood: 6, last: "hace 3 días", next: "hoy", load: "warn" },
  { id: "lucia-torres", name: "Lucía Torres", months: 3, program: "Fuerza base 12 sem", week: "Sem 2/12", energy: 9, sleep: 8, mood: 9, last: "hoy", next: "jueves", load: "ok" },
  { id: "matias-lopez", name: "Matías López", months: 12, program: null, week: null, energy: null, sleep: null, mood: null, last: "hace 7 días", next: null, load: "none" },
  { id: "camila-sanchez", name: "Camila Sánchez", months: 6, program: "Pérdida de grasa", week: "Sem 5/8", energy: 5, sleep: 4, mood: 5, last: "ayer", next: "pasado", load: "warn", marketplace: true },
  { id: "federico-diaz", name: "Federico Díaz", months: 2, program: "Iniciación al peso libre", week: "Sem 4/4", energy: 7, sleep: 8, mood: 7, last: "hoy", next: "viernes", load: "ok", marketplace: true },
  { id: "agustina-ruiz", name: "Agustina Ruiz", months: 9, program: "Potencia y explosividad", week: "Sem 6/6", energy: 3, sleep: 3, mood: 4, last: "hace 2 días", next: "mañana", load: "risk" },
  { id: "tomas-fernandez", name: "Tomás Fernández", months: 4, program: null, week: null, energy: null, sleep: null, mood: null, last: "hace 7 días", next: null, load: "none" },
  { id: "romina-castro", name: "Romina Castro", months: 7, program: "Movilidad para deportistas", week: "Sem 2/4", energy: 8, sleep: 9, mood: 8, last: "ayer", next: "hoy", load: "ok", marketplace: true },
  { id: "nicolas-herrera", name: "Nicolás Herrera", months: 1, program: "Fuerza base 12 sem", week: "Sem 1/12", energy: 7, sleep: 6, mood: 7, last: "hace 3 días", next: "mañana", load: "ok" },
  { id: "florencia-medina", name: "Florencia Medina", months: 10, program: "Cardio y movilidad", week: "Sem 6/6", energy: 6, sleep: 7, mood: 6, last: "hoy", next: "jueves", load: "warn" },
  { id: "ezequiel-mora", name: "Ezequiel Mora", months: 3, program: null, week: null, energy: null, sleep: null, mood: null, last: "hace 14 días", next: null, load: "inactive" },
  { id: "julieta-benitez", name: "Julieta Benítez", months: 0, program: null, week: null, energy: null, sleep: null, mood: null, last: "sin ingresar", next: null, load: "none", invited: true },
  { id: "bruno-alvarez", name: "Bruno Álvarez", months: 0, program: null, week: null, energy: null, sleep: null, mood: null, last: "sin ingresar", next: null, load: "none", invited: true },
];

const LOAD_STYLE: Record<Load, { bg: string; color: string; label: string }> = {
  ok: { bg: "#DCFCE7", color: "#16A34A", label: "Carga OK" },
  warn: { bg: "#FEF9C3", color: "#854D0E", label: "En alerta" },
  risk: { bg: "#FEE2E2", color: "#DC2626", label: "Sobrecargado" },
  none: { bg: "#F1F5F9", color: "#94A3B8", label: "Sin datos" },
  inactive: { bg: "#F1F5F9", color: "#94A3B8", label: "Inactivo" },
};

type Team = { id: string; name: string; members: string[]; description?: string };

const INITIAL_TEAMS: Team[] = [
  { id: "equipo-a", name: "Equipo A", members: ["santiago-perez", "valentina-garcia", "lucia-torres", "matias-lopez", "camila-sanchez"] },
  { id: "equipo-manana", name: "Equipo Mañana", members: ["federico-diaz", "agustina-ruiz", "tomas-fernandez", "romina-castro"] },
  { id: "equipo-avanzado", name: "Equipo Avanzado", members: ["nicolas-herrera", "florencia-medina", "ezequiel-mora"] },
];

const ACTIVE_COUNT = ATHLETES.filter((a) => !a.invited).length;

const PROGRAMS = [
  "Fuerza base 12 sem",
  "Cardio y movilidad",
  "Pérdida de grasa",
  "Potencia y explosividad",
  "Movilidad para deportistas",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LoadChip({ load, compact = false }: { load: Load; compact?: boolean }) {
  const s = LOAD_STYLE[load];
  return (
    <span
      className="inline-flex flex-shrink-0 items-center"
      style={{
        height: compact ? 20 : 24,
        borderRadius: 6,
        padding: compact ? "0 6px" : "0 8px",
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

function AthletesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [view, setView] = useState<"grid" | "list">("list");
  const [invite, setInvite] = useState(false);
  const [assignFor, setAssignFor] = useState<Athlete | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [group, setGroup] = useState<string>("all");
  const [groupOpen, setGroupOpen] = useState(false);
  const [teamModal, setTeamModal] = useState<{ mode: "create" | "edit"; team: Team | null } | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState<null | "message" | "program" | "team">(null);

  const activeTeam = teams.find((t) => t.id === group) ?? null;
  const invitedCount = ATHLETES.filter((a) => a.invited).length;

  const showToast = (msg: string) => {
    sonnerToast.success(msg);
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ATHLETES.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q)) return false;
      if (activeTeam && !activeTeam.members.includes(a.id)) return false;
      if (filter === "Inactivos") return a.load === "inactive" || (a.program === null && !a.invited);
      if (filter === "Invitados") return !!a.invited;
      if (filter === "Programa especializado") return !!a.marketplace;
      return true;
    });
  }, [query, filter, activeTeam]);

  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = list.length > 0 && list.every((a) => selected.includes(a.id));
  const toggleAll = () => setSelected(allSelected ? [] : list.map((a) => a.id));

  const openCalendar = (a: Athlete) =>
    navigate({ to: "/atletas/$athleteId", params: { athleteId: a.id } });
  const openChat = (a: Athlete) =>
    navigate({ to: "/mensajes", search: { atleta: a.name } });

  const stats = [
    { value: "12", label: "Atletas totales", color: "#111827" },
    { value: "9", label: "Con programa activo", color: "#111827" },
    { value: "3", label: "Sin sesión esta semana", color: "#D97706" },
    { value: "2", label: "Invitaciones pendientes", color: "#94A3B8" },
  ];

  const bulkBtn = {
    border: "1px solid #E2E8F0",
    borderRadius: 9,
    height: 36,
    padding: "0 14px",
    fontSize: 13,
    color: "#374151",
    backgroundColor: "#FFFFFF",
    gap: 6,
    cursor: "pointer",
  } as const;

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]" style={{ backgroundColor: "#F8FAFC" }}>
      <Sidebar active="Atletas" />

      <main style={{ padding: 32, overflowY: "auto" }}>
        {/* HEADER */}
        <div className="flex items-start justify-between" style={{ marginBottom: 24, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
              {activeTeam ? activeTeam.name : "Mis atletas"}
            </h1>
            <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 2, marginBottom: 10 }}>
              {activeTeam
                ? `${activeTeam.members.length} atletas en el equipo`
                : "Gestioná el progreso y los programas de tus atletas."}
            </p>

            {/* GROUP SELECTOR */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setGroupOpen((v) => !v)}
                className="inline-flex items-center"
                style={{
                  border: "1px solid #E2E8F0",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 9,
                  height: 36,
                  padding: "0 14px",
                  fontSize: 13,
                  color: "#374151",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <Users size={13} color="#94A3B8" />
                {activeTeam ? `${activeTeam.name} · ${activeTeam.members.length} atletas` : `Todos los atletas (${ACTIVE_COUNT})`}
                <ChevronDown size={13} color="#CBD5E1" />
              </button>

              {groupOpen ? (
                <>
                  <div onClick={() => setGroupOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
                  <div
                    style={{
                      position: "absolute",
                      top: 44,
                      left: 0,
                      width: 260,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                      padding: 8,
                      zIndex: 30,
                    }}
                  >
                    <div style={{ padding: "6px 10px 4px", fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Atletas
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGroup("all");
                        setGroupOpen(false);
                      }}
                      className="block w-full text-left"
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        fontSize: 13,
                        color: "#374151",
                        backgroundColor: group === "all" ? "#F1F5F9" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      Todos los atletas ({ACTIVE_COUNT})
                    </button>

                  </div>
                </>
              ) : null}
            </div>
          </div>

          {selected.length > 0 ? (
            <div className="flex flex-shrink-0 items-center" style={{ gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                {selected.length} seleccionados
              </span>
              <button type="button" onClick={() => setBulk("message")} className="inline-flex items-center" style={bulkBtn}>
                <MessageCircle size={13} color="#94A3B8" />
                Enviar mensaje
              </button>
              <button type="button" onClick={() => setBulk("program")} className="inline-flex items-center" style={bulkBtn}>
                <LayoutTemplate size={13} color="#94A3B8" />
                Asignar programa
              </button>
              <button type="button" onClick={() => setBulk("team")} className="inline-flex items-center" style={bulkBtn}>
                <Users size={13} color="#94A3B8" />
                Agregar a equipo
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`${selected.length} atletas archivados`);
                  setSelected([]);
                }}
                className="inline-flex items-center"
                style={{ ...bulkBtn, color: "#94A3B8" }}
              >
                <Archive size={13} color="#94A3B8" />
                Archivar
              </button>
              <button type="button" aria-label="Cancelar selección" onClick={() => setSelected([])}>
                <X size={14} color="#CBD5E1" />
              </button>
            </div>
          ) : (
            <div className="flex flex-shrink-0 items-center" style={{ gap: 8 }}>
              {activeTeam ? (
                <button
                  type="button"
                  onClick={() => setTeamModal({ mode: "edit", team: activeTeam })}
                  className="inline-flex items-center"
                  style={bulkBtn}
                >
                  <Settings2 size={13} color="#94A3B8" />
                  Gestionar equipo
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setInvite(true)}
                className="inline-flex items-center"
                style={{
                  backgroundColor: "#111827",
                  color: "#FFFFFF",
                  borderRadius: 10,
                  height: 40,
                  padding: "0 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  gap: 8,
                }}
              >
                <UserPlus size={14} />
                Invitar atleta
              </button>
            </div>
          )}
        </div>


        {/* STATS */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                padding: "16px 20px",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
            <Search size={14} color="#CBD5E1" style={{ position: "absolute", left: 12, top: 12 }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar atleta…"
              style={{
                width: "100%",
                height: 38,
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                backgroundColor: "#FFFFFF",
                padding: "0 12px 0 36px",
                fontSize: 13,
                color: "#111827",
                outline: "none",
              }}
            />
          </div>

          <div className="flex" style={{ gap: 8 }}>
            {["Todos", "Inactivos", "Invitados", "Programa especializado"].map((c) => {
              const on = filter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  style={{
                    border: `1px solid ${on ? "#111827" : "#E2E8F0"}`,
                    borderRadius: 20,
                    padding: "5px 16px",
                    fontSize: 12,
                    color: on ? "#FFFFFF" : "#374151",
                    backgroundColor: on ? "#111827" : "#FFFFFF",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c === "Invitados" ? `Invitados (${invitedCount})` : c}
                </button>
              );
            })}
          </div>

          <div className="flex items-center" style={{ gap: 4, marginLeft: "auto" }}>
            {([
              { key: "grid" as const, Icon: LayoutGrid },
              { key: "list" as const, Icon: List },
            ]).map(({ key, Icon }) => {
              const on = view === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={key === "grid" ? "Vista en tarjetas" : "Vista en lista"}
                  onClick={() => setView(key)}
                  className="flex items-center justify-center"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    backgroundColor: on ? "#F1F5F9" : "transparent",
                    color: on ? "#111827" : "#CBD5E1",
                  }}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {list.map((a) => (
              <AthleteCard
                key={a.id}
                a={a}
                menuOpen={menuFor === a.id}
                onMenu={() => setMenuFor((v) => (v === a.id ? null : a.id))}
                onCloseMenu={() => setMenuFor(null)}
                onCalendar={() => openCalendar(a)}
                onChat={() => openChat(a)}
                onAssign={() => setAssignFor(a)}
                onAction={showToast}
              />
            ))}
          </div>
        ) : (
          <ListView
            list={list}
            onCalendar={openCalendar}
            onChat={openChat}
            menuFor={menuFor}
            setMenuFor={setMenuFor}
            onAssign={(a) => setAssignFor(a)}
            onAction={showToast}
            selected={selected}
            onToggle={toggleOne}
            allSelected={allSelected}
            onToggleAll={toggleAll}
          />
        )}
      </main>

      {invite ? <InviteModal onClose={() => setInvite(false)} onSent={showToast} /> : null}
      {assignFor ? (
        <AssignModal
          athlete={assignFor}
          onClose={() => setAssignFor(null)}
          onAssign={(p) => {
            setAssignFor(null);
            showToast(`"${p}" asignado a ${assignFor.name}`);
          }}
        />
      ) : null}

      {teamModal ? (
        <TeamModal
          mode={teamModal.mode}
          team={teamModal.team}
          onClose={() => setTeamModal(null)}
          onSave={(t) => {
            setTeams((prev) => {
              const exists = prev.some((x) => x.id === t.id);
              return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
            });
            setTeamModal(null);
            showToast(teamModal.mode === "create" ? "Equipo creado ✓" : `Equipo "${t.name}" actualizado`);
          }}
        />
      ) : null}

      {bulk === "message" ? (
        <BroadcastModal
          count={selected.length}
          onClose={() => setBulk(null)}
          onSend={() => {
            showToast(`Mensaje enviado a ${selected.length} atletas`);
            setBulk(null);
            setSelected([]);
          }}
        />
      ) : null}

      {bulk === "program" ? (
        <BulkProgramModal
          count={selected.length}
          onClose={() => setBulk(null)}
          onAssign={(p) => {
            showToast(`"${p}" asignado a ${selected.length} atletas`);
            setBulk(null);
            setSelected([]);
          }}
        />
      ) : null}

      {bulk === "team" ? (
        <BulkTeamModal
          teams={teams}
          onClose={() => setBulk(null)}
          onAdd={(ids) => {
            setTeams((prev) =>
              prev.map((t) =>
                ids.includes(t.id)
                  ? { ...t, members: Array.from(new Set([...t.members, ...selected])) }
                  : t,
              ),
            );
            showToast(`${selected.length} atletas agregados a ${ids.length} equipo(s)`);
            setBulk(null);
            setSelected([]);
          }}
        />
      ) : null}

      {toast ? (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#111827",
            color: "#FFFFFF",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 13,
            zIndex: 60,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

const CARD_MENU = ["Ver perfil", "Asignar programa", "Enviar mensaje", "Pausar atleta", "Eliminar atleta"];

function AthleteCard({
  a,
  menuOpen,
  onMenu,
  onCloseMenu,
  onCalendar,
  onChat,
  onAssign,
  onAction,
}: {
  a: Athlete;
  menuOpen: boolean;
  onMenu: () => void;
  onCloseMenu: () => void;
  onCalendar: () => void;
  onChat: () => void;
  onAssign: () => void;
  onAction: (msg: string) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onCalendar}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        border: `1px solid ${hover ? "#CBD5E1" : "#E2E8F0"}`,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        boxShadow: hover ? "0 4px 16px rgba(0,0,0,0.07)" : "none",
        position: "relative",
      }}
    >
      {/* TOP */}
      <div className="flex items-start" style={{ gap: 12, marginBottom: 16 }}>
        <div
          className="flex flex-shrink-0 items-center justify-center"
          style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "#F1F5F9", fontSize: 16, fontWeight: 600, color: "#94A3B8" }}
        >
          {initials(a.name)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{a.name}</span>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            Coach desde hace {a.months} {a.months === 1 ? "mes" : "meses"}
          </span>
        </div>
        <LoadChip load={a.load} />
      </div>

      {/* PROGRAM */}
      <div
        className="flex items-center"
        style={{ gap: 8, backgroundColor: "#F8FAFC", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}
      >
        <LayoutTemplate size={13} color="#CBD5E1" />
        {a.program ? (
          <>
            <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{a.program}</span>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>{a.week}</span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic", flex: 1 }}>
            Sin programa activo
          </span>
        )}
      </div>

      {/* WELLNESS */}
      <div className="flex items-center" style={{ gap: 12, marginBottom: 14 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          {([
            { Icon: Zap, v: a.energy },
            { Icon: Moon, v: a.sleep },
            { Icon: Smile, v: a.mood },
          ]).map(({ Icon, v }, i) => (
            <span key={i} className="flex items-center" style={{ gap: 4 }}>
              <Icon size={11} color="#CBD5E1" />
              <span style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>
                {v === null ? "—" : `${v}/10`}
              </span>
            </span>
          ))}
        </div>
        <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: "auto" }}>Hoy</span>
      </div>

      {/* LAST SESSION */}
      <div className="flex items-center" style={{ gap: 6, marginBottom: 14 }}>
        <Calendar size={11} color="#CBD5E1" />
        <span style={{ fontSize: 11, color: "#94A3B8" }}>Última sesión: {a.last}</span>
        <span style={{ fontSize: 11, color: "#CBD5E1" }}>·</span>
        <span style={{ fontSize: 11, color: a.next ? "#94A3B8" : "#D97706" }}>
          {a.next ? `Próxima: ${a.next}` : "Sin sesión planificada"}
        </span>
      </div>

      {/* ACTIONS */}
      <div className="flex" style={{ gap: 6, paddingTop: 14, borderTop: "1px solid #F8FAFC" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCalendar();
          }}
          className="inline-flex flex-1 items-center justify-center"
          style={{ height: 32, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#374151", gap: 6 }}
        >
          <CalendarDays size={12} color="#94A3B8" />
          Ver calendario
        </button>
        <button
          type="button"
          aria-label="Mensaje"
          onClick={(e) => {
            e.stopPropagation();
            onChat();
          }}
          className="inline-flex items-center justify-center"
          style={{ height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 12px" }}
        >
          <MessageCircle size={14} color="#94A3B8" />
        </button>
        <button
          type="button"
          aria-label="Asignar programa"
          onClick={(e) => {
            e.stopPropagation();
            onAssign();
          }}
          className="inline-flex items-center justify-center"
          style={{ height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 12px" }}
        >
          <Plus size={14} color="#94A3B8" />
        </button>
        <button
          type="button"
          aria-label="Más opciones"
          onClick={(e) => {
            e.stopPropagation();
            onMenu();
          }}
          className="inline-flex items-center justify-center"
          style={{ height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 10px" }}
        >
          <MoreHorizontal size={14} color="#CBD5E1" />
        </button>
      </div>

      {menuOpen ? (
        <>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onCloseMenu();
            }}
            style={{ position: "fixed", inset: 0, zIndex: 20 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 16,
              bottom: 54,
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              padding: 4,
              minWidth: 180,
              zIndex: 30,
            }}
          >
            {CARD_MENU.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onCloseMenu();
                  if (m === "Asignar programa") onAssign();
                  else if (m === "Enviar mensaje") onChat();
                  else if (m === "Ver perfil") onCalendar();
                  else onAction(`${m}: próximamente`);
                }}
                className="block w-full text-left"
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  color: m === "Eliminar atleta" ? "#EF4444" : "#374151",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

const COLS = "40px 1fr 140px 180px 60px 100px";

const LOAD_DOT: Record<Load, { color: string; label: string }> = {
  ok: { color: "#22C55E", label: "Carga OK" },
  warn: { color: "#EAB308", label: "En alerta" },
  risk: { color: "#EF4444", label: "Carga alta" },
  none: { color: "#E2E8F0", label: "Sin datos" },
  inactive: { color: "#E2E8F0", label: "Sin datos" },
};

function LoadDot({ load }: { load: Load }) {
  const [hover, setHover] = useState(false);
  const cfg = LOAD_DOT[load];
  return (
    <span className="relative flex justify-center">
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          flexShrink: 0,
          margin: "auto",
          backgroundColor: cfg.color,
        }}
      />
      {hover ? (
        <span
          style={{
            position: "absolute",
            bottom: 16,
            backgroundColor: "#111827",
            color: "#FFFFFF",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            whiteSpace: "nowrap",
            zIndex: 20,
          }}
        >
          {cfg.label}
        </span>
      ) : null}
    </span>
  );
}

function ListView({
  list,
  onCalendar,
  onChat,
  menuFor,
  setMenuFor,
  onAssign,
  onAction,
  selected,
  onToggle,
  allSelected,
  onToggleAll,
}: {
  list: Athlete[];
  onCalendar: (a: Athlete) => void;
  onChat: (a: Athlete) => void;
  menuFor: string | null;
  setMenuFor: (v: string | null) => void;
  onAssign: (a: Athlete) => void;
  onAction: (msg: string) => void;
  selected: string[];
  onToggle: (id: string) => void;
  allSelected: boolean;
  onToggleAll: () => void;
}) {
  return (
    <div
      style={{ backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: COLS,
          padding: "10px 20px",
          backgroundColor: "#F8FAFC",
          borderBottom: "1px solid #E2E8F0",
          fontSize: 12,
          fontWeight: 500,
          color: "#94A3B8",
        }}
      >
        <span>
          <input
            type="checkbox"
            aria-label="Seleccionar todos"
            checked={allSelected}
            onChange={onToggleAll}
            style={{ accentColor: "#111827" }}
          />
        </span>
        {["Nombre del atleta", "Acciones", "Programa u objetivo", "Carga", "Último acceso"].map((h) => (
          <span key={h} style={h === "Carga" ? { textAlign: "center" } : undefined}>
            {h}
          </span>
        ))}
      </div>

      {list.map((a) => (
        <div
          key={a.id}
          className="grid items-center"
          style={{ gridTemplateColumns: COLS, padding: "12px 20px", borderBottom: "1px solid #F8FAFC", position: "relative" }}
        >
          <span>
            <input
              type="checkbox"
              aria-label={`Seleccionar ${a.name}`}
              checked={selected.includes(a.id)}
              onChange={() => onToggle(a.id)}
              style={{ accentColor: "#111827" }}
            />
          </span>

          <div className="flex items-center" style={{ gap: 10 }}>
            <span
              className="flex flex-shrink-0 items-center justify-center"
              style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#F1F5F9", fontSize: 12, fontWeight: 600, color: "#94A3B8" }}
            >
              {initials(a.name)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{a.name}</span>
          </div>


          <span className="flex items-center" style={{ gap: 12 }}>
            <button type="button" aria-label="Ver calendario" onClick={() => onCalendar(a)}>
              <CalendarDays size={14} color="#CBD5E1" />
            </button>
            <button type="button" aria-label="Mensaje" onClick={() => onChat(a)}>
              <MessageCircle size={14} color="#CBD5E1" />
            </button>
            <button
              type="button"
              aria-label="Más opciones"
              onClick={() => setMenuFor(menuFor === a.id ? null : a.id)}
            >
              <MoreHorizontal size={14} color="#CBD5E1" />
            </button>
          </span>

          {a.program ? (
            <span className="flex items-center" style={{ gap: 6, fontSize: 13, color: "#374151" }}>
              {a.program}
              {a.marketplace ? (
                <span
                  style={{
                    fontSize: 10,
                    backgroundColor: "#EFF6FF",
                    color: "#3B82F6",
                    borderRadius: 4,
                    padding: "1px 5px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Marketplace
                </span>
              ) : null}
            </span>
          ) : (
            <span style={{ fontSize: 13, color: "#94A3B8" }}>—</span>
          )}

          <LoadDot load={a.load} />

          <span style={{ fontSize: 12, color: "#94A3B8", textTransform: "capitalize" }}>{a.last}</span>



          {menuFor === a.id ? (
            <>
              <div onClick={() => setMenuFor(null)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
              <div
                style={{
                  position: "absolute",
                  right: 20,
                  top: 44,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  padding: 4,
                  minWidth: 180,
                  zIndex: 30,
                }}
              >
                {CARD_MENU.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMenuFor(null);
                      if (m === "Asignar programa") onAssign(a);
                      else if (m === "Enviar mensaje") onChat(a);
                      else if (m === "Ver perfil") onCalendar(a);
                      else onAction(`${m}: próximamente`);
                    }}
                    className="block w-full text-left"
                    style={{
                      padding: "9px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      color: m === "Eliminar atleta" ? "#EF4444" : "#374151",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ModalShell({
  children,
  onClose,
  width = 440,
}: {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(17,24,39,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function InviteModal({ onClose, onSent }: { onClose: () => void; onSent: (m: string) => void }) {
  const [tab, setTab] = useState<"email" | "link">("email");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const link = "https://togo.app/join/pablo-r-xyz";

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Invitar atleta</h2>
        <button type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={16} color="#94A3B8" />
        </button>
      </div>

      <div className="flex" style={{ borderBottom: "1px solid #E2E8F0", marginBottom: 20 }}>
        {([
          { key: "email" as const, label: "Por email" },
          { key: "link" as const, label: "Por enlace" },
        ]).map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 500,
                color: on ? "#111827" : "#94A3B8",
                borderBottom: `2px solid ${on ? "#111827" : "transparent"}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "email" ? (
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 6 }}>
              Email del atleta
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="atleta@email.com"
              style={{
                width: "100%",
                height: 44,
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: "0 14px",
                fontSize: 13,
                color: "#111827",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 6 }}>
              Mensaje personalizado (opcional)
            </label>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Hola! Te invito a unirte a mi plataforma en TOGO…"
              style={{
                width: "100%",
                height: 72,
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                color: "#111827",
                outline: "none",
                resize: "none",
              }}
            />
          </div>
          <button
            type="button"
            disabled={!email.includes("@")}
            onClick={() => {
              onClose();
              onSent("Invitación enviada ✓");
            }}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              backgroundColor: "#111827",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              opacity: email.includes("@") ? 1 : 0.5,
            }}
          >
            Enviar invitación
          </button>
        </div>
      ) : (
        <div>
          <div className="flex" style={{ gap: 8 }}>
            <input
              readOnly
              value={link}
              style={{
                flex: 1,
                height: 44,
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                backgroundColor: "#F8FAFC",
                fontSize: 12,
                color: "#94A3B8",
                padding: "0 14px",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(link);
                onSent("Enlace copiado");
              }}
              className="inline-flex items-center"
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                height: 44,
                padding: "0 16px",
                fontSize: 13,
                color: "#374151",
                gap: 6,
              }}
            >
              <Copy size={14} color="#94A3B8" />
              Copiar
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>El enlace expira en 7 días.</p>
        </div>
      )}
    </ModalShell>
  );
}

function AssignModal({
  athlete,
  onClose,
  onAssign,
}: {
  athlete: Athlete;
  onClose: () => void;
  onAssign: (program: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [start, setStart] = useState("");

  return (
    <ModalShell onClose={onClose} width={460}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Asignar programa</h2>
        <button type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={16} color="#94A3B8" />
        </button>
      </div>
      <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 18 }}>Para {athlete.name}</p>

      <div className="flex flex-col" style={{ gap: 6, marginBottom: 18 }}>
        {PROGRAMS.map((p) => {
          const on = selected === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setSelected(p)}
              className="flex items-center justify-between text-left"
              style={{
                border: `1px solid ${on ? "#111827" : "#E2E8F0"}`,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                color: "#374151",
                backgroundColor: on ? "#F8FAFC" : "#FFFFFF",
              }}
            >
              <span className="inline-flex items-center" style={{ gap: 8 }}>
                <LayoutTemplate size={13} color="#CBD5E1" />
                {p}
              </span>
            </button>
          );
        })}
      </div>

      <label style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 6 }}>
        Fecha de inicio
      </label>
      <input
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        style={{
          width: "100%",
          height: 44,
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: "0 14px",
          fontSize: 13,
          color: "#111827",
          outline: "none",
          marginBottom: 20,
        }}
      />

      <div className="flex justify-end" style={{ gap: 8 }}>
        <button
          type="button"
          onClick={onClose}
          style={{ height: 40, borderRadius: 10, border: "1px solid #E2E8F0", padding: "0 18px", fontSize: 13, color: "#374151" }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onAssign(selected)}
          style={{
            height: 40,
            borderRadius: 10,
            backgroundColor: "#111827",
            color: "#FFFFFF",
            padding: "0 22px",
            fontSize: 13,
            fontWeight: 600,
            opacity: selected ? 1 : 0.5,
          }}
        >
          Asignar
        </button>
      </div>
    </ModalShell>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        backgroundColor: on ? "#111827" : "#E2E8F0",
        position: "relative",
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          transition: "left 120ms",
        }}
      />
    </button>
  );
}

const TEAM_FEATURES: { label: string; desc: string }[] = [
  { label: "Planificación compartida", desc: "Todos reciben automáticamente la misma sesión." },
  { label: "Chat grupal", desc: "Los atletas pueden chatear entre ellos dentro de TOGO." },
  { label: "Logros visibles", desc: "Los miembros pueden ver los logros de sus compañeros." },
];

function TeamModal({
  mode,
  team,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  team: Team | null;
  onClose: () => void;
  onSave: (t: Team) => void;
}) {
  const [name, setName] = useState(team?.name ?? "");
  const [desc, setDesc] = useState(team?.description ?? "");
  const [q, setQ] = useState("");
  const [members, setMembers] = useState<string[]>(team?.members ?? []);
  const [features, setFeatures] = useState<Record<string, boolean>>({
    "Planificación compartida": true,
    "Chat grupal": true,
    "Logros visibles": true,
  });

  const filtered = ATHLETES.filter((a) => a.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <ModalShell onClose={onClose} width={480}>
      <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
          {mode === "create" ? "Nuevo equipo" : "Gestionar equipo"}
        </h2>
        <button type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={16} color="#CBD5E1" />
        </button>
      </div>

      <label style={{ fontSize: 12, color: "#374151" }}>Nombre del equipo</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej. Equipo Mañana"
        style={{
          width: "100%",
          height: 44,
          borderRadius: 10,
          border: "1px solid #E2E8F0",
          padding: "0 12px",
          fontSize: 13,
          marginTop: 6,
          marginBottom: 14,
          outline: "none",
        }}
      />

      <label style={{ fontSize: 12, color: "#374151" }}>Descripción (opcional)</label>
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Objetivos, horarios u observaciones del grupo."
        style={{
          width: "100%",
          height: 64,
          borderRadius: 10,
          border: "1px solid #E2E8F0",
          padding: "8px 12px",
          fontSize: 13,
          marginTop: 6,
          marginBottom: 14,
          outline: "none",
          resize: "none",
        }}
      />

      <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
        Agregar atletas
      </div>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <Search size={14} color="#CBD5E1" style={{ position: "absolute", left: 12, top: 12 }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar atleta…"
          style={{
            width: "100%",
            height: 38,
            borderRadius: 9,
            border: "1px solid #E2E8F0",
            padding: "0 12px 0 34px",
            fontSize: 13,
            outline: "none",
          }}
        />
      </div>
      <div className="flex flex-col" style={{ maxHeight: 200, overflowY: "auto", gap: 4 }}>
        {filtered.map((a) => (
          <label
            key={a.id}
            className="flex items-center"
            style={{ gap: 10, padding: "6px 8px", borderRadius: 8, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={members.includes(a.id)}
              onChange={() =>
                setMembers((m) => (m.includes(a.id) ? m.filter((x) => x !== a.id) : [...m, a.id]))
              }
              style={{ width: 16, height: 16, accentColor: "#111827" }}
            />
            <span
              className="flex flex-shrink-0 items-center justify-center"
              style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#F1F5F9", fontSize: 11, fontWeight: 600, color: "#94A3B8" }}
            >
              {initials(a.name)}
            </span>
            <span style={{ fontSize: 13, color: "#111827" }}>{a.name}</span>
            <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}>
              {a.program ? "Con programa" : "Sin programa"}
            </span>
          </label>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 16, marginBottom: 4 }}>
        Funciones del equipo
      </div>
      <div className="flex flex-col">
        {TEAM_FEATURES.map((f) => (
          <div
            key={f.label}
            className="flex items-center justify-between"
            style={{ padding: "10px 0", borderBottom: "1px solid #F8FAFC", gap: 12 }}
          >
            <div>
              <div style={{ fontSize: 13, color: "#111827" }}>{f.label}</div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>{f.desc}</div>
            </div>
            <Toggle
              on={features[f.label] ?? false}
              onChange={(v) => setFeatures((s) => ({ ...s, [f.label]: v }))}
            />
          </div>
        ))}
      </div>

      <div className="flex" style={{ gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={onClose}
          style={{ border: "1px solid #E2E8F0", borderRadius: 10, height: 40, padding: "0 18px", fontSize: 13, color: "#374151", cursor: "pointer" }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              id: team?.id ?? `equipo-${Date.now()}`,
              name: name.trim(),
              ...(desc.trim() ? { description: desc.trim() } : {}),
              members,
            })
          }
          style={{
            flex: 1,
            backgroundColor: "#111827",
            color: "#FFFFFF",
            borderRadius: 10,
            height: 40,
            fontSize: 13,
            fontWeight: 600,
            opacity: name.trim() ? 1 : 0.5,
            cursor: name.trim() ? "pointer" : "default",
          }}
        >
          {mode === "create" ? "Crear equipo" : "Guardar equipo"}
        </button>
      </div>
    </ModalShell>
  );
}

function BroadcastModal({
  count,
  onClose,
  onSend,
}: {
  count: number;
  onClose: () => void;
  onSend: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <ModalShell onClose={onClose} width={460}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Enviar mensaje</h2>
        <button type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={16} color="#CBD5E1" />
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribí tu mensaje…"
        style={{
          width: "100%",
          height: 110,
          borderRadius: 10,
          border: "1px solid #E2E8F0",
          padding: "10px 12px",
          fontSize: 13,
          outline: "none",
          resize: "none",
        }}
      />
      <button
        type="button"
        disabled={!text.trim()}
        onClick={onSend}
        style={{
          width: "100%",
          marginTop: 16,
          backgroundColor: "#111827",
          color: "#FFFFFF",
          borderRadius: 10,
          height: 40,
          fontSize: 13,
          fontWeight: 600,
          opacity: text.trim() ? 1 : 0.5,
          cursor: text.trim() ? "pointer" : "default",
        }}
      >
        Enviar a {count} atletas
      </button>
    </ModalShell>
  );
}

function BulkProgramModal({
  count,
  onClose,
  onAssign,
}: {
  count: number;
  onClose: () => void;
  onAssign: (program: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <ModalShell onClose={onClose} width={460}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Asignar programa</h2>
        <button type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={16} color="#CBD5E1" />
        </button>
      </div>
      <div className="flex flex-col" style={{ gap: 6 }}>
        {PROGRAMS.map((p) => (
          <label
            key={p}
            className="flex items-center"
            style={{
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${sel === p ? "#111827" : "#E2E8F0"}`,
              fontSize: 13,
              color: "#374151",
              cursor: "pointer",
            }}
          >
            <input type="radio" checked={sel === p} onChange={() => setSel(p)} style={{ accentColor: "#111827" }} />
            {p}
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!sel}
        onClick={() => sel && onAssign(sel)}
        style={{
          width: "100%",
          marginTop: 18,
          backgroundColor: "#111827",
          color: "#FFFFFF",
          borderRadius: 10,
          height: 40,
          fontSize: 13,
          fontWeight: 600,
          opacity: sel ? 1 : 0.5,
          cursor: sel ? "pointer" : "default",
        }}
      >
        Asignar a {count} atletas
      </button>
    </ModalShell>
  );
}

function BulkTeamModal({
  teams,
  onClose,
  onAdd,
}: {
  teams: Team[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}) {
  const [sel, setSel] = useState<string[]>([]);
  return (
    <ModalShell onClose={onClose} width={440}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Agregar a equipo</h2>
        <button type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={16} color="#CBD5E1" />
        </button>
      </div>
      <div className="flex flex-col" style={{ gap: 6 }}>
        {teams.map((t) => (
          <label
            key={t.id}
            className="flex items-center"
            style={{ gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13, color: "#374151", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={sel.includes(t.id)}
              onChange={() => setSel((s) => (s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id]))}
              style={{ accentColor: "#111827" }}
            />
            <Users size={14} color="#94A3B8" />
            {t.name} · {t.members.length} atletas
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={sel.length === 0}
        onClick={() => onAdd(sel)}
        style={{
          width: "100%",
          marginTop: 18,
          backgroundColor: "#111827",
          color: "#FFFFFF",
          borderRadius: 10,
          height: 40,
          fontSize: 13,
          fontWeight: 600,
          opacity: sel.length ? 1 : 0.5,
          cursor: sel.length ? "pointer" : "default",
        }}
      >
        Agregar
      </button>
    </ModalShell>
  );
}
