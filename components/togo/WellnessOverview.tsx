import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { QUESTIONS } from "@/components/togo/WellnessSheet";
import type { WellnessOverviewRow } from "@/lib/wellness";

/**
 * Wellness overview pieces of the coach's "Bienestar" page (routes/bienestar.tsx): the status counters and
 * the per-athlete check-in table. Presentational; the landing reuses them with sample rows.
 */

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function label(qId: string, v: number | null) {
  return v == null ? "—" : QUESTIONS.find((q) => q.id === qId)?.options[v]?.label ?? "—";
}

function formatDate(dateKey: string) {
  const parts = dateKey.split("-").map(Number);
  const y = parts[0] ?? 1970, m = parts[1] ?? 1, d = parts[2] ?? 1;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
}

function statusStyle(state: WellnessOverviewRow["state"]) {
  if (state === "warn") return { bg: "#FEF9C3", color: "#854D0E", label: "En alerta" };
  if (state === "ok") return { bg: "#DCFCE7", color: "#16A34A", label: "OK" };
  return { bg: "#F1F5F9", color: "#94A3B8", label: "Sin datos" };
}

export function WellnessSummary({ rows }: { rows: WellnessOverviewRow[] }) {
  const warnCount = rows.filter((r) => r.state === "warn").length;
  const okCount = rows.filter((r) => r.state === "ok").length;
  const noneCount = rows.filter((r) => r.state === "none").length;
  return (
<div className="flex" style={{ gap: 12, marginBottom: 20 }}>
      <div style={{ background: "#FEF9C3", borderRadius: 12, padding: "12px 18px" }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#854D0E" }}>{warnCount}</p>
        <p style={{ fontSize: 12, color: "#854D0E" }}>En alerta</p>
      </div>
      <div style={{ background: "#DCFCE7", borderRadius: 12, padding: "12px 18px" }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#16A34A" }}>{okCount}</p>
        <p style={{ fontSize: 12, color: "#16A34A" }}>OK</p>
      </div>
      <div style={{ background: "#F1F5F9", borderRadius: 12, padding: "12px 18px" }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#64748B" }}>{noneCount}</p>
        <p style={{ fontSize: 12, color: "#64748B" }}>Sin datos</p>
      </div>
    </div>
  );
}

function RowWrap({ athleteId, link, children }: { athleteId: string; link: boolean; children: ReactNode }) {
  if (!link) return <div style={{ display: "contents" }}>{children}</div>;
  return (
    <Link to="/atletas/$athleteId" params={{ athleteId }} style={{ display: "contents", cursor: "pointer" }}>
      {children}
    </Link>
  );
}

/** One row per athlete with their last check-in. `linkRows` (default) opens the athlete on click. */
export function WellnessTable({ rows, linkRows = true }: { rows: WellnessOverviewRow[]; linkRows?: boolean }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 90px 90px 90px 90px 110px" }}>
      {["Atleta", "Último check-in", "Energía", "Sueño", "Cuerpo", "Estado"].map((h, i) => (
        <div
          key={h}
          style={{
            fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase",
            letterSpacing: 0.5, paddingBottom: 8, textAlign: i === 0 ? "left" : "center",
          }}
        >
          {h}
        </div>
      ))}
      {rows.map((r) => {
        const st = statusStyle(r.state);
        return (
          <Link
            key={r.athleteId}
            to="/atletas/$athleteId"
            params={{ athleteId: r.athleteId }}
            style={{ display: "contents", cursor: "pointer" }}
          >
            <div className="flex items-center" style={{ gap: 10, fontSize: 13, color: "#111827", padding: "10px 0", borderTop: "1px solid #F1F5F9" }}>
              <span className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "50%", background: "#F1F5F9", fontSize: 11, fontWeight: 700, color: "#94A3B8", flexShrink: 0 }}>
                {initials(r.athleteName)}
              </span>
              {r.athleteName}
            </div>
            <div style={{ fontSize: 13, color: "#64748B", textAlign: "center", padding: "10px 0", borderTop: "1px solid #F1F5F9" }}>
              {r.date ? formatDate(r.date) : "—"}
            </div>
            <div style={{ fontSize: 13, color: r.energy === null ? "#94A3B8" : "#374151", textAlign: "center", padding: "10px 0", borderTop: "1px solid #F1F5F9" }}>
              {label("energia", r.energy)}
            </div>
            <div style={{ fontSize: 13, color: r.sleep === null ? "#94A3B8" : "#374151", textAlign: "center", padding: "10px 0", borderTop: "1px solid #F1F5F9" }}>
              {label("sueno", r.sleep)}
            </div>
            <div style={{ fontSize: 13, color: r.body === null ? "#94A3B8" : "#374151", textAlign: "center", padding: "10px 0", borderTop: "1px solid #F1F5F9" }}>
              {label("cuerpo", r.body)}
            </div>
            <div style={{ textAlign: "center", padding: "10px 0", borderTop: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: 11, fontWeight: 500, backgroundColor: st.bg, color: st.color, borderRadius: 6, padding: "3px 8px" }}>
                {st.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
