import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchSessionForExecution } from "@/lib/session-execution";
import { AthleteSessionView, type AthleteSessionMeta, type Block } from "@/components/togo/AthleteSessionView";

export const Route = createFileRoute("/sesion-atleta")({
  validateSearch: (search: Record<string, unknown>): { sessionId?: string } =>
    typeof search["sessionId"] === "string" ? { sessionId: search["sessionId"] as string } : {},
  head: () => ({
    meta: [
      { title: "Vista del atleta | TOGO" },
      {
        name: "description",
        content:
          "Así ve el atleta su sesión desde el celular: series, pesos y descansos en vivo.",
      },
      { property: "og:title", content: "Vista del atleta · TOGO" },
      {
        property: "og:description",
        content: "Ejecución de la sesión desde el celular del atleta, serie por serie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AthleteMobileSession,
});

function AthleteMobileSession() {
  const { sessionId } = Route.useSearch();
  const [session, setSession] = useState<{ meta: AthleteSessionMeta; blocks: Block[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    fetchSessionForExecution(sessionId).then((s) => {
      if (s) setSession({ meta: { id: s.id, coachId: s.coachId, name: s.name }, blocks: s.blocks });
      setLoading(false);
    });
  }, [sessionId]);

  if (loading) {
    return <div style={{ padding: 40, color: "#94A3B8" }}>Cargando sesión…</div>;
  }
  if (!session || session.blocks.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ padding: 24, color: "#94A3B8" }}>
        No hay sesión seleccionada.{" "}
        <Link to="/hoy" style={{ color: "#111827", marginLeft: 6 }}>
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div
        style={{
          width: 375,
          height: 812,
          borderRadius: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        <AthleteSessionView meta={session.meta} initialBlocks={session.blocks} />
      </div>
    </div>
  );
}
