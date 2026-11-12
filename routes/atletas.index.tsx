import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/togo/Sidebar";
import { TopBar } from "@/components/togo/TopBar";
import { Plus, Search, ChevronRight, MoreVertical, Pause, Play, Trash2, Mail, KeyRound } from "lucide-react";
import { resendAthleteInvite, sendAthletePasswordReset } from "@/lib/athlete-invites";
import { resyncBillingForCurrentCoach } from "@/lib/billing-sync";

const FREE_TIER_MAX_ATHLETES = 3;

export const Route = createFileRoute("/atletas/")({
  component: AtletasPage,
});

export interface Athlete {
  id: string;
  coach_id: string;
  full_name: string;
  level: string | null;
  created_at: string;
  email?: string | null;
  auth_user_id?: string | null;
  status?: "active" | "paused";
}

function AtletasPage() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLevel, setNewLevel] = useState("intermedio");
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "paused" | "invited" | "all">("active");
  const [sendingFor, setSendingFor] = useState<string | null>(null);

  const fetchAthletes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("athletes")
      .select("*")
      .eq("coach_id", session.user.id)
      .order("created_at", { ascending: false });
    setAthletes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAthletes(); }, []);

  const addAthlete = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }
    const coachId = session.user.id;

    const { data: activeCount } = await supabase.rpc("coach_athlete_count", { target_coach_id: coachId });
    const { data: sub } = await supabase.from("coach_subscriptions").select("status").eq("coach_id", coachId).maybeSingle();
    const hasPaidPlan = sub?.status === "active";
    if (Number(activeCount ?? 0) >= FREE_TIER_MAX_ATHLETES && !hasPaidPlan) {
      setSaving(false);
      toast.error("Llegaste al límite del plan gratis (3 atletas) — elegí un plan para seguir agregando.", {
        action: { label: "Ver planes", onClick: () => navigate({ to: "/configuracion", search: { tab: "Suscripción" } }) },
      });
      return;
    }

    await supabase.from("athletes").insert({
      coach_id: coachId,
      full_name: newName.trim(),
      level: newLevel,
      email: newEmail.trim() || null,
    });
    setNewName("");
    setNewEmail("");
    setNewLevel("intermedio");
    setShowForm(false);
    setSaving(false);
    fetchAthletes();
    resyncBillingForCurrentCoach(coachId);
  };

  const togglePause = async (a: Athlete) => {
    setOpenMenuId(null);
    const nextStatus = a.status === "paused" ? "active" : "paused";
    const { error } = await supabase.from("athletes").update({ status: nextStatus }).eq("id", a.id);
    if (error) { toast.error("No se pudo actualizar el atleta"); return; }
    setAthletes((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: nextStatus } : x)));
    toast.success(nextStatus === "paused" ? "Atleta pausado" : "Atleta reactivado");
    resyncBillingForCurrentCoach(a.coach_id);
  };

  const deleteAthlete = async (id: string) => {
    setConfirmDeleteId(null);
    const toDelete = athletes.find((x) => x.id === id);
    const { error } = await supabase.from("athletes").delete().eq("id", id);
    if (error) { toast.error("No se pudo eliminar el atleta"); return; }
    setAthletes((prev) => prev.filter((x) => x.id !== id));
    toast.success("Atleta eliminado");
    if (toDelete) resyncBillingForCurrentCoach(toDelete.coach_id);
  };

  const resendInvite = async (a: Athlete) => {
    if (!a.email) return;
    setOpenMenuId(null);
    setSendingFor(a.id);
    try {
      await resendAthleteInvite(a.email);
      toast.success(`Invitación reenviada a ${a.email}`);
    } catch {
      toast.error("No se pudo reenviar la invitación");
    } finally {
      setSendingFor(null);
    }
  };

  const resetPassword = async (a: Athlete) => {
    if (!a.email) return;
    setOpenMenuId(null);
    setSendingFor(a.id);
    try {
      await sendAthletePasswordReset(a.email);
      toast.success(`Mail para restablecer contraseña enviado a ${a.email}`);
    } catch {
      toast.error("No se pudo enviar el mail");
    } finally {
      setSendingFor(null);
    }
  };

  const isInvited = (a: Athlete) => !!a.email && !a.auth_user_id;

  const activeCount = athletes.filter(a => (a.status ?? "active") === "active").length;
  const pausedCount = athletes.filter(a => a.status === "paused").length;
  const invitedCount = athletes.filter(isInvited).length;

  const filtered = athletes
    .filter(a => a.full_name.toLowerCase().includes(search.toLowerCase()))
    .filter(a => {
      if (statusFilter === "all") return true;
      if (statusFilter === "paused") return a.status === "paused";
      if (statusFilter === "invited") return isInvited(a);
      return (a.status ?? "active") === "active";
    })
    .sort((a, b) => (a.status === "paused" ? 1 : 0) - (b.status === "paused" ? 1 : 0));

  const levelLabel: Record<string, string> = {
    principiante: "Principiante",
    intermedio: "Intermedio",
    avanzado: "Avanzado",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <Sidebar active="Atletas" />
      <div className="flex min-h-screen flex-col">
        <TopBar title="Atletas" />
        <main className="flex-1 p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Mis atletas</h1>
              <p className="text-sm text-muted-foreground mt-1">{filtered.length} atleta{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "#111827" }}>
              <Plus size={16} /> Agregar atleta
            </button>
          </div>

          {/* Filtro por estado */}
          <div className="flex items-center gap-1 mb-4" style={{ width: "fit-content", backgroundColor: "#F1F5F9", borderRadius: 10, padding: 3 }}>
            {([
              ["active", `Activos (${activeCount})`],
              ["paused", `Pausados (${pausedCount})`],
              ["invited", `Invitados (${invitedCount})`],
              ["all", `Todos (${athletes.length})`],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setStatusFilter(value)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{
                  backgroundColor: statusFilter === value ? "#FFFFFF" : "transparent",
                  color: statusFilter === value ? "#111827" : "#64748B",
                  boxShadow: statusFilter === value ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  border: 0, cursor: "pointer",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar atleta..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background outline-none"
              style={{ maxWidth: 320 }} />
          </div>

          {/* Formulario nuevo atleta */}
          {showForm && (
            <div className="mb-6 p-4 border border-border rounded-xl bg-surface" style={{ maxWidth: 480 }}>
              <h3 className="text-sm font-semibold text-foreground mb-4">Nuevo atleta</h3>
              <div className="flex flex-col gap-3">
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none bg-background" />
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="Email (opcional, para que pueda crear su cuenta)"
                  type="email"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none bg-background" />
                <select value={newLevel} onChange={e => setNewLevel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none bg-background">
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
                <div className="flex gap-2 mt-1">
                  <button onClick={addAthlete} disabled={saving || !newName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                    style={{ backgroundColor: "#111827", opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                  <button onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                {search
                  ? "No hay resultados para tu búsqueda"
                  : statusFilter === "paused"
                    ? "No tenés atletas pausados"
                    : statusFilter === "invited"
                      ? "No tenés invitaciones pendientes"
                      : statusFilter === "active"
                        ? athletes.length > 0 ? "No tenés atletas activos" : "Todavía no tenés atletas. ¡Agregá el primero!"
                        : "Todavía no tenés atletas. ¡Agregá el primero!"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(a => {
                const paused = a.status === "paused";
                return (
                <div key={a.id}
                  className="flex items-center gap-4 p-4 border border-border rounded-xl bg-surface transition-colors"
                  style={{ opacity: paused ? 0.6 : 1 }}>
                  <button
                    onClick={() => navigate({ to: "/atletas/$athleteId", params: { athleteId: a.id } })}
                    className="flex flex-1 min-w-0 items-center gap-4 text-left hover:opacity-80"
                    style={{ background: "none", border: 0, cursor: "pointer" }}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-border text-sm font-semibold text-foreground shrink-0">
                      {a.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.full_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{levelLabel[a.level ?? ""] ?? a.level}</p>
                    </div>
                  </button>
                  {paused ? (
                    <span className="text-xs font-medium shrink-0" style={{ padding: "3px 8px", borderRadius: 999, backgroundColor: "#F1F5F9", color: "#64748B" }}>
                      Pausado
                    </span>
                  ) : a.email ? (
                    <span
                      className="text-xs font-medium shrink-0"
                      style={{
                        padding: "3px 8px", borderRadius: 999,
                        backgroundColor: a.auth_user_id ? "#DCFCE7" : "#F1F5F9",
                        color: a.auth_user_id ? "#166534" : "#64748B",
                      }}
                    >
                      {a.auth_user_id ? "Cuenta activa" : "Invitado"}
                    </span>
                  ) : null}
                  <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                  <div className="relative shrink-0">
                    <button
                      aria-label={`Más acciones para ${a.full_name}`}
                      onClick={() => setOpenMenuId((id) => (id === a.id ? null : a.id))}
                      style={{ background: "none", border: 0, cursor: "pointer", padding: 4, display: "flex" }}>
                      <MoreVertical size={16} className="text-muted-foreground" />
                    </button>
                    {openMenuId === a.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 z-20 flex flex-col border border-border rounded-lg bg-surface shadow-lg" style={{ top: "100%", marginTop: 4, minWidth: 220 }}>
                          {isInvited(a) && (
                            <button
                              onClick={() => resendInvite(a)}
                              disabled={sendingFor === a.id}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent text-left">
                              <Mail size={14} />
                              {sendingFor === a.id ? "Enviando…" : "Reenviar invitación"}
                            </button>
                          )}
                          {a.auth_user_id && (
                            <button
                              onClick={() => resetPassword(a)}
                              disabled={sendingFor === a.id}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent text-left">
                              <KeyRound size={14} />
                              {sendingFor === a.id ? "Enviando…" : "Restablecer contraseña"}
                            </button>
                          )}
                          <button
                            onClick={() => togglePause(a)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent text-left">
                            {paused ? <Play size={14} /> : <Pause size={14} />}
                            {paused ? "Reactivar" : "Pausar"}
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); setConfirmDeleteId(a.id); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                            style={{ color: "#EF4444" }}>
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );})}
            </div>
          )}
        </main>
      </div>

      {confirmDeleteId && (
        <div role="presentation" onClick={() => setConfirmDeleteId(null)} className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} className="bg-surface border border-border rounded-xl p-5" style={{ width: 340 }}>
            <p className="text-sm font-semibold text-foreground">¿Eliminar este atleta?</p>
            <p className="text-xs text-muted-foreground mt-1">Se borran también sus sesiones y datos. Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg">Cancelar</button>
              <button onClick={() => deleteAthlete(confirmDeleteId)} className="px-3 py-2 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: "#EF4444" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Exports requeridos por atletas.$athleteId.tsx

export type Load = { date: string; value: number; type: string };
export const ATHLETES: Athlete[] = [];
