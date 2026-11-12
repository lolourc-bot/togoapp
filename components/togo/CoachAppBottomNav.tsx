import { Link } from "@tanstack/react-router";
import { Users, Mic, User, Shield } from "lucide-react";

export type CoachAppTab = "Atletas" | "Equipos" | "Toguito" | "Perfil";

const TABS: { label: CoachAppTab; icon: typeof Users; to: string }[] = [
  { label: "Atletas", icon: Users, to: "/coach-app" },
  { label: "Equipos", icon: Shield, to: "/coach-app/equipos" },
  { label: "Toguito", icon: Mic, to: "/coach-app/toguito" },
  { label: "Perfil", icon: User, to: "/coach-app/perfil" },
];

export function CoachAppBottomNav({ active }: { active: CoachAppTab }) {
  return (
    <nav
      className="grid shrink-0 items-center"
      style={{ height: 64, backgroundColor: "#FFFFFF", borderTop: "1px solid #E2E8F0", gridTemplateColumns: `repeat(${TABS.length}, 1fr)`, zIndex: 100, position: "relative" }}
    >
      {TABS.map(({ label, icon: Icon, to }) => {
        const on = label === active;
        return (
          <Link key={label} to={to} aria-label={label} aria-current={on ? "page" : undefined} className="flex flex-col items-center" style={{ gap: 3, padding: "8px 0" }}>
            <Icon size={22} color={on ? "#111827" : "#CBD5E1"} />
            <span style={{ fontSize: on ? 10 : 9, fontWeight: on ? 600 : 500, color: on ? "#111827" : "#94A3B8" }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
