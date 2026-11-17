import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { circuitTimerLabel, type CircuitConfig } from "./CircuitModal";
import { fetchCircuitTemplates } from "@/lib/circuit-templates";
import { fetchSessionTemplates } from "@/lib/session-templates";

/**
 * First step of "Agregar circuito" in the session editor: search the circuits the coach already has (saved in the
 * library, or inside Lab sessions) and drop one in, or start a new one from scratch.
 */

type Found = { key: string; config: CircuitConfig; source: string };

const sig = (c: CircuitConfig) => JSON.stringify({ n: c.name.trim().toLowerCase(), t: c.type, e: c.exercises.map((x) => x.name) });

export function CircuitPickerModal({
  coachId,
  onClose,
  onPick,
  onCreateNew,
}: {
  coachId: string;
  onClose: () => void;
  onPick: (config: CircuitConfig) => void;
  onCreateNew: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Found[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCircuitTemplates(coachId), fetchSessionTemplates(coachId).catch(() => [])]).then(([lib, sessions]) => {
      if (cancelled) return;
      const seen = new Set<string>();
      const out: Found[] = [];
      for (const t of lib) {
        seen.add(sig(t.config));
        out.push({ key: `lib-${t.id}`, config: t.config, source: "Lab · Bloques" });
      }
      for (const s of sessions) {
        (s.circuits ?? []).forEach((c, i) => {
          const config = c as CircuitConfig;
          if (!config?.exercises || seen.has(sig(config))) return;
          seen.add(sig(config));
          out.push({ key: `ses-${s.id}-${i}`, config, source: `Lab · ${s.name}` });
        });
      }
      setItems(out);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      ({ config, source }) =>
        config.name.toLowerCase().includes(q) ||
        config.type.toLowerCase().includes(q) ||
        source.toLowerCase().includes(q) ||
        config.exercises.some((e) => e.name.toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.35)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(640px,calc(100dvh-32px))] flex-col overflow-hidden rounded-[16px] bg-white"
        style={{ width: 520, maxWidth: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        role="dialog"
        aria-label="Agregar circuito"
      >
        <div className="flex items-start justify-between" style={{ padding: "22px 24px 14px" }}>
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: "#111827" }}>Agregar circuito</h2>
            <p className="text-[12px]" style={{ color: "#64748B", marginTop: 2 }}>Usá uno que ya tengas armado o creá uno nuevo.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={18} style={{ color: "#94A3B8" }} />
          </button>
        </div>

        <div style={{ padding: "0 24px 12px" }}>
          <button
            type="button"
            onClick={onCreateNew}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] text-[13px] font-semibold text-white"
            style={{ height: 42, backgroundColor: "#111827", marginBottom: 12 }}
          >
            <Plus size={15} /> Crear circuito nuevo
          </button>
          <div className="relative">
            <Search size={15} color="#94A3B8" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, tipo o ejercicio…"
              className="w-full rounded-[10px] border text-[13px] outline-none focus:border-[#0272B7]"
              style={{ height: 40, borderColor: "#E2E8F0", color: "#111827", paddingLeft: 34, paddingRight: 12 }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: "0 16px 16px" }}>
          {loading ? (
            <p className="text-[13px]" style={{ color: "#94A3B8", padding: "16px 8px" }}>Cargando tus circuitos…</p>
          ) : items.length === 0 ? (
            <p className="text-[13px]" style={{ color: "#94A3B8", padding: "16px 8px", lineHeight: 1.5 }}>
              Todavía no tenés circuitos guardados. Creá uno nuevo y, desde el editor, tocá "Guardar en mis circuitos" para reusarlo después.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-[13px]" style={{ color: "#94A3B8", padding: "16px 8px" }}>No encontramos circuitos con "{query}".</p>
          ) : (
            filtered.map(({ key, config, source }) => {
              const timer = circuitTimerLabel(config);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPick(config)}
                  className="flex w-full flex-col items-start rounded-[10px] text-left transition-colors hover:bg-[#F8FAFC]"
                  style={{ padding: "10px 10px", gap: 3, borderLeft: "3px solid #D97706", marginBottom: 6 }}
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="flex-1 truncate text-[14px] font-semibold" style={{ color: "#111827" }}>{config.name || "Circuito"}</span>
                    <span className="shrink-0 text-[11px] font-semibold" style={{ color: "#D97706" }}>
                      {config.type.toUpperCase()}{timer ? ` · ${timer}` : ""}
                    </span>
                  </span>
                  <span className="w-full truncate text-[12px]" style={{ color: "#64748B" }}>
                    {config.exercises.map((e) => e.name).join(" · ") || "Sin ejercicios"}
                  </span>
                  <span className="text-[11px]" style={{ color: "#94A3B8" }}>{source}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
