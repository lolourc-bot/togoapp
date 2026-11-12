import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { CoachAppBottomNav } from "@/components/togo/CoachAppBottomNav";
import { getCoachId } from "@/lib/programs";
import { supabase } from "@/lib/supabase";
import { fetchTeams, createTeam, type Team } from "@/lib/teams";

export const Route = createFileRoute("/coach-app/equipos")({
  head: () => ({ meta: [{ title: "Equipos · TOGO" }] }),
  component: CoachAppTeams,
});

function CoachAppTeams() {
  const navigate = useNavigate();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async (cid: string) => {
    const [t, { data: rows }] = await Promise.all([
      fetchTeams(cid),
      supabase.from("athletes").select("id, full_name").eq("coach_id", cid).eq("status", "active").order("full_name"),
    ]);
    setTeams(t);
    setAthletes((rows ?? []).map((r) => ({ id: r.id, name: r.full_name })));
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const cid = await getCoachId();
      if (!cid) { navigate({ to: "/coach-app/ingresar" }); return; }
      setCoachId(cid);
      await load(cid);
    })();
  }, []);

  const toggleMember = (id: string) => setNewMemberIds((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  const create = async () => {
    if (!coachId || !newName.trim()) return;
    setSaving(true);
    try {
      await createTeam(coachId, { name: newName.trim(), description: "", memberIds: newMemberIds, features: { planning: true, chat: true, achievements: true } });
      toast.success("Equipo creado ✓");
      setNewName("");
      setNewMemberIds([]);
      setShowForm(false);
      await load(coachId);
    } catch {
      toast.error("No se pudo crear el equipo");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PhoneFrame><div /></PhoneFrame>;

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto" style={{ overflowX: "hidden" }}>
      <div className="flex items-center" style={{ padding: "20px 20px 12px", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Equipos</h1>
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{teams.length} {teams.length === 1 ? "equipo" : "equipos"}</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} aria-label="Crear equipo" className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: "50%", background: "#111827", color: "#FFF", flexShrink: 0 }}>
          <Plus size={18} />
        </button>
      </div>

      {showForm ? (
        <div style={{ padding: "0 16px 16px" }}>
          <div className="flex flex-col" style={{ gap: 8, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Nuevo equipo</span>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
                <X size={16} color="#94A3B8" />
              </button>
            </div>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del equipo" style={{ height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 14, minWidth: 0, boxSizing: "border-box" }} />
            <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Miembros</p>
            <div className="flex flex-col" style={{ gap: 4, maxHeight: 180, overflowY: "auto" }}>
              {athletes.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94A3B8" }}>No tenés atletas cargados todavía.</p>
              ) : (
                athletes.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleMember(a.id)}
                    className="flex items-center"
                    style={{ gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E8F0", background: newMemberIds.includes(a.id) ? "#EFF6FF" : "#FFF", cursor: "pointer", textAlign: "left" }}
                  >
                    <span style={{ flex: 1, fontSize: 13, color: "#111827" }}>{a.name}</span>
                    {newMemberIds.includes(a.id) ? <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 700 }}>✓</span> : null}
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={create}
              disabled={saving || !newName.trim()}
              style={{ height: 42, borderRadius: 10, border: 0, background: "#111827", color: "#FFF", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving || !newName.trim() ? 0.6 : 1, marginTop: 4 }}
            >
              {saving ? "Creando…" : "Crear equipo"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col" style={{ padding: "0 16px 16px", gap: 8 }}>
        {teams.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", fontSize: 13, color: "#94A3B8" }}>
            Todavía no tenés equipos. Creá el primero con el botón +.
          </div>
        ) : (
          teams.map((t) => (
            <Link
              key={t.id}
              to="/coach-app/equipo/$teamId"
              params={{ teamId: t.id }}
              className="flex items-center"
              style={{ gap: 12, background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 16px" }}
            >
              <span className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: "50%", background: "#F1F5F9", fontSize: 13, fontWeight: 700, color: "#94A3B8", flexShrink: 0 }}>
                {t.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#111827" }}>{t.name}</span>
                <span style={{ display: "block", fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{t.members.length} {t.members.length === 1 ? "miembro" : "miembros"}</span>
              </span>
              <ChevronRight size={16} color="#CBD5E1" />
            </Link>
          ))
        )}
      </div>
      </div>

      <CoachAppBottomNav active="Equipos" />
    </PhoneFrame>
  );
}
