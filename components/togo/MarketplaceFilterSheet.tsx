import { CATEGORIES, DURATIONS, PRICES, type Category } from "@/lib/marketplace-data";
import { Chip } from "@/components/togo/MarketplaceChips";

export function FilterSheet({
  open,
  onClose,
  showDuration,
  duration,
  setDuration,
  price,
  setPrice,
  category,
  setCategory,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  showDuration: boolean;
  duration: string | null;
  setDuration: (v: string | null) => void;
  price: string | null;
  setPrice: (v: string | null) => void;
  category: Category;
  setCategory: (v: Category) => void;
  onClear: () => void;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40 }}>
      <div
        role="presentation"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.4)" }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#FFFFFF",
          borderRadius: "20px 20px 0 0",
          padding: "20px 16px 24px",
          maxHeight: "75%",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            backgroundColor: "#E2E8F0",
            borderRadius: 2,
            margin: "0 auto 16px",
          }}
        />
        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
          Filtros
        </div>

        {showDuration && (
          <Group title="Duración">
            {DURATIONS.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={duration === d}
                onClick={() => setDuration(duration === d ? null : d)}
              />
            ))}
          </Group>
        )}

        <Group title="Precio">
          {PRICES.map((p) => (
            <Chip
              key={p}
              label={p}
              selected={price === p}
              onClick={() => setPrice(price === p ? null : p)}
            />
          ))}
        </Group>

        <Group title="Especialidad">
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </Group>

        <div className="flex" style={{ gap: 8, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClear}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              border: "1px solid #E2E8F0",
              backgroundColor: "#FFFFFF",
              fontSize: 13,
              fontWeight: 500,
              color: "#111827",
              cursor: "pointer",
            }}
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              border: "none",
              backgroundColor: "#111827",
              fontSize: 13,
              fontWeight: 500,
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
        {title}
      </div>
      <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}
