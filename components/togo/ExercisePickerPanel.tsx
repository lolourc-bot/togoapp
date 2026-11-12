import { useEffect, useMemo, useState } from "react";
import { Check, Play, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  PICKER_PATTERN_CHIPS, EQUIPMENT_OPTIONS, LATERALITY_OPTIONS,
  fetchLibraryExercises, createLibraryExercise, type LibraryExercise,
} from "@/lib/exercise-data";
import { getCoachId } from "@/lib/programs";
import { NewExerciseModal, type NewExerciseInput } from "@/components/togo/NewExerciseModal";

export function ExercisePickerPanel({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (exercise: LibraryExercise) => void;
}) {
  const [query, setQuery] = useState("");
  const [pattern, setPattern] = useState("Todos");
  const [equipment, setEquipment] = useState("Todo");
  const [laterality, setLaterality] = useState("Todos");
  const [added, setAdded] = useState<string | null>(null);
  const [quick, setQuick] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [qHover, setQHover] = useState(false);
  const quickInitial = useMemo(
    () => ({ name: quickName, pattern: "", equipment: "Peso corporal", laterality: "Bilateral", description: "", videoUrl: "", imageUrl: "" }),
    [quickName],
  );
  const [coachId, setCoachId] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);

  useEffect(() => {
    getCoachId().then((cid) => {
      if (!cid) return;
      setCoachId(cid);
      fetchLibraryExercises(cid).then(setLibrary);
    });
  }, []);

  if (!open) return null;

  const results = library.filter((e) => {
    if (pattern !== "Todos" && e.pattern !== pattern) return false;
    if (equipment !== "Todo" && e.equipment !== equipment) return false;
    if (laterality !== "Todos" && e.laterality !== laterality) return false;
    if (query.trim() && !e.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  const handleAdd = (e: LibraryExercise) => {
    onAdd(e);
    setAdded(e.name);
    setTimeout(() => setAdded(null), 200);
  };

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.2)", zIndex: 59 }}
      />
      <div
        className="togo-panel-slide flex flex-col"
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100vh",
          width: 400,
          backgroundColor: "#FFFFFF",
          borderLeft: "1px solid #E2E8F0",
          zIndex: 60,
        }}
      >
        {/* HEADER */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "20px 20px 16px", borderBottom: "1px solid #E2E8F0" }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Agregar ejercicio</span>
          <button type="button" aria-label="Cerrar" onClick={onClose} style={{ cursor: "pointer" }}>
            <X size={18} color="#94A3B8" />
          </button>
        </div>

        {/* SEARCH */}
        <div style={{ padding: "12px 16px" }}>
          <div
            className="flex items-center"
            style={{
              height: 38,
              width: "100%",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              backgroundColor: "#F8FAFC",
              padding: "0 12px",
              gap: 8,
            }}
          >
            <Search size={14} color="#CBD5E1" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ejercicio..."
              aria-label="Buscar ejercicio"
              className="togo-search"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13,
                color: "#111827",
              }}
            />
          </div>
        </div>

        {/* CHIPS */}
        <div
          className="flex"
          style={{ padding: "0 16px 12px", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}
        >
          {PICKER_PATTERN_CHIPS.map((c) => {
            const selected = c === pattern;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setPattern(c)}
                style={{
                  height: 28,
                  flexShrink: 0,
                  borderRadius: 20,
                  padding: "0 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  backgroundColor: selected ? "#111827" : "#FFFFFF",
                  border: `1px solid ${selected ? "#111827" : "#E2E8F0"}`,
                  color: selected ? "#FFFFFF" : "#64748B",
                  whiteSpace: "nowrap",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* EQUIPMENT + LATERALITY (same options as Biblioteca) */}
        <div className="flex items-center" style={{ padding: "0 16px 12px", gap: 8 }}>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            aria-label="Equipamiento"
            style={{ flex: 1, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 8px", fontSize: 12, color: "#374151", background: "#FFFFFF" }}
          >
            {EQUIPMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select
            value={laterality}
            onChange={(e) => setLaterality(e.target.value)}
            aria-label="Lateralidad"
            style={{ flex: 1, height: 32, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 8px", fontSize: 12, color: "#374151", background: "#FFFFFF" }}
          >
            {LATERALITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* LIST */}
        <div
          className="flex flex-1 flex-col overflow-y-auto"
          style={{ padding: "0 16px 16px", gap: 8 }}
        >
          {results.map((e) => (
            <div
              key={e.name}
              role="button"
              tabIndex={0}
              onClick={() => handleAdd(e)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") handleAdd(e);
              }}
              className="togo-picker-row flex items-center"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: "10px 12px",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <span
                className="flex items-center justify-center"
                style={{ width: 44, height: 32, backgroundColor: "#F1F5F9", borderRadius: 6 }}
              >
                <Play size={12} color="#CBD5E1" />
              </span>
              <span className="flex-1" style={{ minWidth: 0 }}>
                <span
                  className="block truncate"
                  style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}
                >
                  {e.name}
                </span>
                <span className="block" style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                  {e.pattern} · {e.equipment}
                </span>
              </span>
              {added === e.name ? (
                <Check size={18} color="#16A34A" />
              ) : (
                <Plus size={18} color="#CBD5E1" />
              )}
            </div>
          ))}
          {results.length === 0 && !query.trim() && (
            <p style={{ fontSize: 12, color: "#94A3B8" }}>No hay ejercicios con estos filtros.</p>
          )}
          {results.length === 0 && query.trim() && (
            <div className="flex flex-col items-center" style={{ padding: "20px 16px", gap: 12, textAlign: "center" }}>
              <Search size={24} color="var(--text-muted)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>No encontramos '{query.trim()}'</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>¿Querés agregarlo como ejercicio nuevo?</span>
              <div role="button" tabIndex={0}
                onClick={() => { setQuickName(query.trim()); setQuick(true); }}
                onKeyDown={(ev) => { if (ev.key === "Enter") { setQuickName(query.trim()); setQuick(true); } }}
                onMouseEnter={() => setQHover(true)} onMouseLeave={() => setQHover(false)}
                className="flex items-center"
                style={{ width: "100%", gap: 10, padding: "14px 16px", cursor: "pointer", textAlign: "left", transition: "all .2s",
                  border: `1px dashed ${qHover ? "var(--color-primary)" : "var(--border-default)"}`, borderRadius: "var(--radius-md)",
                  background: qHover ? "var(--color-primary-light)" : "transparent" }}>
                <Plus size={16} color="var(--color-primary)" />
                <span className="flex flex-col">
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Agregar '{query.trim()}'</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Se guardará en tu biblioteca del Lab.</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <NewExerciseModal
        open={quick}
        initial={quickInitial}
        onClose={() => setQuick(false)}
        onSave={(input: NewExerciseInput) => {
          if (!coachId) return;
          createLibraryExercise(coachId, {
            name: input.name,
            pattern: input.pattern as LibraryExercise["pattern"],
            equipment: input.equipment,
            laterality: input.laterality as LibraryExercise["laterality"],
            videoUrl: input.videoUrl,
          })
            .then((ex) => {
              setLibrary((prev) => [ex, ...prev]);
              onAdd(ex);
              setQuick(false);
              setQuery("");
              toast.success("Ejercicio creado y agregado ✓");
            })
            .catch(() => toast.error("No se pudo crear el ejercicio"));
        }}
      />
    </>
  );
}
