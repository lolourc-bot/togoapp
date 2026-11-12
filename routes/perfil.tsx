import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Building2, Camera, ChevronRight, Compass, Edit2, FileText, Globe, HelpCircle, Lock, LogOut, Phone, Ruler, Scale, Trash2, User, Users, X } from "lucide-react";
import { AthleteBottomNav, useHasCoach } from "@/components/togo/AthleteBottomNav";
import { useUserContext } from "@/lib/user-context";
import { useMyCoachRequest } from "@/components/togo/CoachPlanRequest";
import { MY_TEAMS } from "@/components/togo/TeamBlocks";
import { fetchAthleteProfile, updateAthleteProfile, deleteAthleteAccount, type AthleteProfile } from "@/lib/profile";
import { fetchAthleteProgress, computeProfileStats } from "@/lib/athlete-progress";
import { useAthleteAuth } from "@/hooks/useAthleteAuth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/perfil")({
  validateSearch: (search: Record<string, unknown>): { athleteId?: string } =>
    typeof search["athleteId"] === "string" ? { athleteId: search["athleteId"] as string } : {},
  head: () => ({
    meta: [
      { title: "Perfil · TOGO" },
      { name: "description", content: "Tu perfil de atleta en TOGO: datos personales, estadísticas y configuración." },
      { property: "og:title", content: "Perfil · TOGO" },
      { property: "og:description", content: "Configurá tu perfil y cuenta de atleta en TOGO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AthleteProfile,
});

type Profile = { nombre: string; apellido: string; nacimiento: string; altura: string; peso: string; especialidad: string; telefono: string };
const card: React.CSSProperties = { background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", margin: "0 16px 12px", overflow: "hidden" };
const inp: React.CSSProperties = { width: "100%", height: 42, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13, color: "#111827", background: "#FFF" };
const lbl: React.CSSProperties = { fontSize: 11, color: "#94A3B8", marginBottom: 4, display: "block" };

function age(d: string) {
  const b = new Date(d); if (isNaN(+b)) return "—";
  const n = new Date(); let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return `${a} años`;
}

function AthleteProfile() {
  const navigate = useNavigate();
  const { athleteId: athleteIdParam } = Route.useSearch();
  const { athlete } = useAthleteAuth();
  const athleteId = athleteIdParam ?? athlete?.id;
  const ctx = useUserContext();
  const hasCoach = useHasCoach();
  const myReq = useMyCoachRequest();
  const kind = athlete ? "coached_athlete" : ctx.type === "gym_member" && hasCoach ? "mixed" : ctx.type;
  const [editing, setEditing] = useState(false);
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [confirmDel, setConfirmDel] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [realStats, setRealStats] = useState<{ sessionsCount: number; weekStreak: number; prCount: number } | null>(null);
  const [p, setP] = useState<Profile>({ nombre: "", apellido: "", nacimiento: "", altura: "", peso: "", especialidad: "", telefono: "" });
  const [draft, setDraft] = useState(p);
  const [stravaConnected, setStravaConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!athleteId) return;
    fetchAthleteProfile(athleteId).then((prof) => {
      if (!prof) return;
      setProfile(prof);
      const [nombre, ...rest] = prof.fullName.split(" ");
      setP({ nombre: nombre ?? "", apellido: rest.join(" "), nacimiento: prof.birthdate ?? "", altura: prof.heightCm, peso: prof.weightKg, especialidad: "", telefono: prof.phone });
    });
    fetchAthleteProgress(athleteId).then((raw) => setRealStats(computeProfileStats(raw)));
    supabase.from("athlete_strava_connections").select("athlete_id").eq("athlete_id", athleteId).maybeSingle()
      .then(({ data }) => setStravaConnected(!!data));
  }, [athleteId]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("strava");
    if (result === "connected") { toast.success("Strava conectado ✓"); setStravaConnected(true); }
    else if (result === "error") toast.error("No se pudo conectar con Strava, probá de nuevo");
  }, []);

  const connectStrava = () => {
    if (!athleteId) return;
    const redirectUri = `${window.location.origin}/api/strava-callback`;
    const params = new URLSearchParams({
      client_id: import.meta.env["VITE_STRAVA_CLIENT_ID"],
      redirect_uri: redirectUri,
      response_type: "code",
      approval_prompt: "auto",
      scope: "activity:read_all",
      state: athleteId,
    });
    window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  };

  const disconnectStrava = async () => {
    if (!athleteId) return;
    await supabase.from("athlete_strava_connections").delete().eq("athlete_id", athleteId);
    setStravaConnected(false);
    toast.success("Strava desconectado");
  };

  const name = `${p.nombre} ${p.apellido}`.trim();
  const initials = (p.nombre[0] ?? "") + (p.apellido[0] ?? "");
  const team = MY_TEAMS[0];
  const coachName = profile?.coachName ?? myReq?.coach ?? "Sin coach asignado";
  const coachInitials = coachName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const badge = {
    coached_athlete: ["Con entrenador", "#EFF6FF", "#3B82F6"],
    gym_member: ["Socio", "#F0FDF4", "#16A34A"],
    mixed: ["Socio · Con entrenador", "#FFFBEB", "#D97706"],
    club_athlete: ["Atleta de club", "#FDF4FF", "#9333EA"],
    explorer: ["Explorando", "#F1F5F9", "#94A3B8"],
  }[kind];

  const stats = kind === "explorer"
    ? null
    : realStats
      ? [[String(realStats.sessionsCount), "sesiones"], [String(realStats.weekStreak), "sem. seguidas"], [String(realStats.prCount), "PRs"]]
      : [["—", "sesiones"], ["—", "sem. seguidas"], ["—", "PRs"]];

  const openEdit = () => { setDraft(p); setEditing(true); };
  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); };

  const Avatar = ({ size, cam }: { size: number; cam: number }) => (
    <label className="relative flex items-center justify-center" style={{ width: size, height: size, borderRadius: "50%", border: "3px solid #F1F5F9", background: "#F1F5F9", flexShrink: 0, cursor: "pointer" }}>
      {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : <span style={{ fontSize: size / 3, fontWeight: 700, color: "#94A3B8" }}>{initials}</span>}
      <span className="flex items-center justify-center" style={{ position: "absolute", bottom: -2, right: -2, width: cam, height: cam, borderRadius: "50%", background: "#111827" }}><Camera size={cam / 2} color="#FFF" /></span>
      <input type="file" accept="image/*" hidden onChange={pickPhoto} aria-label="Editar foto" />
    </label>
  );

  const rows: [React.ComponentType<{ size?: number; color?: string }>, string, string | null][] = [
    [User, "Edad", age(p.nacimiento)], [Ruler, "Altura", p.altura ? `${p.altura} cm` : null], [Scale, "Peso", p.peso ? `${p.peso} kg` : null],
    [Phone, "Teléfono", p.telefono || null],
  ];
  const conf: [React.ComponentType<{ size?: number; color?: string }>, string][] = [[Bell, "Notificaciones"], [Lock, "Cambiar contraseña"], [HelpCircle, "Ayuda y soporte"], [FileText, "Términos y privacidad"]];
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: e.target.value });

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div className="relative flex flex-col" style={{ width: 375, height: 812, backgroundColor: "#F8FAFC", borderRadius: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div className="flex-1 overflow-y-auto">
          {/* HEADER */}
          <div style={{ background: "#FFF", borderRadius: "0 0 20px 20px", padding: "44px 16px 24px", marginBottom: 12 }}>
            <div className="flex items-center" style={{ gap: 14 }}>
              <Avatar size={72} cam={22} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{name}</div>
                <span style={{ display: "inline-block", marginTop: 6, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, background: badge[1], color: badge[2] }}>{badge[0]}</span>
              </div>
              <button onClick={openEdit} aria-label="Editar perfil" style={{ alignSelf: "flex-start", background: "none", border: 0, cursor: "pointer" }}><Edit2 size={18} color="#CBD5E1" /></button>
            </div>
            <div style={{ borderTop: "1px solid #F1F5F9", marginTop: 14, paddingTop: 14 }}>
              {kind === "coached_athlete" && (
                <div className="flex items-center" style={{ gap: 10 }}>
                  <span className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "50%", background: "#F1F5F9", fontSize: 10, fontWeight: 600, color: "#94A3B8" }}>{coachInitials}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{coachName}</div></div>
                  <button onClick={() => navigate({ to: "/hoy", search: athleteId ? { athleteId } : {} })} style={{ fontSize: 11, color: "#3B82F6", background: "none", border: 0, cursor: "pointer" }}>Ver plan</button>
                </div>
              )}
              {kind === "gym_member" && (
                <div className="flex items-center" style={{ gap: 10 }}>
                  <Building2 size={14} color="#94A3B8" /><span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#374151" }}>CrossFit Palermo</span>
                  <span style={{ fontSize: 10, background: "#EFF6FF", color: "#3B82F6", borderRadius: 20, padding: "2px 8px" }}>Mensual</span>
                </div>
              )}
              {kind === "mixed" && (
                <div className="flex flex-col" style={{ gap: 8 }}>
                  <div className="flex items-center" style={{ gap: 10 }}><Building2 size={14} color="#94A3B8" /><span style={{ fontSize: 12, color: "#374151" }}>CrossFit Palermo</span></div>
                  <div className="flex items-center" style={{ gap: 10 }}><User size={14} color="#94A3B8" /><span style={{ fontSize: 12, color: "#374151" }}>{coachName}</span></div>
                </div>
              )}
              {kind === "club_athlete" && (
                <div className="flex items-center" style={{ gap: 10 }}>
                  <Users size={14} color="#94A3B8" />
                  <span style={{ flex: 1, fontSize: 12 }}><span style={{ fontWeight: 600, color: "#374151" }}>{team?.name ?? "Sin equipo"}</span><span style={{ color: "#94A3B8" }}> · {team?.club ?? "Club"}</span></span>
                </div>
              )}
              {kind === "explorer" && (
                <div className="flex items-center" style={{ gap: 10 }}><Compass size={14} color="#94A3B8" /><span style={{ flex: 1, fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>Explorando el marketplace</span></div>
              )}
            </div>
          </div>

          {stats && (
            <div className="flex" style={card}>
              {stats.map(([v, l], i) => (
                <div key={l} style={{ flex: 1, padding: "14px 0", textAlign: "center", borderRight: i < 2 ? "1px solid #F1F5F9" : "none" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{v}</div>
                  <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
          )}

          <div style={card}>
            <div className="flex items-center" style={{ padding: "14px 16px", borderBottom: "1px solid #F8FAFC" }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#111827" }}>Datos personales</span>
              <button onClick={openEdit} style={{ fontSize: 11, color: "#3B82F6", background: "none", border: 0, cursor: "pointer" }}>Editar</button>
            </div>
            {rows.map(([Icon, l, v], i) => (
              <div key={l} className="flex items-center" style={{ padding: "12px 16px", gap: 12, borderBottom: i < rows.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                <Icon size={14} color="#CBD5E1" />
                <span style={{ width: 80, fontSize: 12, color: "#94A3B8" }}>{l}</span>
                <span style={{ flex: 1, fontSize: 12, color: v ? "#374151" : "#CBD5E1", fontStyle: v ? "normal" : "italic" }}>{v ?? "No cargado"}</span>
              </div>
            ))}
          </div>

          {kind !== "explorer" ? (
            <div style={card}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #F8FAFC", fontSize: 13, fontWeight: 700, color: "#111827" }}>Conexiones</div>
              <div className="flex items-center" style={{ padding: "14px 16px", gap: 12 }}>
                <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "50%", background: "#FFF1EC", flexShrink: 0, fontSize: 14, fontWeight: 700, color: "#FC4C02" }}>S</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827" }}>Strava</span>
                  <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>
                    {stravaConnected === null ? "Cargando…" : stravaConnected ? "Conectado — tus actividades completadas se reflejan en TOGO" : "Conectá tu cuenta para que tus sesiones de campo se marquen solas"}
                  </span>
                </span>
                {stravaConnected === null ? null : stravaConnected ? (
                  <button onClick={disconnectStrava} style={{ fontSize: 11, fontWeight: 600, color: "#DC2626", background: "none", border: 0, cursor: "pointer", flexShrink: 0 }}>Desconectar</button>
                ) : (
                  <button onClick={connectStrava} style={{ fontSize: 11, fontWeight: 600, color: "#FC4C02", background: "none", border: 0, cursor: "pointer", flexShrink: 0 }}>Conectar</button>
                )}
              </div>
            </div>
          ) : null}

          <div style={card}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #F8FAFC", fontSize: 13, fontWeight: 700, color: "#111827" }}>Configuración</div>
            {conf.map(([Icon, l], i) => (
              <button key={l} onClick={l === "Notificaciones" ? () => navigate({ to: "/ajustes-notificaciones" }) : l === "Términos y privacidad" ? () => navigate({ to: "/legal" }) : undefined} className="flex items-center" style={{ width: "100%", padding: "14px 16px", gap: 12, background: "none", border: 0, borderBottom: i < conf.length - 1 ? "1px solid #F8FAFC" : "none", cursor: l === "Notificaciones" || l === "Términos y privacidad" ? "pointer" : "default", textAlign: "left" }}>
                <Icon size={16} color="#CBD5E1" /><span style={{ flex: 1, fontSize: 13, color: "#374151" }}>{l}</span><ChevronRight size={14} color="#CBD5E1" />
              </button>
            ))}
          </div>

          <div className="flex flex-col" style={{ gap: 8, padding: "0 16px", marginBottom: 32 }}>
            <button onClick={() => supabase.auth.signOut().finally(() => navigate({ to: "/ingresar-atleta" }))} className="flex items-center justify-center" style={{ height: 48, gap: 8, background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, cursor: "pointer" }}>
              <LogOut size={16} color="#374151" /><span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Cerrar sesión</span>
            </button>
            <button onClick={() => setConfirmDel(true)} className="flex items-center justify-center" style={{ height: 48, gap: 8, background: "#FFF", border: "1px solid #FEE2E2", borderRadius: 12, cursor: "pointer" }}>
              <Trash2 size={16} color="#EF4444" /><span style={{ fontSize: 14, fontWeight: 600, color: "#EF4444" }}>Eliminar cuenta</span>
            </button>
          </div>
        </div>

        {editing && (
          <div className="absolute inset-0 flex flex-col justify-end" style={{ background: "rgba(17,24,39,0.5)", zIndex: 200 }} onClick={() => setEditing(false)}>
            <div className="flex flex-col" style={{ height: "85%", background: "#FFF", borderRadius: "20px 20px 0 0" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ width: 36, height: 4, background: "#E2E8F0", borderRadius: 2, margin: "12px auto 0" }} />
              <div className="flex items-center" style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "#111827" }}>Editar perfil</span>
                <button onClick={() => setEditing(false)} aria-label="Cerrar" style={{ background: "none", border: 0, cursor: "pointer" }}><X size={20} color="#CBD5E1" /></button>
              </div>
              <div className="flex flex-col" style={{ flex: 1, padding: 20, gap: 14, overflowY: "auto" }}>
                <div style={{ alignSelf: "center" }}><Avatar size={64} cam={20} /></div>
                <div className="grid grid-cols-2" style={{ gap: 10 }}>
                  <div><span style={lbl}>Nombre</span><input style={inp} value={draft.nombre} onChange={set("nombre")} /></div>
                  <div><span style={lbl}>Apellido</span><input style={inp} value={draft.apellido} onChange={set("apellido")} /></div>
                </div>
                <div><span style={lbl}>Fecha de nacimiento</span><input type="date" style={inp} value={draft.nacimiento} onChange={set("nacimiento")} /></div>
                <div className="grid grid-cols-2" style={{ gap: 10 }}>
                  <div><span style={lbl}>{units === "metric" ? "Altura (cm)" : "Altura (ft)"}</span><input type="number" style={inp} value={draft.altura} onChange={set("altura")} /></div>
                  <div><span style={lbl}>{units === "metric" ? "Peso (kg)" : "Peso (lb)"}</span><input type="number" style={inp} value={draft.peso} onChange={set("peso")} /></div>
                </div>
                <div className="flex items-center" style={{ gap: 10 }}>
                  <Globe size={14} color="#CBD5E1" />
                  <span style={{ flex: 1, fontSize: 13, color: "#374151" }}>Sistema de unidades</span>
                  <div className="flex" style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                    {(["metric", "imperial"] as const).map((u) => (
                      <button key={u} onClick={() => setUnits(u)} style={{ padding: "6px 14px", fontSize: 12, color: units === u ? "#FFF" : "#374151", background: units === u ? "#111827" : "#FFF", border: 0, cursor: "pointer", transition: "background 0.2s ease, color 0.2s ease" }}>
                        {u === "metric" ? "Métrico" : "Imperial"}
                      </button>
                    ))}
                  </div>
                </div>
                <div><span style={lbl}>Teléfono (opcional)</span><input style={inp} value={draft.telefono} onChange={set("telefono")} /></div>
              </div>
              <div style={{ padding: "16px 20px", borderTop: "1px solid #F1F5F9" }}>
                <button
                  onClick={() => {
                    setP(draft);
                    setEditing(false);
                    if (athleteId) {
                      updateAthleteProfile(athleteId, {
                        fullName: `${draft.nombre} ${draft.apellido}`.trim(),
                        birthdate: draft.nacimiento || null,
                        heightCm: draft.altura,
                        weightKg: draft.peso,
                        phone: draft.telefono,
                      }).catch(() => toast.error("No se pudo guardar el perfil"));
                    }
                  }}
                  style={{ width: "100%", height: 48, background: "#111827", color: "#FFF", borderRadius: 12, fontSize: 15, fontWeight: 600, border: 0, cursor: "pointer" }}
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDel && (
          <div className="absolute inset-0 flex flex-col justify-end" style={{ background: "rgba(17,24,39,0.5)", zIndex: 200 }} onClick={() => setConfirmDel(false)}>
            <div style={{ background: "#FFF", borderRadius: "20px 20px 0 0", padding: "24px 20px 28px" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", textAlign: "center" }}>¿Querés eliminar tu cuenta?</div>
              <div style={{ fontSize: 13, color: "#64748B", textAlign: "center", marginTop: 8 }}>Esta acción es permanente y eliminará todos tus datos.</div>
              <div className="flex flex-col" style={{ gap: 8, marginTop: 20 }}>
                <button onClick={() => setConfirmDel(false)} style={{ height: 46, borderRadius: 12, border: "1px solid #E2E8F0", background: "#FFF", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}>Cancelar</button>
                <button
                  onClick={() => {
                    if (!athleteId) { navigate({ to: "/ingresar-atleta" }); return; }
                    deleteAthleteAccount(athleteId)
                      .then(() => supabase.auth.signOut())
                      .then(() => navigate({ to: "/ingresar-atleta" }))
                      .catch(() => toast.error("No se pudo eliminar la cuenta"));
                  }}
                  style={{ height: 46, borderRadius: 12, border: 0, background: "#EF4444", fontSize: 14, fontWeight: 500, color: "#FFF", cursor: "pointer" }}
                >
                  Eliminar cuenta
                </button>
              </div>
            </div>
          </div>
        )}

        <AthleteBottomNav active="Perfil" />
      </div>
    </div>
  );
}
