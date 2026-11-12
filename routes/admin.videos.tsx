import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Link as LinkIcon, Pencil, Play, Plus, Search, Trash2, X } from "lucide-react";
import { Sidebar } from "@/components/togo/Sidebar";
import { BrandLogo } from "@/components/togo/BrandLogo";
import { VideoField } from "@/components/togo/VideoField";
import { EQUIPMENT_OPTIONS, LATERALITY_OPTIONS, MOVEMENT_PATTERNS } from "@/lib/exercise-data";
import { getCoachId } from "@/lib/programs";
import {
  fetchIsAdmin,
  fetchTogoVideos,
  createTogoVideo,
  updateTogoVideo,
  deleteTogoVideo,
  type TogoVideo,
  type TogoVideoInput,
} from "@/lib/togo-videos";

export const Route = createFileRoute("/admin/videos")({
  head: () => ({ meta: [{ title: "Admin · Videos TOGO" }] }),
  component: AdminVideosScreen,
});

function youtubeThumbnail(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

const inputStyle = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "1px solid #E2E8F0",
  backgroundColor: "#FFFFFF",
  fontSize: 14,
  color: "#111827",
  padding: "0 14px",
  outline: "none",
} as const;

const labelStyle = { fontSize: 13, fontWeight: 500, color: "#374151" } as const;

function AdminVideoModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (video: TogoVideoInput) => void;
  initial?: TogoVideo | null;
}) {
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");
  const [equipment, setEquipment] = useState("Peso corporal");
  const [laterality, setLaterality] = useState("Bilateral");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState("");
  const [image, setImage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setPattern(initial?.pattern ?? "");
    setEquipment(initial?.equipment || "Peso corporal");
    setLaterality(initial?.laterality || "Bilateral");
    setDescription(initial?.description ?? "");
    setVideo(initial?.videoUrl ?? "");
    setImage(initial?.imageUrl ?? "");
  }, [open, initial]);

  if (!open) return null;

  const valid = name.trim().length > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      name: name.trim(),
      pattern,
      equipment,
      laterality,
      description: description.trim(),
      videoUrl: video.trim(),
      imageUrl: image.trim(),
    });
    onClose();
  };

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 70 }}
      />
      <div
        className="flex flex-col"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 560,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 16,
          padding: 28,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          zIndex: 71,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
            {initial ? "Editar video" : "Nuevo video"}
          </span>
          <button type="button" aria-label="Cerrar" onClick={onClose} style={{ color: "#CBD5E1", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col" style={{ gap: 18 }}>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <label style={labelStyle} htmlFor="av-name">Nombre del ejercicio</label>
            <input
              id="av-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Sentadilla búlgara con mancuernas"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 6 }}>
              <label style={labelStyle} htmlFor="av-pattern">Patrón de movimiento</label>
              <select
                id="av-pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                style={{ ...inputStyle, color: pattern ? "#111827" : "#94A3B8", cursor: "pointer" }}
              >
                <option value="">Seleccionar…</option>
                {MOVEMENT_PATTERNS.filter((p) => p !== "Todos").map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col" style={{ gap: 6 }}>
              <label style={labelStyle} htmlFor="av-equipment">Equipamiento</label>
              <select
                id="av-equipment"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {EQUIPMENT_OPTIONS.filter((e) => e !== "Todo").map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 8 }}>
            <span style={labelStyle}>Lateralidad</span>
            <div className="flex" style={{ gap: 8 }}>
              {LATERALITY_OPTIONS.filter((l) => l !== "Todos").map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLaterality(l)}
                  style={{
                    border: `1px solid ${laterality === l ? "#111827" : "#E2E8F0"}`,
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 13,
                    color: laterality === l ? "#FFFFFF" : "#374151",
                    backgroundColor: laterality === l ? "#111827" : "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 6 }}>
            <label style={labelStyle} htmlFor="av-desc">Descripción / instrucciones</label>
            <textarea
              id="av-desc"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describí la ejecución, puntos clave de la técnica, errores comunes…"
              style={{
                height: 88,
                minHeight: 72,
                resize: "vertical",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                padding: "12px 14px",
                fontSize: 13,
                color: "#374151",
                outline: "none",
              }}
            />
          </div>

          <div className="flex flex-col" style={{ gap: 6 }}>
            <label style={labelStyle} htmlFor="av-video">Video de referencia</label>
            <VideoField>
              <div className="relative flex items-center">
                <LinkIcon size={14} color="#CBD5E1" style={{ position: "absolute", left: 14, pointerEvents: "none" }} />
                <input
                  id="av-video"
                  value={video}
                  onChange={(e) => setVideo(e.target.value)}
                  placeholder="https://youtube.com/..."
                  style={{ ...inputStyle, paddingLeft: 36 }}
                />
              </div>
            </VideoField>
          </div>

          <div className="flex flex-col" style={{ gap: 6 }}>
            <span style={labelStyle}>Imagen de referencia</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              aria-label="Subir imagen"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setImage(URL.createObjectURL(f));
              }}
            />
            {image ? (
              <div className="flex items-center" style={{ gap: 12 }}>
                <img src={image} alt="Referencia del ejercicio" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover" }} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{ fontSize: 12, color: "#111827", textDecoration: "underline", cursor: "pointer", background: "none", border: "none" }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center"
                style={{ gap: 6, border: "1.5px dashed #E2E8F0", borderRadius: 10, padding: 18, backgroundColor: "#FAFAFA", cursor: "pointer" }}
              >
                <ImagePlus size={20} color="#CBD5E1" />
                <span style={{ fontSize: 13, color: "#94A3B8" }}>Subir imagen</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex" style={{ gap: 10, marginTop: 4, paddingTop: 18, borderTop: "1px solid #F8FAFC" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "1px solid #E2E8F0", borderRadius: 10, height: 42, padding: "0 20px", fontSize: 13, color: "#374151", backgroundColor: "#FFFFFF", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!valid}
            style={{
              backgroundColor: "#111827",
              color: "#FFFFFF",
              borderRadius: 10,
              height: 42,
              flex: 1,
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              opacity: valid ? 1 : 0.4,
              cursor: valid ? "pointer" : "not-allowed",
            }}
          >
            Guardar video
          </button>
        </div>
      </div>
    </>
  );
}

const PAGE_SIZE = 20;

function AdminVideosScreen() {
  const [coachId, setCoachId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [all, setAll] = useState<TogoVideo[]>([]);
  const [query, setQuery] = useState("");
  const [pattern, setPattern] = useState("Todos");
  const [equipment, setEquipment] = useState("Todo");
  const [laterality, setLaterality] = useState("Todos");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TogoVideo | null>(null);

  const reload = () => fetchTogoVideos().then(setAll);

  useEffect(() => {
    getCoachId().then(async (cid) => {
      if (!cid) {
        setIsAdmin(false);
        return;
      }
      setCoachId(cid);
      const admin = await fetchIsAdmin(cid);
      setIsAdmin(admin);
      if (admin) reload();
    });
  }, []);

  const results = all.filter((v) => {
    if (query.trim() && !v.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (pattern !== "Todos" && v.pattern !== pattern) return false;
    if (equipment !== "Todo" && v.equipment !== equipment) return false;
    if (laterality !== "Todos" && v.laterality !== laterality) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = (input: TogoVideoInput) => {
    if (!coachId) return;
    const action = editing ? updateTogoVideo(editing.id, input) : createTogoVideo(coachId, input);
    action
      .then(() => {
        reload();
        toast.success(editing ? "Video actualizado" : "Video creado");
      })
      .catch(() => toast.error("No se pudo guardar el video"));
  };

  const handleDelete = (v: TogoVideo) => {
    deleteTogoVideo(v.id)
      .then(reload)
      .catch(() => toast.error("No se pudo eliminar el video"));
  };

  if (isAdmin === null) return null;

  if (!isAdmin) {
    return (
      <div className="flex" style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
        <Sidebar active="Admin" />
        <main style={{ flex: 1, padding: "32px 40px" }}>
          <p style={{ fontSize: 14, color: "#374151" }}>No tenés acceso a esta sección.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex" style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      <Sidebar active="Admin" />
      <main style={{ flex: 1, padding: "32px 40px", maxWidth: 1440 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <BrandLogo className="h-7 w-7" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>Admin · Videos TOGO</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex items-center"
            style={{ gap: 8, backgroundColor: "#111827", color: "#FFFFFF", fontSize: 13, fontWeight: 500, borderRadius: 10, padding: "8px 16px", border: "none", cursor: "pointer" }}
          >
            <Plus size={14} color="#FFFFFF" />
            Subir video
          </button>
        </div>

        <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
          <div className="flex items-center" style={{ flex: 1, height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 14px", backgroundColor: "#FFFFFF", gap: 8 }}>
            <Search size={15} color="#CBD5E1" />
            <input
              type="search"
              placeholder="Buscar video..."
              aria-label="Buscar video"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#111827", backgroundColor: "transparent" }}
            />
          </div>
          <select
            aria-label="Filtrar por patrón"
            value={pattern}
            onChange={(e) => {
              setPattern(e.target.value);
              setPage(1);
            }}
            style={{ height: 40, borderRadius: 10, border: "1px solid #E2E8F0", padding: "0 28px 0 12px", fontSize: 13, backgroundColor: "#FFFFFF", cursor: "pointer" }}
          >
            {MOVEMENT_PATTERNS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por equipamiento"
            value={equipment}
            onChange={(e) => {
              setEquipment(e.target.value);
              setPage(1);
            }}
            style={{ height: 40, borderRadius: 10, border: "1px solid #E2E8F0", padding: "0 28px 0 12px", fontSize: 13, backgroundColor: "#FFFFFF", cursor: "pointer" }}
          >
            {EQUIPMENT_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por lateralidad"
            value={laterality}
            onChange={(e) => {
              setLaterality(e.target.value);
              setPage(1);
            }}
            style={{ height: 40, borderRadius: 10, border: "1px solid #E2E8F0", padding: "0 28px 0 12px", fontSize: 13, backgroundColor: "#FFFFFF", cursor: "pointer" }}
          >
            {LATERALITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div style={{ borderRadius: 12, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", overflow: "hidden" }}>
          {pageItems.length === 0 ? (
            <p style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>No hay videos que coincidan.</p>
          ) : (
            pageItems.map((v, i) => {
              const thumb = youtubeThumbnail(v.videoUrl) || v.imageUrl;
              return (
                <div
                  key={v.id}
                  className="flex items-center"
                  style={{ gap: 14, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #F1F5F9" }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ width: 56, height: 40, borderRadius: 8, backgroundColor: "#F1F5F9", flexShrink: 0, overflow: "hidden" }}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Play size={16} color="#CBD5E1" />
                    )}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#111827" }}>{v.name}</span>
                  <span style={{ width: 150, fontSize: 12, color: "#64748B" }}>{v.pattern || "—"}</span>
                  <span style={{ width: 120, fontSize: 12, color: "#64748B" }}>{v.equipment || "—"}</span>
                  <span style={{ width: 90, fontSize: 12, color: "#64748B" }}>{v.laterality || "—"}</span>
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <button
                      type="button"
                      aria-label="Editar"
                      onClick={() => {
                        setEditing(v);
                        setModalOpen(true);
                      }}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Pencil size={14} color="#64748B" />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar"
                      onClick={() => handleDelete(v)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #FEE2E2", backgroundColor: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Trash2 size={14} color="#DC2626" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between" style={{ marginTop: 16, fontSize: 13, color: "#64748B" }}>
          <span>{results.length} videos · Página {page} de {totalPages}</span>
          <div className="flex" style={{ gap: 8 }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 12px", backgroundColor: "#FFFFFF", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 12px", backgroundColor: "#FFFFFF", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </main>

      <AdminVideoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  );
}
