import { useEffect, useState } from "react";
import { MessageCircle, UserPlus, Users, Users2, X, type LucideIcon } from "lucide-react";
import { Dumbbell } from "@/components/togo/icons/Dumbbell";
import { toast } from "sonner";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export type EmptySection = "dashboard" | "atletas" | "equipos" | "lab" | "mensajes";

const CFG: Record<EmptySection, { icon: LucideIcon; title: string; desc: string; cta: string; nav: string; top: string; invite?: boolean }> = {
  dashboard: { icon: Users, title: "Todavía no tenés atletas", desc: "Invitá a tus primeros atletas y empezá a publicar sesiones.", cta: "Invitar atleta", nav: "Inicio", top: "Inicio", invite: true },
  atletas: { icon: UserPlus, title: "Tu lista de atletas está vacía", desc: "Invitá atletas o esperá a que te encuentren en el marketplace.", cta: "Invitar atleta", nav: "Atletas", top: "Atletas", invite: true },
  equipos: { icon: Users2, title: "No creaste ningún equipo", desc: "Organizá a tus atletas en grupos para asignarles sesiones en conjunto.", cta: "Crear equipo", nav: "Equipos", top: "Equipos" },
  lab: { icon: Dumbbell, title: "Tu biblioteca está vacía", desc: "Agregá ejercicios personalizados para usarlos al crear sesiones.", cta: "Agregar ejercicio", nav: "Lab", top: "Lab" },
  mensajes: { icon: MessageCircle, title: "Sin conversaciones", desc: "Cuando tus atletas te escriban o vos los contactes, aparecerán acá.", cta: "Nueva conversación", nav: "Mensajes", top: "Mensajes" },
};

const NEW_KEY = "togo-coach-new";
const doneKey = (s: EmptySection) => `togo-empty-done-${s}`;

export function markNewCoach() {
  localStorage.setItem(NEW_KEY, "1");
  (Object.keys(CFG) as EmptySection[]).forEach((s) => localStorage.removeItem(doneKey(s)));
}

export function EmptyState({ icon: Icon, title, desc, cta, onCta }: { icon: LucideIcon; title: string; desc: string; cta: string; onCta: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ padding: "48px 24px", textAlign: "center" }}>
      <span className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: "50%", background: "#F8FAFC", marginBottom: 16 }}><Icon size={24} color="#CBD5E1" /></span>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.5, maxWidth: 280, marginBottom: 20 }}>{desc}</div>
      <button onClick={onCta} style={{ background: "#111827", color: "#FFF", borderRadius: 10, height: 40, padding: "0 20px", fontSize: 13, fontWeight: 600 }}>{cta}</button>
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const ok = /\S+@\S+\.\S+/.test(email);
  return (
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.4)", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, background: "#FFF", borderRadius: 16, padding: 24 }}>
        <div className="flex items-center" style={{ marginBottom: 14 }}>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "#111827" }}>Invitar atleta</div>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} color="#CBD5E1" /></button>
        </div>
        <input autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@atleta.com" style={{ width: "100%", height: 42, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13, outline: "none" }} />
        <button disabled={!ok} onClick={() => { toast.success("Invitación enviada ✓"); onClose(); }} style={{ marginTop: 14, width: "100%", height: 44, borderRadius: 10, background: ok ? "#111827" : "#CBD5E1", color: "#FFF", fontSize: 13, fontWeight: 600 }}>Enviar invitación</button>
      </div>
    </div>
  );
}

/** Shows the section's empty state for a coach who just finished onboarding; otherwise renders children. */
export function NewCoachGate({ section, children }: { section: EmptySection; children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "empty" | "full">("loading");
  const [invite, setInvite] = useState(false);
  useEffect(() => {
    setState(localStorage.getItem(NEW_KEY) === "1" && localStorage.getItem(doneKey(section)) !== "1" ? "empty" : "full");
  }, [section]);
  if (state === "loading") return <div style={{ minHeight: "100vh", background: "#F8FAFC" }} />;
  if (state === "full") return <>{children}</>;
  const c = CFG[section];
  const proceed = () => { localStorage.setItem(doneKey(section), "1"); setState("full"); };
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-background">
      <Sidebar active={c.nav} />
      <div className="flex min-h-screen flex-col">
        <TopBar title={c.top} />
        <main className="flex flex-1 items-center justify-center bg-background p-6">
          <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, minWidth: 420 }}>
            <EmptyState icon={c.icon} title={c.title} desc={c.desc} cta={c.cta} onCta={c.invite ? () => setInvite(true) : proceed} />
          </div>
        </main>
      </div>
      {invite && <InviteModal onClose={() => setInvite(false)} />}
    </div>
  );
}
