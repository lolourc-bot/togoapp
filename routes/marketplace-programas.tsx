import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Dumbbell } from "@/components/togo/icons/Dumbbell";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { MarketplaceSearchBar } from "@/components/togo/MarketplaceSearchBar";
import { Chip, ChipRow } from "@/components/togo/MarketplaceChips";
import { fetchPublicPrograms, type PublicProgramSummary, type ProgramLevel } from "@/lib/marketplace";

const LEVEL_COLOR: Record<ProgramLevel, [string, string]> = {
  Principiante: ["#F0FDF4", "#16A34A"], Intermedio: ["#FFFBEB", "#D97706"], Avanzado: ["#FEF2F2", "#EF4444"],
};

export const Route = createFileRoute("/marketplace-programas")({
  head: () => ({
    meta: [
      { title: "Programas · Marketplace · TOGO" },
      { name: "description", content: "Encontrá programas de entrenamiento en TOGO." },
    ],
  }),
  component: ProgramasScreen,
});

function ProgramasScreen() {
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<PublicProgramSummary[]>([]);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<ProgramLevel | "Todos">("Todos");

  useEffect(() => {
    fetchPublicPrograms().then((list) => { setPrograms(list); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return programs.filter((p) => {
      if (level !== "Todos" && p.level !== level) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return p.name.toLowerCase().includes(q) || p.coachName.toLowerCase().includes(q);
    });
  }, [programs, query, level]);

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto" style={{ paddingBottom: 64 }}>
        <div style={{ padding: "44px 16px 4px" }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Programas</span>
        </div>

        <MarketplaceSearchBar placeholder="Buscar programa o coach..." value={query} onChange={setQuery} />

        <ChipRow>
          {(["Todos", "Principiante", "Intermedio", "Avanzado"] as const).map((l) => (
            <Chip key={l} label={l} selected={level === l} onClick={() => setLevel(l)} />
          ))}
        </ChipRow>

        <div className="flex flex-col" style={{ gap: 10, padding: "16px" }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "#94A3B8" }}>Cargando...</p>
          ) : programs.length === 0 ? (
            <div className="flex flex-col items-center" style={{ gap: 8, padding: "48px 16px", textAlign: "center" }}>
              <Dumbbell size={28} color="#CBD5E1" />
              <p style={{ fontSize: 13, color: "#94A3B8" }}>Todavía no hay programas publicados en el marketplace.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "24px 0" }}>No hay resultados con estos filtros.</p>
          ) : (
            filtered.map((p) => (
              <Link
                key={p.id}
                to="/perfil-coach/$coachId"
                params={{ coachId: p.coachId }}
                className="flex"
                style={{ backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: 14, gap: 12, textDecoration: "none" }}
              >
                <div className="flex items-center justify-center" style={{ width: 56, height: 56, backgroundColor: "#F1F5F9", borderRadius: 10, flexShrink: 0 }}>
                  <Dumbbell size={22} color="#CBD5E1" />
                </div>
                <div className="flex flex-col" style={{ flex: 1, gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>{p.coachName}{p.weeks ? ` · ${p.weeks} semanas` : ""}</span>
                  {p.level ? <span style={{ alignSelf: "flex-start", fontSize: 10, borderRadius: 20, padding: "2px 8px", background: LEVEL_COLOR[p.level][0], color: LEVEL_COLOR[p.level][1] }}>{p.level}</span> : null}
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{p.price || "Consultar precio"}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <AthleteBottomNav active="Marketplace" />
    </PhoneFrame>
  );
}
