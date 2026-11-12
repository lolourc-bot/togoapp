import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  Calendar,
  Download,
  ExternalLink,
  RotateCcw,
  TrendingUp,
  Package,
  type LucideIcon,
} from "lucide-react";
import { Sidebar } from "@/components/togo/Sidebar";
import { getCoachId } from "@/lib/programs";
import {
  fetchMyProgramPurchases, fetchMyPaymentAccountStatus, createStripeExpressDashboardLink,
  type CoachProgramPurchase, type PaymentAccountStatus,
} from "@/lib/marketplace-payments";

export const Route = createFileRoute("/facturacion")({
  head: () => ({
    meta: [
      { title: "Facturación del coach — TOGO" },
      {
        name: "description",
        content: "Controlá ingresos y ventas de tus programas en el marketplace de TOGO.",
      },
      { property: "og:title", content: "Facturación del coach — TOGO" },
      { property: "og:description", content: "Ingresos y ventas de programas en un solo lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FacturacionPage,
});

const FILTERS = ["Todas", "Ingresos", "Reembolsos"] as const;
const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const card = { background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0" } as const;

const chip = (active: boolean) => ({
  height: 28, borderRadius: 6, padding: "0 10px", fontSize: 12, fontWeight: 500,
  background: active ? "#111827" : "#F1F5F9", color: active ? "#FFFFFF" : "#64748B", cursor: "pointer", border: 0,
});

const headerBtn = {
  display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E2E8F0", borderRadius: 10,
  padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#374151", background: "#FFFFFF", cursor: "pointer",
} as const;

function txStyle(status: string) {
  if (status === "refunded" || status === "partially_refunded") {
    return { bg: "#FEF2F2", icon: RotateCcw, color: "#EF4444", amountColor: "#EF4444", prefix: "-" };
  }
  return { bg: "#F0FDF4", icon: ArrowDownLeft, color: "#16A34A", amountColor: "#16A34A", prefix: "+" };
}

function money(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString("es-AR")} ${currency}`;
}

function FacturacionPage() {
  const [coachId, setCoachId] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<CoachProgramPurchase[]>([]);
  const [account, setAccount] = useState<PaymentAccountStatus>({ processor: null, status: "pending" });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("Todas");

  useEffect(() => {
    getCoachId().then(async (cid) => {
      setCoachId(cid);
      if (!cid) { setLoading(false); return; }
      const [p, a] = await Promise.all([fetchMyProgramPurchases(cid), fetchMyPaymentAccountStatus({ data: { coachId: cid } })]);
      setPurchases(p);
      setAccount(a);
      setLoading(false);
    });
  }, []);

  const paid = purchases.filter((p) => p.status === "paid");
  const refunded = purchases.filter((p) => p.status === "refunded" || p.status === "partially_refunded");
  const pending = purchases.filter((p) => p.status === "pending");
  const currency = paid[0]?.currency ?? "USD";

  const now = new Date();
  const totalCobrado = paid.reduce((s, p) => s + p.netAmount, 0);
  const ingresosMes = paid
    .filter((p) => p.purchasedAt && new Date(p.purchasedAt).getMonth() === now.getMonth() && new Date(p.purchasedAt).getFullYear() === now.getFullYear())
    .reduce((s, p) => s + p.netAmount, 0);

  const STATS: { label: string; value: string; sub: string; subColor: string; icon: LucideIcon; iconColor: string }[] = [
    { label: "Total cobrado", value: money(totalCobrado, currency), sub: "Transferido a tu cuenta", subColor: "#16A34A", icon: TrendingUp, iconColor: "#94A3B8" },
    { label: "Ingresos del mes", value: money(ingresosMes, currency), sub: `${paid.length} ventas en total`, subColor: "#94A3B8", icon: Calendar, iconColor: "#94A3B8" },
    { label: "Pendientes de pago", value: String(pending.length), sub: "Solicitudes aceptadas sin pagar", subColor: "#94A3B8", icon: Package, iconColor: "#94A3B8" },
  ];

  const bars = useMemo(() => {
    const months: { m: string; v: number; current?: boolean }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = paid
        .filter((p) => p.purchasedAt && new Date(p.purchasedAt).getMonth() === d.getMonth() && new Date(p.purchasedAt).getFullYear() === d.getFullYear())
        .reduce((s, p) => s + p.netAmount, 0) / 100;
      months.push({ m: MONTH_ABBR[d.getMonth()]!, v: total, current: i === 0 });
    }
    return months;
  }, [paid]);
  const maxY = Math.max(100, ...bars.map((b) => b.v));
  const barWidth = `${Math.min(10, 60 / bars.length)}%`;

  const rows = purchases.filter((p) => {
    if (filter === "Ingresos") return p.status === "paid";
    if (filter === "Reembolsos") return p.status === "refunded" || p.status === "partially_refunded";
    return p.status !== "pending" && p.status !== "failed";
  });

  const byProgram = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const p of paid) {
      const e = map.get(p.programName) ?? { count: 0, total: 0 };
      e.count++; e.total += p.netAmount;
      map.set(p.programName, e);
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [paid]);

  const openStripeDashboard = async () => {
    if (!coachId) return;
    try {
      const { url } = await createStripeExpressDashboardLink({ data: { coachId } });
      if (url) window.open(url, "_blank");
    } catch {
      // sin cuenta conectada todavía, o no es Stripe — no hacer nada
    }
  };

  const exportCsv = () => {
    const header = ["Fecha", "Programa", "Comprador", "Monto neto", "Moneda", "Estado"];
    const lines = rows.map((t) => [
      t.purchasedAt ?? t.createdAt,
      t.programName,
      t.buyerName ?? "",
      String(t.netAmount / 100),
      t.currency,
      t.status,
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "facturacion-togo.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#F8FAFC" }} />;

  return (
    <div style={{ display: "flex", background: "#F8FAFC", minHeight: "100vh" }}>
      <style>{`.fa-bar:hover{background:#374151 !important}.fa-link:hover{color:#111827 !important}`}</style>
      <Sidebar active="Facturación" />

      <main style={{ flex: 1, minWidth: 0, padding: "32px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h1 style={{ flex: 1, fontSize: 22, fontWeight: 700, color: "#111827" }}>Facturación</h1>
          <div style={{ display: "flex", gap: 10 }}>
            {account.processor === "stripe" && account.status === "active" ? (
              <button type="button" style={headerBtn} onClick={openStripeDashboard}>
                <ExternalLink size={14} color="#374151" /> Ver en Stripe
              </button>
            ) : null}
            <button type="button" style={headerBtn} onClick={exportCsv} disabled={rows.length === 0}>
              <Download size={14} color="#374151" /> Exportar
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 24 }}>
          Ingresos y ventas de tus programas en el marketplace.
        </p>

        {purchases.length === 0 ? (
          <div style={{ ...card, padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
            Todavía no tenés ventas registradas.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
              {STATS.map((s) => (
                <div key={s.label} style={{ ...card, padding: "18px 20px", flex: 1, position: "relative" }}>
                  <s.icon size={20} color={s.iconColor} style={{ position: "absolute", top: 18, right: 20 }} />
                  <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>{s.label}</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: s.subColor, marginTop: 4 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: 20, marginBottom: 24 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Ingresos mensuales (últimos 6 meses)</span>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <div style={{ flex: 1, position: "relative", height: 140 }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "space-around" }}>
                    {bars.map((b) => (
                      <div key={b.m} style={{ width: barWidth, textAlign: "center" }}>
                        {b.current ? <span style={{ display: "block", fontSize: 10, color: "#94A3B8", marginBottom: 4 }}>mes en curso</span> : null}
                        <div className="fa-bar" style={{ height: Math.max(2, (b.v / maxY) * 130), background: "#111827", borderRadius: "4px 4px 0 0" }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8 }}>
                {bars.map((b) => <span key={b.m} style={{ width: barWidth, textAlign: "center", fontSize: 11, color: "#94A3B8" }}>{b.m}</span>)}
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <section style={{ ...card, flex: 1, minWidth: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Últimas transacciones</h2>
                </div>
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #F8FAFC", display: "flex", gap: 8 }}>
                  {FILTERS.map((f) => <button key={f} type="button" onClick={() => setFilter(f)} style={chip(filter === f)}>{f}</button>)}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {rows.length === 0 ? <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Sin resultados.</div> : null}
                  {rows.map((t) => {
                    const st = txStyle(t.status);
                    const Icon = st.icon;
                    return (
                      <div key={t.id} style={{ padding: "14px 20px", borderBottom: "1px solid #F8FAFC", display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ width: 36, height: 36, borderRadius: "50%", background: st.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={16} color={st.color} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#111827" }}>{t.programName}</span>
                          <span style={{ display: "block", fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                            {t.status === "refunded" ? "Reembolsado" : t.status === "partially_refunded" ? "Reembolso parcial" : "Venta de programa"}
                          </span>
                        </span>
                        <span style={{ textAlign: "right" }}>
                          <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: st.amountColor }}>
                            {st.prefix}{money(t.netAmount, t.currency)}
                          </span>
                          <span style={{ display: "block", fontSize: 11, color: "#CBD5E1" }}>
                            {t.purchasedAt ? new Date(t.purchasedAt).toLocaleDateString("es-AR") : new Date(t.createdAt).toLocaleDateString("es-AR")}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <aside style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ ...card, padding: 20 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 14 }}>Cobros</h3>
                  {account.processor ? (
                    <>
                      <p style={{ fontSize: 13, color: "#374151" }}>{account.processor === "stripe" ? "Stripe Connect" : "Mercado Pago"}</p>
                      <p style={{ fontSize: 12, color: account.status === "active" ? "#16A34A" : "#94A3B8", marginTop: 4 }}>
                        {account.status === "active" ? "Activo — tus pagos se transfieren directo a tu cuenta" : "Configuración pendiente"}
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: 12, color: "#94A3B8" }}>Conectá tus cobros desde Configuración → Pagos para empezar a recibir pagos del marketplace.</p>
                  )}
                </div>

                <div style={{ ...card, padding: 20 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 14 }}>Por programa</h3>
                  {byProgram.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#94A3B8" }}>Sin ventas todavía.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {byProgram.map((p) => (
                        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "#374151" }}>{p.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#111827", background: "#F1F5F9", borderRadius: 6, padding: "2px 8px" }}>{p.count}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A" }}>{money(p.total, currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
