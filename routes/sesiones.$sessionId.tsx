import { createFileRoute } from "@tanstack/react-router";
import { SessionEditor, type SessionSearch } from "@/components/togo/SessionEditor";

export const Route = createFileRoute("/sesiones/$sessionId")({
  validateSearch: (search: Record<string, unknown>): SessionSearch => ({
    ...(typeof search["athleteId"] === "string" ? { athleteId: search["athleteId"] } : {}),
    ...(typeof search["teamId"] === "string" ? { teamId: search["teamId"] } : {}),
    ...(typeof search["programId"] === "string" ? { programId: search["programId"] } : {}),
    ...(typeof search["week"] === "string" ? { week: search["week"] } : {}),
    ...(typeof search["day"] === "string" ? { day: search["day"] } : {}),
    ...(typeof search["slot"] === "string" ? { slot: search["slot"] } : {}),
    ...(typeof search["date"] === "string" ? { date: search["date"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Editor de sesión · TOGO" },
      { name: "description", content: "Armá y editá una sesión de entrenamiento: ejercicios, series, pesos y circuitos." },
      { property: "og:title", content: "Editor de sesión · TOGO" },
      { property: "og:description", content: "Armá sesiones con series, cargas y circuitos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionEditorRoute,
});


function SessionEditorRoute() {
  const search = Route.useSearch();
  const { sessionId } = Route.useParams();
  // Remount when jumping to another session/day from inside the editor, so it loads fresh.
  return <SessionEditor key={`${sessionId}|${search.date ?? ""}`} search={search} sessionId={sessionId} />;
}
