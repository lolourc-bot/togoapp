import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  ChevronDown,
  Grid3x3,
  List,
  MoreHorizontal,
  Play,
  PlayCircle,
  Plus,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/togo/Sidebar";
import { NewExerciseModal, type NewExerciseInitial } from "@/components/togo/NewExerciseModal";
import { EQUIPMENT_OPTIONS, LATERALITY_OPTIONS, MOVEMENT_PATTERNS, youtubeThumbnail, youtubeEmbedUrl } from "@/lib/exercise-data";
import { getCoachId } from "@/lib/programs";
import { fetchTogoVideos, type TogoVideo } from "@/lib/togo-videos";
import {
  fetchOwnVideos,
  fetchCommunityVideos,
  fetchFollowedCoaches,
  searchCoaches,
  followCoach,
  unfollowCoach,
  createCoachVideo,
  updateCoachVideo,
  deleteCoachVideo,
  type CoachVideo,
  type FollowedCoach,
} from "@/lib/coach-videos";

type LibraryItem = {
  id: string;
  name: string;
  pattern: string;
  equipment: string;
  laterality: string;
  description: string;
  videoUrl: string;
  imageUrl: string;
  badge: string;
  mine: boolean;
  coachId?: string;
};

function togoToItem(v: TogoVideo): LibraryItem {
  return { ...v, badge: "TOGO", mine: false };
}

function coachToItem(v: CoachVideo, mine: boolean): LibraryItem {
  return { ...v, badge: mine ? "Mío" : v.coachName, mine };
}

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca de ejercicios · TOGO" },
      {
        name: "description",
        content: "Explorá, filtrá y administrá la biblioteca de ejercicios de tus atletas en TOGO.",
      },
      { property: "og:title", content: "Biblioteca de ejercicios · TOGO" },
      {
        property: "og:description",
        content: "Buscá ejercicios por patrón de movimiento, equipamiento y lateralidad en TOGO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryScreen,
});

const TABS = ["Míos", "TOGO", "Seguidos"] as const;

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="relative flex items-center"
      style={{ height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", backgroundColor: "#FFFFFF", gap: 8 }}
    >
      <span style={{ fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>{value === options[0] ? label : value}</span>
      <ChevronDown size={13} color="#CBD5E1" />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function SourceBadge({ item }: { item: LibraryItem }) {
  const isTogo = item.badge === "TOGO";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: isTogo ? 9 : 11,
        fontWeight: isTogo ? 700 : 500,
        padding: isTogo ? "2px 7px" : 0,
        borderRadius: 6,
        textAlign: "center",
        whiteSpace: "nowrap",
        backgroundColor: isTogo ? "#111827" : "transparent",
        color: isTogo ? "#FFFFFF" : "#64748B",
      }}
    >
      {item.badge}
    </span>
  );
}

function ExerciseCard({
  item,
  onEdit,
  onDuplicate,
  onDelete,
  onFollow,
  onPlay,
}: {
  item: LibraryItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onFollow?: (() => void) | undefined;
  onPlay: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const thumb = item.videoUrl ? youtubeThumbnail(item.videoUrl) : null;

  return (
    <div
      className="togo-ex-card"
      style={{ backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", cursor: "pointer", transition: "border-color 120ms ease, transform 120ms ease" }}
    >
      <button
        type="button"
        onClick={onPlay}
        disabled={!item.videoUrl}
        aria-label={item.videoUrl ? `Reproducir video de ${item.name}` : "Sin video"}
        className="relative flex w-full items-center justify-center"
        style={{ height: 140, backgroundColor: "#F1F5F9", backgroundImage: thumb ? `url(${thumb})` : undefined, backgroundSize: "cover", backgroundPosition: "center", border: "none", padding: 0, cursor: item.videoUrl ? "pointer" : "default" }}
      >
        {!thumb ? <PlayCircle size={32} color="#94A3B8" /> : (
          <span className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, backgroundColor: "rgba(0,0,0,0.5)" }}>
            <Play size={16} color="#FFFFFF" />
          </span>
        )}
        <span
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            fontSize: 9,
            fontWeight: 600,
            padding: "3px 7px",
            borderRadius: "0 0 0 8px",
            whiteSpace: "nowrap",
            backgroundColor: item.badge === "TOGO" ? "#111827" : "#F1F5F9",
            color: item.badge === "TOGO" ? "#FFFFFF" : "#64748B",
          }}
        >
          {item.badge}
        </span>
      </button>

      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </div>
        <div className="flex" style={{ gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#64748B", backgroundColor: "#F1F5F9", borderRadius: 6, padding: "2px 7px" }}>{item.pattern}</span>
          <span style={{ fontSize: 10, color: "#64748B", backgroundColor: "#F1F5F9", borderRadius: 6, padding: "2px 7px" }}>{item.laterality}</span>
        </div>
        <div className="flex items-center" style={{ gap: 4, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>{item.equipment}</span>
        </div>
      </div>

      <div className="flex items-center" style={{ padding: "8px 12px", borderTop: "1px solid #F8FAFC" }}>
        {onFollow ? (
          <button
            type="button"
            onClick={onFollow}
            className="flex items-center"
            style={{ gap: 4, fontSize: 11, fontWeight: 500, color: "#111827", background: "#F1F5F9", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}
          >
            <UserPlus size={12} />
            Seguir
          </button>
        ) : null}
        <div className="relative flex items-center" style={{ gap: 6, marginLeft: "auto" }}>
          <button
            type="button"
            className="togo-ex-action"
            title="Reproducir video"
            aria-label={`Reproducir video de ${item.name}`}
            onClick={onPlay}
            disabled={!item.videoUrl}
            style={{ opacity: item.videoUrl ? 1 : 0.35, cursor: item.videoUrl ? "pointer" : "default" }}
          >
            <Play size={20} />
          </button>
          <button type="button" className="togo-ex-action" aria-label="Más opciones" onClick={() => setMenuOpen((v) => !v)}>
            <MoreHorizontal size={20} />
          </button>
          {menuOpen && (
            <div
              style={{ position: "absolute", right: 0, top: 26, zIndex: 20, backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden", minWidth: 120 }}
            >
              {(item.mine ? ["Editar", "Duplicar", "Eliminar"] : ["Duplicar"]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (opt === "Editar") onEdit();
                    if (opt === "Duplicar") onDuplicate();
                    if (opt === "Eliminar") onDelete();
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12, color: opt === "Eliminar" ? "#EF4444" : "#374151", backgroundColor: "transparent", border: "none", cursor: "pointer" }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseTableRow({
  item,
  onEdit,
  onDuplicate,
  onDelete,
  onFollow,
  onPlay,
}: {
  item: LibraryItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onFollow?: (() => void) | undefined;
  onPlay: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const thumb = item.videoUrl ? youtubeThumbnail(item.videoUrl) : null;
  return (
    <div className="flex items-center" style={{ height: 52, padding: "0 16px", backgroundColor: "#FFFFFF", borderBottom: "1px solid #F8FAFC" }}>
      <button
        type="button"
        onClick={onPlay}
        disabled={!item.videoUrl}
        aria-label={item.videoUrl ? `Reproducir video de ${item.name}` : "Sin video"}
        className="flex items-center justify-center"
        style={{ width: 48, height: 36, backgroundColor: "#F1F5F9", backgroundImage: thumb ? `url(${thumb})` : undefined, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 6, marginRight: 16, flexShrink: 0, border: "none", padding: 0, cursor: item.videoUrl ? "pointer" : "default" }}
      >
        {!thumb ? <Play size={14} color="#CBD5E1" /> : null}
      </button>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.name}</span>
      <span style={{ width: 180, fontSize: 12, color: "#64748B" }}>{item.pattern}</span>
      <span style={{ width: 160, fontSize: 12, color: "#94A3B8" }}>{item.equipment}</span>
      <span style={{ width: 110, textAlign: "center" }}>
        <SourceBadge item={item} />
      </span>
      {onFollow ? (
        <button
          type="button"
          onClick={onFollow}
          className="flex items-center"
          style={{ gap: 4, fontSize: 11, fontWeight: 500, color: "#111827", background: "#F1F5F9", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", marginRight: 8 }}
        >
          <UserPlus size={12} />
          Seguir
        </button>
      ) : null}
      <span className="relative flex items-center" style={{ width: 64, gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="togo-ex-action" aria-label="Más opciones" style={{ color: "#CBD5E1" }} onClick={() => setMenuOpen((v) => !v)}>
          <MoreHorizontal size={18} />
        </button>
        {menuOpen ? (
          <div style={{ position: "absolute", right: 0, top: 26, zIndex: 20, backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden", minWidth: 120 }}>
            {(item.mine ? ["Editar", "Duplicar", "Eliminar"] : ["Duplicar"]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (opt === "Editar") onEdit();
                  if (opt === "Duplicar") onDuplicate();
                  if (opt === "Eliminar") onDelete();
                }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12, color: opt === "Eliminar" ? "#EF4444" : "#374151", backgroundColor: "transparent", border: "none", cursor: "pointer" }}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : null}
      </span>
    </div>
  );
}

function ExerciseTable({
  items,
  onEdit,
  onDuplicate,
  onDelete,
  onFollow,
  onPlay,
}: {
  items: LibraryItem[];
  onEdit: (i: LibraryItem) => void;
  onDuplicate: (i: LibraryItem) => void;
  onDelete: (i: LibraryItem) => void;
  onFollow?: ((i: LibraryItem) => void) | undefined;
  onPlay: (i: LibraryItem) => void;
}) {
  return (
    <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 40, padding: "0 16px", backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", fontSize: 11, fontWeight: 500, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.4px" }} className="flex items-center">
        <span style={{ width: 48, marginRight: 16 }} />
        <span style={{ flex: 1 }}>Ejercicio</span>
        <span style={{ width: 180 }}>Patrón de movimiento</span>
        <span style={{ width: 160 }}>Equipamiento</span>
        <span style={{ width: 110, textAlign: "center" }}>Fuente</span>
        <span style={{ width: 64 }} />
      </div>
      {items.map((i) => (
        <ExerciseTableRow
          key={i.id}
          item={i}
          onEdit={() => onEdit(i)}
          onDuplicate={() => onDuplicate(i)}
          onDelete={() => onDelete(i)}
          onFollow={onFollow ? () => onFollow(i) : undefined}
          onPlay={() => onPlay(i)}
        />
      ))}
    </div>
  );
}

function FollowPanel({
  coachId,
  followed,
  onFollowedChange,
}: {
  coachId: string;
  followed: FollowedCoach[];
  onFollowedChange: () => void;
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FollowedCoach[]>([]);
  const followedIds = new Set(followed.map((f) => f.id));

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchCoaches(query, coachId).then(setResults);
    }, 250);
    return () => clearTimeout(t);
  }, [query, coachId]);

  return (
    <div style={{ marginBottom: 20, border: "1px solid #E2E8F0", borderRadius: 12, backgroundColor: "#FFFFFF", padding: 16 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 8, flexWrap: "wrap" }}>
          {followed.length === 0 ? (
            <span style={{ fontSize: 13, color: "#94A3B8" }}>Todavía no seguís a ningún coach.</span>
          ) : (
            followed.map((f) => (
              <span
                key={f.id}
                className="flex items-center"
                style={{ gap: 6, fontSize: 12, color: "#374151", backgroundColor: "#F1F5F9", borderRadius: 20, padding: "5px 6px 5px 12px" }}
              >
                {f.fullName}
                <button
                  type="button"
                  aria-label={`Dejar de seguir a ${f.fullName}`}
                  onClick={() => unfollowCoach(coachId, f.id).then(onFollowedChange)}
                  style={{ display: "flex", color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}
                >
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={() => setSearching((v) => !v)}
          className="flex items-center"
          style={{ gap: 6, fontSize: 12, fontWeight: 500, color: "#111827", background: "none", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 10px", cursor: "pointer", flexShrink: 0 }}
        >
          <UserPlus size={14} />
          Seguir coach
        </button>
      </div>

      {searching ? (
        <div style={{ marginTop: 12, position: "relative" }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar coach por nombre..."
            aria-label="Buscar coach"
            style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #E2E8F0", padding: "0 12px", fontSize: 13, outline: "none" }}
          />
          {results.length > 0 ? (
            <div style={{ marginTop: 6, border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
              {results.map((r) => {
                const already = followedIds.has(r.id);
                return (
                  <div key={r.id} className="flex items-center justify-between" style={{ padding: "8px 12px", borderBottom: "1px solid #F8FAFC" }}>
                    <span style={{ fontSize: 13, color: "#111827" }}>{r.fullName}</span>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() =>
                        followCoach(coachId, r.id)
                          .then(() => {
                            onFollowedChange();
                            setQuery("");
                            setResults([]);
                          })
                          .catch(() => toast.error("No se pudo seguir al coach"))
                      }
                      style={{ fontSize: 12, fontWeight: 500, color: already ? "#94A3B8" : "#111827", background: "none", border: "none", cursor: already ? "default" : "pointer" }}
                    >
                      {already ? "Ya lo seguís" : "Seguir"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LibraryScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Míos");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [pattern, setPattern] = useState("Todos");
  const [equipment, setEquipment] = useState("Todo");
  const [laterality, setLaterality] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const playItem = (item: LibraryItem) => {
    const embed = item.videoUrl ? youtubeEmbedUrl(item.videoUrl) : null;
    if (embed) setVideoModal(embed);
  };
  const [coachId, setCoachId] = useState<string | null>(null);

  const [ownVideos, setOwnVideos] = useState<CoachVideo[]>([]);
  const [togoVideos, setTogoVideos] = useState<TogoVideo[]>([]);
  const [communityVideos, setCommunityVideos] = useState<CoachVideo[]>([]);
  const [followedCoaches, setFollowedCoaches] = useState<FollowedCoach[]>([]);
  const [seguidosView, setSeguidosView] = useState<"feed" | "discover">("feed");

  const reloadOwn = (cid: string) => fetchOwnVideos(cid).then(setOwnVideos);
  const reloadFollowed = (cid: string) => {
    fetchFollowedCoaches(cid).then(setFollowedCoaches);
    fetchCommunityVideos(cid).then(setCommunityVideos);
  };

  useEffect(() => {
    getCoachId().then((cid) => {
      if (!cid) return;
      setCoachId(cid);
      reloadOwn(cid);
      fetchTogoVideos().then(setTogoVideos);
      reloadFollowed(cid);
    });
  }, []);

  const followedIds = new Set(followedCoaches.map((f) => f.id));
  const feedVideos = communityVideos.filter((v) => followedIds.has(v.coachId));
  const discoverVideos = communityVideos.filter((v) => !followedIds.has(v.coachId));

  const items: LibraryItem[] =
    tab === "Míos"
      ? ownVideos.map((v) => coachToItem(v, true))
      : tab === "TOGO"
        ? togoVideos.map(togoToItem)
        : (seguidosView === "feed" ? feedVideos : discoverVideos).map((v) => coachToItem(v, false));

  const results = items.filter((e) => {
    if (query.trim() && !e.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (pattern === "Sin clasificar" ? !!e.pattern : pattern !== "Todos" && e.pattern !== pattern) return false;
    if (equipment === "Sin clasificar" ? !!e.equipment : equipment !== "Todo" && e.equipment !== equipment) return false;
    if (laterality !== "Todos" && e.laterality !== laterality) return false;
    return true;
  });

  const handleDuplicate = (item: LibraryItem) => {
    if (!coachId) return;
    createCoachVideo(coachId, {
      name: `${item.name} (copia)`,
      pattern: item.pattern,
      equipment: item.equipment,
      laterality: item.laterality,
      description: item.description,
      videoUrl: item.videoUrl,
    })
      .then(() => reloadOwn(coachId))
      .catch(() => toast.error("No se pudo duplicar el ejercicio"));
  };

  const handleDelete = (item: LibraryItem) => {
    if (!coachId || !item.mine) return;
    deleteCoachVideo(item.id)
      .then(() => reloadOwn(coachId))
      .catch(() => toast.error("No se pudo eliminar el ejercicio"));
  };

  const handleFollow = (item: LibraryItem) => {
    if (!coachId || !item.coachId) return;
    followCoach(coachId, item.coachId)
      .then(() => reloadFollowed(coachId))
      .catch(() => toast.error("No se pudo seguir al coach"));
  };

  const editingInitial: NewExerciseInitial | null = editing
    ? { name: editing.name, pattern: editing.pattern, equipment: editing.equipment, laterality: editing.laterality, description: editing.description, videoUrl: editing.videoUrl, imageUrl: editing.imageUrl }
    : null;

  return (
    <div className="flex" style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      <Sidebar active="Biblioteca" />

      <main style={{ flex: 1, padding: "32px 40px", maxWidth: 1440 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>Biblioteca de ejercicios</h1>
          {tab === "Míos" ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center"
              style={{ gap: 8, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 13, fontWeight: 500, borderRadius: 10, padding: "8px 16px", border: "none", cursor: "pointer" }}
            >
              <Plus size={14} color="#FFFFFF" />
              Nuevo ejercicio
            </button>
          ) : null}
        </div>

        {/* TABS */}
        <div style={{ marginBottom: 20, borderBottom: "1px solid #E2E8F0" }}>
          <div className="flex" style={{ gap: 24 }}>
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{ fontSize: 13, fontWeight: 500, paddingBottom: 10, border: "none", background: "none", cursor: "pointer", color: tab === t ? "#111827" : "#94A3B8", borderBottom: `2px solid ${tab === t ? "#111827" : "transparent"}`, marginBottom: -1 }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === "Seguidos" && coachId ? (
          <>
            <FollowPanel coachId={coachId} followed={followedCoaches} onFollowedChange={() => reloadFollowed(coachId)} />
            <div className="flex items-center" style={{ gap: 8, marginBottom: 20 }}>
              {([
                { id: "feed" as const, label: "Tu feed" },
                { id: "discover" as const, label: `Descubrir${discoverVideos.length ? ` (${discoverVideos.length})` : ""}` },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSeguidosView(id)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "7px 14px",
                    borderRadius: 20,
                    border: `1px solid ${seguidosView === id ? "#111827" : "#E2E8F0"}`,
                    backgroundColor: seguidosView === id ? "#111827" : "#FFFFFF",
                    color: seguidosView === id ? "#FFFFFF" : "#374151",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {/* SEARCH + FILTERS */}
        <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
          <div className="flex items-center" style={{ flex: 1, height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 14px", backgroundColor: "#FFFFFF", gap: 8 }}>
            <Search size={15} color="#CBD5E1" />
            <input
              type="search"
              className="togo-search"
              placeholder="Buscar ejercicio..."
              aria-label="Buscar ejercicio"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#111827", backgroundColor: "transparent" }}
            />
          </div>

          <FilterSelect label="Patrón de movimiento" options={[...MOVEMENT_PATTERNS, "Sin clasificar"]} value={pattern} onChange={setPattern} />
          <FilterSelect label="Equipamiento" options={[...EQUIPMENT_OPTIONS, "Sin clasificar"]} value={equipment} onChange={setEquipment} />
          <FilterSelect label="Lateralidad" options={LATERALITY_OPTIONS} value={laterality} onChange={setLaterality} />

          <div className="flex items-center" style={{ gap: 8 }}>
            {([
              { id: "grid" as const, Icon: Grid3x3, label: "Vista de grilla" },
              { id: "list" as const, Icon: List, label: "Vista de lista" },
            ]).map(({ id, Icon, label }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                onClick={() => setView(id)}
                className="flex items-center justify-center"
                style={{ width: 36, height: 36, border: `1px solid ${view === id ? "#111827" : "#E2E8F0"}`, borderRadius: 8, backgroundColor: view === id ? "#111827" : "#FFFFFF", cursor: "pointer" }}
              >
                <Icon size={16} color={view === id ? "#FFFFFF" : "#94A3B8"} />
              </button>
            ))}
          </div>
        </div>

        {/* RESULTS */}
        {view === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
            {results.map((e) => (
              <ExerciseCard
                key={e.id}
                item={e}
                onEdit={() => setEditing(e)}
                onDuplicate={() => handleDuplicate(e)}
                onDelete={() => handleDelete(e)}
                onFollow={tab === "Seguidos" && seguidosView === "discover" ? () => handleFollow(e) : undefined}
                onPlay={() => playItem(e)}
              />
            ))}
          </div>
        ) : (
          <ExerciseTable
            items={results}
            onEdit={setEditing}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onFollow={tab === "Seguidos" && seguidosView === "discover" ? handleFollow : undefined}
            onPlay={playItem}
          />
        )}

        {results.length === 0 && (
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 12 }}>
            {tab === "Seguidos" && seguidosView === "discover"
              ? "No hay otros coaches con videos para descubrir todavía."
              : tab === "Seguidos" && seguidosView === "feed"
                ? "Los coaches que sigas van a aparecer acá. Probá la pestaña Descubrir."
                : "No hay ejercicios con estos filtros."}
          </p>
        )}

        <div className="flex items-center justify-between" style={{ marginTop: 24 }}>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>
            Mostrando {results.length} de {items.length} ejercicios
          </span>
        </div>
      </main>

      <NewExerciseModal
        takenNames={[...ownVideos.map((v) => coachToItem(v, true).name), ...togoVideos.map((v) => togoToItem(v).name)]}
        open={modalOpen || editing !== null}
        initial={editingInitial}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={(input) => {
          if (!coachId) return;
          const task = editing ? updateCoachVideo(editing.id, input) : createCoachVideo(coachId, input);
          task
            .then(() => reloadOwn(coachId))
            .catch(() => toast.error("No se pudo guardar el ejercicio"));
          setTab("Míos");
          setSavedBanner(true);
          setTimeout(() => setSavedBanner(false), 2600);
        }}
      />

      {savedBanner && (
        <div role="status" className="flex items-center" style={{ position: "fixed", top: 24, right: 24, gap: 8, backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 80 }}>
          <CheckCircle size={14} color="#10B981" />
          <span style={{ fontSize: 13, color: "#374151" }}>Ejercicio guardado</span>
        </div>
      )}

      {videoModal ? (
        <div role="presentation" onClick={() => setVideoModal(null)} className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 90 }}>
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
    </div>
  );
}
