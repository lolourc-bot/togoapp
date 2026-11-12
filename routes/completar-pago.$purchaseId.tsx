import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import {
  fetchProgramPurchaseForPayment, createProgramCheckoutSession, createProgramMpPreference,
  type ProgramPurchaseForPayment,
} from "@/lib/marketplace-payments";

export const Route = createFileRoute("/completar-pago/$purchaseId")({
  head: () => ({
    meta: [
      { title: "Completar pago — TOGO" },
      { name: "description", content: "Completá el pago de tu programa." },
    ],
  }),
  component: CompletarPagoPage,
});

function CompletarPagoPage() {
  const { purchaseId } = useParams({ from: "/completar-pago/$purchaseId" });
  const search = useSearch({ strict: false }) as { result?: string };
  const [purchase, setPurchase] = useState<ProgramPurchaseForPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgramPurchaseForPayment({ data: { purchaseId } }).then((p) => { setPurchase(p); setLoading(false); });
  }, [purchaseId]);

  const pay = async () => {
    if (!purchase) return;
    setPaying(true);
    setError(null);
    try {
      const { url } = purchase.processor === "stripe"
        ? await createProgramCheckoutSession({ data: { purchaseId } })
        : await createProgramMpPreference({ data: { purchaseId } });
      if (url) window.location.href = url;
    } catch {
      setError("No se pudo iniciar el pago. Probá de nuevo en un momento.");
      setPaying(false);
    }
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#F8FAFC" }} />;

  if (!purchase) {
    return (
      <Shell>
        <p style={{ fontSize: 14, color: "#374151" }}>No encontramos esta compra.</p>
      </Shell>
    );
  }

  if (search.result === "success" || purchase.status === "paid") {
    return (
      <Shell>
        <CheckCircle size={48} color="#22C55E" style={{ margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", textAlign: "center" }}>¡Pago confirmado!</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8 }}>Ya podés coordinar con tu coach para arrancar.</p>
      </Shell>
    );
  }

  if (purchase.status === "refunded" || purchase.status === "partially_refunded") {
    return (
      <Shell>
        <p style={{ fontSize: 14, color: "#374151", textAlign: "center" }}>Esta compra fue reembolsada.</p>
      </Shell>
    );
  }

  if (!purchase.coachPaymentAccountActive) {
    return (
      <Shell>
        <XCircle size={40} color="#94A3B8" style={{ margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: "#374151", textAlign: "center" }}>Este coach todavía no activó los cobros. Escribile para coordinar el pago de otra forma.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{purchase.programName}</h1>
      <p style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginTop: 8 }}>
        {(purchase.amountTotal / 100).toLocaleString("es-AR")} {purchase.currency}
      </p>
      {search.result === "cancel" ? <p style={{ fontSize: 12, color: "#D97706", marginTop: 8 }}>El pago anterior no se completó. Podés intentar de nuevo.</p> : null}
      {error ? <p style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{error}</p> : null}
      <button
        onClick={pay}
        disabled={paying}
        style={{ marginTop: 20, width: "100%", background: "#111827", color: "#FFF", borderRadius: 12, height: 48, fontSize: 14, fontWeight: 700, border: 0, cursor: "pointer", opacity: paying ? 0.7 : 1 }}
      >
        {paying ? "Un momento…" : "Pagar"}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 400, padding: "40px 32px", backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
        {children}
      </div>
    </div>
  );
}
