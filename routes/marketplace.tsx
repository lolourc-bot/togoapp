import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Dumbbell, ChevronRight } from "lucide-react";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace · TOGO" },
      { name: "description", content: "Encontrá coaches y programas de entrenamiento en TOGO." },
    ],
  }),
  component: MarketplaceHub,
});

function MarketplaceHub() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col" style={{ paddingBottom: 64 }}>
        <div style={{ padding: "44px 16px 4px" }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Marketplace</span>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Encontrá tu coach o programa ideal.</p>
        </div>
        <div className="flex flex-col" style={{ gap: 10, padding: 16 }}>
          <Link to="/explorar" className="flex items-center" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 18, gap: 14, textDecoration: "none" }}>
            <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#F1F5F9", flexShrink: 0 }}><Users size={20} color="#374151" /></span>
            <div className="flex flex-col" style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Coaches</span>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>Explorá perfiles de entrenadores</span>
            </div>
            <ChevronRight size={16} color="#CBD5E1" />
          </Link>
          <Link to="/marketplace-programas" className="flex items-center" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 18, gap: 14, textDecoration: "none" }}>
            <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#F1F5F9", flexShrink: 0 }}><Dumbbell size={20} color="#374151" /></span>
            <div className="flex flex-col" style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Programas</span>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>Buscá por tipo de programa</span>
            </div>
            <ChevronRight size={16} color="#CBD5E1" />
          </Link>
        </div>
      </div>

      <AthleteBottomNav active="Marketplace" />
    </PhoneFrame>
  );
}
