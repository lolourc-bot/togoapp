import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, CheckCircle, ChevronLeft, Share2, MapPin, MessageCircle, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { Sidebar } from "@/components/togo/Sidebar";
import { TopBar } from "@/components/togo/TopBar";
import { getCoachId } from "@/lib/programs";
import { uploadCoachProfilePhoto } from "@/lib/coach-photo";
import {
  fetchCoachMarketplaceProfile,
  fetchMyMarketplaceProfile,
  fetchCoachMarketplacePrograms,
  fetchMyMarketplacePrograms,
  upsertCoachMarketplaceProfile,
  updateProgramMarketplace,
  type MarketplaceCoach,
  type MarketplaceProgram,
  type Modality,
  type ProgramLevel,
  type PaymentType,
} from "@/lib/marketplace";
import { createDirectProgramPurchase } from "@/lib/marketplace-payments";

const MOD_COLOR: Record<Modality, string> = { Online: "#22C55E", Presencial: "#3B82F6", Ambas: "#7C3AED" };
const LEVEL: Record<ProgramLevel, [string, string]> = { Principiante: ["#F0FDF4", "#16A34A"], Intermedio: ["#FFFBEB", "#D97706"], Avanzado: ["#FEF2F2", "#EF4444"] };
const DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export const Route = createFileRoute("/perfil-coach/$coachId")({
  head: () => ({
    meta: [
      { title: "Perfil de coach · TOGO" },
      { name: "description", content: "Conocé al coach, sus programas y disponibilidad en TOGO." },
      { property: "og:title", content: "Perfil de coach · TOGO" },
      { property: "og:description", content: "Conocé al coach, sus programas y disponibilidad en TOGO." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoachProfile,
});

const card = { background: "#FFF", padding: 16, marginBottom: 8 } as const;
const h = { fontSize: 13, fontWeight: 700, color: "#111827" } as const;
const inputStyle = { width: "100%", border: "1px solid #E2E8F0", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "#111827", outline: "none" } as const;
const labelStyle = { display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 } as const;

function EditProfileModal({
  coachId,
  initial,
  onClose,
  onSaved,
}: {
  coachId: string;
  initial: MarketplaceCoach | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [modality, setModality] = useState<Modality>(initial?.modality ?? "Online");
  const [modalityText, setModalityText] = useState(initial?.modalityText ?? "");
  const [years, setYears] = useState(initial?.yearsExperience != null ? String(initial.yearsExperience) : "");
  const [chipsText, setChipsText] = useState((initial?.chips ?? []).join(", "));
  const [days, setDays] = useState<boolean[]>(initial?.availableDays ?? Array(7).fill(false));
  const [visible, setVisible] = useState(initial?.visible ?? false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.photoUrl ?? null);

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    setSaving(true);
    try {
      let photoUrl = initial?.photoUrl ?? null;
      if (photoFile) photoUrl = await uploadCoachProfilePhoto(coachId, photoFile);
      await upsertCoachMarketplaceProfile(coachId, {
        specialty, bio, modality, modalityText,
        yearsExperience: years.trim() ? Number(years) : null,
        chips: chipsText.split(",").map((c) => c.trim()).filter(Boolean),
        availableDays: days, visible, photoUrl,
      });
      toast.success("Perfil público actualizado ✓");
      onSaved();
      onClose();
    } catch {
      toast.error("No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="presentation" onClick={onClose} className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(15,23,42,0.4)", zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFF", borderRadius: 16, padding: 24, width: 440, maxHeight: "85vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Editar mi perfil público</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}><X size={16} /></button>
        </div>

        <div className="flex items-center justify-center" style={{ marginBottom: 16 }}>
          <label className="relative flex cursor-pointer items-center justify-center" style={{ width: 72, height: 72 }}>
            <div className="flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "#F1F5F9", overflow: "hidden" }}>
              {photoPreview ? (
                <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 24, fontWeight: 700, color: "#94A3B8" }}>{(initial?.name ?? "Vos").split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
              )}
            </div>
            <span className="absolute flex items-center justify-center rounded-full" style={{ bottom: -2, right: -2, width: 24, height: 24, backgroundColor: "#111827" }}>
              <Camera size={13} color="#FFFFFF" />
            </span>
            <input type="file" accept="image/*" hidden onChange={pickPhoto} aria-label="Foto de perfil" />
          </label>
        </div>

        <label style={labelStyle}>Especialidad</label>
        <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ej. Fuerza y potencia · Running" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelStyle}>Sobre mí</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Contá tu experiencia y enfoque de entrenamiento..." style={{ ...inputStyle, minHeight: 90, resize: "none", marginBottom: 14 }} />

        <label style={labelStyle}>Modalidad</label>
        <div className="flex" style={{ gap: 8, marginBottom: 10 }}>
          {(["Online", "Presencial", "Ambas"] as Modality[]).map((m) => (
            <button key={m} type="button" onClick={() => setModality(m)} style={{ flex: 1, height: 34, borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", background: modality === m ? "#111827" : "#F1F5F9", color: modality === m ? "#FFF" : "#64748B", cursor: "pointer" }}>{m}</button>
          ))}
        </div>
        <input value={modalityText} onChange={(e) => setModalityText(e.target.value)} placeholder="Ej. Online vía videollamada" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelStyle}>Años de experiencia</label>
        <input value={years} onChange={(e) => setYears(e.target.value.replace(/[^0-9]/g, ""))} placeholder="3" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelStyle}>Especialidades (separadas por coma)</label>
        <input value={chipsText} onChange={(e) => setChipsText(e.target.value)} placeholder="Fuerza, Hipertrofia, Running" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelStyle}>Días disponibles</label>
        <div className="flex" style={{ gap: 6, marginBottom: 16 }}>
          {DAYS.map((d, i) => (
            <button key={d} type="button" onClick={() => setDays((p) => p.map((v, x) => (x === i ? !v : v)))} className="flex items-center justify-center" style={{ flex: 1, height: 32, borderRadius: 8, fontSize: 10, fontWeight: 600, border: "none", background: days[i] ? "#111827" : "#F1F5F9", color: days[i] ? "#FFF" : "#94A3B8", cursor: "pointer" }}>{d[0]}</button>
          ))}
        </div>

        <label className="flex items-center" style={{ gap: 8, fontSize: 13, color: "#374151", marginBottom: 20 }}>
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Publicar mi perfil en el marketplace
        </label>

        <button type="button" disabled={saving} onClick={save} style={{ width: "100%", height: 44, background: "#111827", color: "#FFF", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Guardando…" : "Guardar perfil"}
        </button>
      </div>
    </div>
  );
}

const PROGRAM_PAYMENT_TYPE: PaymentType = "unico";

function EditProgramRow({ program, onSaved }: { program: MarketplaceProgram; onSaved: (p: MarketplaceProgram) => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(program.price ?? "");
  const [level, setLevel] = useState<ProgramLevel>(program.level ?? "Intermedio");
  const [visible, setVisible] = useState(program.visible);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const priceNum = Number(price.replace(/[^0-9.,]/g, "").replace(",", "."));
    if (visible && (!priceNum || priceNum <= 0)) {
      toast.error("Poné un precio para publicar el programa — no hay programas gratis en el marketplace");
      return;
    }
    setSaving(true);
    try {
      await updateProgramMarketplace(program.id, { price: price || null, paymentType: PROGRAM_PAYMENT_TYPE, level, visible });
      onSaved({ ...program, price: price || null, paymentType: PROGRAM_PAYMENT_TYPE, level, visible });
      toast.success(`"${program.name}" actualizado`);
      setEditing(false);
    } catch {
      toast.error("No se pudo actualizar el programa");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 14, width: 220, flexShrink: 0 }}>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{program.name}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: visible ? "#16A34A" : "#94A3B8" }}>{visible ? "Público" : "Oculto"}</span>
      </div>
      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{program.weeks ? `${program.weeks} semanas` : "Sin duración"}</div>
      {editing ? (
        <div className="flex flex-col" style={{ gap: 8, marginTop: 10 }}>
          <select value={level} onChange={(e) => setLevel(e.target.value as ProgramLevel)} style={{ ...inputStyle, height: 32 }}>
            {(["Principiante", "Intermedio", "Avanzado"] as ProgramLevel[]).map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$8.500" style={{ ...inputStyle, height: 32 }} />
          <label className="flex items-center" style={{ gap: 6, fontSize: 11, color: "#374151" }}>
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            Publicar en marketplace
          </label>
          <div className="flex" style={{ gap: 6 }}>
            <button type="button" onClick={() => setEditing(false)} style={{ flex: 1, height: 28, fontSize: 11, borderRadius: 6, border: "1px solid #E2E8F0", background: "#FFF", cursor: "pointer" }}>Cancelar</button>
            <button type="button" disabled={saving} onClick={save} style={{ flex: 1, height: 28, fontSize: 11, borderRadius: 6, border: "none", background: "#111827", color: "#FFF", cursor: "pointer" }}>{saving ? "..." : "Guardar"}</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginTop: 8 }}>{program.price || "Sin precio"}</div>
          <button type="button" onClick={() => setEditing(true)} style={{ fontSize: 11, color: "#3B82F6", marginTop: 4, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Editar</button>
        </>
      )}
    </div>
  );
}

function CoachProfile() {
  const { coachId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [profile, setProfile] = useState<MarketplaceCoach | null>(null);
  const [programs, setPrograms] = useState<MarketplaceProgram[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [sel, setSel] = useState(0);
  const [sending, setSending] = useState(false);
  const [myAthleteId, setMyAthleteId] = useState<string | null>(null);

  const load = async () => {
    const myCoachId = await getCoachId();
    const owner = myCoachId === coachId;
    setIsOwner(owner);
    const [prof, progs] = await Promise.all([
      owner ? fetchMyMarketplaceProfile(coachId) : fetchCoachMarketplaceProfile(coachId),
      owner ? fetchMyMarketplacePrograms(coachId) : fetchCoachMarketplacePrograms(coachId),
    ]);
    setProfile(prof);
    setPrograms(progs);
    if (!owner) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: athleteRow } = await supabase.from("athletes").select("id").eq("coach_id", coachId).eq("auth_user_id", user.id).maybeSingle();
        setMyAthleteId(athleteRow?.id ?? null);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [coachId]);

  const share = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    toast.success("Link del perfil copiado");
  };

  if (loading) {
    return isOwner
      ? <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}><Sidebar active="Marketplace" /><div /></div>
      : <PhoneFrame><div className="flex flex-1" /></PhoneFrame>;
  }

  if (isOwner) {
    const c: MarketplaceCoach = profile ?? {
      coachId, name: "Vos", photoUrl: null, bio: "", specialty: "", modality: null, modalityText: "",
      yearsExperience: null, chips: [], availableDays: Array(7).fill(false), athleteCount: 0, visible: false,
    };
    const initials = c.name.split(" ").map((p) => p[0]).join("");
    return (
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        <Sidebar active="Marketplace" />
        <div className="flex min-h-screen flex-col">
          <TopBar title="Mi perfil público" />
          <main className="flex-1 p-6" style={{ maxWidth: 760 }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center" style={{ gap: 14 }}>
                <span className="flex items-center justify-center overflow-hidden" style={{ width: 64, height: 64, borderRadius: 16, background: "#F1F5F9", fontSize: 22, fontWeight: 700, color: "#94A3B8", flexShrink: 0 }}>
                  {c.photoUrl ? <img src={c.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
                </span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: "#94A3B8" }}>{c.specialty || "Sin especialidad cargada"}</div>
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <button onClick={share} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border"><Share2 size={14} /> Compartir</button>
                <button onClick={() => setEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: "#111827" }}><Pencil size={14} /> Editar perfil</button>
              </div>
            </div>

            {!profile?.chips.length && !profile?.bio ? (
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 13, color: "#92400E" }}>
                Todavía no completaste tu perfil público. <button onClick={() => setEditingProfile(true)} style={{ color: "#92400E", fontWeight: 700, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Completarlo ahora</button>.
              </div>
            ) : profile && !profile.visible ? (
              <div style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 13, color: "#374151" }}>
                Vista previa: tu perfil todavía no está publicado en el marketplace. <button onClick={() => setEditingProfile(true)} style={{ color: "#111827", fontWeight: 700, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Publicarlo</button>.
              </div>
            ) : (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 13, color: "#166534" }}>
                Tu perfil está publicado en el marketplace.
              </div>
            )}

            <div className="flex" style={{ ...card, border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: 20 }}>
              {[[c.athleteCount, "atletas"], [c.yearsExperience ?? "—", "años exp."], [programs.length, "programas"]].map(([v, l], i, a) => (
                <div key={l} style={{ flex: 1, padding: "14px 0", textAlign: "center", borderRight: i < a.length - 1 ? "1px solid #F1F5F9" : 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{v}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>

            {c.chips.length ? (
              <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 20 }}>
                {c.chips.map((t) => <span key={t} style={{ border: "1px solid #E2E8F0", borderRadius: 20, padding: "5px 12px", fontSize: 12, color: "#374151" }}>{t}</span>)}
              </div>
            ) : null}

            {c.bio ? (
              <div style={{ ...card, border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: 20 }}>
                <div style={{ ...h, marginBottom: 8 }}>Sobre mí</div>
                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{c.bio}</p>
              </div>
            ) : null}

            <div style={{ ...card, border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: 20 }}>
              <div style={{ ...h, marginBottom: 12 }}>Programas</div>
              {programs.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94A3B8" }}>Todavía no tenés programas. Creá uno en Lab para poder publicarlo acá.</p>
              ) : (
                <div className="flex flex-wrap" style={{ gap: 10 }}>
                  {programs.map((p) => (
                    <EditProgramRow key={p.id} program={p} onSaved={(updated) => setPrograms((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...card, border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: 20 }}>
              <div style={{ ...h, marginBottom: 12 }}>Disponibilidad</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, maxWidth: 420 }}>
                {DAYS.map((d, i) => (
                  <div key={d} className="flex flex-col items-center" style={{ gap: 4 }}>
                    <span style={{ fontSize: 10, color: "#94A3B8" }}>{d}</span>
                    <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 16, fontSize: 11, fontWeight: 600, background: c.availableDays[i] ? "#111827" : "#F1F5F9", color: c.availableDays[i] ? "#FFF" : "#CBD5E1" }}>{d[0]}</span>
                  </div>
                ))}
              </div>
              {c.modalityText ? (
                <div className="flex items-center" style={{ gap: 8, marginTop: 14 }}>
                  <MapPin size={13} color="#94A3B8" /><span style={{ fontSize: 13, color: "#374151" }}>{c.modalityText}</span>
                </div>
              ) : null}
            </div>

            <div style={{ ...card, border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: 20 }}>
              <div style={{ ...h, marginBottom: 12 }}>Reseñas</div>
              <p style={{ fontSize: 13, color: "#94A3B8" }}>Todavía no hay reseñas.</p>
            </div>
          </main>
        </div>

        {editingProfile ? (
          <EditProfileModal coachId={coachId} initial={profile} onClose={() => setEditingProfile(false)} onSaved={load} />
        ) : null}
      </div>
    );
  }

  if (!profile && !isOwner) {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col items-center justify-center" style={{ padding: 32, gap: 8, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Este coach todavía no tiene un perfil público.</p>
          <Link to="/explorar" style={{ fontSize: 13, color: "#3B82F6" }}>Volver al Marketplace</Link>
        </div>
      </PhoneFrame>
    );
  }

  const c: MarketplaceCoach = profile ?? {
    coachId, name: "Vos", photoUrl: null, bio: "", specialty: "", modality: null, modalityText: "",
    yearsExperience: null, chips: [], availableDays: Array(7).fill(false), athleteCount: 0, visible: false,
  };
  const initials = c.name.split(" ").map((p) => p[0]).join("");
  const visiblePrograms = programs;
  const selectedProgram = visiblePrograms[sel];
  const selectedPriceNum = selectedProgram?.price ? Number(String(selectedProgram.price).replace(/[^0-9]/g, "")) : 0;
  const isPaidProgram = selectedProgram?.paymentType === "unico" && selectedPriceNum > 0;

  const buyNow = async () => {
    if (!selectedProgram) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) { toast.error("Iniciá sesión para comprar"); setSending(false); return; }
      const metaName = user.user_metadata?.["full_name"] as string | undefined;
      let buyerName = metaName;
      if (!buyerName) {
        const { data: athleteRow } = await supabase.from("athletes").select("full_name").eq("coach_id", coachId).eq("email", email).limit(1).maybeSingle();
        buyerName = athleteRow?.full_name ?? email.split("@")[0];
      }
      const { purchaseId } = await createDirectProgramPurchase({ data: { coachId, programId: selectedProgram.id, buyerName: buyerName ?? email, buyerEmail: email } });
      window.location.href = `/completar-pago/${purchaseId}`;
    } catch {
      toast.error("No se pudo iniciar la compra");
      setSending(false);
    }
  };

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto" style={{ paddingBottom: 80 }}>
        <div className="flex items-center" style={{ position: "sticky", top: 0, background: "#FFF", borderBottom: "1px solid #E2E8F0", padding: "12px 16px", zIndex: 10, gap: 12 }}>
          <Link to="/explorar" aria-label="Volver"><ChevronLeft size={22} color="#111827" /></Link>
          <span style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: "#111827" }}>Perfil</span>
          {isOwner ? (
            <button onClick={() => setEditingProfile(true)} aria-label="Editar mi perfil" style={{ background: "none", border: "none", cursor: "pointer" }}><Pencil size={18} color="#CBD5E1" /></button>
          ) : null}
          <button onClick={share} aria-label="Compartir perfil" style={{ background: "none", border: "none", cursor: "pointer" }}><Share2 size={18} color="#CBD5E1" /></button>
        </div>

        {isOwner && !profile?.chips.length && !profile?.bio ? (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 14, margin: 16, fontSize: 12, color: "#92400E" }}>
            Todavía no completaste tu perfil público. <button onClick={() => setEditingProfile(true)} style={{ color: "#92400E", fontWeight: 700, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Completarlo ahora</button>.
          </div>
        ) : isOwner && profile && !profile.visible ? (
          <div style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, margin: 16, fontSize: 12, color: "#374151" }}>
            Esto es una vista previa: tu perfil todavía no está publicado en el marketplace. <button onClick={() => setEditingProfile(true)} style={{ color: "#111827", fontWeight: 700, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Publicarlo</button>.
          </div>
        ) : null}

        <div style={{ background: "#FFF", padding: "24px 16px 20px", marginBottom: 8 }}>
          <div className="flex items-start" style={{ gap: 14, marginBottom: 16 }}>
            <span className="flex items-center justify-center overflow-hidden" style={{ width: 72, height: 72, borderRadius: 16, background: "#F1F5F9", fontSize: 24, fontWeight: 700, color: "#94A3B8", flexShrink: 0 }}>
              {c.photoUrl ? <img src={c.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
            </span>
            <div className="flex flex-col" style={{ flex: 1, gap: 6 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{c.name}</div>
              <div style={{ fontSize: 13, color: "#94A3B8" }}>{c.specialty || "Sin especialidad cargada"}</div>
              {c.modality ? (
                <div className="flex items-center" style={{ gap: 6 }}>
                  <span style={{ fontSize: 12, color: MOD_COLOR[c.modality] }}>{c.modality}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex" style={{ borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9", marginBottom: 16 }}>
            {[[c.athleteCount, "atletas"], [c.yearsExperience ?? "—", "años exp."], [visiblePrograms.length, "programas"]].map(([v, l], i, a) => (
              <div key={l} style={{ flex: 1, padding: "12px 0", textAlign: "center", borderRight: i < a.length - 1 ? "1px solid #F1F5F9" : 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{v}</div>
                <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
          {c.chips.length ? (
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {c.chips.map((t) => <span key={t} style={{ border: "1px solid #E2E8F0", borderRadius: 20, padding: "5px 12px", fontSize: 11, color: "#374151" }}>{t}</span>)}
            </div>
          ) : null}
        </div>

        {c.bio ? (
          <div style={card}>
            <div style={{ ...h, marginBottom: 8 }}>Sobre mí</div>
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{c.bio}</p>
          </div>
        ) : null}

        <div style={card}>
          <div style={{ ...h, marginBottom: 12 }}>Programas</div>
          {visiblePrograms.length === 0 ? (
            <p style={{ fontSize: 12, color: "#94A3B8" }}>
              {isOwner ? "Todavía no tenés programas. Creá uno en Lab para poder publicarlo acá." : "Este coach no publicó programas todavía."}
            </p>
          ) : (
            <div className="flex" style={{ gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {isOwner
                ? visiblePrograms.map((p) => (
                    <EditProgramRow key={p.id} program={p} onSaved={(updated) => setPrograms((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
                  ))
                : visiblePrograms.map((p, i) => (
                    <div key={p.id} className="flex flex-col" style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 14, width: 200, flexShrink: 0, gap: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>{p.weeks ? `${p.weeks} semanas` : ""}</div>
                      {p.level ? <span style={{ alignSelf: "flex-start", fontSize: 10, borderRadius: 20, padding: "2px 8px", background: LEVEL[p.level][0], color: LEVEL[p.level][1] }}>{p.level}</span> : null}
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginTop: 4 }}>{p.price || "Consultar precio"}</div>
                      <button onClick={() => { setSel(i); setSheet(true); }} style={{ fontSize: 11, color: "#3B82F6", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Ver programa</button>
                    </div>
                  ))}
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ ...h, marginBottom: 12 }}>Disponibilidad</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {DAYS.map((d, i) => (
              <div key={d} className="flex flex-col items-center" style={{ gap: 4 }}>
                <span style={{ fontSize: 9, color: "#94A3B8" }}>{d}</span>
                <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 16, fontSize: 11, fontWeight: 600, background: c.availableDays[i] ? "#111827" : "#F1F5F9", color: c.availableDays[i] ? "#FFF" : "#CBD5E1" }}>{d[0]}</span>
              </div>
            ))}
          </div>
          {c.modalityText ? (
            <div className="flex items-center" style={{ gap: 8, marginTop: 12 }}>
              <MapPin size={13} color="#94A3B8" /><span style={{ fontSize: 12, color: "#374151" }}>{c.modalityText}</span>
            </div>
          ) : null}
        </div>

        <div style={card}>
          <div className="flex items-center" style={{ marginBottom: 12 }}>
            <span style={{ ...h, flex: 1 }}>Reseñas</span>
          </div>
          <p style={{ fontSize: 12, color: "#94A3B8" }}>Todavía no hay reseñas.</p>
        </div>
      </div>

      {!isOwner ? (
        <>
          <div className="flex" style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#FFF", borderTop: "1px solid #E2E8F0", padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", gap: 10, zIndex: 20 }}>
            {myAthleteId ? (
              <Link to="/chat/$coachId" params={{ coachId }} search={{ athleteId: myAthleteId }} className="flex items-center justify-center" style={{ flex: 1, border: "1px solid #E2E8F0", borderRadius: 12, height: 48, fontSize: 14, fontWeight: 600, color: "#374151", gap: 6 }}>
                <MessageCircle size={16} color="#94A3B8" /> Enviar mensaje
              </Link>
            ) : null}
            <button onClick={() => setSheet(true)} disabled={visiblePrograms.length === 0} style={{ flex: 1, background: visiblePrograms.length === 0 ? "#CBD5E1" : "#111827", color: "#FFF", borderRadius: 12, height: 48, fontSize: 14, fontWeight: 700, border: "none", cursor: visiblePrograms.length === 0 ? "default" : "pointer" }}>Contratar</button>
          </div>

          <div onClick={() => setSheet(false)} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)", opacity: sheet ? 1 : 0, pointerEvents: sheet ? "auto" : "none", transition: "opacity .25s", zIndex: 30 }} />
          <div className="flex flex-col" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "70%", background: "#FFF", borderRadius: "20px 20px 0 0", transform: sheet ? "translateY(0)" : "translateY(100%)", transition: "transform .3s ease", zIndex: 40 }}>
            <div style={{ width: 36, height: 4, background: "#E2E8F0", borderRadius: 2, margin: "12px auto" }} />
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", fontSize: 16, fontWeight: 700, color: "#111827" }}>Contratar a {c.name}</div>
            <div className="flex flex-col" style={{ padding: 20, gap: 16, flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Seleccioná un programa</div>
              <div className="flex flex-col" style={{ gap: 8 }}>
                {visiblePrograms.map((p, i) => (
                  <button key={p.id} onClick={() => setSel(i)} className="flex items-center" style={{ border: `1px solid ${sel === i ? "#111827" : "#E2E8F0"}`, borderRadius: 12, padding: 14, gap: 12, textAlign: "left", background: "none", cursor: "pointer" }}>
                    <span className="flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 9, border: `1.5px solid ${sel === i ? "#111827" : "#CBD5E1"}`, flexShrink: 0 }}>
                      {sel === i && <span style={{ width: 8, height: 8, borderRadius: 4, background: "#111827" }} />}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.name}</span>
                      <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>{p.weeks ? `${p.weeks} semanas` : ""}</span>
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{p.price || "Consultar"}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: "16px 20px", borderTop: "1px solid #F1F5F9" }}>
              <button
                disabled={sending || !isPaidProgram}
                onClick={buyNow}
                style={{ width: "100%", background: isPaidProgram ? "#111827" : "#CBD5E1", color: "#FFF", borderRadius: 12, height: 50, fontSize: 15, fontWeight: 700, border: "none", cursor: isPaidProgram ? "pointer" : "default", opacity: sending ? 0.7 : 1 }}
              >
                {sending ? "Un momento…" : isPaidProgram ? `Comprar · ${selectedProgram?.price}` : "Precio no definido"}
              </button>
              <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", marginTop: 8 }}>Pagás ahora y el programa te aparece en tu calendario al toque, sin esperar a que el coach confirme.</div>
            </div>
          </div>
        </>
      ) : null}

      {editingProfile ? (
        <EditProfileModal coachId={coachId} initial={profile} onClose={() => setEditingProfile(false)} onSaved={load} />
      ) : null}
    </PhoneFrame>
  );
}
