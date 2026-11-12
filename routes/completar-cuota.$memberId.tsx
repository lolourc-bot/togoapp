import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import {
  fetchMemberBillingForPayment, createMemberStripeCheckout, createMemberMpPreapproval,
  type MemberBillingInfo,
} from "@/lib/institution-member-billing";

export const Route = createFileRoute("/completar-cuota/$memberId")({
  head: () => ({
    meta: [
      { title: "Completar cuota — TOGO" },
      { name: "description", content: "Autorizá el pago de tu cuota mensual." },
    ],
  }),
  component: CompletarCuotaPage,
});

function CompletarCuotaPage() {
  const { memberId } = useParams({ from: "/completar-cuota/$memberId" });
  const search = useSearch({ strict: false }) as { result?: string };
  const [billing, setBilling] = useState<MemberBillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberBillingForPayment({ data: { memberId } }).then((b) => { setBilling(b); setLoading(false); });
  }, [memberId]);

  const pay = async () => {
    if (!billing) return;
    setPaying(true);
    setError(null);
    try {
      const { url } = billing.processor === "stripe"
        ? await createMemberStripeCheckout({ data: { memberId } })
        : await createMemberMpPreapproval({ data: { memberId } });
      if (url) window.location.href = url;
    } catch {
      setError("No se pudo iniciar la autorización. Probá de nuevo en un momento.");
      setPaying(false);
    }
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#F8FAFC" }} />;

  if (!billing) {
    return (
      <Shell>
        <p style={{ fontSize: 14, color: "#374151" }}>No encontramos esta cuota.</p>
      </Shell>
    );
  }

  if (search.result === "success" || billing.billingStatus === "active") {
    return (
      <Shell>
        <CheckCircle size={48} color="#22C55E" style={{ margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", textAlign: "center" }}>¡Cuota autorizada!</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8 }}>Se va a debitar automáticamente todos los meses.</p>
      </Shell>
    );
  }

  if (!billing.planAmount) {
    return (
      <Shell>
        <p style={{ fontSize: 14, color: "#374151", textAlign: "center" }}>Todavía no te asignaron un precio de cuota. Consultá con tu institución.</p>
      </Shell>
    );
  }

  if (!billing.institutionAccountActive) {
    return (
      <Shell>
        <XCircle size={40} color="#94A3B8" style={{ margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: "#374151", textAlign: "center" }}>Tu institución todavía no activó los cobros online. Consultá cómo pagar tu cuota de otra forma.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Cuota mensual de {billing.fullName}</h1>
      <p style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginTop: 8 }}>
        {(billing.planAmount / 100).toLocaleString("es-AR")} {billing.planCurrency}<span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 400 }}>/mes</span>
      </p>
      {search.result === "cancel" ? <p style={{ fontSize: 12, color: "#D97706", marginTop: 8 }}>La autorización anterior no se completó. Podés intentar de nuevo.</p> : null}
      {error ? <p style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{error}</p> : null}
      <button
        onClick={pay}
        disabled={paying}
        style={{ marginTop: 20, width: "100%", background: "#111827", color: "#FFF", borderRadius: 12, height: 48, fontSize: 14, fontWeight: 700, border: 0, cursor: "pointer", opacity: paying ? 0.7 : 1 }}
      >
        {paying ? "Un momento…" : "Autorizar débito mensual"}
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
