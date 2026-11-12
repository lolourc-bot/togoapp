import { toast as sonnerToast } from "sonner";
import { NewCoachGate } from "@/components/togo/EmptyStates";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock,
  Eye,
  MessageCircle,
  Send,
  Plus,
  Search,
  Settings2,
  Trash2,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/togo/Sidebar";
import { CalendarTopBar, denseCell } from "@/components/togo/DenseSession";
import { SelectionToolbar, Selectable, dayDiff, mapOps, selId, useDragSelect } from "@/components/togo/CalendarSelection";
import { SessionCard, newEx, type CalEx } from "@/components/togo/AthleteSessionCard";
import { getCoachId } from "@/lib/programs";
import { fetchSessionTemplates } from "@/lib/session-templates";
import type { LabSession } from "@/components/togo/LabSessions";
import {
  fetchTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  fetchAthleteRoster,
  LOAD_LABEL,
  type Team,
  type TeamFeatures,
  type RosterMember,
} from "@/lib/teams";
import { uploadTeamPhoto } from "@/lib/team-photos";
import { Camera } from "lucide-react";
import {
  fetchTeamSessions,
  addTeamSession,
  patchTeamSessionGroup,
  deleteTeamSessionGroup,
  duplicateTeamSessionGroup,
  publishTeamSessionsInRange,
  fetchRecentTeamActivity,
  type TeamDaySession,
  type TeamActivity,
} from "@/lib/team-sessions";

type EquiposSearch = { equipo?: string };

export const Route = createFileRoute("/equipos")({
  validateSearch: (search: Record<string, unknown>): EquiposSearch => ({
    ...(typeof search["equipo"] === "string" ? { equipo: search["equipo"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Equipos · TOGO" },
      {
        name: "description",
        content:
          "Gestioná tus equipos: planificación compartida, miembros y actividad del grupo en una sola pantalla.",
      },
      { property: "og:title", content: "Equipos · TOGO" },
      {
        property: "og:description",
        content: "Planificá una semana y publicala para todos los atletas del equipo al mismo tiempo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <NewCoachGate section="equipos">
      <TeamsPage />
    </NewCoachGate>
  ),
});

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function TeamAvatar({ name, photoUrl, size = 36 }: { name: string; photoUrl: string | null | undefined; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, backgroundColor: "#F1F5F9", color: "#64748B", fontSize: size * 0.4, fontWeight: 700 }}
    >
      {photoUrl ? <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(name)}
    </div>
  );
}

function AvatarStack({ names, size = 22 }: { names: string[]; size?: number }) {
  const shown = names.slice(0, 3);
  const extra = names.length - shown.length;
  return (
    <div className="flex flex-shrink-0 items-center">
      {shown.map((n, i) => (
        <div
          key={n}
          className="flex items-center justify-center rounded-full"
          style={{ width: size, height: size, marginLeft: i === 0 ? 0 : -6, backgroundColor: "#F1F5F9", color: "#94A3B8", border: "2px solid #FFFFFF", fontSize: size >= 32 ? 11 : 9, fontWeight: 600 }}
        >
          {initials(n)}
        </div>
      ))}
      {extra > 0 ? <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 6 }}>+{extra}</span> : null}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-label={on ? "Desactivar" : "Activar"}
      className="cursor-pointer"
      style={{ width: 36, height: 20, borderRadius: 999, border: "none", backgroundColor: on ? "#111827" : "#E2E8F0", position: "relative", flexShrink: 0 }}
    >
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: 999, backgroundColor: "#FFFFFF", transition: "left 150ms" }} />
    </button>
  );
}

const outlineBtn = {
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

function templateToItems(t: LabSession): CalEx[] {
  return t.exercises.map((e, i, arr) => ({
    ...newEx(e.name, String(e.sets), String(e.reps)),
    weight: e.weight ? String(e.weight) : "",
    chain: e.group === "B" && i > 0 && arr[i - 1]?.group === "B",
  }));
}

function TeamsPage() {
  const navigate = useNavigate();
  const incoming = Route.useSearch();

  const [coachId, setCoachId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [templates, setTemplates] = useState<LabSession[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [view, setView] = useState<"list" | "detail">("list");
  const [tab, setTab] = useState<"Calendario" | "Miembros" | "Actividad">("Calendario");
  const [monthOffset, setMonthOffset] = useState(0);
  const [sessions, setSessions] = useState<Record<string, TeamDaySession[]>>({});
  const [activity, setActivity] = useState<TeamActivity[]>([]);
  const sel = useDragSelect();
  const [publishedOnly, setPublishedOnly] = useState(false);
  const [copied, setCopied] = useState<{ key: string; s: TeamDaySession }[]>([]);
  const ops = mapOps<TeamDaySession>(setSessions, (s) => ({ ...s, id: crypto.randomUUID() }));
  const selItems = ops.collect(sessions, sel.selected);
  const [picker, setPicker] = useState<{ key: string } | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; team: Team | null } | null>(null);
  const [addMember, setAddMember] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (!switcherOpen) return;
    const close = () => setSwitcherOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [switcherOpen]);

  const flash = (msg: string) => sonnerToast.success(msg);

  useEffect(() => {
    getCoachId().then(async (cid) => {
      if (!cid) {
        setLoading(false);
        return;
      }
      setCoachId(cid);
      const [teamList, rosterList, templateList] = await Promise.all([
        fetchTeams(cid),
        fetchAthleteRoster(cid),
        fetchSessionTemplates(cid),
      ]);
      setTeams(teamList);
      setRoster(rosterList);
      setTemplates(templateList);
      if (incoming.equipo && teamList.some((t) => t.id === incoming.equipo)) {
        setActiveId(incoming.equipo);
        setView("detail");
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTeam = (id: string) => {
    setActiveId(id);
    setTab("Calendario");
    setView("detail");
  };

  useEffect(() => {
    if (!activeId) return;
    fetchTeamSessions(activeId).then(setSessions);
    const members = teams.find((t) => t.id === activeId)?.members ?? [];
    const nameById = new Map(roster.map((m) => [m.id, m.name]));
    fetchRecentTeamActivity(activeId, nameById).then(setActivity);
    void members;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const team = teams.find((t) => t.id === activeId) ?? null;
  const memberList = (team?.members ?? [])
    .map((id) => roster.find((a) => a.id === id))
    .filter((a): a is RosterMember => Boolean(a));
  const memberIds = memberList.map((m) => m.id);

  const viewMonth = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthCells = useMemo(() => {
    const first = new Date(viewMonth);
    const lead = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(start.getDate() - lead);
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  const dateOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const cellKey = (d: Date) => `${activeId}|${dateOf(d)}`;
  const dateFromKey = (key: string) => key.slice(-10);

  const monthSessions = monthCells
    .filter((d) => d.getMonth() === viewMonth.getMonth())
    .flatMap((d) => sessions[cellKey(d)] ?? []);
  const draftCount = monthSessions.filter((s) => s.status === "draft").length;

  const goMonth = (dir: number) => {
    setMonthOffset((m) => m + dir);
    setPicker(null);
  };

  const onDragStart = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest("button, input")) return;
    dragStart.current = e.clientX;
    setDragging(true);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDragX(e.clientX - dragStart.current);
  };
  const onDragEnd = () => {
    if (dragStart.current === null) return;
    const dx = dragX;
    dragStart.current = null;
    setDragging(false);
    setDragX(0);
    if (dx < -60) goMonth(1);
    else if (dx > 60) goMonth(-1);
  };

  const addSession = (key: string, template: LabSession) => {
    if (!coachId || !team) return;
    const groupId = crypto.randomUUID();
    const items = templateToItems(template);
    const optimistic: TeamDaySession = {
      id: groupId,
      name: template.name,
      status: "draft",
      minutes: template.minutes,
      items,
      circuits: template.circuits,
      memberSessionIds: [],
    };
    setSessions((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), optimistic] }));
    setPicker(null);
    setPickerQuery("");
    addTeamSession(
      coachId,
      team.id,
      memberIds,
      dateFromKey(key),
      { name: template.name, minutes: template.minutes, items, circuits: template.circuits },
      groupId,
    ).catch(() => toast_error("No se pudo crear la sesión"));
  };

  function toast_error(msg: string) {
    sonnerToast.error(msg);
  }

  const removeSession = (key: string, groupId: string) => {
    setSessions((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((s) => s.id !== groupId) }));
    deleteTeamSessionGroup(groupId).catch(() => toast_error("No se pudo eliminar la sesión"));
  };

  const onSessionChange = (key: string, s: TeamDaySession, full: TeamDaySession) => {
    ops.patch(new Set([selId(key, s.id)]), (x) => ({ ...x, name: full.name, status: full.status, minutes: full.minutes, items: full.items, circuits: full.circuits }));
    patchTeamSessionGroup(s.id, { name: full.name, status: full.status, minutes: full.minutes, items: full.items, circuits: full.circuits }).catch(() => toast_error("No se pudo guardar el cambio"));
  };

  const publishSelected = (publish: boolean) => {
    ops.patch(sel.selected, (s) => ({ ...s, status: publish ? "published" : "draft" }));
    selItems.forEach(({ s }) => patchTeamSessionGroup(s.id, { status: publish ? "published" : "draft" }).catch(() => {}));
  };

  const deleteSelected = () => {
    const ids = selItems.map(({ s }) => s.id);
    ops.remove(sel.selected);
    sel.clear();
    ids.forEach((id) => deleteTeamSessionGroup(id).catch(() => {}));
  };

  const duplicateSelected = (offsetDays: number) => {
    if (!coachId || !team) return;
    const originals = selItems;
    const created = ops.place(originals, offsetDays);
    created.forEach((c, i) => {
      const orig = originals[i]!.s;
      duplicateTeamSessionGroup(coachId, team.id, memberIds, orig, dateFromKey(c.key), c.s.id).catch(() => toast_error("No se pudo duplicar"));
    });
  };

  const pasteHere = (key: string) => {
    if (!copied.length || !coachId || !team) return;
    const first = copied.reduce((m, c) => (dayDiff(c.key, m) < 0 ? c.key : m), copied[0]!.key);
    const offset = dayDiff(key, first);
    const created = ops.place(copied, offset);
    created.forEach((c, i) => {
      const orig = copied[i]!.s;
      duplicateTeamSessionGroup(coachId, team.id, memberIds, orig, dateFromKey(c.key), c.s.id).catch(() => toast_error("No se pudo pegar la sesión"));
    });
    setCopied([]);
  };

  const publishMonth = () => {
    if (!team) return;
    setSessions((prev) => {
      const next = { ...prev };
      monthCells.forEach((d) => {
        const key = cellKey(d);
        if (next[key]) next[key] = next[key]!.map((s) => ({ ...s, status: "published" }));
      });
      return next;
    });
    setConfirmPublish(false);
    const from = dateOf(monthCells[0]!);
    const to = dateOf(monthCells[monthCells.length - 1]!);
    publishTeamSessionsInRange(team.id, from, to)
      .then(() => flash(`Mes publicado para ${memberList.length} atletas`))
      .catch(() => toast_error("No se pudo publicar el mes"));
  };

  if (loading) {
    return (
      <div className="grid min-h-screen grid-cols-[240px_1fr]" style={{ backgroundColor: "#F8FAFC" }}>
        <Sidebar active="Equipos" />
        <main />
      </div>
    );
  }

  if (view === "list" || !team) {
    return (
      <div className="grid min-h-screen grid-cols-[240px_1fr]" style={{ backgroundColor: "#F8FAFC" }}>
        <Sidebar active="Equipos" />
        <main style={{ padding: "32px 40px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>Equipos</h1>
            <button
              type="button"
              onClick={() => setModal({ mode: "create", team: null })}
              className="flex items-center"
              style={{ gap: 8, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 13, fontWeight: 500, borderRadius: 10, padding: "8px 16px", border: "none", cursor: "pointer" }}
            >
              <Plus size={14} color="#FFFFFF" />
              Nuevo equipo
            </button>
          </div>

          {teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ gap: 12, padding: "80px 0" }}>
              <p style={{ fontSize: 14, color: "#374151" }}>Todavía no tenés equipos.</p>
              <button
                type="button"
                onClick={() => setModal({ mode: "create", team: null })}
                style={{ backgroundColor: "#111827", color: "#FFFFFF", borderRadius: 10, height: 40, padding: "0 20px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
              >
                Crear mi primer equipo
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {teams.map((t) => {
                const names = t.members.map((id) => roster.find((x) => x.id === id)?.name ?? "").filter(Boolean);
                return (
                  <div key={t.id} style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 18 }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                      <TeamAvatar name={t.name} photoUrl={t.photoUrl} />
                      <button
                        type="button"
                        aria-label={`Gestionar ${t.name}`}
                        onClick={() => setModal({ mode: "edit", team: t })}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "#94A3B8" }}
                      >
                        <Settings2 size={15} />
                      </button>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{t.name}</div>
                    <div className="flex items-center" style={{ gap: 8, marginTop: 4, marginBottom: 14 }}>
                      <AvatarStack names={names} />
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>{t.members.length} atletas</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectTeam(t.id)}
                      style={{ width: "100%", height: 36, borderRadius: 9, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", fontSize: 13, color: "#374151", cursor: "pointer" }}
                    >
                      Ver equipo
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {modal ? (
          <TeamModal
            mode={modal.mode}
            team={modal.team}
            roster={roster}
            onClose={() => setModal(null)}
            onDelete={() => {
              const id = modal.team?.id;
              if (!id || !coachId) return;
              setTeams((prev) => prev.filter((t) => t.id !== id));
              setModal(null);
              deleteTeam(id)
                .then(() => flash("Equipo eliminado"))
                .catch(() => toast_error("No se pudo eliminar el equipo"));
            }}
            onSave={async (t, photoFile) => {
              if (!coachId) return;
              let photoUrl = t.photoUrl;
              if (photoFile) {
                try { photoUrl = await uploadTeamPhoto(coachId, photoFile); }
                catch { toast_error("No se pudo subir la foto del equipo"); }
              }
              if (modal.mode === "create") {
                const id = await createTeam(coachId, { name: t.name, description: t.description, memberIds: t.members, features: t.features, photoUrl });
                const fresh = await fetchTeams(coachId);
                setTeams(fresh);
                setModal(null);
                flash("Equipo creado ✓");
              } else {
                const fresh = await fetchTeams(coachId);
                await updateTeam(coachId, t.id, { name: t.name, description: t.description, memberIds: t.members, features: t.features, photoUrl }).catch(() => toast_error("No se pudo actualizar el equipo"));
                setTeams(fresh.map((x) => (x.id === t.id ? { ...t, photoUrl } : x)));
                setModal(null);
                flash(`Equipo "${t.name}" actualizado`);
              }
            }}
          />
        ) : null}
      </div>
    );
  }

  const featureLine = [
    `${memberList.length} atletas`,
    team.features.planning ? "Planificación compartida" : null,
  ].filter(Boolean).join(" · ");
  void featureLine;

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]" style={{ backgroundColor: "#F8FAFC" }}>
      <Sidebar active="Equipos" />

      <main className="flex" style={{ height: "100vh", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div className="relative flex items-center" style={{ gap: 12, padding: "24px 32px 0", marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="Volver a Equipos"
              className="flex items-center"
              style={{ gap: 4, fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <ChevronLeft size={16} color="#94A3B8" />
            </button>
            <TeamAvatar name={team.name} photoUrl={team.photoUrl} size={32} />
            <AvatarStack names={memberList.map((m) => m.name)} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSwitcherOpen((v) => !v); }}
              className="flex cursor-pointer items-center transition-colors hover:border-[#CBD5E1]"
              style={{ gap: 8, padding: "8px 14px", border: "1px solid #E2E8F0", borderRadius: 10, backgroundColor: "#FFFFFF" }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{team.name}</span>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>{memberList.length} atletas</span>
              <ChevronDown size={14} color="#CBD5E1" />
            </button>
            {switcherOpen ? (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: "absolute", top: "calc(100% + 6px)", left: 32, backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", padding: 6, minWidth: 260, zIndex: 30 }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", padding: "6px 12px" }}>Mis equipos</div>
                {teams.map((t) => {
                  const names = t.members.map((id) => roster.find((x) => x.id === id)?.name ?? "").filter(Boolean);
                  const on = t.id === team.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setActiveId(t.id); setTab("Calendario"); setSwitcherOpen(false); }}
                      className="flex w-full cursor-pointer items-center hover:bg-[#F8FAFC]"
                      style={{ gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", backgroundColor: on ? "#F1F5F9" : "transparent", textAlign: "left" }}
                    >
                      <TeamAvatar name={t.name} photoUrl={t.photoUrl} size={20} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{t.name}</span>
                      <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}>{t.members.length} atletas</span>
                      {on ? <Check size={13} color="#111827" /> : <span style={{ width: 13 }} />}
                    </button>
                  );
                })}
                <div style={{ height: 1, backgroundColor: "#F1F5F9", margin: "4px 0" }} />
                <button
                  type="button"
                  onClick={() => { setSwitcherOpen(false); setModal({ mode: "create", team: null }); }}
                  className="flex w-full cursor-pointer items-center hover:bg-[#F8FAFC]"
                  style={{ gap: 8, padding: "8px 12px", borderRadius: 8, border: "none", background: "none", fontSize: 12, color: "#374151" }}
                >
                  <Plus size={12} color="#94A3B8" /> Nuevo equipo
                </button>
              </div>
            ) : null}
            <div className="flex items-center" style={{ gap: 8, marginLeft: "auto" }}>
              <button type="button" onClick={() => setModal({ mode: "edit", team })} className="inline-flex items-center" style={outlineBtn}>
                <Settings2 size={13} color="#94A3B8" /> Gestionar equipo
              </button>
              <button type="button" onClick={() => setConfirmPublish(true)} style={{ backgroundColor: "#111827", color: "#FFFFFF", borderRadius: 9, height: 36, padding: "0 16px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
                Publicar mes
              </button>
            </div>
          </div>

          <div style={{ padding: "0 32px 32px" }}>
            <div className="flex" style={{ borderBottom: "1px solid #E2E8F0", marginBottom: 24 }}>
              {(["Calendario", "Miembros", "Actividad"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="cursor-pointer"
                  style={{ padding: "10px 20px", fontSize: 13, fontWeight: 500, background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "#111827" : "transparent"}`, color: tab === t ? "#111827" : "#94A3B8" }}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "Calendario" ? (
              <>
                {sel.overlay}
                <SelectionToolbar
                  count={selItems.length}
                  hasDraft={selItems.some((i) => i.s.status === "draft")}
                  hasPublished={selItems.some((i) => i.s.status === "published")}
                  onCopy={() => setCopied(selItems)}
                  onDuplicate={() => duplicateSelected(7)}
                  onPublish={() => publishSelected(true)}
                  onUnpublish={() => publishSelected(false)}
                  onDelete={deleteSelected}
                  onCancel={sel.clear}
                />
                <div
                  onPointerDown={onDragStart}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  onPointerCancel={onDragEnd}
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", touchAction: "pan-y" }}
                >
                  <CalendarTopBar>
                    <button type="button" aria-label="Mes anterior" onClick={() => goMonth(-1)} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0 }}>
                      <ChevronLeft size={20} color="#FFFFFF" />
                    </button>
                    <button type="button" aria-label="Mes siguiente" onClick={() => goMonth(1)} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0 }}>
                      <ChevronRight size={20} color="#FFFFFF" />
                    </button>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", flex: 1 }}>{monthLabel}</span>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <button type="button" onClick={() => navigate({ to: "/mensajes", search: { teamId: team.id } })} className="flex items-center" style={{ gap: 6, border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 8, height: 34, padding: "0 14px", fontSize: 12, color: "#FFFFFF", background: "none", cursor: "pointer" }}>
                        <MessageCircle size={13} color="#FFFFFF" />Chat grupal
                      </button>
                      <button type="button" onClick={() => setConfirmPublish(true)} style={{ backgroundColor: "#FFFFFF", color: "#111827", borderRadius: 8, height: 34, padding: "0 14px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
                        Publicar todo
                      </button>
                      <button type="button" title={publishedOnly ? "Ver todo" : "Ver solo publicadas"} aria-label="Vista de atletas" onClick={() => setPublishedOnly((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0, padding: 4 }}>
                        <Eye size={18} color={publishedOnly ? "#FFFFFF" : "rgba(255,255,255,0.6)"} />
                      </button>
                      <button type="button" title="Agregar sesión hoy" aria-label="Agregar sesión hoy" onClick={() => { setMonthOffset(0); setPicker({ key: cellKey(today) }); setPickerQuery(""); }} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0, padding: 4 }}>
                        <Plus size={18} color="rgba(255,255,255,0.6)" />
                      </button>
                      <button type="button" title="Ir a hoy" aria-label="Ir a hoy" onClick={() => setMonthOffset(0)} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0, padding: 4 }}>
                        <Clock size={18} color="rgba(255,255,255,0.6)" />
                      </button>
                    </div>
                  </CalendarTopBar>
                  <div style={{ ...(dragX !== 0 ? { transform: `translateX(${dragX}px)` } : {}), transition: dragging ? "none" : "transform 300ms ease" }}>
                    <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", position: "sticky", top: 0, backgroundColor: "#FFFFFF", borderBottom: "1px solid #E2E8F0", zIndex: 10 }}>
                      {DAYS.map((d) => (
                        <div key={d} style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8", textAlign: "center", padding: "8px 0" }}>{d}</div>
                      ))}
                    </div>

                    <div ref={sel.containerRef} onMouseDown={sel.onMouseDown} style={{ maxHeight: "62vh", overflowY: "auto", userSelect: "none" }}>
                      {Array.from({ length: monthCells.length / 7 }, (_, wi) => (
                        <div key={wi} style={denseCell.weekRow}>
                          {monthCells.slice(wi * 7, wi * 7 + 7).map((d, j) => {
                            const idx = wi * 7 + j;
                            const key = cellKey(d);
                            const day = (sessions[key] ?? []).filter((s) => !publishedOnly || s.status === "published");
                            const outside = d.getMonth() !== viewMonth.getMonth();
                            const isToday = d.getTime() === today.getTime();
                            return (
                              <div key={key} className="group/cell" style={denseCell.cell(outside, idx % 7 === 6)}>
                                <div style={denseCell.header}>
                                  <span style={denseCell.dayNum(isToday, outside)}>{d.getDate()}</span>
                                  <span className="flex-1" />
                                  {copied.length ? (
                                    <button type="button" onClick={() => pasteHere(key)} className="cursor-pointer opacity-0 group-hover/cell:opacity-100" style={{ fontSize: 10, color: "#3B82F6", background: "none", border: "none", padding: 0 }}>
                                      Pegar aquí
                                    </button>
                                  ) : null}
                                </div>
                                <div style={denseCell.area}>
                                  {day.map((s) => (
                                    <Selectable key={s.id} id={selId(key, s.id)} selected={sel.selected.has(selId(key, s.id))} onToggle={sel.toggle} radius={4}>
                                      <SessionCard
                                        session={s}
                                        alignRight={false}
                                        onChange={(full) => onSessionChange(key, s, full as TeamDaySession)}
                                        onDelete={() => removeSession(key, s.id)}
                                        onCopy={() => { setCopied([{ key, s }]); flash("Sesión copiada"); }}
                                        onRepeat={() => { duplicateSelected(7); flash("Sesión repetida la semana siguiente"); }}
                                        onEditDetail={() => navigate({ to: "/sesiones/$sessionId", params: { sessionId: s.id }, search: { teamId: team.id } })}
                                      />
                                    </Selectable>
                                  ))}
                                </div>
                                <button type="button" onClick={() => { setPicker({ key }); setPickerQuery(""); }} className={denseCell.addBtn} style={denseCell.addStyle}>
                                  <Plus size={10} />
                                  sesión
                                </button>

                                {picker?.key === key ? (
                                  <>
                                    <div onClick={() => setPicker(null)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
                                    <div style={{ position: "absolute", top: 6, left: 6, width: 230, backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", padding: 8, zIndex: 30 }}>
                                      <div className="relative" style={{ marginBottom: 6 }}>
                                        <Search size={13} color="#CBD5E1" style={{ position: "absolute", left: 10, top: 10 }} />
                                        <input
                                          autoFocus
                                          value={pickerQuery}
                                          onChange={(e) => setPickerQuery(e.target.value)}
                                          placeholder="Buscar sesión…"
                                          aria-label="Buscar sesión"
                                          style={{ width: "100%", height: 34, border: "1px solid #E2E8F0", borderRadius: 9, padding: "0 10px 0 30px", fontSize: 12, color: "#374151", outline: "none" }}
                                        />
                                      </div>
                                      {templates.filter((s) => s.name.toLowerCase().includes(pickerQuery.trim().toLowerCase())).map((s) => (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => addSession(key, s)}
                                          className="flex w-full cursor-pointer items-center justify-between rounded-[8px] transition-colors hover:bg-[#F8FAFC]"
                                          style={{ background: "none", border: "none", padding: "7px 10px", fontSize: 12, color: "#374151", textAlign: "left" }}
                                        >
                                          <span>{s.name}</span>
                                          <span style={{ fontSize: 10, color: "#94A3B8" }}>{s.category}</span>
                                        </button>
                                      ))}
                                      {templates.length === 0 ? (
                                        <p style={{ fontSize: 11, color: "#94A3B8", padding: "6px 10px" }}>
                                          No tenés plantillas en /lab todavía.
                                        </p>
                                      ) : null}
                                      <div style={{ height: 1, backgroundColor: "#F1F5F9", margin: "6px 0" }} />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPicker(null);
                                          setPickerQuery("");
                                          navigate({ to: "/sesiones/$sessionId", params: { sessionId: "nueva" }, search: { teamId: team.id, date: dateFromKey(key) } });
                                        }}
                                        className="flex w-full cursor-pointer items-center rounded-[8px] transition-colors hover:bg-[#F8FAFC]"
                                        style={{ background: "none", border: "none", padding: "7px 10px", fontSize: 12, color: "#94A3B8", gap: 6 }}
                                      >
                                        <Plus size={12} />
                                        Nueva sesión
                                      </button>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start" style={{ marginTop: 16, backgroundColor: "#FFFBEB", borderRadius: 10, border: "1px solid #FDE68A", padding: "12px 16px", gap: 10 }}>
                  <Info size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: "#92400E" }}>
                    Al publicar, todos los atletas del equipo reciben estas sesiones automáticamente. Podés
                    editarlas individualmente desde el perfil de cada atleta si alguno necesita ajustes.
                  </p>
                </div>
              </>
            ) : null}

            {tab === "Miembros" ? (
              <div className="flex flex-col" style={{ gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setAddMember(true)}
                  className="flex w-full cursor-pointer items-center justify-center transition-colors hover:bg-[#F8FAFC]"
                  style={{ border: "1px solid #E2E8F0", borderRadius: 10, height: 40, fontSize: 13, color: "#374151", gap: 8, backgroundColor: "#FFFFFF", marginBottom: 8 }}
                >
                  <UserPlus size={13} color="#94A3B8" />
                  Agregar atleta
                </button>

                {memberList.map((m) => (
                  <div key={m.id} className="flex items-center" style={{ backgroundColor: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0", padding: "12px 16px", gap: 12 }}>
                    <div className="flex flex-shrink-0 items-center justify-center rounded-full" style={{ width: 36, height: 36, backgroundColor: "#F1F5F9", color: "#94A3B8", fontSize: 12, fontWeight: 600 }}>
                      {initials(m.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>
                        Atleta desde hace {m.months} {m.months === 1 ? "mes" : "meses"}
                      </div>
                    </div>
                    <span title={LOAD_LABEL[m.load]} style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: { ok: "#16A34A", warn: "#D97706", inactive: "#DC2626", none: "#CBD5E1" }[m.load], flexShrink: 0 }} />
                    <span style={{ flex: 1, textAlign: "right", fontSize: 11, color: "#94A3B8" }}>
                      Última sesión: {m.last}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/atletas/$athleteId", params: { athleteId: m.id } })}
                      className="cursor-pointer transition-colors hover:text-[#111827]"
                      style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "#94A3B8" }}
                    >
                      Ver perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!coachId) return;
                        const nextMembers = team.members.filter((id) => id !== m.id);
                        setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, members: nextMembers } : t)));
                        updateTeam(coachId, team.id, { name: team.name, description: team.description, memberIds: nextMembers, features: team.features }).catch(() => toast_error("No se pudo quitar al atleta"));
                      }}
                      aria-label={`Quitar ${m.name} del equipo`}
                      className="cursor-pointer text-[#CBD5E1] transition-colors hover:text-[#EF4444]"
                      style={{ background: "none", border: "none", padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {tab === "Actividad" ? (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Sesiones completadas recientemente
                </div>
                {activity.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#94A3B8" }}>Todavía no hay sesiones completadas por el equipo.</p>
                ) : (
                  activity.map((a, i) => (
                    <div key={i} className="flex items-start" style={{ backgroundColor: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0", padding: "14px 16px", gap: 12 }}>
                      <div className="flex flex-shrink-0 items-center justify-center rounded-full" style={{ width: 36, height: 36, backgroundColor: "#FFFBEB" }}>
                        <Trophy size={16} color="#D97706" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{a.athleteName}</span>{" "}
                          <span style={{ fontSize: 12, color: "#374151" }}>completó {a.sessionName}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{new Date(a.completedAt).toLocaleString("es-AR")}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {confirmPublish ? (
        <ModalShell onClose={() => setConfirmPublish(false)} width={420}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
            ¿Publicar {draftCount} {draftCount === 1 ? "sesión" : "sesiones"} para los{" "}
            {memberList.length} atletas del equipo?
          </h3>
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>
            Todos los miembros van a recibir la planificación de esta semana.
          </p>
          <div className="flex" style={{ gap: 10, marginTop: 20 }}>
            <button type="button" onClick={() => setConfirmPublish(false)} className="cursor-pointer" style={{ ...outlineBtn, flex: 1, height: 40 }}>
              Cancelar
            </button>
            <button type="button" onClick={publishMonth} className="cursor-pointer" style={{ flex: 1, height: 40, backgroundColor: "#111827", color: "#FFFFFF", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
              Confirmar
            </button>
          </div>
        </ModalShell>
      ) : null}

      {addMember ? (
        <AddMemberModal
          current={team.members}
          roster={roster}
          onClose={() => setAddMember(false)}
          onSave={(ids) => {
            if (!coachId) return;
            setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, members: ids } : t)));
            setAddMember(false);
            updateTeam(coachId, team.id, { name: team.name, description: team.description, memberIds: ids, features: team.features })
              .then(() => flash("Miembros actualizados"))
              .catch(() => toast_error("No se pudieron actualizar los miembros"));
          }}
        />
      ) : null}

      {modal ? (
        <TeamModal
          mode={modal.mode}
          team={modal.team}
          roster={roster}
          onClose={() => setModal(null)}
          onDelete={() => {
            const id = modal.team?.id;
            if (!id) return;
            setTeams((prev) => {
              const next = prev.filter((t) => t.id !== id);
              setActiveId(next[0]?.id ?? "");
              return next;
            });
            setModal(null);
            deleteTeam(id)
              .then(() => flash("Equipo eliminado"))
              .catch(() => toast_error("No se pudo eliminar el equipo"));
          }}
          onSave={async (t, photoFile) => {
            if (!coachId) return;
            let photoUrl = t.photoUrl;
            if (photoFile) {
              try { photoUrl = await uploadTeamPhoto(coachId, photoFile); }
              catch { toast_error("No se pudo subir la foto del equipo"); }
            }
            if (modal.mode === "create") {
              const id = await createTeam(coachId, { name: t.name, description: t.description, memberIds: t.members, features: t.features, photoUrl });
              const fresh = await fetchTeams(coachId);
              setTeams(fresh);
              setActiveId(id);
              flash("Equipo creado ✓");
            } else {
              setTeams((prev) => prev.map((x) => (x.id === t.id ? { ...t, photoUrl } : x)));
              await updateTeam(coachId, t.id, { name: t.name, description: t.description, memberIds: t.members, features: t.features, photoUrl }).catch(() => toast_error("No se pudo actualizar el equipo"));
              flash(`Equipo "${t.name}" actualizado`);
            }
            setModal(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ModalShell({ children, onClose, width = 480 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.35)", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 28, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", maxHeight: "88vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function AthletePicker({ roster, selected, onToggle }: { roster: RosterMember[]; selected: string[]; onToggle: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = roster.filter((a) => a.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <div className="relative" style={{ marginBottom: 8 }}>
        <Search size={13} color="#CBD5E1" style={{ position: "absolute", left: 12, top: 12 }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar atleta…"
          aria-label="Buscar atleta"
          style={{ width: "100%", height: 38, border: "1px solid #E2E8F0", borderRadius: 9, padding: "0 12px 0 32px", fontSize: 13, color: "#374151", outline: "none" }}
        />
      </div>
      <div style={{ maxHeight: 180, overflowY: "auto" }}>
        {list.length === 0 ? <p style={{ fontSize: 12, color: "#94A3B8", padding: "6px 8px" }}>No tenés atletas todavía.</p> : null}
        {list.map((a) => (
          <label key={a.id} className="flex cursor-pointer items-center transition-colors hover:bg-[#F8FAFC]" style={{ gap: 10, padding: "7px 8px", borderRadius: 8 }}>
            <input type="checkbox" checked={selected.includes(a.id)} onChange={() => onToggle(a.id)} style={{ width: 16, height: 16, accentColor: "#111827" }} />
            <span className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, backgroundColor: "#F1F5F9", color: "#94A3B8", fontSize: 10, fontWeight: 600 }}>
              {initials(a.name)}
            </span>
            <span style={{ flex: 1, fontSize: 13, color: "#111827" }}>{a.name}</span>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>{LOAD_LABEL[a.load]}</span>
          </label>
        ))}
      </div>
    </>
  );
}

function AddMemberModal({ current, roster, onClose, onSave }: { current: string[]; roster: RosterMember[]; onClose: () => void; onSave: (ids: string[]) => void }) {
  const [ids, setIds] = useState<string[]>(current);
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Agregar atletas</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="cursor-pointer text-[#CBD5E1] transition-colors hover:text-[#111827]" style={{ background: "none", border: "none", padding: 0 }}>
          <X size={16} />
        </button>
      </div>
      <AthletePicker roster={roster} selected={ids} onToggle={(id) => setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))} />
      <div className="flex" style={{ gap: 10, marginTop: 20 }}>
        <button type="button" onClick={onClose} style={{ ...outlineBtn, flex: 1, height: 40 }}>
          Cancelar
        </button>
        <button type="button" onClick={() => onSave(ids)} className="cursor-pointer" style={{ flex: 1, height: 40, backgroundColor: "#111827", color: "#FFFFFF", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          Guardar
        </button>
      </div>
    </ModalShell>
  );
}

function TeamModal({
  mode,
  team,
  roster,
  onClose,
  onSave,
  onDelete,
}: {
  mode: "create" | "edit";
  team: Team | null;
  roster: RosterMember[];
  onClose: () => void;
  onSave: (team: Team, photoFile: File | null) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(team?.name ?? "");
  const [desc, setDesc] = useState(team?.description ?? "");
  const [ids, setIds] = useState<string[]>(team?.members ?? []);
  const [features, setFeatures] = useState<TeamFeatures>(team?.features ?? { planning: true, chat: true, achievements: true });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(team?.photoUrl ?? null);

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const rows: { key: keyof TeamFeatures; label: string; hint: string }[] = [
    { key: "planning", label: "Planificación compartida", hint: "Todos reciben la misma sesión automáticamente." },
    { key: "chat", label: "Chat grupal", hint: "Escribile a todo el equipo a la vez desde Mensajes." },
    { key: "achievements", label: "Actividad visible", hint: "Los miembros ven la actividad reciente del equipo." },
  ];

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{mode === "create" ? "Nuevo equipo" : "Gestionar equipo"}</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="cursor-pointer text-[#CBD5E1] transition-colors hover:text-[#111827]" style={{ background: "none", border: "none", padding: 0 }}>
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center justify-center" style={{ marginBottom: 16 }}>
        <label className="relative flex cursor-pointer items-center justify-center" style={{ width: 64, height: 64 }}>
          <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#F1F5F9", overflow: "hidden" }}>
            {photoPreview ? (
              <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 700, color: "#94A3B8" }}>{name ? initials(name) : "?"}</span>
            )}
          </div>
          <span className="absolute flex items-center justify-center rounded-full" style={{ bottom: -2, right: -2, width: 22, height: 22, backgroundColor: "#111827" }}>
            <Camera size={12} color="#FFFFFF" />
          </span>
          <input type="file" accept="image/*" hidden onChange={pickPhoto} aria-label="Foto del equipo" />
        </label>
      </div>

      <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Nombre del equipo</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej. Equipo Mañana"
        aria-label="Nombre del equipo"
        style={{ width: "100%", height: 44, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 14px", fontSize: 13, color: "#374151", outline: "none", marginBottom: 14 }}
      />

      <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Descripción (opcional)</div>
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Objetivos, horarios u observaciones del grupo."
        aria-label="Descripción del equipo"
        style={{ width: "100%", height: 60, border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#374151", outline: "none", resize: "none", marginBottom: 16 }}
      />

      <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Miembros</div>
      <AthletePicker roster={roster} selected={ids} onToggle={(id) => setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))} />

      <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", margin: "16px 0 8px" }}>Funciones del equipo</div>
      {rows.map((r) => (
        <div key={r.key} className="flex items-center" style={{ gap: 12, padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "#111827" }}>{r.label}</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>{r.hint}</div>
          </div>
          <Toggle on={features[r.key]} onChange={(v) => setFeatures((f) => ({ ...f, [r.key]: v }))} />
        </div>
      ))}

      <div className="flex items-center" style={{ gap: 10, marginTop: 20 }}>
        {mode === "edit" ? (
          <button type="button" onClick={onDelete} className="cursor-pointer" style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "#EF4444" }}>
            Eliminar equipo
          </button>
        ) : null}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onClose} style={{ ...outlineBtn, height: 40 }}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() =>
            onSave(
              {
                id: team?.id ?? "",
                name: name.trim(),
                description: desc.trim(),
                members: ids,
                features,
                photoUrl: team?.photoUrl ?? null,
              },
              photoFile,
            )
          }
          className={name.trim() ? "cursor-pointer" : ""}
          style={{ flex: 1, height: 40, backgroundColor: name.trim() ? "#111827" : "#94A3B8", color: "#FFFFFF", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600 }}
        >
          {mode === "create" ? "Crear equipo" : "Guardar cambios"}
        </button>
      </div>
    </ModalShell>
  );
}
