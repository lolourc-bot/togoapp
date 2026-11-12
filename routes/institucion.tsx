import { toast as sonnerToast } from "sonner";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { InstOnboarding } from "@/components/togo/Onboarding";
import {
  Header, SearchBox, DotMenu, Modal, ModalFooter, Field, Av,
  outlineBtn, darkBtn, inputStyle,
} from "@/components/togo/InstScreens";
import { supabase } from "@/lib/supabase";
import { fetchMyInstitution, fetchInstitutionAccessForUser, createInstitution, updateInstitution, uploadInstitutionLogo, type Institution, type InstitutionMode } from "@/lib/institutions";
import { fetchInstitutionNotificationPrefs, setInstitutionNotificationPrefs } from "@/lib/institution-notifications";
import {
  fetchInstitutionStaff, inviteInstitutionStaff, updateInstitutionStaffPermission, revokeInstitutionStaff,
  type InstitutionStaffMember, type StaffPermission, type StaffStatus,
} from "@/lib/institution-staff";
import {
  fetchInstitutionPaymentAccountStatus, startInstitutionStripeConnectOnboarding, createInstitutionStripeExpressDashboardLink,
  refreshInstitutionStripeAccountStatus, startInstitutionMercadoPagoOAuth, type PaymentAccountStatus,
} from "@/lib/institution-payment-accounts";
import { setMemberPlanPrice, fetchInstitutionMemberCharges, type InstitutionMemberCharge } from "@/lib/institution-member-billing";
import {
  startGoogleCalendarOAuth, disconnectGoogleCalendar, fetchInstitutionIntegrationsStatus, type IntegrationsStatus,
  syncClassToGoogleCalendar, deleteClassFromGoogleCalendar, syncPracticeToGoogleCalendar, deletePracticeFromGoogleCalendar,
} from "@/lib/google-calendar";
import { fetchWhatsAppStatus, sendTestWhatsAppMessage } from "@/lib/whatsapp";
import { fetchInstitutionCoaches, createInstitutionCoach, updateInstitutionCoach, deleteInstitutionCoach, type InstitutionCoach } from "@/lib/institution-coaches";
import { fetchInstitutionMembers, createInstitutionMember, updateInstitutionMember, deleteInstitutionMember, type InstitutionMember } from "@/lib/institution-members";
import { fetchInstitutionTeams, createInstitutionTeam, updateInstitutionTeam, deleteInstitutionTeam, type InstitutionTeam } from "@/lib/institution-teams";
import { fetchInstitutionClasses, createInstitutionClasses, updateInstitutionClass, deleteInstitutionClass, type InstitutionClass, type ClassInput } from "@/lib/institution-classes";
import {
  fetchClassBookings, createClassBooking, updateClassBooking, deleteClassBooking, markAllPresent, fetchBookingCountsForClasses, type ClassBooking,
} from "@/lib/institution-class-bookings";
import { CLASS_TYPES, type ClassType, iso, endTime, DAY_ABBR, dayLabel, initials } from "@/lib/gym-classes";
import { fetchInstitutionPractices, createInstitutionPractices, updateInstitutionPractice, deleteInstitutionPractice, type InstitutionPractice, type PracticeInput } from "@/lib/institution-practices";
import { fetchPracticeAttendance, setPracticeAttendance, markAllPracticeAttendance, fetchAttendanceCountsForPractices } from "@/lib/institution-practice-attendance";
import { INSTITUTION_PRICING_TIERS, resolveInstitutionTier, type InstitutionTierKey } from "@/lib/institution-billing-pricing";
import { startInstitutionStripeCheckout, createInstitutionStripePortalSession, changeInstitutionStripeTier } from "@/lib/institution-billing-stripe";
import { startInstitutionMpSubscription, cancelInstitutionMpSubscription, changeInstitutionMpTier } from "@/lib/institution-billing-mp";
import { resyncInstitutionBilling } from "@/lib/institution-billing-sync";
import {
  LayoutDashboard, Users2, Dumbbell, CalendarDays, BarChart2, CreditCard, Settings2,
  LogOut, CheckCircle2, Trophy, Users, Plus, Shield, Clock, MapPin, User, X, Edit2, ChevronDown, CheckSquare, Activity, UserPlus, ChevronLeft, ChevronRight, Trash2, Upload,
} from "lucide-react";

export const Route = createFileRoute("/institucion")({
  head: () => ({
    meta: [
      { title: "Panel Institución — TOGO" },
      { name: "description", content: "Administrá tu club deportivo o gimnasio en TOGO: entrenadores y miembros." },
      { property: "og:title", content: "Panel Institución — TOGO" },
      { property: "og:description", content: "Panel para clubes deportivos y gimnasios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstitucionPage,
});

const cardStyle: React.CSSProperties = { background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0" };
const LABEL_STYLE: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 };

function Toast({ text }: { text: string }) {
  return <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#111827", color: "#FFF", fontSize: 12, padding: "10px 16px", borderRadius: 10, zIndex: 50 }}>{text}</div>;
}

function Kpi({ label, Icon, value }: { label: string; Icon: typeof Users2; value: string | number }) {
  return (
    <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#94A3B8" }}>{label}</span>
        <Icon size={15} color="#CBD5E1" style={{ marginLeft: "auto" }} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function GateMessage({ text, linkTo, linkLabel }: { text: string; linkTo: string; linkLabel: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 12, textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "#374151", maxWidth: 360 }}>{text}</p>
      <Link to={linkTo as "/ingresar"} style={{ background: "#111827", color: "#FFF", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>{linkLabel}</Link>
    </div>
  );
}

function TypeSelector({ onChoose }: { onChoose: (m: InstitutionMode) => void }) {
  const opts = [
    { m: "club" as InstitutionMode, Icon: Trophy, title: "Club deportivo", btn: "Elegir Club",
      desc: "Atletismo, fútbol, natación, remo, rugby… Los entrenadores diseñan planes y los atletas los ejecutan de forma independiente.",
      feats: ["Planificación remota", "Métricas de completado"] },
    { m: "gym" as InstitutionMode, Icon: Dumbbell, title: "Gimnasio / Centro deportivo", btn: "Elegir Gimnasio",
      desc: "Clases presenciales, membresías, turnos. Los socios asisten físicamente.",
      feats: ["Control de asistencia presencial", "Membresías"] },
  ];
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", textAlign: "center" }}>¿Cómo es tu organización?</h1>
      <p style={{ fontSize: 14, color: "#94A3B8", textAlign: "center", maxWidth: 480, margin: "8px auto 40px" }}>Elegí el tipo que mejor describe cómo trabajás.</p>
      <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
        {opts.map((o) => (
          <div key={o.m} onClick={() => onChoose(o.m)} className="hover:!border-[#111827]" style={{ background: "#FFF", borderRadius: 16, border: "2px solid #E2E8F0", padding: "32px 28px", width: 280, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, transition: "border-color .15s" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "#F1F5F9", display: "grid", placeItems: "center" }}><o.Icon size={36} color="#111827" /></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", textAlign: "center" }}>{o.title}</div>
            <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", lineHeight: 1.6 }}>{o.desc}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "stretch", marginTop: 4 }}>
              {o.feats.map((f) => <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#374151" }}><CheckCircle2 size={12} color="#22C55E" /> {f}</div>)}
            </div>
            <button style={{ background: "#111827", color: "#FFF", borderRadius: 10, height: 44, width: "100%", fontSize: 13, fontWeight: 600, border: 0, cursor: "pointer", marginTop: 8 }}>{o.btn}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachModal({ initial, onClose, onSave }: { initial: InstitutionCoach | null; onClose: () => void; onSave: (input: { fullName: string; email: string | null; specialty: string | null }) => Promise<void> }) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      title={initial ? "Editar entrenador" : "Agregar entrenador"}
      onClose={onClose}
      footer={<ModalFooter onCancel={onClose} ok={saving ? "Guardando…" : "Guardar"} disabled={!fullName.trim() || saving} onOk={async () => {
        setSaving(true);
        await onSave({ fullName: fullName.trim(), email: email.trim() || null, specialty: specialty.trim() || null });
      }} />}
    >
      <Field label="Nombre completo"><input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
      <Field label="Email (opcional)"><input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Especialidad (opcional)"><input style={inputStyle} value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ej. Fuerza, Yoga, Running..." /></Field>
    </Modal>
  );
}

/** No hay tramo gratis para instituciones: hace falta un plan activo para agregar entrenadores o miembros. */
function useInstitutionPlanGate(institutionId: string) {
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("institution_subscriptions").select("status").eq("institution_id", institutionId).maybeSingle().then(({ data }) => {
      setHasActivePlan(data?.status === "active");
      setLoading(false);
    });
  }, [institutionId]);
  return { hasActivePlan, loading };
}

function requirePlanOrRedirect(hasActivePlan: boolean, notify: (m: string) => void, goToSuscripcion: () => void): boolean {
  if (hasActivePlan) return true;
  notify("Elegí un plan en Configuración para agregar entrenadores o miembros.");
  goToSuscripcion();
  return false;
}

function CoachesPanel({ institutionId, institutionMode, notify, goToSuscripcion, canWrite }: { institutionId: string; institutionMode: InstitutionMode; notify: (m: string) => void; goToSuscripcion: () => void; canWrite: boolean }) {
  const [coaches, setCoaches] = useState<InstitutionCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ mode: "add" | "edit"; coach: InstitutionCoach | null } | null>(null);
  const { hasActivePlan } = useInstitutionPlanGate(institutionId);

  const load = () => fetchInstitutionCoaches(institutionId).then((c) => { setCoaches(c); setLoading(false); });
  useEffect(() => { load(); }, [institutionId]);

  const list = coaches.filter((c) => c.fullName.toLowerCase().includes(q.toLowerCase()));
  const openAdd = () => { if (requirePlanOrRedirect(hasActivePlan, notify, goToSuscripcion)) setModal({ mode: "add", coach: null }); };

  return (
    <div>
      <Header title="Entrenadores" count={coaches.length}>
        <SearchBox q={q} setQ={setQ} />
        {!canWrite ? (
          <span style={{ fontSize: 12, color: "#94A3B8" }}>Solo lectura</span>
        ) : hasActivePlan ? (
          <button style={darkBtn} onClick={openAdd}>＋ Agregar entrenador</button>
        ) : (
          <button style={{ ...outlineBtn, color: "#94A3B8" }} onClick={openAdd}>Activá un plan para agregar entrenadores</button>
        )}
      </Header>

      <div style={{ ...cardStyle, margin: "0 32px 32px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Cargando...</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
            {coaches.length === 0 ? "Todavía no agregaste entrenadores." : "No hay resultados para tu búsqueda."}
          </div>
        ) : (
          list.map((c, i) => (
            <div key={c.id} className="hover:bg-[#FAFAFA]" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < list.length - 1 ? "1px solid #F8FAFC" : "none" }}>
              <Av name={c.fullName} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.fullName}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{c.specialty || c.email || "Sin datos adicionales"}</div>
              </div>
              {canWrite ? (
                <DotMenu options={["Editar", "Eliminar"]} onPick={(o) => {
                  if (o === "Editar") setModal({ mode: "edit", coach: c });
                  if (o === "Eliminar") deleteInstitutionCoach(c.id).then(() => { notify(`${c.fullName} eliminado`); load(); resyncInstitutionBilling(institutionId, institutionMode); });
                }} />
              ) : null}
            </div>
          ))
        )}
      </div>

      {modal ? (
        <CoachModal
          initial={modal.coach}
          onClose={() => setModal(null)}
          onSave={async (input) => {
            if (modal.mode === "add") { await createInstitutionCoach(institutionId, input); resyncInstitutionBilling(institutionId, institutionMode); }
            else await updateInstitutionCoach(modal.coach!.id, input);
            setModal(null);
            notify(modal.mode === "add" ? "Entrenador agregado ✓" : "Entrenador actualizado ✓");
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function MemberModal({ onClose, onSave }: { onClose: () => void; onSave: (input: { fullName: string; email: string | null; plan: string | null }) => Promise<void> }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("Mensual");
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      title="Agregar miembro"
      onClose={onClose}
      footer={<ModalFooter onCancel={onClose} ok={saving ? "Guardando…" : "Guardar"} disabled={!fullName.trim() || saving} onOk={async () => {
        setSaving(true);
        await onSave({ fullName: fullName.trim(), email: email.trim() || null, plan });
      }} />}
    >
      <Field label="Nombre completo"><input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
      <Field label="Email (opcional)"><input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Plan">
        <select style={inputStyle} value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option>Mensual</option><option>Trimestral</option><option>Anual</option>
        </select>
      </Field>
    </Modal>
  );
}

function MembersPanel({ institutionId, mode, notify, goToSuscripcion, canWrite }: { institutionId: string; mode: InstitutionMode; notify: (m: string) => void; goToSuscripcion: () => void; canWrite: boolean }) {
  const club = mode === "club";
  const noun = club ? "atleta" : "socio";
  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [coaches, setCoaches] = useState<InstitutionCoach[]>([]);
  const [teams, setTeams] = useState<InstitutionTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "paused" | "all">("active");
  const [adding, setAdding] = useState(false);
  const { hasActivePlan } = useInstitutionPlanGate(institutionId);
  const openAdd = () => { if (requirePlanOrRedirect(hasActivePlan, notify, goToSuscripcion)) setAdding(true); };

  const load = () => Promise.all([fetchInstitutionMembers(institutionId), fetchInstitutionCoaches(institutionId), club ? fetchInstitutionTeams(institutionId) : Promise.resolve([])])
    .then(([m, c, t]) => { setMembers(m); setCoaches(c); setTeams(t); setLoading(false); });
  useEffect(() => { load(); }, [institutionId]);

  const list = members
    .filter((p) => p.fullName.toLowerCase().includes(q.toLowerCase()))
    .filter((p) => statusFilter === "all" ? true : p.status === statusFilter);
  const activeCount = members.filter((p) => p.status === "active").length;
  const pausedCount = members.filter((p) => p.status === "paused").length;

  const assignCoach = (member: InstitutionMember, coachId: string | null) => {
    updateInstitutionMember(member.id, { coachId }).then(() => {
      notify(coachId ? "Entrenador asignado" : "Entrenador quitado");
      load();
    });
  };
  const assignTeam = (member: InstitutionMember, teamId: string | null) => {
    updateInstitutionMember(member.id, { teamId }).then(() => {
      notify(teamId ? "Equipo asignado" : "Equipo quitado");
      load();
    });
  };
  const gridCols = club ? "28px 2fr 1fr 1fr 1fr 1fr 32px" : "28px 2fr 1fr 1fr 1fr 32px";

  return (
    <div>
      <Header title={mode === "club" ? "Atletas" : "Socios"} count={members.length}>
        <SearchBox q={q} setQ={setQ} />
        {!canWrite ? (
          <span style={{ fontSize: 12, color: "#94A3B8" }}>Solo lectura</span>
        ) : hasActivePlan ? (
          <button style={darkBtn} onClick={openAdd}><Plus size={14} style={{ marginRight: 4 }} />Agregar {noun}</button>
        ) : (
          <button style={{ ...outlineBtn, color: "#94A3B8" }} onClick={openAdd}>Activá un plan para agregar {noun}s</button>
        )}
      </Header>

      <div className="flex items-center gap-1" style={{ margin: "0 32px 16px", width: "fit-content", backgroundColor: "#F1F5F9", borderRadius: 10, padding: 3 }}>
        {([["active", `Activos (${activeCount})`], ["paused", `Pausados (${pausedCount})`], ["all", `Todos (${members.length})`]] as const).map(([value, label]) => (
          <button key={value} onClick={() => setStatusFilter(value)} className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: statusFilter === value ? "#FFFFFF" : "transparent", color: statusFilter === value ? "#111827" : "#64748B", boxShadow: statusFilter === value ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: 0, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ ...cardStyle, margin: "0 32px 32px", overflow: "visible" }}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, alignItems: "center", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", padding: "10px 20px", borderRadius: "14px 14px 0 0" }}>
          <span />
          {[noun === "atleta" ? "Atleta" : "Socio", "Plan", ...(club ? ["Equipo"] : []), "Entrenador", "Estado", ""].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>{h}</span>
          ))}
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Cargando...</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
            {members.length === 0 ? `Todavía no agregaste ${noun}s.` : `No hay ${noun}s con estos filtros.`}
          </div>
        ) : (
          list.map((p) => (
            <div key={p.id} className="hover:bg-[#FAFAFA]" style={{ display: "grid", gridTemplateColumns: gridCols, alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #F8FAFC", opacity: p.status === "paused" ? 0.6 : 1 }}>
              <span />
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Av name={p.fullName} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.fullName}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email ?? "—"}</div>
                </div>
              </div>
              <span style={{ fontSize: 12, color: "#374151" }}>{p.plan ?? "—"}</span>
              {club ? (
                <select
                  value={p.teamId ?? ""}
                  disabled={!canWrite}
                  onChange={(e) => assignTeam(p, e.target.value || null)}
                  style={{ height: 30, border: "1px solid #E2E8F0", borderRadius: 6, padding: "0 8px", fontSize: 11, color: "#374151", background: "#FFF", maxWidth: 140 }}
                >
                  <option value="">Sin equipo</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : null}
              <select
                value={p.coachId ?? ""}
                disabled={!canWrite}
                onChange={(e) => assignCoach(p, e.target.value || null)}
                style={{ height: 30, border: "1px solid #E2E8F0", borderRadius: 6, padding: "0 8px", fontSize: 11, color: "#374151", background: "#FFF", maxWidth: 140 }}
              >
                <option value="">Sin asignar</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
              <span>
                <span style={{ background: p.status === "active" ? "#DCFCE7" : "#F1F5F9", color: p.status === "active" ? "#16A34A" : "#64748B", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 500 }}>
                  {p.status === "active" ? "Activo" : "Pausado"}
                </span>
              </span>
              {canWrite ? (
                <DotMenu options={[p.status === "active" ? "Pausar" : "Reactivar", "Eliminar"]} onPick={(o) => {
                  if (o === "Eliminar") { deleteInstitutionMember(p.id).then(() => { notify(`${p.fullName} eliminado`); load(); resyncInstitutionBilling(institutionId, mode); }); return; }
                  const nextStatus = p.status === "active" ? "paused" : "active";
                  updateInstitutionMember(p.id, { status: nextStatus }).then(() => { notify(nextStatus === "paused" ? "Pausado" : "Reactivado"); load(); });
                }} />
              ) : null}
            </div>
          ))
        )}
      </div>

      {adding ? (
        <MemberModal onClose={() => setAdding(false)} onSave={async (input) => {
          await createInstitutionMember(institutionId, input);
          resyncInstitutionBilling(institutionId, mode);
          setAdding(false);
          notify(`${noun === "atleta" ? "Atleta" : "Socio"} agregado ✓`);
          load();
        }} />
      ) : null}
    </div>
  );
}

function TeamModal({ coaches, initial, onClose, onSave }: { coaches: InstitutionCoach[]; initial: InstitutionTeam | null; onClose: () => void; onSave: (input: { name: string; category: string | null; coachId: string | null }) => Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [coachId, setCoachId] = useState(initial?.coachId ?? "");
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      title={initial ? "Editar equipo" : "Crear equipo"}
      onClose={onClose}
      footer={<ModalFooter onCancel={onClose} ok={saving ? "Guardando…" : "Guardar"} disabled={!name.trim() || saving} onOk={async () => {
        setSaving(true);
        await onSave({ name: name.trim(), category: category.trim() || null, coachId: coachId || null });
      }} />}
    >
      <Field label="Nombre del equipo"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Sub-16 Masculino" /></Field>
      <Field label="Categoría (opcional)"><input style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej. Sub-16, Femenino, Primera..." /></Field>
      <Field label="Entrenador (opcional)">
        <select style={inputStyle} value={coachId} onChange={(e) => setCoachId(e.target.value)}>
          <option value="">Sin asignar</option>
          {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
        </select>
      </Field>
    </Modal>
  );
}

function TeamsPanel({ institutionId, notify }: { institutionId: string; notify: (m: string) => void }) {
  const [teams, setTeams] = useState<InstitutionTeam[]>([]);
  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [coaches, setCoaches] = useState<InstitutionCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ mode: "add" | "edit"; team: InstitutionTeam | null } | null>(null);

  const load = () => Promise.all([fetchInstitutionTeams(institutionId), fetchInstitutionMembers(institutionId), fetchInstitutionCoaches(institutionId)])
    .then(([t, m, c]) => { setTeams(t); setMembers(m); setCoaches(c); setLoading(false); });
  useEffect(() => { load(); }, [institutionId]);

  const list = teams.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  const countFor = (teamId: string) => members.filter((m) => m.teamId === teamId).length;

  return (
    <div>
      <Header title="Equipos" count={teams.length}>
        <SearchBox q={q} setQ={setQ} />
        <button style={darkBtn} onClick={() => setModal({ mode: "add", team: null })}><Plus size={14} style={{ marginRight: 4 }} />Crear equipo</button>
      </Header>

      {loading ? (
        <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Cargando...</div>
      ) : list.length === 0 ? (
        <div style={{ margin: "0 32px", padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8", ...cardStyle }}>
          {teams.length === 0 ? "Todavía no creaste equipos." : "No hay resultados para tu búsqueda."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, padding: "0 32px 32px" }}>
          {list.map((t) => (
            <div key={t.id} style={{ ...cardStyle, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F1F5F9", display: "grid", placeItems: "center" }}><Shield size={18} color="#374151" /></div>
                <DotMenu options={["Editar", "Eliminar"]} onPick={(o) => {
                  if (o === "Editar") setModal({ mode: "edit", team: t });
                  if (o === "Eliminar") deleteInstitutionTeam(t.id).then(() => { notify(`${t.name} eliminado`); load(); });
                }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{t.category ?? "Sin categoría"}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: 11, color: "#374151" }}>{countFor(t.id)} atletas</span>
                <span style={{ fontSize: 11, color: "#374151" }}>{t.coachName ?? "Sin entrenador"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal ? (
        <TeamModal
          coaches={coaches}
          initial={modal.team}
          onClose={() => setModal(null)}
          onSave={async (input) => {
            if (modal.mode === "add") await createInstitutionTeam(institutionId, input);
            else await updateInstitutionTeam(modal.team!.id, input);
            setModal(null);
            notify(modal.mode === "add" ? "Equipo creado ✓" : "Equipo actualizado ✓");
            load();
          }}
        />
      ) : null}
    </div>
  );
}

const CLASS_SLOT = 40;
const CLASS_DAY_START = 6 * 60;
const CLASS_DAY_END = 23 * 60;

function mondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - wd);
  return copy;
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function ClassModal({ coaches, initial, onClose, onSave }: { coaches: InstitutionCoach[]; initial: InstitutionClass | null; onClose: () => void; onSave: (inputs: ClassInput[]) => Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [classType, setClassType] = useState<ClassType>((initial?.classType as ClassType) ?? "CrossFit");
  const [coachId, setCoachId] = useState(initial?.coachId ?? "");
  const [room, setRoom] = useState(initial?.room ?? "");
  const [date, setDate] = useState(initial?.date ?? iso(new Date()));
  const [start, setStart] = useState(initial?.start ?? "09:00");
  const [duration, setDuration] = useState(initial?.durationMinutes ?? 60);
  const [capacity, setCapacity] = useState(initial?.capacity ?? 20);
  const [waitlistEnabled, setWaitlistEnabled] = useState(initial?.waitlistEnabled ?? true);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(4);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const base: Omit<ClassInput, "date"> = {
      name: name.trim() || classType, classType, coachId: coachId || null, room: room.trim() || null,
      start, durationMinutes: duration, capacity, waitlistEnabled, description: description.trim() || null,
    };
    if (initial) { await onSave([{ ...base, date }]); return; }
    let dates = [date];
    if (repeat && repeatDays.length) {
      const s = new Date(date + "T00:00");
      const limit = addDays(s, weeks * 7 - 1);
      dates = [];
      for (let d = new Date(s); d <= limit; d.setDate(d.getDate() + 1)) {
        if (repeatDays.includes((d.getDay() + 6) % 7)) dates.push(iso(d));
      }
    }
    await onSave(dates.map((d) => ({ ...base, date: d })));
  };

  return (
    <Modal
      title={initial ? "Editar clase" : "Nueva clase"}
      width={520}
      onClose={onClose}
      footer={<ModalFooter onCancel={onClose} ok={saving ? "Guardando…" : "Guardar"} disabled={!name.trim() || saving} onOk={save} />}
    >
      <Field label="Nombre de la clase"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. CrossFit Avanzado" /></Field>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(Object.keys(CLASS_TYPES) as ClassType[]).map((t) => (
          <button key={t} onClick={() => setClassType(t)} style={{ border: `1px solid ${classType === t ? CLASS_TYPES[t] : "#E2E8F0"}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, background: classType === t ? CLASS_TYPES[t] : "#FFF", color: classType === t ? "#FFF" : "#374151", cursor: "pointer" }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Entrenador (opcional)">
          <select style={inputStyle} value={coachId} onChange={(e) => setCoachId(e.target.value)}>
            <option value="">Sin asignar</option>
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </Field>
        <Field label="Sala / Espacio"><input style={inputStyle} value={room} onChange={(e) => setRoom(e.target.value)} /></Field>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1.3 }}><Field label="Día"><input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Hora inicio"><input type="time" style={inputStyle} value={start} onChange={(e) => setStart(e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Duración (min)"><input type="number" min={15} step={5} style={inputStyle} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></Field></div>
      </div>
      <Field label="Cupo máximo"><input type="number" min={1} style={{ ...inputStyle, width: 140 }} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></Field>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={waitlistEnabled} onChange={(e) => setWaitlistEnabled(e.target.checked)} id="wl" />
        <label htmlFor="wl" style={{ fontSize: 13, color: "#374151" }}>Permitir lista de espera</label>
      </div>
      {!initial ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} id="rep" />
            <label htmlFor="rep" style={{ fontSize: 13, color: "#374151" }}>Repetir semanalmente</label>
          </div>
          {repeat ? (
            <>
              <div style={{ display: "flex", gap: 6 }}>
                {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => {
                  const on = repeatDays.includes(i);
                  return <button key={d} onClick={() => setRepeatDays(on ? repeatDays.filter((x) => x !== i) : [...repeatDays, i])} style={{ width: 32, height: 32, borderRadius: 16, fontSize: 12, fontWeight: 600, background: on ? "#111827" : "#FFF", color: on ? "#FFF" : "#374151", border: on ? "none" : "1px solid #E2E8F0", cursor: "pointer" }}>{d}</button>;
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#374151" }}>Durante:</span>
                <input type="number" min={1} style={{ ...inputStyle, width: 70, height: 34 }} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
                <span style={{ fontSize: 12, color: "#374151" }}>semanas</span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      <Field label="Descripción (opcional)"><textarea style={{ ...inputStyle, height: 64, padding: 10, resize: "none" }} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
    </Modal>
  );
}

function ClassDetailPanel({ cls, members, onClose, onEdit, onCancelClass, notify }: {
  cls: InstitutionClass; members: InstitutionMember[]; onClose: () => void; onEdit: () => void; onCancelClass: () => void; notify: (m: string) => void;
}) {
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = () => fetchClassBookings(cls.id).then((b) => { setBookings(b); setLoading(false); });
  useEffect(() => { load(); }, [cls.id]);

  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const waiting = bookings.filter((b) => b.status === "waitlisted");
  const pct = confirmed.length / cls.capacity;
  const barColor = confirmed.length >= cls.capacity ? "#EF4444" : pct >= 0.75 ? "#EAB308" : "#22C55E";
  const bookedIds = new Set(bookings.map((b) => b.memberId));
  const pickable = members.filter((m) => !bookedIds.has(m.id));

  const addMember = (memberId: string) => {
    const status = confirmed.length < cls.capacity ? "confirmed" : "waitlisted";
    createClassBooking(cls.id, memberId, status).then(() => { setAdding(false); load(); });
  };

  return (
    <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 340, background: "#FFF", borderLeft: "1px solid #E2E8F0", zIndex: 30, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(0,0,0,0.08)" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: CLASS_TYPES[(cls.classType as ClassType) ?? "Personalizada"] ?? "#94A3B8" }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", flex: 1 }}>{cls.name}</span>
        <button aria-label="Editar clase" onClick={onEdit}><Edit2 size={16} color="#94A3B8" /></button>
        <button aria-label="Cerrar" onClick={onClose}><X size={18} color="#CBD5E1" /></button>
      </div>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}><Clock size={13} color="#CBD5E1" />{dayLabel(cls.date)} · {cls.start} – {endTime({ start: cls.start, duration: cls.durationMinutes })} hs</div>
        {cls.coachName ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}><User size={13} color="#CBD5E1" />{cls.coachName}</div> : null}
        {cls.room ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}><MapPin size={13} color="#CBD5E1" />{cls.room}</div> : null}
        <div style={{ padding: "12px 16px", background: "#F8FAFC", borderRadius: 10, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>{confirmed.length} / {cls.capacity} reservas</span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#E2E8F0" }}><div style={{ width: `${Math.min(100, pct * 100)}%`, height: 8, borderRadius: 4, background: barColor }} /></div>
          </div>
          {waiting.length > 0 ? <div style={{ fontSize: 11, color: "#D97706", marginTop: 6 }}>{waiting.length} en lista de espera</div> : null}
        </div>
        <button onClick={() => setAdding(true)} style={{ ...outlineBtn, justifyContent: "center", marginTop: 4 }}><UserPlus size={13} style={{ marginRight: 6 }} />Agregar socio</button>
      </div>
      <div style={{ padding: "0 20px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", padding: "12px 0 8px" }}>Reservas confirmadas</div>
        {loading ? <div style={{ fontSize: 12, color: "#94A3B8" }}>Cargando...</div> : confirmed.length === 0 ? <div style={{ fontSize: 12, color: "#94A3B8", paddingBottom: 8 }}>Sin reservas todavía.</div> : null}
        {confirmed.map((b) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}>
            <Av name={b.memberName} size={28} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "#111827", flex: 1 }}>{b.memberName}</span>
            <button onClick={() => updateClassBooking(b.id, { present: !b.present }).then(load)} style={{ borderRadius: 6, padding: "2px 8px", fontSize: 10, background: b.present ? "#DCFCE7" : "#F1F5F9", color: b.present ? "#16A34A" : "#94A3B8" }}>{b.present ? "Presente" : "Ausente"}</button>
            <button aria-label="Cancelar reserva" onClick={() => deleteClassBooking(b.id).then(() => { notify(`Reserva de ${b.memberName} cancelada`); load(); })}><X size={12} color="#CBD5E1" /></button>
          </div>
        ))}
        {waiting.length > 0 ? (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", padding: "10px 0 8px" }}>Lista de espera</div>
            {waiting.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}>
                <Av name={b.memberName} size={28} />
                <span style={{ fontSize: 12, fontWeight: 500, color: "#111827", flex: 1 }}>{b.memberName}</span>
                <span style={{ borderRadius: 6, padding: "2px 8px", fontSize: 10, background: "#FEF3C7", color: "#D97706" }}>En espera</span>
                <button aria-label="Pasar a confirmadas" title="Pasar a confirmadas" onClick={() => updateClassBooking(b.id, { status: "confirmed" }).then(() => { notify(`${b.memberName} pasó a confirmadas`); load(); })}><Users size={14} color="#16A34A" /></button>
              </div>
            ))}
          </>
        ) : null}
        {adding ? (
          <div style={{ padding: "10px 0" }}>
            <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>Elegí un socio para agregar:</div>
            {pickable.length === 0 ? <div style={{ fontSize: 12, color: "#94A3B8" }}>Todos los socios ya están en esta clase.</div> : pickable.map((m) => (
              <button key={m.id} onClick={() => addMember(m.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 4px", fontSize: 12, color: "#374151" }}>{m.fullName}</button>
            ))}
            <button onClick={() => setAdding(false)} style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Cancelar</button>
          </div>
        ) : null}
      </div>
      <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => markAllPresent(cls.id).then(() => { notify("Asistencia marcada para todos"); load(); })} style={{ ...outlineBtn, justifyContent: "center" }}><CheckSquare size={12} style={{ marginRight: 6 }} />Marcar asistencia masiva</button>
        {confirmCancel ? (
          <div style={{ fontSize: 12, color: "#374151", textAlign: "center" }}>
            ¿Cancelar esta clase? Se eliminarán las {confirmed.length} reservas.
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
              <button onClick={() => setConfirmCancel(false)} style={{ fontSize: 12, color: "#94A3B8" }}>No</button>
              <button onClick={onCancelClass} style={{ fontSize: 12, color: "#EF4444", fontWeight: 600 }}>Sí, cancelar</button>
            </div>
          </div>
        ) : <button onClick={() => setConfirmCancel(true)} style={{ fontSize: 12, color: "#EF4444", textAlign: "center" }}>Cancelar clase</button>}
      </div>
    </aside>
  );
}

function ClassesPanel({ institutionId, notify }: { institutionId: string; notify: (m: string) => void }) {
  const [classes, setClasses] = useState<InstitutionClass[]>([]);
  const [coaches, setCoaches] = useState<InstitutionCoach[]>([]);
  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [counts, setCounts] = useState<Record<string, { confirmed: number; waitlisted: number }>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"Semana" | "Día">("Semana");
  const [anchor, setAnchor] = useState(() => new Date());
  const [day, setDay] = useState(() => iso(new Date()));
  const [openId, setOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | InstitutionClass | null>(null);

  const load = () => fetchInstitutionClasses(institutionId).then(async (cl) => {
    setClasses(cl);
    setCounts(await fetchBookingCountsForClasses(cl.map((c) => c.id)));
    setLoading(false);
  });
  useEffect(() => {
    load();
    fetchInstitutionCoaches(institutionId).then(setCoaches);
    fetchInstitutionMembers(institutionId).then(setMembers);
  }, [institutionId]);

  const weekStart = mondayOf(anchor);
  const days = Array.from({ length: 7 }, (_, i) => iso(addDays(weekStart, i)));
  const shown = view === "Semana" ? days : [day];
  const todayIso = iso(new Date());
  const open = classes.find((c) => c.id === openId) ?? null;

  const moveWeek = (n: number) => {
    setAnchor((a) => addDays(a, 7 * n));
    if (view === "Día") setDay((d) => iso(addDays(new Date(d + "T00:00"), 7 * n)));
  };

  const weekClasses = classes.filter((c) => days.includes(c.date));
  const weekBookings = weekClasses.reduce((s, c) => s + (counts[c.id]?.confirmed ?? 0), 0);
  const weekWaiting = weekClasses.reduce((s, c) => s + (counts[c.id]?.waitlisted ?? 0), 0);
  const weekOcc = weekClasses.length ? Math.round((weekClasses.reduce((s, c) => s + (counts[c.id]?.confirmed ?? 0) / c.capacity, 0) / weekClasses.length) * 100) : 0;

  return (
    <div style={{ position: "relative" }}>
      <header style={{ padding: "24px 32px 0", display: "flex", alignItems: "center", marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Clases</h1>
          <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>{view === "Semana" ? `Semana del ${dayLabel(days[0]!, false)} al ${dayLabel(days[6]!, false)}` : dayLabel(day)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button aria-label="Semana anterior" onClick={() => moveWeek(-1)} style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}><ChevronLeft size={16} color="#374151" /></button>
          <button aria-label="Semana siguiente" onClick={() => moveWeek(1)} style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}><ChevronRight size={16} color="#374151" /></button>
          <div style={{ display: "flex", border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
            {(["Semana", "Día"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500, background: view === v ? "#111827" : "#FFF", color: view === v ? "#FFF" : "#374151", border: 0, cursor: "pointer" }}>{v}</button>
            ))}
          </div>
          <button style={darkBtn} onClick={() => setModal("new")}><Plus size={14} style={{ marginRight: 4 }} />Nueva clase</button>
        </div>
      </header>

      {view === "Día" ? (
        <div style={{ display: "flex", gap: 6, padding: "0 32px 12px" }}>
          {days.map((d, i) => (
            <button key={d} onClick={() => setDay(d)} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, border: "1px solid #E2E8F0", background: d === day ? "#111827" : "#FFF", color: d === day ? "#FFF" : "#374151", cursor: "pointer" }}>{DAY_ABBR[i]} {Number(d.slice(8))}</button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div style={{ margin: "0 32px", padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8", ...cardStyle }}>Cargando...</div>
      ) : (
        <div style={{ margin: "0 32px", background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ ["--slot-height" as string]: `${CLASS_SLOT}px` } as React.CSSProperties}>
            <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${shown.length}, 1fr)`, borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
              <div />
              {shown.map((d) => {
                const dt = new Date(d + "T00:00");
                const wd = (dt.getDay() + 6) % 7;
                return (
                  <div key={d} style={{ height: 52, minWidth: 0, borderLeft: "1px solid #E2E8F0", padding: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: "#94A3B8" }}>{DAY_ABBR[wd]}</div>
                    {d === todayIso ? (
                      <span style={{ display: "inline-flex", width: 26, height: 26, borderRadius: "50%", background: "#111827", color: "#FFF", fontSize: 15, fontWeight: 700, alignItems: "center", justifyContent: "center" }}>{dt.getDate()}</span>
                    ) : <div style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>{dt.getDate()}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${shown.length}, 1fr)` }}>
              <div>
                {Array.from({ length: (CLASS_DAY_END - CLASS_DAY_START) / 30 }, (_, i) => {
                  const m = CLASS_DAY_START + i * 30;
                  return <div key={i} style={{ height: "var(--slot-height)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingTop: 4, paddingRight: 8, fontSize: 10, color: "#94A3B8", boxSizing: "border-box" }}>{m % 60 === 0 ? `${String(Math.floor(m / 60)).padStart(2, "0")}:00` : ""}</div>;
                })}
              </div>
              {shown.map((d) => (
                <div key={d} style={{ minWidth: 0, borderLeft: "1px solid #E2E8F0", position: "relative", height: `calc(${(CLASS_DAY_END - CLASS_DAY_START) / 30} * var(--slot-height))`, backgroundImage: `repeating-linear-gradient(to bottom, #F1F5F9 0 1px, transparent 1px ${CLASS_SLOT * 2}px)` }}>
                  {classes.filter((c) => c.date === d).map((c) => {
                    const big = view === "Día";
                    const [sh = 0, sm = 0] = c.start.split(":").map(Number);
                    const slots = c.durationMinutes / 30;
                    const small = slots * CLASS_SLOT < 60;
                    const confirmedN = counts[c.id]?.confirmed ?? 0;
                    const full = confirmedN >= c.capacity;
                    const ell: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                    const color = CLASS_TYPES[(c.classType as ClassType) ?? "Personalizada"] ?? "#94A3B8";
                    return (
                      <div key={c.id} onClick={() => setOpenId(c.id)} style={{ position: "absolute", top: `calc(${(sh - 6) * 2 + sm / 30} * var(--slot-height) + 1px)`, height: `calc(${slots} * var(--slot-height) - 2px)`, left: 3, right: 3, background: color, borderRadius: 8, padding: small ? "4px 6px" : big ? "8px 12px 10px" : "6px 6px 9px", overflow: "hidden", cursor: "pointer", color: "#FFF", display: "flex", flexDirection: "column", boxSizing: "border-box", outline: openId === c.id ? "2px solid #FBBF24" : "none" }}>
                        <div style={{ fontSize: big ? 13 : 11, fontWeight: 700, ...ell }}>{c.name}</div>
                        {!small ? (
                          <>
                            <div style={{ fontSize: big ? 11 : 9, color: "rgba(255,255,255,0.8)", ...ell }}>{c.start} · {c.durationMinutes} min{big ? ` · ${c.room ?? ""}` : ""}</div>
                            {c.coachName ? <div style={{ fontSize: big ? 11 : 9, color: "rgba(255,255,255,0.7)", ...ell }}>{c.coachName}</div> : null}
                            {slots * CLASS_SLOT >= 80 ? (
                              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 4, minWidth: 0, overflow: "hidden" }}>
                                {full ? <span style={{ background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: "1px 5px", fontSize: 9, ...ell }}>Completo</span> : null}
                                <span style={{ fontSize: 9, marginLeft: "auto", ...ell }}>{confirmedN}/{c.capacity}</span>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "20px 32px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {([["Clases esta semana", String(weekClasses.length), Activity], ["Ocupación promedio", `${weekOcc}%`, Users], ["Reservas / espera", `${weekBookings} / ${weekWaiting}`, CheckCircle2]] as const).map(([l, v, I]) => (
          <div key={l} style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, border: "1px solid #E2E8F0" }}>
            <I size={18} color="#94A3B8" />
            <div><div style={{ fontSize: 11, color: "#94A3B8" }}>{l}</div><div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{v}</div></div>
          </div>
        ))}
      </div>

      {open ? (
        <ClassDetailPanel
          cls={open} members={members} onClose={() => setOpenId(null)} onEdit={() => setModal(open)} notify={notify}
          onCancelClass={() => deleteClassFromGoogleCalendar({ data: { institutionId, classId: open.id } }).catch(() => {}).then(() =>
            deleteInstitutionClass(open.id)).then(() => { notify("Clase cancelada"); setOpenId(null); load(); })}
        />
      ) : null}

      {modal ? (
        <ClassModal
          coaches={coaches}
          initial={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={async (inputs) => {
            if (modal === "new") {
              const created = await createInstitutionClasses(institutionId, inputs);
              notify(inputs.length > 1 ? `${inputs.length} clases creadas` : "Clase creada");
              created.forEach((c) => syncClassToGoogleCalendar({ data: { institutionId, classId: c.id } }).catch(() => {}));
            } else {
              await updateInstitutionClass(modal.id, inputs[0]!);
              notify("Clase actualizada");
              syncClassToGoogleCalendar({ data: { institutionId, classId: modal.id } }).catch(() => {});
            }
            setModal(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

const TEAM_COLORS = ["#3B82F6", "#16A34A", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#D97706"];
function teamColor(teams: InstitutionTeam[], teamId: string): string {
  const idx = teams.findIndex((t) => t.id === teamId);
  return TEAM_COLORS[idx % TEAM_COLORS.length] ?? "#94A3B8";
}
const PRACTICE_HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const PRACTICE_SLOT = 56;
const practiceToMin = (t: string) => { const [h = 0, m = 0] = t.split(":").map(Number); return h * 60 + m; };

function PracticeModal({ teams, initial, defaultDate, onClose, onSave }: {
  teams: InstitutionTeam[]; initial: InstitutionPractice | null; defaultDate: string; onClose: () => void; onSave: (inputs: PracticeInput[]) => Promise<void>;
}) {
  const [teamId, setTeamId] = useState(initial?.teamId ?? teams[0]?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [start, setStart] = useState(initial?.start ?? "18:00");
  const [end, setEnd] = useState(initial?.end ?? "19:30");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(8);
  const [saving, setSaving] = useState(false);

  const ok = teamId && start < end;

  const save = async () => {
    setSaving(true);
    const base: Omit<PracticeInput, "date"> = { teamId, name: name.trim() || null, start, end, place: place.trim() || null, notes: notes.trim() || null };
    if (initial) { await onSave([{ ...base, date }]); return; }
    let dates = [date];
    if (repeat && repeatDays.length) {
      const s = new Date(date + "T00:00");
      const limit = addDays(s, weeks * 7 - 1);
      dates = [];
      for (let d = new Date(s); d <= limit; d.setDate(d.getDate() + 1)) {
        if (repeatDays.includes((d.getDay() + 6) % 7)) dates.push(iso(d));
      }
    }
    await onSave(dates.map((d) => ({ ...base, date: d })));
  };

  return (
    <Modal
      title={initial ? "Editar práctica" : "Agregar práctica"}
      width={440}
      onClose={onClose}
      footer={<ModalFooter onCancel={onClose} ok={saving ? "Guardando…" : "Guardar práctica"} disabled={!ok || saving} onOk={save} />}
    >
      <Field label="Equipo">
        <select style={inputStyle} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Nombre (opcional)"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Partido amistoso" /></Field>
      <Field label="Día"><input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      {!initial ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} id="rep-prac" />
            <label htmlFor="rep-prac" style={{ fontSize: 13, color: "#374151" }}>Repetir semanalmente</label>
          </div>
          {repeat ? (
            <>
              <div style={{ display: "flex", gap: 6 }}>
                {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => {
                  const on = repeatDays.includes(i);
                  return <button key={d} onClick={() => setRepeatDays(on ? repeatDays.filter((x) => x !== i) : [...repeatDays, i])} style={{ width: 32, height: 32, borderRadius: 16, fontSize: 12, fontWeight: 600, background: on ? "#111827" : "#FFF", color: on ? "#FFF" : "#374151", border: on ? "none" : "1px solid #E2E8F0", cursor: "pointer" }}>{d}</button>;
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#374151" }}>Durante:</span>
                <input type="number" min={1} style={{ ...inputStyle, width: 70, height: 34 }} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
                <span style={{ fontSize: 12, color: "#374151" }}>semanas</span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Hora de inicio"><input type="time" style={inputStyle} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Hora de fin"><input type="time" style={inputStyle} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Lugar (opcional)"><input style={inputStyle} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ej. Campo principal, Gimnasio B" /></Field>
      <Field label="Notas (opcional)"><textarea style={{ ...inputStyle, height: 56, padding: 10, resize: "none" }} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </Modal>
  );
}

function PracticeDetailPanel({ practice, color, members, onClose, onEdit, onDelete, notify }: {
  practice: InstitutionPractice; color: string; members: InstitutionMember[]; onClose: () => void; onEdit: () => void; onDelete: () => void; notify: (m: string) => void;
}) {
  const roster = members.filter((m) => m.teamId === practice.teamId);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetchPracticeAttendance(practice.id).then((rows) => {
      const map: Record<string, boolean> = {};
      rows.forEach((r) => { map[r.memberId] = r.present; });
      setAttendance(map);
      setLoading(false);
    });
  }, [practice.id]);

  const presentCount = roster.filter((m) => attendance[m.id]).length;
  const toggle = (memberId: string) => {
    const next = !attendance[memberId];
    setAttendance((a) => ({ ...a, [memberId]: next }));
    setPracticeAttendance(practice.id, memberId, next);
  };

  return (
    <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 320, background: "#FFF", borderLeft: "1px solid #E2E8F0", zIndex: 30, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(0,0,0,0.08)" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", flex: 1 }}>{practice.teamName}</span>
        <button aria-label="Editar práctica" onClick={onEdit}><Edit2 size={16} color="#94A3B8" /></button>
        <button aria-label="Cerrar" onClick={onClose}><X size={18} color="#CBD5E1" /></button>
      </div>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 8 }}>
        {practice.name ? <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{practice.name}</div> : null}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}><Clock size={13} color="#CBD5E1" />{dayLabel(practice.date)} · {practice.start} – {practice.end} hs</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: practice.place ? "#374151" : "#94A3B8", fontStyle: practice.place ? "normal" : "italic" }}><MapPin size={13} color="#CBD5E1" />{practice.place ?? "Sin ubicación"}</div>
        {practice.notes ? <div style={{ fontSize: 12, color: "#94A3B8" }}>{practice.notes}</div> : null}
      </div>
      <div style={{ padding: "0 20px", flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 0 8px" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" }}>Asistencia</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#374151" }}>{presentCount} / {roster.length}</span>
        </div>
        {loading ? <div style={{ fontSize: 12, color: "#94A3B8" }}>Cargando...</div> : roster.length === 0 ? (
          <div style={{ fontSize: 12, color: "#94A3B8", paddingBottom: 8 }}>Este equipo todavía no tiene atletas asignados.</div>
        ) : roster.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}>
            <Av name={m.fullName} size={26} />
            <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{m.fullName}</span>
            <button onClick={() => toggle(m.id)} style={{ borderRadius: 6, padding: "2px 8px", fontSize: 10, background: attendance[m.id] ? "#DCFCE7" : "#F1F5F9", color: attendance[m.id] ? "#16A34A" : "#94A3B8" }}>{attendance[m.id] ? "Presente" : "Ausente"}</button>
          </div>
        ))}
        {roster.length > 0 ? (
          <button onClick={() => { markAllPracticeAttendance(practice.id, roster.map((m) => m.id), true).then(() => { const map: Record<string, boolean> = {}; roster.forEach((m) => { map[m.id] = true; }); setAttendance(map); notify(`Asistencia guardada · ${roster.length}/${roster.length}`); }); }} style={{ width: "100%", ...outlineBtn, justifyContent: "center", marginTop: 8 }}>Marcar todos presentes</button>
        ) : null}
      </div>
      <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0" }}>
        {confirmDelete ? (
          <div style={{ fontSize: 12, color: "#374151", textAlign: "center" }}>
            ¿Eliminar esta práctica?
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, color: "#94A3B8" }}>No</button>
              <button onClick={onDelete} style={{ fontSize: 12, color: "#EF4444", fontWeight: 600 }}>Sí, eliminar</button>
            </div>
          </div>
        ) : <button onClick={() => setConfirmDelete(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, width: "100%", border: "1px solid #FEE2E2", borderRadius: 9, height: 36, fontSize: 12, color: "#EF4444", background: "#FFF", cursor: "pointer" }}><Trash2 size={12} />Eliminar práctica</button>}
      </div>
    </aside>
  );
}

function PracticesPanel({ institutionId, notify }: { institutionId: string; notify: (m: string) => void }) {
  const [practices, setPractices] = useState<InstitutionPractice[]>([]);
  const [teams, setTeams] = useState<InstitutionTeam[]>([]);
  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchor, setAnchor] = useState(() => new Date());
  const [teamFilter, setTeamFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | InstitutionPractice | null>(null);

  const load = () => Promise.all([fetchInstitutionPractices(institutionId), fetchInstitutionTeams(institutionId), fetchInstitutionMembers(institutionId)])
    .then(([p, t, m]) => { setPractices(p); setTeams(t); setMembers(m); setLoading(false); });
  useEffect(() => { load(); }, [institutionId]);

  const weekStart = mondayOf(anchor);
  const days = Array.from({ length: 7 }, (_, i) => iso(addDays(weekStart, i)));
  const todayIso = iso(new Date());
  const visible = practices.filter((p) => teamFilter === "all" || p.teamId === teamFilter);
  const open = practices.find((p) => p.id === openId) ?? null;
  const weekPractices = visible.filter((p) => days.includes(p.date));

  return (
    <div>
      <header style={{ padding: "24px 32px 0", display: "flex", alignItems: "center", marginBottom: 20, gap: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", flex: 1 }}>Calendario de prácticas</h1>
        <button aria-label="Semana anterior" onClick={() => setAnchor((a) => addDays(a, -7))} style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}><ChevronLeft size={16} color="#374151" /></button>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", minWidth: 150, textAlign: "center" }}>{dayLabel(days[0]!, false)} – {dayLabel(days[6]!, false)}</span>
        <button aria-label="Semana siguiente" onClick={() => setAnchor((a) => addDays(a, 7))} style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}><ChevronRight size={16} color="#374151" /></button>
        <button style={darkBtn} onClick={() => setModal("new")} disabled={teams.length === 0}><Plus size={14} style={{ marginRight: 4 }} />Agregar práctica</button>
      </header>

      {teams.length === 0 ? (
        <div style={{ margin: "0 32px", padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8", ...cardStyle }}>Creá un equipo primero en la sección Equipos para poder agendar prácticas.</div>
      ) : (
        <>
          <div style={{ padding: "0 32px", display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
            <button onClick={() => setTeamFilter("all")} style={{ border: `1px solid ${teamFilter === "all" ? "#111827" : "#E2E8F0"}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, background: teamFilter === "all" ? "#111827" : "#FFF", color: teamFilter === "all" ? "#FFF" : "#374151", cursor: "pointer", whiteSpace: "nowrap" }}>Todos los equipos</button>
            {teams.map((t) => (
              <button key={t.id} onClick={() => setTeamFilter(t.id)} style={{ border: `1px solid ${teamFilter === t.id ? "#111827" : "#E2E8F0"}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, background: teamFilter === t.id ? "#111827" : "#FFF", color: teamFilter === t.id ? "#FFF" : "#374151", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: teamColor(teams, t.id) }} />{t.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ margin: "0 32px", padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8", ...cardStyle }}>Cargando...</div>
          ) : (
            <div style={{ ...cardStyle, overflow: "hidden", margin: "0 32px 32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <span />
                {DAY_ABBR.map((d, i) => {
                  const date = days[i]!;
                  return (
                    <div key={d} style={{ padding: "10px 0", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8" }}>{d}</div>
                      <div style={{ margin: "4px auto 0", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, background: date === todayIso ? "#111827" : "transparent", color: date === todayIso ? "#FFF" : "#111827" }}>{Number(date.slice(8))}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ position: "relative" }}>
                {PRACTICE_HOURS.map((h, hi) => (
                  <div key={h} style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", background: hi % 2 ? "#FAFAFA" : "#FFFFFF" }}>
                    <div style={{ fontSize: 10, color: "#CBD5E1", textAlign: "right", paddingRight: 8, paddingTop: 4, borderRight: "1px solid #F1F5F9" }}>{String(h).padStart(2, "0")}:00</div>
                    {days.map((d) => {
                      const starting = visible.filter((p) => p.date === d && Math.floor(practiceToMin(p.start) / 60) === h);
                      return (
                        <div key={d} style={{ height: PRACTICE_SLOT, borderRight: "1px solid #F1F5F9", borderBottom: "1px solid #F8FAFC", position: "relative" }}>
                          {starting.map((p) => {
                            const top = 2 + ((practiceToMin(p.start) % 60) / 60) * PRACTICE_SLOT;
                            const height = Math.max(36, ((practiceToMin(p.end) - practiceToMin(p.start)) / 60) * PRACTICE_SLOT - 4);
                            const c = teamColor(teams, p.teamId);
                            return (
                              <button key={p.id} onClick={() => setOpenId(p.id)} style={{ position: "absolute", top, left: 3, right: 3, height, zIndex: 2, overflow: "hidden", textAlign: "left", borderRadius: 8, padding: "6px 8px", background: `${c}1A`, border: 0, borderLeft: `3px solid ${c}`, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.teamName}</span>
                                {height > 40 ? <span style={{ fontSize: 10, color: c, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.start} – {p.end}</span> : null}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: "0 32px 32px", fontSize: 12, color: "#94A3B8" }}>{weekPractices.length} práctica{weekPractices.length === 1 ? "" : "s"} esta semana</div>
        </>
      )}

      {open ? (
        <PracticeDetailPanel
          practice={open} color={teamColor(teams, open.teamId)} members={members}
          onClose={() => setOpenId(null)} onEdit={() => setModal(open)}
          onDelete={() => deletePracticeFromGoogleCalendar({ data: { institutionId, practiceId: open.id } }).catch(() => {}).then(() =>
            deleteInstitutionPractice(open.id)).then(() => { notify("Práctica eliminada"); setOpenId(null); load(); })}
          notify={notify}
        />
      ) : null}

      {modal ? (
        <PracticeModal
          teams={teams}
          initial={modal === "new" ? null : modal}
          defaultDate={iso(new Date())}
          onClose={() => setModal(null)}
          onSave={async (inputs) => {
            if (modal === "new") {
              const created = await createInstitutionPractices(institutionId, inputs);
              notify(inputs.length > 1 ? `${inputs.length} prácticas creadas` : "Práctica creada");
              created.forEach((p) => syncPracticeToGoogleCalendar({ data: { institutionId, practiceId: p.id } }).catch(() => {}));
            } else {
              await updateInstitutionPractice(modal.id, inputs[0]!);
              notify("Práctica actualizada");
              syncPracticeToGoogleCalendar({ data: { institutionId, practiceId: modal.id } }).catch(() => {});
            }
            setModal(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function ReportsPanel({ institutionId, mode }: { institutionId: string; mode: InstitutionMode }) {
  const club = mode === "club";
  const [period, setPeriod] = useState<"Esta semana" | "Este mes">("Esta semana");
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [coaches, setCoaches] = useState<InstitutionCoach[]>([]);
  const [teams, setTeams] = useState<InstitutionTeam[]>([]);
  const [classes, setClasses] = useState<InstitutionClass[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, { confirmed: number; waitlisted: number }>>({});
  const [practices, setPractices] = useState<InstitutionPractice[]>([]);
  const [attCounts, setAttCounts] = useState<Record<string, { present: number; total: number }>>({});

  useEffect(() => {
    Promise.all([
      fetchInstitutionMembers(institutionId),
      fetchInstitutionCoaches(institutionId),
      club ? fetchInstitutionTeams(institutionId) : Promise.resolve([]),
      club ? Promise.resolve([]) : fetchInstitutionClasses(institutionId),
      club ? fetchInstitutionPractices(institutionId) : Promise.resolve([]),
    ]).then(async ([me, co, te, cl, pr]) => {
      setMembers(me); setCoaches(co); setTeams(te); setClasses(cl); setPractices(pr);
      if (!club) setClassCounts(await fetchBookingCountsForClasses(cl.map((c) => c.id)));
      else setAttCounts(await fetchAttendanceCountsForPractices(pr.map((p) => p.id)));
      setLoading(false);
    });
  }, [institutionId, club]);

  const today = new Date();
  const rangeStart = period === "Esta semana" ? mondayOf(today) : new Date(today.getFullYear(), today.getMonth(), 1);
  const rangeEnd = period === "Esta semana" ? addDays(rangeStart, 6) : new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startIso = iso(rangeStart), endIso = iso(rangeEnd);
  const inRange = (d: string) => d >= startIso && d <= endIso;

  const activeMembers = members.filter((m) => m.status === "active").length;
  const pausedMembers = members.filter((m) => m.status === "paused").length;

  const periodClasses = classes.filter((c) => inRange(c.date));
  const periodPractices = practices.filter((p) => inRange(p.date));

  const occByType = club ? [] : Object.entries(
    periodClasses.reduce<Record<string, { count: number; confirmed: number; capacity: number }>>((acc, c) => {
      const key = c.classType ?? "Sin tipo";
      const entry = acc[key] ?? { count: 0, confirmed: 0, capacity: 0 };
      entry.count++; entry.confirmed += classCounts[c.id]?.confirmed ?? 0; entry.capacity += c.capacity;
      acc[key] = entry;
      return acc;
    }, {}),
  ).map(([type, v]) => ({ type, count: v.count, pct: v.capacity ? Math.round((v.confirmed / v.capacity) * 100) : 0 })).sort((a, b) => b.count - a.count);

  const attByTeam = !club ? [] : teams.map((t) => {
    const teamPracticeIds = periodPractices.filter((p) => p.teamId === t.id).map((p) => p.id);
    const totals = teamPracticeIds.reduce((s, id) => { const e = attCounts[id]; return e ? { present: s.present + e.present, total: s.total + e.total } : s; }, { present: 0, total: 0 });
    return { team: t, practiceCount: teamPracticeIds.length, ...totals };
  }).filter((r) => r.practiceCount > 0);

  return (
    <div>
      <Header title="Reportes">
        <div style={{ display: "flex", border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
          {(["Esta semana", "Este mes"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500, background: period === p ? "#111827" : "#FFF", color: period === p ? "#FFF" : "#374151", border: 0, cursor: "pointer" }}>{p}</button>
          ))}
        </div>
      </Header>

      {loading ? (
        <div style={{ margin: "0 32px", padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8", ...cardStyle }}>Cargando...</div>
      ) : (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: "0 32px", marginBottom: 20 }}>
            <Kpi label={club ? "Atletas activos" : "Socios activos"} Icon={Users} value={activeMembers} />
            <Kpi label={club ? "Atletas pausados" : "Socios pausados"} Icon={Users2} value={pausedMembers} />
            <Kpi label="Entrenadores" Icon={Dumbbell} value={coaches.length} />
            {club ? (
              <Kpi label="Prácticas en el período" Icon={CalendarDays} value={periodPractices.length} />
            ) : (
              <Kpi label="Clases en el período" Icon={CalendarDays} value={periodClasses.length} />
            )}
          </section>

          {club ? (
            <section style={{ ...cardStyle, margin: "0 32px 32px", overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", padding: "18px 20px" }}>Asistencia por equipo</div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0", padding: "10px 20px" }}>
                {["Equipo", "Prácticas", "Asistencia"].map((h) => <span key={h} style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>{h}</span>)}
              </div>
              {attByTeam.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Todavía no hay asistencia registrada en este período.</div>
              ) : attByTeam.map(({ team, practiceCount, present, total }) => (
                <div key={team.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #F8FAFC", fontSize: 12, color: "#374151" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#111827" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: teamColor(teams, team.id) }} />{team.name}</span>
                  <span>{practiceCount}</span>
                  <span>{total > 0 ? `${Math.round((present / total) * 100)}% (${present}/${total})` : "Sin datos"}</span>
                </div>
              ))}
            </section>
          ) : (
            <section style={{ ...cardStyle, margin: "0 32px 32px", overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", padding: "18px 20px" }}>Clases por tipo</div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0", padding: "10px 20px" }}>
                {["Tipo", "Clases", "Ocupación"].map((h) => <span key={h} style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>{h}</span>)}
              </div>
              {occByType.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>No hay clases programadas en este período.</div>
              ) : occByType.map(({ type, count, pct }) => (
                <div key={type} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #F8FAFC", fontSize: 12, color: "#374151" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#111827" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: CLASS_TYPES[type as ClassType] ?? "#94A3B8" }} />{type}</span>
                  <span>{count}</span>
                  <span>{pct}%</span>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function InstitutionProfileSection({ institution, onSaved }: { institution: Institution; onSaved: (i: Institution) => void }) {
  const [name, setName] = useState(institution.name);
  const [description, setDescription] = useState(institution.description ?? "");
  const [address, setAddress] = useState(institution.address ?? "");
  const [city, setCity] = useState(institution.city ?? "");
  const [country, setCountry] = useState(institution.country ?? "");
  const [phone, setPhone] = useState(institution.phone ?? "");
  const [website, setWebsite] = useState(institution.website ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(institution.logoUrl);
  const [saving, setSaving] = useState(false);

  const pickLogo = (file: File) => { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); };

  const save = async () => {
    setSaving(true);
    let logoUrl = institution.logoUrl;
    if (logoFile) logoUrl = await uploadInstitutionLogo(institution.ownerId, logoFile);
    const patch = { name: name.trim(), logoUrl, description: description.trim() || null, address: address.trim() || null, city: city.trim() || null, country: country.trim() || null, phone: phone.trim() || null, website: website.trim() || null };
    await updateInstitution(institution.id, patch);
    setSaving(false);
    onSaved({ ...institution, ...patch });
    sonnerToast.success("Cambios guardados ✓");
  };

  return (
    <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 520 }}>
      <Field label="Nombre"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Tipo de institución">
        <span style={{ fontSize: 12, color: "#94A3B8" }}>{institution.mode === "club" ? "Club deportivo" : "Gimnasio"} — no se puede cambiar por ahora.</span>
      </Field>
      <Field label="Logo">
        <label style={{ display: "inline-block", width: 120, height: 120, cursor: "pointer" }}>
          <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pickLogo(f); }} />
          <div style={{ width: 120, height: 120, border: "1.5px dashed #CBD5E1", borderRadius: 12, background: "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, overflow: "hidden" }}>
            {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <><Upload size={16} color="#94A3B8" /><span style={{ fontSize: 12, color: "#94A3B8" }}>Subir logo</span></>}
          </div>
        </label>
      </Field>
      <Field label="Descripción (opcional)"><textarea style={{ ...inputStyle, height: 72, padding: 10, resize: "none" }} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field label="Dirección (opcional)"><input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. Siempre Viva 123" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Ciudad (opcional)"><input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        <Field label="País (opcional)"><input style={inputStyle} value={country} onChange={(e) => setCountry(e.target.value)} /></Field>
        <Field label="Sitio web (opcional)"><input style={inputStyle} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></Field>
        <Field label="Teléfono (opcional)"><input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      </div>
      <button onClick={save} disabled={!name.trim() || saving} style={{ ...darkBtn, width: "100%", height: 42, opacity: !name.trim() || saving ? 0.6 : 1 }}>{saving ? "Guardando…" : "Guardar cambios"}</button>
    </div>
  );
}

type InstitutionSubRow = {
  processor: "stripe" | "mercadopago"; status: string; tier_key: string;
  monthly_price_usd: number; charge_currency: string; current_period_end: string | null;
};

const INST_SUB_STATUS_LABEL: Record<string, string> = {
  incomplete: "Pendiente de confirmación", active: "ACTIVO", past_due: "Pago pendiente", canceled: "Cancelado",
};

function InstitutionSubscriptionSection({ institution }: { institution: Institution }) {
  const [sub, setSub] = useState<InstitutionSubRow | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [coachCount, setCoachCount] = useState(0);
  const [currency, setCurrency] = useState("ARS");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);

  const load = async () => {
    const [{ data: row }, { count: members }, { count: coaches }, { data: profile }] = await Promise.all([
      supabase.from("institution_subscriptions").select("*").eq("institution_id", institution.id).maybeSingle(),
      supabase.from("institution_members").select("*", { count: "exact", head: true }).eq("institution_id", institution.id),
      supabase.from("institution_coaches").select("*", { count: "exact", head: true }).eq("institution_id", institution.id),
      supabase.from("profiles").select("currency").eq("id", institution.ownerId).maybeSingle(),
    ]);
    setSub(row as InstitutionSubRow | null);
    setMemberCount(members ?? 0);
    setCoachCount(coaches ?? 0);
    setPreviewCount(members ?? 0);
    if (profile?.currency) setCurrency(profile.currency);
    setLoading(false);
  };

  useEffect(() => { load(); }, [institution.id]);

  if (loading) return null;

  const isArs = currency === "ARS";
  const liveTier = resolveInstitutionTier(institution.mode, memberCount, coachCount);
  const status = sub?.status ?? "incomplete";
  const hasSub = status === "active" || status === "past_due";
  const displayTier = sub?.tier_key ? (INSTITUTION_PRICING_TIERS.find((t) => t.key === sub.tier_key) ?? liveTier) : liveTier;
  const liveIdx = INSTITUTION_PRICING_TIERS.indexOf(liveTier);

  const choosePlan = async (tierKey: InstitutionTierKey) => {
    setBusy(true);
    try {
      const data = { institutionId: institution.id, mode: institution.mode, memberCount, coachCount };
      if (hasSub) {
        if (sub?.processor === "stripe") await changeInstitutionStripeTier({ data: { ...data, tierKey } });
        else await changeInstitutionMpTier({ data: { ...data, tierKey } });
        sonnerToast.success("Plan actualizado ✓");
        load();
      } else {
        const { url } = isArs
          ? await startInstitutionMpSubscription({ data: { ...data, ownerId: institution.ownerId, tierKey } })
          : await startInstitutionStripeCheckout({ data: { ...data, ownerId: institution.ownerId, tierKey } });
        if (url) window.location.href = url;
        return;
      }
    } catch (err) {
      console.error(err);
      sonnerToast.error(err instanceof Error ? err.message : "No se pudo actualizar el plan");
    } finally {
      setBusy(false);
    }
  };

  const manage = async () => {
    setBusy(true);
    try {
      if (sub?.processor === "stripe") {
        const { url } = await createInstitutionStripePortalSession({ data: { institutionId: institution.id } });
        if (url) window.location.href = url;
      } else {
        setCancel(true);
        setBusy(false);
      }
    } catch {
      sonnerToast.error("No se pudo abrir la gestión de suscripción");
      setBusy(false);
    }
  };

  const confirmCancelMp = async () => {
    setBusy(true);
    try {
      await cancelInstitutionMpSubscription({ data: { institutionId: institution.id } });
      sonnerToast.success("Suscripción cancelada");
      setCancel(false);
      load();
    } catch {
      sonnerToast.error("No se pudo cancelar la suscripción");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 16, border: "2px solid #111827", padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
            {memberCount} {institution.mode === "club" ? "miembros" : "socios"}{institution.mode === "gym" ? ` · ${coachCount} entrenadores` : ""}
          </span>
          <span style={{ background: status === "active" ? "#DCFCE7" : status === "past_due" ? "#FEF9C3" : "#F1F5F9", color: status === "active" ? "#16A34A" : status === "past_due" ? "#D97706" : "#94A3B8", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 8px" }}>
            {INST_SUB_STATUS_LABEL[status] ?? status.toUpperCase()}
          </span>
        </div>
        <p style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginTop: 8 }}>
          {isArs ? `$${displayTier.monthlyPriceArs.toLocaleString("es-AR")} ARS` : `$${displayTier.monthlyPriceUsd} USD`} <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 400 }}>/mes</span>
        </p>
        {sub?.current_period_end ? <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>· próxima renovación: {new Date(sub.current_period_end).toLocaleDateString("es-AR")}</p> : null}

        {hasSub ? (
          <button type="button" onClick={manage} disabled={busy} style={{ display: "inline-block", fontSize: 13, color: "#94A3B8", marginTop: 16, background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }}>
            Administrar suscripción
          </button>
        ) : (
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 16 }}>Elegí un plan abajo para activar la suscripción — no hay tramo gratis para instituciones.</p>
        )}
      </div>

      <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>
        Podés elegir cualquier plan, incluso uno más grande del que necesitás hoy — nunca te vamos a bajar de categoría automáticamente, solo subir si tu cantidad de {institution.mode === "club" ? "miembros" : "socios o entrenadores"} lo supera.
      </p>

      {(() => {
        const SLIDER_MAX = 400;
        const previewTier = resolveInstitutionTier(institution.mode, previewCount, coachCount);
        return (
          <div style={{ background: "#F8FAFC", borderRadius: 14, border: "1px solid #E2E8F0", padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Cantidad de {institution.mode === "club" ? "miembros" : "socios"}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{previewCount}+</span>
            </div>
            <input
              type="range"
              min={1}
              max={SLIDER_MAX}
              value={Math.min(previewCount, SLIDER_MAX)}
              onChange={(e) => setPreviewCount(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#111827" }}
            />
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 10 }}>
              Con {previewCount} {institution.mode === "club" ? "miembros" : "socios"} pagarías{" "}
              <strong style={{ color: "#111827" }}>
                {isArs ? `$${previewTier.monthlyPriceArs.toLocaleString("es-AR")} ARS` : `$${previewTier.monthlyPriceUsd} USD`}/mes
              </strong>
              . Movela para ver qué plan te conviene, y tocá "Elegir este plan" abajo para confirmarlo.
            </p>
          </div>
        );
      })()}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {INSTITUTION_PRICING_TIERS.map((t, i) => {
          const isCurrent = t.key === displayTier.key;
          const belowLive = i < liveIdx;
          const isPreview = t.key === resolveInstitutionTier(institution.mode, previewCount, coachCount).key;
          const range = institution.mode === "club"
            ? `${t.clubMinMembers}${t.clubMaxMembers ? `–${t.clubMaxMembers}` : "+"} miembros`
            : `${t.gymMinMembers}${t.gymMaxMembers ? `–${t.gymMaxMembers}` : "+"} socios · ${t.gymMaxCoaches ?? "∞"} coaches`;
          const muted = belowLive && !isCurrent;
          return (
            <div
              key={t.key}
              onClick={() => setPreviewCount(institution.mode === "club" ? t.clubMinMembers : t.gymMinMembers)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "16px 20px",
                borderRadius: 14,
                border: isCurrent ? "2px solid #111827" : isPreview ? "2px solid #CBD5E1" : "1px solid #E2E8F0",
                background: muted ? "#F8FAFC" : "#FFFFFF",
                opacity: muted ? 0.55 : 1,
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: muted ? "#94A3B8" : "#111827" }}>Plan {i + 1}</span>
                  {isCurrent ? (
                    <span style={{ background: "#111827", color: "#FFFFFF", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>Tu plan actual</span>
                  ) : null}
                </div>
                <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{range}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: muted ? "#94A3B8" : "#111827" }}>
                  {isArs ? `$${t.monthlyPriceArs.toLocaleString("es-AR")}` : `$${t.monthlyPriceUsd}`}
                  <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}> {isArs ? "ARS/mes" : "USD/mes"}</span>
                </p>
                {!isCurrent ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      choosePlan(t.key);
                    }}
                    style={{
                      marginTop: 4,
                      background: muted ? "#F1F5F9" : "#111827",
                      color: muted ? "#CBD5E1" : "#FFFFFF",
                      borderRadius: 6,
                      padding: "4px 12px",
                      fontSize: 11,
                      fontWeight: 600,
                      border: 0,
                      cursor: "pointer",
                    }}
                  >
                    Elegir este plan
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {hasSub && sub?.processor === "mercadopago" ? (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button type="button" onClick={() => setCancel(true)} style={{ fontSize: 12, color: "#94A3B8" }}>Cancelar suscripción</button>
        </div>
      ) : null}

      {cancel ? (
        <Modal title="Cancelar suscripción" onClose={() => setCancel(false)} footer={<>
          <button type="button" style={outlineBtn} onClick={() => setCancel(false)}>Mantener plan</button>
          <button type="button" onClick={confirmCancelMp} disabled={busy} style={{ background: "#EF4444", color: "#FFFFFF", borderRadius: 8, padding: "0 16px", fontSize: 12, fontWeight: 600, border: 0, height: 36 }}>Sí, cancelar</button>
        </>}>
          <p style={{ fontSize: 13, color: "#64748B" }}>¿Querés cancelar la suscripción de Mercado Pago de tu institución?</p>
        </Modal>
      ) : null}
    </div>
  );
}

const INST_EMAIL_ROWS = [
  ["Nuevo socio", "Cuando se agrega un socio o atleta nuevo.", true],
  ["Pago de la institución", "Confirmación de cada cobro de tu suscripción a TOGO.", true],
  ["Pago pendiente", "Si tu suscripción tiene un pago rechazado o pendiente.", true],
  ["Novedades de TOGO", "Tips, nuevas funciones y actualizaciones.", false],
] as const;

const INST_PUSH_ROWS = [
  ["Reservas de clases", "Cuando un socio reserva o cancela una clase.", true],
  ["Actividad del staff", "Cuando alguien invitado acepta el acceso a la institución.", true],
] as const;

function InstitutionNotificationsSection({ institutionId, canWrite }: { institutionId: string; canWrite: boolean }) {
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    [...INST_EMAIL_ROWS, ...INST_PUSH_ROWS].forEach(([label, , on]) => { initial[label as string] = on as boolean; });
    return initial;
  });

  useEffect(() => {
    fetchInstitutionNotificationPrefs(institutionId).then((prefs) => { if (prefs) setState((s) => ({ ...s, ...prefs })); });
  }, [institutionId]);

  const toggle = (label: string, v: boolean) => {
    setState((s) => {
      const next = { ...s, [label]: v };
      setInstitutionNotificationPrefs(institutionId, next).catch(() => sonnerToast.error("No se pudo guardar"));
      return next;
    });
  };

  const rows = (list: typeof INST_EMAIL_ROWS | typeof INST_PUSH_ROWS) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {list.map(([label, desc]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid #F8FAFC" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{label}</p>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{desc}</p>
          </div>
          <input type="checkbox" checked={state[label] ?? false} disabled={!canWrite} onChange={(e) => toggle(label as string, e.target.checked)} style={{ width: 18, height: 18 }} />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 520 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 }}>Por email</p>
      {rows(INST_EMAIL_ROWS)}
      <div style={{ height: 1, background: "#E2E8F0", margin: "20px 0" }} />
      <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 }}>Push (app móvil)</p>
      {rows(INST_PUSH_ROWS)}
    </div>
  );
}

const PERMISSION_LABEL: Record<StaffPermission, string> = { full_access: "Acceso completo", read_only: "Solo lectura" };
const STAFF_STATUS_LABEL: Record<StaffStatus, string> = { pending: "Invitación pendiente", active: "Activo", revoked: "Revocado" };

function InviteStaffModal({ onClose, onSave }: { onClose: () => void; onSave: (input: { email: string; fullName: string | null; permission: StaffPermission }) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [permission, setPermission] = useState<StaffPermission>("read_only");
  const [saving, setSaving] = useState(false);
  return (
    <Modal title="Invitar a alguien" onClose={onClose} footer={<>
      <button type="button" style={outlineBtn} onClick={onClose}>Cancelar</button>
      <button
        type="button"
        disabled={saving || !email.trim()}
        onClick={async () => { setSaving(true); try { await onSave({ email: email.trim(), fullName: fullName.trim() || null, permission }); } finally { setSaving(false); } }}
        style={{ background: "#111827", color: "#FFFFFF", borderRadius: 8, padding: "0 16px", fontSize: 12, fontWeight: 600, border: 0, height: 36 }}
      >
        {saving ? "..." : "Invitar"}
      </button>
    </>}>
      <Field label="Email">
        <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@email.com" />
      </Field>
      <Field label="Nombre (opcional)">
        <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Field>
      <Field label="Permiso">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(["read_only", "full_access"] as StaffPermission[]).map((p) => (
            <label key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
              <input type="radio" name="permission" checked={permission === p} onChange={() => setPermission(p)} />
              {PERMISSION_LABEL[p]}
            </label>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

function InstitutionStaffSection({ institutionId, canWrite }: { institutionId: string; canWrite: boolean }) {
  const [staff, setStaff] = useState<InstitutionStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const load = () => fetchInstitutionStaff(institutionId).then((s) => { setStaff(s); setLoading(false); });
  useEffect(() => { load(); }, [institutionId]);

  const inviteLink = (token: string) => `${window.location.origin}/institucion-invitacion/${token}`;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#94A3B8" }}>Invitá gente de tu equipo para que administre la institución, con acceso completo o solo lectura.</p>
        {canWrite ? <button style={darkBtn} onClick={() => setInviting(true)}>＋ Invitar</button> : null}
      </div>

      {loading ? null : staff.length === 0 ? (
        <div style={{ ...cardStyle, padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Todavía no invitaste a nadie.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          {staff.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: i < staff.length - 1 ? "1px solid #F8FAFC" : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.fullName || s.email}</p>
                <p style={{ fontSize: 11, color: "#94A3B8" }}>{s.email}</p>
                {s.status === "pending" ? (
                  <p style={{ fontSize: 11, color: "#3B82F6", marginTop: 4, wordBreak: "break-all" }}>{inviteLink(s.inviteToken)}</p>
                ) : null}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#F1F5F9", borderRadius: 6, padding: "3px 8px" }}>{PERMISSION_LABEL[s.permission]}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.status === "active" ? "#16A34A" : "#D97706", background: s.status === "active" ? "#DCFCE7" : "#FFFBEB", borderRadius: 6, padding: "3px 8px" }}>{STAFF_STATUS_LABEL[s.status]}</span>
              {canWrite ? (
                <DotMenu
                  options={s.permission === "full_access" ? ["Cambiar a solo lectura", "Revocar acceso"] : ["Cambiar a acceso completo", "Revocar acceso"]}
                  onPick={(o) => {
                    if (o === "Revocar acceso") { revokeInstitutionStaff(s.id).then(() => { sonnerToast.success("Acceso revocado"); load(); }); return; }
                    const next: StaffPermission = s.permission === "full_access" ? "read_only" : "full_access";
                    updateInstitutionStaffPermission(s.id, next).then(() => { sonnerToast.success("Permiso actualizado"); load(); });
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}

      {inviting ? (
        <InviteStaffModal
          onClose={() => setInviting(false)}
          onSave={async (input) => {
            try {
              await inviteInstitutionStaff(institutionId, input);
              setInviting(false);
              sonnerToast.success("Invitación creada ✓ — copiá el link de abajo y compartiselo");
              load();
            } catch (err) {
              sonnerToast.error(err instanceof Error ? err.message : "No se pudo invitar");
            }
          }}
        />
      ) : null}
    </div>
  );
}

const CAJA_STATUS_LABEL: Record<PaymentAccountStatus["status"], string> = {
  pending: "Todavía no activaste los cobros", onboarding: "Completá tu verificación",
  active: "Listo para cobrar cuotas", restricted: "Hay un problema con tu cuenta", disabled: "Cuenta deshabilitada",
};
const MEMBER_BILLING_LABEL: Record<string, string> = {
  none: "Sin configurar", pending: "Pendiente de autorización", active: "Al día", past_due: "Atrasado", canceled: "Cancelado",
};
const MEMBER_BILLING_COLOR: Record<string, [string, string]> = {
  none: ["#F1F5F9", "#94A3B8"], pending: ["#FFFBEB", "#D97706"], active: ["#F0FDF4", "#16A34A"],
  past_due: ["#FEF2F2", "#EF4444"], canceled: ["#F1F5F9", "#94A3B8"],
};

function InstitutionCajaSection({ institutionId, mode, canWrite }: { institutionId: string; mode: InstitutionMode; canWrite: boolean }) {
  const search = useSearch({ strict: false }) as { stripe?: string; mp?: string };
  const [currency, setCurrency] = useState("ARS");
  const [account, setAccount] = useState<PaymentAccountStatus>({ processor: null, status: "pending" });
  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [charges, setCharges] = useState<InstitutionMemberCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data: inst }, acc, m, c] = await Promise.all([
      supabase.from("institutions").select("owner_id").eq("id", institutionId).maybeSingle(),
      fetchInstitutionPaymentAccountStatus({ data: { institutionId } }),
      fetchInstitutionMembers(institutionId),
      fetchInstitutionMemberCharges(institutionId),
    ]);
    if (inst?.owner_id) {
      const { data: profile } = await supabase.from("profiles").select("currency").eq("id", inst.owner_id).maybeSingle();
      if (profile?.currency) setCurrency(profile.currency);
    }
    setAccount(acc);
    setMembers(m);
    setCharges(c);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      if (search.stripe === "return") await refreshInstitutionStripeAccountStatus({ data: { institutionId } });
      if (search.mp === "connected") sonnerToast.success("Mercado Pago conectado ✓");
      await load();
    })();
  }, [institutionId]);

  const connect = async () => {
    setConnecting(true);
    try {
      const { url } = currency !== "ARS"
        ? await startInstitutionStripeConnectOnboarding({ data: { institutionId } })
        : await startInstitutionMercadoPagoOAuth({ data: { institutionId } });
      if (url) window.location.href = url;
    } catch {
      sonnerToast.error("No se pudo iniciar la conexión de cobros");
      setConnecting(false);
    }
  };

  const manage = async () => {
    setConnecting(true);
    try {
      if (account.processor === "stripe") {
        const { url } = await createInstitutionStripeExpressDashboardLink({ data: { institutionId } });
        if (url) window.open(url, "_blank");
      } else {
        window.open("https://www.mercadopago.com.ar/", "_blank");
      }
    } catch {
      sonnerToast.error("No se pudo abrir tu cuenta de cobros");
    } finally {
      setConnecting(false);
    }
  };

  const savePrice = async (memberId: string) => {
    const raw = priceDrafts[memberId];
    const amount = Math.round(Number(String(raw ?? "").replace(/[^0-9.,]/g, "").replace(",", ".")) * 100);
    if (!amount || amount <= 0) { sonnerToast.error("Ingresá un precio válido"); return; }
    try {
      await setMemberPlanPrice(memberId, amount, currency);
      sonnerToast.success("Precio de cuota guardado ✓");
      load();
    } catch {
      sonnerToast.error("No se pudo guardar el precio");
    }
  };

  const copyLink = (memberId: string) => {
    navigator.clipboard?.writeText(`${window.location.origin}/completar-cuota/${memberId}`).catch(() => {});
    sonnerToast.success("Link copiado ✓");
  };

  if (loading) return null;
  const noun = mode === "club" ? "atleta" : "socio";

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <p style={LABEL_STYLE}>Cobros de Caja</p>
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{currency !== "ARS" ? "Stripe" : "Mercado Pago"}</p>
            <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{CAJA_STATUS_LABEL[account.status]}</p>
          </div>
          {!canWrite ? null : account.status === "active" ? (
            <button type="button" onClick={manage} disabled={connecting} style={{ fontSize: 12, color: "#94A3B8", background: "none", border: 0, cursor: "pointer" }}>
              {account.processor === "stripe" ? "Ver mi cuenta de Stripe" : "Ir a Mercado Pago"}
            </button>
          ) : (
            <button type="button" onClick={connect} disabled={connecting} style={{ ...darkBtn }}>
              {connecting ? "Un momento…" : currency !== "ARS" ? "Conectar con Stripe" : "Conectar con Mercado Pago"}
            </button>
          )}
        </div>
        <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>La cuota de cada {noun} se cobra directo a esta cuenta — TOGO no se queda con nada de Caja.</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <p style={LABEL_STYLE}>Cuota por {noun}</p>
        {members.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94A3B8" }}>Todavía no tenés {noun}s cargados.</p>
        ) : (
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            {members.map((m, i) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: i < members.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{m.fullName}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8" }}>{m.email ?? "Sin email"}</p>
                </div>
                {canWrite ? (
                  <input
                    style={{ ...inputStyle, height: 32, width: 110 }}
                    placeholder={m.plan ?? "$ por mes"}
                    value={priceDrafts[m.id] ?? ""}
                    onChange={(e) => setPriceDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                    onBlur={() => { if (priceDrafts[m.id]) savePrice(m.id); }}
                  />
                ) : null}
                <span style={{ fontSize: 11, fontWeight: 600, color: MEMBER_BILLING_COLOR[m.billingStatus]?.[1] ?? "#94A3B8", background: MEMBER_BILLING_COLOR[m.billingStatus]?.[0] ?? "#F1F5F9", borderRadius: 6, padding: "3px 8px" }}>
                  {MEMBER_BILLING_LABEL[m.billingStatus] ?? "Sin configurar"}
                </span>
                {canWrite && account.status === "active" ? (
                  <button type="button" onClick={() => copyLink(m.id)} style={{ fontSize: 11, color: "#3B82F6", background: "none", border: 0, cursor: "pointer" }}>Copiar link</button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p style={LABEL_STYLE}>Historial de cobros</p>
        {charges.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94A3B8" }}>Todavía no hay cobros registrados.</p>
        ) : (
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            {charges.map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: i < charges.length - 1 ? "1px solid #F8FAFC" : "none", fontSize: 12 }}>
                <span style={{ flex: 1 }}>{c.memberName}</span>
                <span>{(c.amount / 100).toLocaleString("es-AR")} {c.currency}</span>
                <span style={{ color: c.status === "paid" ? "#16A34A" : c.status === "failed" ? "#EF4444" : "#94A3B8" }}>{c.status === "paid" ? "Pagado" : c.status === "failed" ? "Falló" : c.status}</span>
                <span style={{ color: "#CBD5E1" }}>{new Date(c.createdAt).toLocaleDateString("es-AR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InstitutionIntegrationsSection({ institutionId, canWrite }: { institutionId: string; canWrite: boolean }) {
  const search = useSearch({ strict: false }) as { google?: string };
  const [status, setStatus] = useState<IntegrationsStatus>({ googleConnected: false, whatsappConnected: false });
  const [waConnected, setWaConnected] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([fetchInstitutionIntegrationsStatus({ data: { institutionId } }), fetchWhatsAppStatus()])
    .then(([s, wa]) => { setStatus(s); setWaConnected(wa.connected); setLoading(false); });
  useEffect(() => {
    if (search.google === "connected") sonnerToast.success("Google Calendar conectado ✓");
    if (search.google === "error") sonnerToast.error("No se pudo conectar Google Calendar");
    load();
  }, [institutionId]);

  const sendTest = async () => {
    if (!testPhone.trim()) { sonnerToast.error("Ingresá un número con código de país (ej: 549291...)"); return; }
    setSendingTest(true);
    try {
      await sendTestWhatsAppMessage({ data: { toPhoneE164: testPhone.trim() } });
      sonnerToast.success("Mensaje de prueba enviado ✓");
    } catch (err) {
      sonnerToast.error(err instanceof Error ? err.message : "No se pudo enviar el mensaje");
    } finally {
      setSendingTest(false);
    }
  };

  const connectGoogle = async () => {
    setBusy(true);
    try {
      const { url } = await startGoogleCalendarOAuth({ data: { institutionId } });
      if (url) window.location.href = url;
    } catch {
      sonnerToast.error("No se pudo iniciar la conexión con Google");
      setBusy(false);
    }
  };

  const disconnectGoogle = async () => {
    setBusy(true);
    try {
      await disconnectGoogleCalendar({ data: { institutionId } });
      sonnerToast.success("Google Calendar desconectado");
      load();
    } catch {
      sonnerToast.error("No se pudo desconectar");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p style={LABEL_STYLE}>Google Calendar</p>
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Sincronizar clases y prácticas</p>
            <p style={{ fontSize: 11, color: status.googleConnected ? "#16A34A" : "#94A3B8", marginTop: 2 }}>
              {status.googleConnected ? "Conectado — cada clase o práctica nueva se agrega a tu Google Calendar" : "No conectado"}
            </p>
          </div>
          {!canWrite ? null : status.googleConnected ? (
            <button type="button" onClick={disconnectGoogle} disabled={busy} style={{ fontSize: 12, color: "#94A3B8", background: "none", border: 0, cursor: "pointer" }}>Desconectar</button>
          ) : (
            <button type="button" onClick={connectGoogle} disabled={busy} style={darkBtn}>{busy ? "Un momento…" : "Conectar"}</button>
          )}
        </div>
      </div>

      <div>
        <p style={LABEL_STYLE}>WhatsApp</p>
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: "16px 20px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Notificaciones por WhatsApp</p>
          <p style={{ fontSize: 11, color: waConnected ? "#16A34A" : "#94A3B8", marginTop: 2 }}>
            {waConnected ? "Conectado (número único de TOGO, compartido por todas las instituciones)" : "Todavía no está disponible"}
          </p>
          {waConnected ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                style={{ ...inputStyle, height: 34, flex: 1 }}
                placeholder="Ej: 5492911234567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <button type="button" onClick={sendTest} disabled={sendingTest} style={{ ...darkBtn, height: 34 }}>
                {sendingTest ? "Enviando…" : "Mandar prueba"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ institution, onSaved, section, setSection, canWrite }: { institution: Institution; onSaved: (i: Institution) => void; section: string; setSection: (s: string) => void; canWrite: boolean }) {
  const sections = ["Institución", "Suscripción", "Accesos y roles", "Notificaciones", "Integraciones", "Caja"];
  return (
    <div style={{ display: "flex" }}>
      <nav style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2, padding: "20px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", padding: "4px 12px 10px" }}>Configuración</div>
        {sections.map((s) => (
          <button key={s} onClick={() => setSection(s)} className={section === s ? "" : "hover:bg-slate-50"} style={{ textAlign: "left", padding: "8px 12px", borderRadius: 8, border: 0, cursor: "pointer", fontSize: 13, fontWeight: section === s ? 600 : 500, color: section === s ? "#111827" : "#374151", background: section === s ? "#F1F5F9" : "transparent" }}>{s}</button>
        ))}
      </nav>
      <div style={{ flex: 1, padding: "28px 32px 32px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 20 }}>{section}</h1>
        {section === "Institución" ? <InstitutionProfileSection institution={institution} onSaved={onSaved} />
          : section === "Suscripción" ? <InstitutionSubscriptionSection institution={institution} />
          : section === "Accesos y roles" ? <InstitutionStaffSection institutionId={institution.id} canWrite={canWrite} />
          : section === "Notificaciones" ? <InstitutionNotificationsSection institutionId={institution.id} canWrite={canWrite} />
          : section === "Caja" ? <InstitutionCajaSection institutionId={institution.id} mode={institution.mode} canWrite={canWrite} />
          : section === "Integraciones" ? <InstitutionIntegrationsSection institutionId={institution.id} canWrite={canWrite} />
          : (
          <p style={{ fontSize: 13, color: "#94A3B8" }}>Esta sección todavía no está conectada — llega en una próxima vuelta.</p>
        )}
      </div>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ padding: "28px 32px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>{label}</h1>
      <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Esta sección todavía no está conectada — llega en una próxima vuelta.</p>
    </div>
  );
}

function Dashboard({ institution: initialInstitution, permission, onSignOut }: { institution: Institution; permission: "owner" | "full_access" | "read_only"; onSignOut: () => void }) {
  const navigate = useNavigate();
  const [institution, setInstitution] = useState(initialInstitution);
  const canWrite = permission !== "read_only";
  const club = institution.mode === "club";
  const [active, setActive] = useState("Resumen");
  const [settingsSection, setSettingsSection] = useState("Institución");
  const goToSuscripcion = () => { setActive("Configuración"); setSettingsSection("Suscripción"); };
  const goToCaja = () => { setActive("Configuración"); setSettingsSection("Caja"); };
  const [toast, setToast] = useState<string | null>(null);
  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [coaches, setCoaches] = useState<InstitutionCoach[]>([]);

  const notify = (m: string) => setToast(m);
  useEffect(() => { if (!toast) return; sonnerToast.success(toast); setToast(null); }, [toast]);

  useEffect(() => {
    Promise.all([fetchInstitutionMembers(institution.id), fetchInstitutionCoaches(institution.id)])
      .then(([m, c]) => { setMembers(m); setCoaches(c); });
  }, [institution.id, active]);

  const nav: { icon: typeof Users2; label: string }[] = club
    ? [
        { icon: LayoutDashboard, label: "Resumen" },
        { icon: Users2, label: "Equipos" },
        { icon: Dumbbell, label: "Entrenadores" },
        { icon: Users, label: "Atletas" },
        { icon: CalendarDays, label: "Calendario" },
        { icon: BarChart2, label: "Reportes" },
        { icon: Settings2, label: "Configuración" },
      ]
    : [
        { icon: LayoutDashboard, label: "Resumen" },
        { icon: Dumbbell, label: "Entrenadores" },
        { icon: CalendarDays, label: "Clases" },
        { icon: Users, label: "Socios" },
        { icon: CreditCard, label: "Caja" },
        { icon: BarChart2, label: "Reportes" },
        { icon: Settings2, label: "Configuración" },
      ];

  const instIni = institution.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", color: "#111827" }}>
      <aside style={{ width: 240, position: "fixed", top: 0, left: 0, height: "100vh", background: "#FFFFFF", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", padding: "20px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 28 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#111827", color: "#FFFFFF", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
            {institution.logoUrl ? <img src={institution.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : instIni}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{institution.name}</div>
            <span style={{ display: "inline-block", marginTop: 3, fontSize: 9, borderRadius: 4, padding: "1px 6px", color: club ? "#3B82F6" : "#D97706", background: club ? "#EFF6FF" : "#FFFBEB" }}>{club ? "Club deportivo" : "Gimnasio"}</span>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map((n) => (
            <button key={n.label} onClick={() => n.label === "Caja" ? goToCaja() : setActive(n.label)} className={(active === n.label || (n.label === "Caja" && active === "Configuración" && settingsSection === "Caja")) ? "" : "hover:bg-slate-50"}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: 0, cursor: "pointer", fontSize: 13, fontWeight: (active === n.label || (n.label === "Caja" && active === "Configuración" && settingsSection === "Caja")) ? 600 : 500, color: (active === n.label || (n.label === "Caja" && active === "Configuración" && settingsSection === "Caja")) ? "#111827" : "#374151", background: (active === n.label || (n.label === "Caja" && active === "Configuración" && settingsSection === "Caja")) ? "#F1F5F9" : "transparent", textAlign: "left" }}>
              <n.icon size={16} />
              <span style={{ flex: 1 }}>{n.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
            <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>Cerrar sesión</span>
            <LogOut size={14} color="#CBD5E1" style={{ cursor: "pointer" }} onClick={() => { supabase.auth.signOut().then(() => { onSignOut(); navigate({ to: "/ingresar" }); }); }} />
          </div>
        </div>
      </aside>

      <main style={{ marginLeft: 240, flex: 1, minWidth: 0 }}>
        {active === "Entrenadores" ? (
          <CoachesPanel institutionId={institution.id} institutionMode={institution.mode} notify={notify} goToSuscripcion={goToSuscripcion} canWrite={canWrite} />
        ) : active === "Equipos" ? (
          <TeamsPanel institutionId={institution.id} notify={notify} />
        ) : active === "Clases" ? (
          <ClassesPanel institutionId={institution.id} notify={notify} />
        ) : active === "Calendario" ? (
          <PracticesPanel institutionId={institution.id} notify={notify} />
        ) : active === "Atletas" || active === "Socios" ? (
          <MembersPanel institutionId={institution.id} mode={institution.mode} notify={notify} goToSuscripcion={goToSuscripcion} canWrite={canWrite} />
        ) : active === "Reportes" ? (
          <ReportsPanel institutionId={institution.id} mode={institution.mode} />
        ) : active === "Configuración" ? (
          <SettingsPanel institution={institution} onSaved={setInstitution} section={settingsSection} setSection={setSettingsSection} canWrite={canWrite} />
        ) : active !== "Resumen" ? (
          <ComingSoon label={active} />
        ) : (
          <>
            <header style={{ padding: "28px 32px 0", marginBottom: 22 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800 }}>{institution.name}</h1>
              <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>{coaches.length} entrenadores · {members.length} {club ? "atletas" : "socios"}</p>
            </header>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: "0 32px", marginBottom: 22 }}>
              <Kpi label={club ? "Atletas activos" : "Socios activos"} Icon={Users} value={members.filter((m) => m.status === "active").length} />
              <Kpi label="Entrenadores" Icon={Dumbbell} value={coaches.length} />
              <Kpi label={club ? "Atletas pausados" : "Socios pausados"} Icon={Users2} value={members.filter((m) => m.status === "paused").length} />
            </section>
            <section style={{ padding: "0 32px 32px" }}>
              <div style={{ ...cardStyle, padding: 20 }}>
                <p style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>Equipos, {club ? "calendario de prácticas" : "clases"}, caja y reportes todavía no están conectados a datos reales — van en próximas vueltas.</p>
                <div className="flex" style={{ gap: 8 }}>
                  <button style={outlineBtn} onClick={() => setActive("Entrenadores")}>Ver entrenadores</button>
                  <button style={outlineBtn} onClick={() => setActive(club ? "Atletas" : "Socios")}>Ver {club ? "atletas" : "socios"}</button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {toast && <Toast text={toast} />}
    </div>
  );
}

function OnboardingFlow({ ownerId, onCreated }: { ownerId: string; onCreated: (i: Institution) => void }) {
  const [mode, setMode] = useState<InstitutionMode | null>(null);
  if (!mode) return <TypeSelector onChoose={setMode} />;
  return (
    <InstOnboarding
      mode={mode}
      onFinish={async (name) => {
        const inst = await createInstitution(ownerId, name, mode);
        onCreated(inst);
      }}
    />
  );
}

function InstitucionPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [permission, setPermission] = useState<"owner" | "full_access" | "read_only">("owner");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);
      const [{ data: profile }, access] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle(),
        fetchInstitutionAccessForUser(session.user.id),
      ]);
      setRole(profile?.role ?? null);
      if (access) {
        setInstitution(access.institution);
        setPermission(access.permission);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ minHeight: "100vh", background: "#F8FAFC" }} />;
  if (!userId) return <GateMessage text="Necesitás iniciar sesión para administrar tu institución." linkTo="/ingresar" linkLabel="Ingresar" />;
  if (!institution && role !== "institution") return <GateMessage text="Esta sección es para cuentas de institución (club o gimnasio). Tu cuenta actual es de coach individual." linkTo="/ingresar" linkLabel="Crear cuenta de institución" />;
  if (!institution) return <OnboardingFlow ownerId={userId} onCreated={setInstitution} />;

  return <Dashboard institution={institution} permission={permission} onSignOut={() => { setUserId(null); setInstitution(null); }} />;
}
