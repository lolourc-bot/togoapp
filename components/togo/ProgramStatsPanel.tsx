import { useState } from "react";
import { X } from "lucide-react";

const PERIODS = ["7 días", "30 días", "3 meses", "Todo"];
const BARS = [
  { m: "Mar", v: 180 },
  { m: "Abr", v: 240 },
  { m: "May", v: 210 },
  { m: "Jun", v: 290 },
  { m: "Jul", v: 320 },
  { m: "Ago", v: 359 },
];
const RECENT = [
  { initials: "MS", name: "Martina Silva", since: "desde 2/8/26", amount: "$19.99/mes" },
  { initials: "JP", name: "Julián Pérez", since: "desde 28/7/26", amount: "$19.99/mes" },
  { initials: "CF", name: "Carla Funes", since: "desde 21/7/26", amount: "$19.99/mes" },
];

export function ProgramStatsPanel({
  programName,
  onClose,
}: {
  programName: string;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState("30 días");
  const max = Math.max(...BARS.map((b) => b.v));

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.25)", zIndex: 55 }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 420,
          height: "100vh",
          background: "#FFFFFF",
          borderLeft: "1px solid #E2E8F0",
          zIndex: 60,
          overflowY: "auto",
          animation: "togo-slide-in 200ms ease-out",
        }}
      >
        <div
          style={{
            padding: 20,
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#111827" }}>
            {programName}
          </span>
          <button type="button" aria-label="Cerrar" onClick={onClose}>
            <X size={18} color="#94A3B8" />
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {PERIODS.map((p) => (
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

          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#111827" }}>
                Ingresos
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>$359</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 100 }}>
              {BARS.map((b) => (
                <div key={b.m} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      height: (b.v / max) * 88,
                      background: "#111827",
                      borderRadius: 4,
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              {BARS.map((b) => (
                <span key={b.m} style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#CBD5E1" }}>
                  {b.m}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Suscriptores activos", value: "18", color: "#111827" },
              { label: "Nuevos este mes", value: "3", color: "#16A34A" },
              { label: "Cancelaciones", value: "1", color: "#EF4444" },
              { label: "Valoración", value: "⭐ 4.9", color: "#111827" },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  padding: 14,
                }}
              >
                <span style={{ display: "block", fontSize: 12, color: "#94A3B8" }}>{c.label}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</span>
              </div>
            ))}
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 10 }}>
              Últimos suscriptores
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {RECENT.map((r) => (
                <div
                  key={r.initials}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid #F8FAFC",
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#F1F5F9",
                      color: "#64748B",
                      fontSize: 11,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {r.initials}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 13, color: "#111827" }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>{r.since}</span>
                  </span>
                  <span style={{ fontSize: 12, color: "#374151" }}>{r.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
