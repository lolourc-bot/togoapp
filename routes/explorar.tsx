import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Compass } from "lucide-react";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { MarketplaceSearchBar } from "@/components/togo/MarketplaceSearchBar";
import {
  FiltersButton, FilterSheet, matchFilters, sortCoaches, activeChips, EMPTY_FILTERS,
  type MktCoach, type MktFilters,
} from "@/components/togo/MarketFilters";
import { fetchPublicCoaches, type PublicCoachSummary } from "@/lib/marketplace";

const SHORT_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const Route = createFileRoute("/explorar")({
  head: () => ({
    meta: [
      { title: "Marketplace · TOGO" },
      { name: "description", content: "Encontrá coaches y programas de entrenamiento en TOGO." },
      { property: "og:title", content: "Marketplace · TOGO" },
      { property: "og:description", content: "Encontrá coaches y programas de entrenamiento en TOGO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExplorarScreen,
});

function toMktCoach(c: PublicCoachSummary): MktCoach {
  return {
    name: c.name,
    spec: c.specialty || "Sin especialidad",
    athletes: c.athleteCount,
    online: c.modality === "Online" || c.modality === "Ambas",
    tags: c.chips,
    mod: c.modality ?? "Online",
    price: c.minPrice ?? 0,
    years: c.yearsExperience ?? 0,
    days: SHORT_DAYS.filter((_, i) => c.availableDays[i]),
  };
}

function money(n: number) {
  return n > 0 ? `$${n.toLocaleString("es-AR")}/mes` : "Consultar precio";
}

export function ExplorarScreen() {
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState<PublicCoachSummary[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MktFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetchPublicCoaches().then((list) => { setCoaches(list); setLoading(false); });
  }, []);

  const allSpecs = useMemo(() => [...new Set(coaches.flatMap((c) => c.chips))].sort(), [coaches]);

  const filtered = useMemo(() => {
    const searched = coaches.filter((c) => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return c.name.toLowerCase().includes(q) || c.specialty.toLowerCase().includes(q) || c.chips.some((t) => t.toLowerCase().includes(q));
    });
    const pairs = searched
      .map((original) => ({ original, mkt: toMktCoach(original) }))
      .filter((p) => matchFilters(p.mkt, filters));
    const byMkt = new Map(pairs.map((p) => [p.mkt, p.original] as const));
    const sortedMkt = sortCoaches(pairs.map((p) => p.mkt), filters.sort);
    return sortedMkt.map((m) => byMkt.get(m)!);
  }, [coaches, query, filters]);

  const countFor = (f: MktFilters) => coaches.map(toMktCoach).filter((c) => matchFilters(c, f)).length;
  const activeCount = activeChips(filters, setFilters).length;

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto" style={{ paddingBottom: 64 }}>
        <div style={{ padding: "44px 16px 4px" }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Marketplace</span>
        </div>

        <MarketplaceSearchBar placeholder="Buscar coach, especialidad..." value={query} onChange={setQuery} />

        <div className="flex items-center" style={{ gap: 8, padding: "0 16px", marginBottom: 12 }}>
          <FiltersButton count={activeCount} onClick={() => setSheetOpen(true)} />
          <span style={{ fontSize: 12, color: "#94A3B8" }}>{filtered.length} coach{filtered.length !== 1 ? "es" : ""}</span>
        </div>

        <div className="flex flex-col" style={{ gap: 8, padding: "0 16px" }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "#94A3B8" }}>Cargando...</p>
          ) : coaches.length === 0 ? (
            <div className="flex flex-col items-center" style={{ gap: 8, padding: "48px 16px", textAlign: "center" }}>
              <Compass size={28} color="#CBD5E1" />
              <p style={{ fontSize: 13, color: "#94A3B8" }}>Todavía no hay coaches publicados en el marketplace.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "24px 0" }}>No hay resultados con estos filtros.</p>
          ) : (
            filtered.map((c) => (
              <Link
                key={c.coachId}
                to="/perfil-coach/$coachId"
                params={{ coachId: c.coachId }}
                className="flex items-center"
                style={{ backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: 14, gap: 12, textDecoration: "none" }}
              >
                <div className="flex items-center justify-center overflow-hidden" style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: "#F1F5F9", flexShrink: 0 }}>
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#94A3B8" }}>{c.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{c.specialty || "Sin especialidad"}</div>
                  <div className="flex items-center" style={{ gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: "#64748B" }}>{c.athleteCount} atletas</span>
                    {c.modality ? <span style={{ fontSize: 11, color: "#CBD5E1" }}>· {c.modality}</span> : null}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", flexShrink: 0, textAlign: "right" }}>{money(c.minPrice ?? 0)}</div>
              </Link>
            ))
          )}
        </div>
      </div>

      {sheetOpen ? (
        <FilterSheet
          value={filters}
          specs={allSpecs}
          onClose={() => setSheetOpen(false)}
          onApply={(f) => { setFilters(f); setSheetOpen(false); }}
          countFor={countFor}
        />
      ) : null}

      <AthleteBottomNav active="Marketplace" />
    </PhoneFrame>
  );
}
