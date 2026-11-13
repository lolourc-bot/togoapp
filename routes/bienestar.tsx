import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/togo/Sidebar";
import { TopBar } from "@/components/togo/TopBar";
import { WellnessSummary, WellnessTable } from "@/components/togo/WellnessOverview";
import { getCoachId } from "@/lib/programs";
import { fetchWellnessOverview, type WellnessOverviewRow } from "@/lib/wellness";

export const Route = createFileRoute("/bienestar")({
  head: () => ({
    meta: [
      { title: "Bienestar · TOGO" },
      { name: "description", content: "Check-ins de bienestar de tus atletas: energía, sueño y estado del cuerpo." },
    ],
  }),
  component: BienestarPage,
});

function BienestarPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<WellnessOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const coachId = await getCoachId();
      if (!coachId) { navigate({ to: "/ingresar" }); return; }
      const data = await fetchWellnessOverview(coachId);
      setRows(data);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <Sidebar active="Bienestar" />
      <div className="flex min-h-screen flex-col">
        <TopBar title="Bienestar" />
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Bienestar de tus atletas</h1>
            <p className="text-sm text-muted-foreground mt-1">Último check-in de cada atleta, últimos 7 días.</p>
          </div>

          {!loading ? <WellnessSummary rows={rows} /> : null}

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            {loading ? (
              <p style={{ fontSize: 13, color: "#94A3B8", padding: "20px 0", textAlign: "center" }}>Cargando…</p>
            ) : rows.length === 0 ? (
              <p style={{ fontSize: 13, color: "#94A3B8", padding: "20px 0", textAlign: "center" }}>
                Todavía no tenés atletas activos cargados.
              </p>
            ) : (
              <WellnessTable rows={rows} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
