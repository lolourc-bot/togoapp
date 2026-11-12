import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { CoachAppBottomNav } from "@/components/togo/CoachAppBottomNav";
import { getCoachId } from "@/lib/programs";
import { supabase } from "@/lib/supabase";
import { resendAthleteInvite } from "@/lib/athlete-invites";

export const Route = createFileRoute("/coach-app/")({
  head: () => ({
    meta: [{ title: "Mis atletas · TOGO" }],
  }),
  component: CoachAppHome,
});

const FREE_TIER_MAX_ATHLETES = 3;

type AthleteRow = { id: string; fullName: string; status: string; todaySession: string | null };

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CoachAppHome() {
  const navigate = useNavigate();
  const [coachId, setCoachId] = useState<string | null | undefined>(undefined);
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLevel, setNewLevel] = useState("intermedio");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCoachId().then((cid) => {
      setCoachId(cid);
      if (!cid) { navigate({ to: "/coach-app/ingresar" }); setLoading(false); return; }
      load(cid);
    });
  }, []);

  const load = async (cid: string) => {
    const [{ data: rows }, { data: sessions }] = await Promise.all([
      supabase.from("athletes").select("id, full_name, status").eq("coach_id", cid).order("full_name", { ascending: true }),
      supabase.from("athlete_sessions").select("athlete_id, name").eq("coach_id", cid).eq("date", todayKey()).neq("status", "draft"),
    ]);
    const todayByAthlete = new Map((sessions ?? []).map((s) => [s.athlete_id, s.name as string]));
    setAthletes((rows ?? []).map((r) => ({ id: r.id, fullName: r.full_name, status: r.status, todaySession: todayByAthlete.get(r.id) ?? null })));
    setLoading(false);
  };

  const addAthlete = async () => {
    if (!newName.trim() || !coachId) return;
    setSaving(true);
    try {
      const { data: activeCount } = await supabase.rpc("coach_athlete_count", { target_coach_id: coachId });
      const { data: sub } = await supabase.from("coach_subscriptions").select("status").eq("coach_id", coachId).maybeSingle();
      const hasPaidPlan = sub?.status === "active";
      if (Number(activeCount ?? 0) >= FREE_TIER_MAX_ATHLETES && !hasPaidPlan) {
        toast.error("Llegaste al límite del plan gratis (3 atletas) — elegí un plan desde la compu para seguir agregando.");
        return;
      }
      const email = newEmail.trim();
      const { error } = await supabase.from("athletes").insert({ coach_id: coachId, full_name: newName.trim(), level: newLevel, email: email || null });
      if (error) { toast.error("No se pudo agregar el atleta"); return; }
      if (email) {
        try { await resendAthleteInvite(email); } catch { /* el atleta queda creado igual; puede reintentarse desde la compu */ }
      }
      toast.success(email ? "Atleta agregado — invitación enviada ✓" : "Atleta agregado ✓");
      setNewName("");
      setNewEmail("");
      setNewLevel("intermedio");
      setShowForm(false);
      load(coachId);
    } finally {
      setSaving(false);
    }
  };

  if (coachId === undefined || loading) return <PhoneFrame><div /></PhoneFrame>;

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto" style={{ overflowX: "hidden" }}>
        <div className="flex items-center" style={{ padding: "20px 20px 12px", position: "sticky", top: 0, background: "#F8FAFC", zIndex: 10, gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Mis atletas</h1>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{athletes.length} {athletes.length === 1 ? "atleta" : "atletas"}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            aria-label="Agregar atleta"
            className="flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: "50%", background: "#111827", color: "#FFF", flexShrink: 0 }}
          >
            <Plus size={18} />
          </button>
        </div>

        {showForm ? (
          <div style={{ padding: "0 16px 16px" }}>
            <div className="flex flex-col" style={{ gap: 8, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Nuevo atleta</span>
                <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
                  <X size={16} color="#94A3B8" />
                </button>
              </div>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre completo" style={{ height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 14, minWidth: 0, boxSizing: "border-box" }} />
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="Email (opcional, para invitarlo)" style={{ height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 14, minWidth: 0, boxSizing: "border-box" }} />
              <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)} style={{ height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 14 }}>
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
              <button
                type="button"
                onClick={addAthlete}
                disabled={saving || !newName.trim()}
                style={{ height: 42, borderRadius: 10, border: 0, background: "#111827", color: "#FFF", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving || !newName.trim() ? 0.6 : 1 }}
              >
                {saving ? "Guardando…" : "Agregar"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col" style={{ padding: "0 16px 16px", gap: 8 }}>
          {athletes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", fontSize: 13, color: "#94A3B8" }}>
              Todavía no tenés atletas cargados.
            </div>
          ) : (
            athletes.map((a) => (
              <Link
                key={a.id}
                to="/coach-app/atleta/$athleteId"
                params={{ athleteId: a.id }}
                className="flex items-center"
                style={{ gap: 12, background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 16px", opacity: a.status === "paused" ? 0.6 : 1 }}
              >
                <span className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: "50%", background: "#F1F5F9", fontSize: 13, fontWeight: 700, color: "#94A3B8", flexShrink: 0 }}>
                  {a.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#111827" }}>{a.fullName}</span>
                  <span style={{ display: "block", fontSize: 11, color: a.todaySession ? "#16A34A" : "#94A3B8", marginTop: 2 }}>
                    {a.todaySession ?? "Sin sesión hoy"}
                  </span>
                </span>
                <ChevronRight size={16} color="#CBD5E1" />
              </Link>
            ))
          )}
        </div>
      </div>

      <CoachAppBottomNav active="Atletas" />
    </PhoneFrame>
  );
}
