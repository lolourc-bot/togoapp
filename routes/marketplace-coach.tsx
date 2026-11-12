import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Sidebar } from "@/components/togo/Sidebar";
import { TopBar } from "@/components/togo/TopBar";
import { getCoachId } from "@/lib/programs";
import { fetchMyMarketplaceProfile, type MarketplaceCoach } from "@/lib/marketplace";
import { fetchMyProgramPurchases, type CoachProgramPurchase } from "@/lib/marketplace-payments";

export const Route = createFileRoute("/marketplace-coach")({
  component: MarketplaceCoachPanel,
});

function relativeDay(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays <= 0) return "hoy";
  if (diffDays === 1) return "ayer";
  return `hace ${diffDays} días`;
}

type PurchaseFilter = "paid" | "pending" | "refunded" | "all";
const STATUS_LABEL: Record<string, string> = {
  paid: "Pagada", pending: "Pendiente de pago", failed: "Falló", refunded: "Reembolsada", partially_refunded: "Reembolso parcial",
};
const STATUS_COLOR: Record<string, [string, string]> = {
  paid: ["#F0FDF4", "#16A34A"], pending: ["#FFFBEB", "#D97706"], failed: ["#FEF2F2", "#EF4444"],
  refunded: ["#FEF2F2", "#EF4444"], partially_refunded: ["#FEF2F2", "#EF4444"],
};

function MarketplaceCoachPanel() {
  const [coachId, setCoachId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MarketplaceCoach | null>(null);
  const [purchases, setPurchases] = useState<CoachProgramPurchase[]>([]);
  const [filter, setFilter] = useState<PurchaseFilter>("paid");

  useEffect(() => {
    getCoachId().then(async (cid) => {
      if (!cid) { setLoading(false); return; }
      setCoachId(cid);
      const [prof, purch] = await Promise.all([fetchMyMarketplaceProfile(cid), fetchMyProgramPurchases(cid)]);
      setProfile(prof);
      setPurchases(purch);
      setLoading(false);
    });
  }, []);

  const counts = {
    paid: purchases.filter((p) => p.status === "paid").length,
    pending: purchases.filter((p) => p.status === "pending").length,
    refunded: purchases.filter((p) => p.status === "refunded" || p.status === "partially_refunded").length,
  };
  const filtered = filter === "all" ? purchases
    : filter === "refunded" ? purchases.filter((p) => p.status === "refunded" || p.status === "partially_refunded")
    : purchases.filter((p) => p.status === filter);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <Sidebar active="Marketplace" />
      <div className="flex min-h-screen flex-col">
        <TopBar title="Marketplace" />
        <main className="flex-1 p-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 p-4 border border-border rounded-xl bg-surface">
                <div>
                  <h1 className="text-base font-semibold text-foreground">Mi perfil público</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile?.visible
                      ? "Tu perfil está publicado en el marketplace."
                      : profile?.bio || profile?.specialty
                        ? "Tenés un borrador sin publicar todavía."
                        : "Todavía no configuraste tu perfil público."}
                  </p>
                </div>
                {coachId ? (
                  <Link to="/perfil-coach/$coachId" params={{ coachId }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border">
                    Ver y editar <ExternalLink size={14} />
                  </Link>
                ) : null}
              </div>

              <h2 className="text-base font-semibold text-foreground mb-3">Ventas de programas</h2>
              <div className="flex items-center gap-1 mb-4" style={{ width: "fit-content", backgroundColor: "#F1F5F9", borderRadius: 10, padding: 3 }}>
                {([
                  ["paid", `Pagadas (${counts.paid})`],
                  ["pending", `Pendientes (${counts.pending})`],
                  ["refunded", `Reembolsadas (${counts.refunded})`],
                  ["all", `Todas (${purchases.length})`],
                ] as const).map(([value, label]) => (
                  <button key={value} onClick={() => setFilter(value)}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                    style={{
                      backgroundColor: filter === value ? "#FFFFFF" : "transparent",
                      color: filter === value ? "#111827" : "#64748B",
                      boxShadow: filter === value ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                      border: 0, cursor: "pointer",
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-sm">
                    {filter === "paid" ? "Todavía no tenés ventas pagadas." : "No hay ventas acá."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtered.map((p) => (
                    <div key={p.id} className="p-4 border border-border rounded-xl bg-surface">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.buyerName ?? "Comprador"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.programName} · {relativeDay(p.createdAt)}
                            {p.buyerEmail ? ` · ${p.buyerEmail}` : ""}
                          </p>
                          <p className="text-sm text-foreground mt-2">
                            {(p.amountTotal / 100).toLocaleString("es-AR")} {p.currency} <span className="text-xs text-muted-foreground">(neto: {(p.netAmount / 100).toLocaleString("es-AR")} {p.currency})</span>
                          </p>
                        </div>
                        <span className="text-xs font-medium shrink-0" style={{ padding: "3px 8px", borderRadius: 999, backgroundColor: STATUS_COLOR[p.status]?.[0] ?? "#F1F5F9", color: STATUS_COLOR[p.status]?.[1] ?? "#64748B" }}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
