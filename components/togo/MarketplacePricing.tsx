import { useState } from "react";
import { CreditCard, RefreshCw } from "lucide-react";

export function PricingSection({
  showVisibility = false,
  initialPrice = "",
  initialPayment = "sub",
}: {
  showVisibility?: boolean;
  initialPrice?: string;
  initialPayment?: "unico" | "sub";
}) {
  const [payment, setPayment] = useState<"unico" | "sub">(initialPayment);
  const [currency, setCurrency] = useState("ARS");
  const [price, setPrice] = useState(initialPrice);
  const [period, setPeriod] = useState("Mensual");
  const [trial, setTrial] = useState(false);
  const [days, setDays] = useState("7");
  const [visibility, setVisibility] = useState("publico");

  const amount = Number(price.replace(",", ".")) || 0;
  const months = period === "Trimestral" ? 3 : period === "Anual" ? 12 : 1;
  const monthly = months > 1 ? (amount / months).toFixed(2) : null;

  const optionCard = (
    id: "unico" | "sub",
    Icon: typeof CreditCard,
    title: string,
    desc: string,
  ) => (
    <button
      key={id}
      type="button"
      onClick={() => setPayment(id)}
      style={{
        flex: 1,
        textAlign: "left",
        border: `1px solid ${payment === id ? "#111827" : "#E2E8F0"}`,
        background: payment === id ? "#F8FAFC" : "#FFFFFF",
        borderRadius: 12,
        padding: "14px 16px",
        cursor: "pointer",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Icon size={18} color="#94A3B8" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{title}</span>
      </span>
      <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{desc}</p>
    </button>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label
          style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 10 }}
        >
          Tipo de pago
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          {optionCard(
            "unico",
            CreditCard,
            "Pago único",
            "El atleta paga una vez y accede al programa completo.",
          )}
          {optionCard(
            "sub",
            RefreshCw,
            "Suscripción",
            "El atleta paga de forma recurrente mientras esté suscripto.",
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 8 }}
        >
          Precio
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["ARS", "USD"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              style={{
                height: 32,
                borderRadius: 8,
                padding: "0 14px",
                fontSize: 12,
                fontWeight: 500,
                background: currency === c ? "#111827" : "#F1F5F9",
                color: currency === c ? "#FFFFFF" : "#64748B",
              }}
            >
              {c}
            </button>
          ))}
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: 10,
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
              }}
            >
              $
            </span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="19.99"
              aria-label="Precio"
              style={{
                width: 140,
                height: 40,
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: "0 12px 0 28px",
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
              }}
            />
          </div>
        </div>
      </div>

      {payment === "sub" ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 8 }}
            >
              Período de facturación
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Mensual", "Trimestral", "Anual"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  style={{
                    height: 32,
                    borderRadius: 8,
                    padding: "0 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    background: period === p ? "#111827" : "#F1F5F9",
                    color: period === p ? "#FFFFFF" : "#64748B",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>
              {monthly
                ? `$${amount.toFixed(2)} cada ${months} meses (= $${monthly}/mes)`
                : `$${amount.toFixed(2)} por mes`}
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
              <input type="checkbox" checked={trial} onChange={(e) => setTrial(e.target.checked)} />
              Ofrecer período de prueba gratuito
            </label>
            {trial ? (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {["7", "14", "30"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    style={{
                      height: 32,
                      borderRadius: 8,
                      padding: "0 14px",
                      fontSize: 12,
                      fontWeight: 500,
                      background: days === d ? "#111827" : "#F1F5F9",
                      color: days === d ? "#FFFFFF" : "#64748B",
                    }}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {showVisibility ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {[
            { id: "publico", label: "Público en el marketplace" },
            { id: "privado", label: "Solo mis atletas" },
          ].map((o) => (
            <label
              key={o.id}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}
            >
              <input
                type="radio"
                name="visibilidad"
                checked={visibility === o.id}
                onChange={() => setVisibility(o.id)}
              />
              {o.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EditPriceModal({
  program,
  onClose,
}: {
  program: { name: string; price: string; payment: string };
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 70,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          padding: 24,
          width: 520,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
          Editar precio
        </h2>
        <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 20 }}>{program.name}</p>
        <PricingSection
          initialPrice={program.price.replace(/[^0-9.]/g, "")}
          initialPayment={program.payment === "Pago único" ? "unico" : "sub"}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid #E2E8F0",
              fontSize: 13,
              color: "#374151",
              background: "#FFFFFF",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 10,
              background: "#111827",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Guardar precio
          </button>
        </div>
      </div>
    </div>
  );
}
