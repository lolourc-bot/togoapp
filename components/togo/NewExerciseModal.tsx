import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link as LinkIcon, X } from "lucide-react";
import { VideoField } from "./VideoField";
import { MOVEMENT_PATTERNS, EQUIPMENT_OPTIONS, LATERALITY_OPTIONS } from "@/lib/exercise-data";

export type NewExerciseInput = {
  name: string;
  pattern: string;
  equipment: string;
  laterality: string;
  description: string;
  videoUrl: string;
};

export type NewExerciseInitial = {
  name: string;
  pattern: string;
  equipment: string;
  laterality: string;
  description: string;
  videoUrl: string;
  imageUrl: string;
};

// Same canonical lists the Biblioteca filters use — keep in sync so exercises created
// here always match what the library's own pattern/equipment/laterality filters expect.
const PATTERNS = MOVEMENT_PATTERNS.filter((p) => p !== "Todos");
const EQUIPMENT = EQUIPMENT_OPTIONS.filter((e) => e !== "Todo");
const LATERALITIES = LATERALITY_OPTIONS.filter((l) => l !== "Todos");

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

function Chip({
  children,
  selected,
  onClick,
  full,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center"
      style={{
        gap: 6,
        flex: full ? 1 : undefined,
        border: `1px solid ${selected ? "#111827" : "#E2E8F0"}`,
        borderRadius: 8,
        padding: "7px 14px",
        fontSize: 13,
        color: selected ? "#FFFFFF" : "#374151",
        backgroundColor: selected ? "#111827" : "#FFFFFF",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function NewExerciseModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (exercise: NewExerciseInput) => void;
  initial?: NewExerciseInitial | null;
}) {
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");
  const [equipment, setEquipment] = useState("Peso corporal");
  const [laterality, setLaterality] = useState("Bilateral");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState("");
  const [image, setImage] = useState<{ url: string; fileName: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setPattern(initial?.pattern ?? "");
    setEquipment(initial?.equipment || "Peso corporal");
    setLaterality(initial?.laterality || "Bilateral");
    setDescription(initial?.description ?? "");
    setVideo(initial?.videoUrl ?? "");
    setImage(initial?.imageUrl ? { url: initial.imageUrl, fileName: "imagen" } : null);
  }, [open, initial]);

  if (!open) return null;

  const valid = name.trim().length > 0 && pattern.length > 0;

  const reset = () => {
    setName("");
    setPattern("");
    setEquipment("Peso corporal");
    setLaterality("Bilateral");
    setDescription("");
    setVideo("");
    setImage(null);
  };

  const handleSave = () => {
    if (!valid) return;
    onSave({
      name: name.trim(),
      pattern,
      equipment,
      laterality,
      description: description.trim(),
      videoUrl: video.trim(),
    });
    reset();
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
        {/* HEADER */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Nuevo ejercicio</span>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="togo-modal-close"
            style={{ color: "#CBD5E1", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col" style={{ gap: 18 }}>
          {/* NOMBRE */}
          <div className="flex flex-col" style={{ gap: 6 }}>
            <label style={labelStyle} htmlFor="ex-name">
              Nombre del ejercicio
            </label>
            <input
              id="ex-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Sentadilla búlgara con mancuernas"
              style={inputStyle}
            />
          </div>

          {/* PATRÓN + EQUIPAMIENTO */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 6 }}>
              <label style={labelStyle} htmlFor="ex-pattern">
                Patrón de movimiento
              </label>
              <select
                id="ex-pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                style={{ ...inputStyle, color: pattern ? "#111827" : "#94A3B8", cursor: "pointer" }}
              >
                <option value="">Seleccionar…</option>
                {PATTERNS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col" style={{ gap: 6 }}>
              <label style={labelStyle} htmlFor="ex-equipment">
                Equipamiento
              </label>
              <select
                id="ex-equipment"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {EQUIPMENT.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* LATERALIDAD */}
          <div className="flex flex-col" style={{ gap: 8 }}>
            <span style={labelStyle}>Lateralidad</span>
            <div className="flex" style={{ gap: 8 }}>
              {LATERALITIES.map((l) => (
                <Chip key={l} selected={laterality === l} onClick={() => setLaterality(l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>

          {/* DESCRIPCIÓN */}
          <div className="flex flex-col" style={{ gap: 6 }}>
            <label style={labelStyle} htmlFor="ex-desc">
              Descripción / instrucciones
            </label>
            <textarea
              id="ex-desc"
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
            <span style={{ fontSize: 10, color: "#CBD5E1", textAlign: "right" }}>
              {description.length}/500
            </span>
          </div>

          {/* VIDEO */}
          <div className="flex flex-col" style={{ gap: 6 }}>
            <label style={labelStyle} htmlFor="ex-video">
              Video de referencia
            </label>
            <VideoField>
            <div className="relative flex items-center">
              <LinkIcon
                size={14}
                color="#CBD5E1"
                style={{ position: "absolute", left: 14, pointerEvents: "none" }}
              />
              <input
                id="ex-video"
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                placeholder="https://youtube.com/..."
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
            </div>
            </VideoField>
          </div>

          {/* IMAGEN */}
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
                if (f) setImage({ url: URL.createObjectURL(f), fileName: f.name });
              }}
            />
            {image ? (
              <div className="flex items-center" style={{ gap: 12 }}>
                <img
                  src={image.url}
                  alt="Referencia del ejercicio"
                  style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover" }}
                />
                <span style={{ fontSize: 13, color: "#374151" }}>{image.fileName}</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    fontSize: 12,
                    color: "#111827",
                    textDecoration: "underline",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                  }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="togo-upload-zone flex flex-col items-center justify-center"
                style={{
                  gap: 6,
                  border: "1.5px dashed #E2E8F0",
                  borderRadius: 10,
                  padding: 18,
                  backgroundColor: "#FAFAFA",
                  cursor: "pointer",
                }}
              >
                <ImagePlus size={20} color="#CBD5E1" />
                <span style={{ fontSize: 13, color: "#94A3B8" }}>Subir imagen</span>
                <span style={{ fontSize: 11, color: "#CBD5E1" }}>JPG o PNG · Máx. 5MB</span>
              </button>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div
          className="flex"
          style={{ gap: 10, marginTop: 4, paddingTop: 18, borderTop: "1px solid #F8FAFC" }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              height: 42,
              padding: "0 20px",
              fontSize: 13,
              color: "#374151",
              backgroundColor: "#FFFFFF",
              flex: 0,
              cursor: "pointer",
            }}
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
            Guardar ejercicio
          </button>
        </div>
      </div>
    </>
  );
}
