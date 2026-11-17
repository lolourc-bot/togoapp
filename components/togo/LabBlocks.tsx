import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { uniqueName } from "@/lib/unique-name";
import { toast } from "sonner";
import { Search, MoreHorizontal, Plus } from "lucide-react";
import { CircuitModal, circuitTimerLabel, emptyCircuitConfig, type CircuitConfig } from "@/components/togo/CircuitModal";
import {
  fetchCircuitTemplates,
  createCircuitTemplate,
  updateCircuitTemplate,
  deleteCircuitTemplate,
  type CircuitTemplate,
} from "@/lib/circuit-templates";

export type LabBlocksHandle = { newCircuit: () => void };

const MENU = ["Editar", "Duplicar", "Agregar a sesión", "Eliminar"];

export const LabBlocks = forwardRef<LabBlocksHandle, { coachId: string | null }>(function LabBlocks({ coachId }, ref) {
  const [query, setQuery] = useState("");
  const [circuits, setCircuits] = useState<CircuitTemplate[]>([]);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!coachId) return;
    fetchCircuitTemplates(coachId).then(setCircuits);
  }, [coachId]);

  useImperativeHandle(ref, () => ({
    newCircuit: () => {
      setEditIndex(null);
      setModalOpen(true);
    },
  }));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return circuits.map((t, i) => ({ c: t.config, i }));
    return circuits
      .map((t, i) => ({ c: t.config, i }))
      .filter(
        ({ c }) =>
          c.name.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q) ||
          c.exercises.some((e) => e.name.toLowerCase().includes(q)),
      );
  }, [circuits, query]);

  const submit = (cfg: CircuitConfig) => {
    if (!coachId) return;
    if (editIndex === null) {
      createCircuitTemplate(coachId, cfg)
        .then((id) => setCircuits((prev) => [...prev, { id, config: cfg }]))
        .catch(() => toast.error("No se pudo crear el circuito"));
    } else {
      const id = circuits[editIndex]!.id;
      setCircuits((prev) => prev.map((t, i) => (i === editIndex ? { id, config: cfg } : t)));
      updateCircuitTemplate(id, cfg).catch(() => toast.error("No se pudo guardar el circuito"));
    }
    setModalOpen(false);
    setEditIndex(null);
  };

  return (
    <div>
      <div className="flex flex-row items-center gap-3" style={{ marginBottom: 20 }}>
        <div className="relative" style={{ maxWidth: 280, flex: 1 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#CBD5E1" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar circuito..."
            aria-label="Buscar circuito"
            className="w-full rounded-[10px] border bg-white pl-9 pr-3 text-[13px] outline-none"
            style={{ height: 38, borderColor: "#E2E8F0", color: "#111827" }}
          />
        </div>
        <span className="text-[12px]" style={{ color: "#94A3B8" }}>
          Todos los circuitos
        </span>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {list.map(({ c, i }) => (
          <div
            key={`${c.name}-${i}`}
            className="flex flex-col gap-2.5 rounded-[14px] bg-white"
            style={{
              borderLeft: "3px solid #D97706",
              borderTop: "1px solid #E2E8F0",
              borderRight: "1px solid #E2E8F0",
              borderBottom: "1px solid #E2E8F0",
              padding: "16px 18px",
            }}
          >
            <div className="flex flex-row items-center gap-2">
              <span className="text-[10px] font-bold" style={{ color: "#D97706", width: 18 }}>
                {`C${i + 1}`}
              </span>
              <span
                className="rounded-[4px] text-[9px] font-bold"
                style={{ backgroundColor: "#FFFBEB", color: "#D97706", padding: "2px 6px" }}
              >
                {c.type}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" style={{ color: "#111827" }}>
                {c.name || "Circuito sin nombre"}
              </span>
              {circuitTimerLabel(c) ? (
                <span
                  className="whitespace-nowrap rounded-[6px] text-[11px]"
                  style={{ backgroundColor: "#FFFBEB", color: "#D97706", padding: "2px 8px" }}
                >
                  {circuitTimerLabel(c)}
                </span>
              ) : null}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === i ? null : i)}
                  aria-label={`Más opciones circuito ${i + 1}`}
                >
                  <MoreHorizontal size={15} style={{ color: "#CBD5E1" }} />
                </button>
                {openMenu === i ? (
                  <>
                    <div className="fixed inset-0" style={{ zIndex: 5 }} onClick={() => setOpenMenu(null)} />
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
                      {MENU.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setOpenMenu(null);
                            if (m === "Editar") {
                              setEditIndex(i);
                              setModalOpen(true);
                            }
                            if (m === "Duplicar" && coachId) {
                              const clone = { ...c, name: uniqueName(`${c.name} (copia)`, circuits.map((t) => t.config.name)) };
                              createCircuitTemplate(coachId, clone)
                                .then((id) => setCircuits((prev) => [...prev, { id, config: clone }]))
                                .catch(() => toast.error("No se pudo duplicar el circuito"));
                            }
                            if (m === "Eliminar") {
                              const id = circuits[i]!.id;
                              setCircuits((prev) => prev.filter((_x, idx) => idx !== i));
                              deleteCircuitTemplate(id).catch(() => toast.error("No se pudo eliminar el circuito"));
                            }
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

            <div className="flex flex-col gap-1">
              {c.exercises.map((e, ei) => (
                <div key={`${e.name}-${ei}`} className="flex flex-row items-center gap-2">
                  <span className="text-[10px] font-bold" style={{ color: "#D97706" }}>
                    {`E${ei + 1}`}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: "#374151" }}>
                    {e.name}
                  </span>
                  {e.reps ? (
                    <span
                      className="rounded-[4px] text-[10px]"
                      style={{ backgroundColor: "#F8FAFC", color: "#94A3B8", padding: "1px 6px" }}
                    >
                      {e.reps}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <div
              className="flex flex-row gap-2"
              style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid #F8FAFC" }}
            >
              <button
                type="button"
                className="flex flex-1 items-center justify-center rounded-[8px] border text-[12px] hover:bg-[#F8FAFC]"
                style={{ height: 32, borderColor: "#E2E8F0", color: "#374151" }}
              >
                Agregar a sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditIndex(i);
                  setModalOpen(true);
                }}
                className="flex flex-1 items-center justify-center rounded-[8px] border text-[12px] hover:bg-[#F8FAFC]"
                style={{ height: 32, borderColor: "#E2E8F0", color: "#374151" }}
              >
                Editar circuito
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => {
            setEditIndex(null);
            setModalOpen(true);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px]"
          style={{ border: "1.5px dashed #E2E8F0", backgroundColor: "#FFFFFF", minHeight: 150 }}
        >
          <Plus size={20} style={{ color: "#CBD5E1" }} />
          <span className="text-[13px]" style={{ color: "#94A3B8" }}>
            Nuevo circuito
          </span>
        </button>
      </div>

      <CircuitModal
        open={modalOpen}
        mode={editIndex === null ? "create" : "edit"}
        initial={editIndex === null ? null : (circuits[editIndex]?.config ?? null)}
        onClose={() => {
          setModalOpen(false);
          setEditIndex(null);
        }}
        onSubmit={submit}
        takenNames={circuits.map((t) => t.config.name)}
      />
    </div>
  );
});
