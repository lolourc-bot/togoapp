import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BrandLogo } from "./BrandLogo";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import {
  Home, Users, BookOpen, ShoppingBag, MessageCircle,
  Activity, FlaskConical, Receipt, Settings, LogOut, type LucideIcon,
} from "lucide-react";

const navItems: { icon: LucideIcon; label: string; to: string }[] = [
  { icon: Home, label: "Inicio", to: "/" },
  { icon: Users, label: "Atletas", to: "/atletas" },
  { icon: Users, label: "Equipos", to: "/equipos" },
  { icon: BookOpen, label: "Biblioteca", to: "/biblioteca" },
  { icon: ShoppingBag, label: "Marketplace", to: "/marketplace-coach" },
  { icon: Receipt, label: "Facturación", to: "/facturacion" },
  { icon: MessageCircle, label: "Mensajes", to: "/mensajes" },
  { icon: Activity, label: "Bienestar", to: "/bienestar" },
  { icon: FlaskConical, label: "Lab", to: "/lab" },
];

/**
 * Real count of athlete messages the coach hasn't read yet (it used to be a fixed "2"). Refreshes when the tab
 * regains focus and every minute.
 */
function useUnreadMessages(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const coachId = data.session?.user.id;
      if (!coachId) return;
      const { count: n } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("coach_id", coachId)
        .eq("sender", "athlete")
        .is("read_at", null);
      if (alive) setCount(n ?? 0);
    };
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener("focus", load);
    window.addEventListener("togo:messages-read", load);
    return () => {
      window.removeEventListener("togo:messages-read", load);
      alive = false;
      clearInterval(t);
      window.removeEventListener("focus", load);
    };
  }, []);
  return count;
}

export function Sidebar({ active = "Inicio" }: { active?: string }) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const unreadMessages = useUnreadMessages();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/ingresar" });
  };

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-surface"
      style={{ height: "100vh", position: "sticky", top: 0, overflowY: "auto" }}>
      <div className="flex items-center gap-3 p-5">
        <BrandLogo className="h-8 w-8" />
        <span className="text-[1rem] font-bold text-foreground">TOGO</span>
      </div>

      <nav className="mt-8 flex flex-col gap-1 px-3">
        {navItems.map(({ icon: Icon, label, to }) => {
          const isActive = active === label;
          const badge = label === "Mensajes" && unreadMessages > 0 ? (unreadMessages > 99 ? "99+" : String(unreadMessages)) : null;
          return (
            <button key={label} type="button" onClick={() => navigate({ to: to as any })}
              className="flex h-10 items-center gap-3 rounded-sm px-3 text-left text-[0.875rem] transition-colors"
              style={isActive ? { backgroundColor: "var(--color-primary-light)", color: "var(--color-primary)", fontWeight: 600 } : undefined}>
              <Icon size={16} strokeWidth={2} className={isActive ? "" : "text-muted-foreground"} />
              <span className={`flex-1 ${isActive ? "" : "text-muted-foreground"}`}>{label}</span>
              {badge && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none"
                  style={{ backgroundColor: "#DC2626", color: "#FFFFFF" }}>{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-border p-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/configuracion" })}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label="Ir a Configuración"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-border text-[0.75rem] font-semibold text-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-medium text-foreground">
              {profile?.full_name ?? "Coach"}
            </p>
            <p className="truncate text-[0.6875rem] text-subtle">
              {profile?.plan ?? "free"}
            </p>
          </div>
        </button>
        <button type="button" onClick={handleSignOut} aria-label="Cerrar sesión">
          <LogOut size={16} className="text-subtle" />
        </button>
      </div>
    </aside>
  );
}
