import { createFileRoute } from "@tanstack/react-router";
import { ExplorarScreen } from "@/routes/explorar";

export const Route = createFileRoute("/marketplace-coaches")({
  head: () => ({
    meta: [
      { title: "Coaches · Marketplace · TOGO" },
      { name: "description", content: "Encontrá coaches en TOGO." },
    ],
  }),
  component: ExplorarScreen,
});
