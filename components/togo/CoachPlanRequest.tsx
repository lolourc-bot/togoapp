import { useEffect, useState } from "react";
import { Activity, Calendar, CheckCircle, ChevronRight, Clock, Dumbbell, Heart, MoreHorizontal, PartyPopper, Target, TrendingDown, TrendingUp, Trophy, User, X } from "lucide-react";
import { ME, markSeen, submitRequest, useCoachRequests } from "@/lib/coach-requests";
import { useUserContext } from "@/lib/user-context";

const GOALS = [
  { label: "Ganar masa muscular", Icon: Dumbbell },
  { label: "Bajar de peso", Icon: TrendingDown },
  { label: "Mejorar resistencia", Icon: Activity },
  { label: "Rendimiento deportivo", Icon: Trophy },
  { label: "Rehabilitación / Salud", Icon: Heart },
  { label: "Otro", Icon: MoreHorizontal },
];
const DISMISS_KEY = "togo-coach-banner-dismissed";

export function useMyCoachRequest() {
  return useCoachRequests().find((r) => r.member === ME);
}

const btn = (enabled = true): React.CSSProperties => ({ width: "calc(100% - 40px)", margin: "20px 20px 0", height: 52, borderRadius: 14, background: enabled ? "#111827" : "#CBD5E1", color: "#FFF", fontSize: 14, fontWeight: 600, border: 0, cursor: enabled ? "pointer" : "default" });
const link: React.CSSProperties = { display: "block", margin: "10px auto 0", fontSize: 12, color: "#94A3B8", background: "none", border: 0, cursor: "pointer" };
const q: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#374151", margin: "16px 20px 8px" };

export function CoachPlanSheet({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<string[]>([]);
  const [days, setDays] = useState<number | null>(null);
  const [exp, setExp] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  const toggle = (g: string) => setGoals((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));
  const send = () => { submitRequest({ goals, days: days ?? 3, experience: exp ?? "Principiante", notes }); setSent(true); };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#FFF", borderRadius: "20px 20px 0 0", maxHeight: "85%", overflowY: "auto", paddingBottom: 32 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E2E8F0", margin: "10px auto 0" }} />
        {sent ? (
          <div style={{ textAlign: "center", padding: "28px 0 0" }}>
            <CheckCircle size={52} color="#22C55E" style={{ margin: "0 auto", animation: "togo-pop .35s ease-out" }} />
            <style>{"@keyframes togo-pop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}"}</style>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginTop: 16 }}>¡Solicitud enviada!</div>
            <div style={{ fontSize: 13, color: "#94A3B8", margin: "4px 20px 4px", lineHeight: 1.6 }}>El gym revisará tu perfil y te asignará un coach. Te avisamos cuando esté listo.</div>
            <button onClick={onClose} style={btn()}>Entendido</button>
          </div>
        ) : (
          <>
            <div style={{ height: 3, background: "#F1F5F9", borderRadius: 2, margin: "14px 20px 0" }}>
              <div style={{ height: 3, width: `${(step / 3) * 100}%`, background: "#111827", borderRadius: 2, transition: "width .3s" }} />
            </div>
            {step === 1 && (
              <>
                <div style={{ padding: "20px 20px 8px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Contanos sobre vos</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Paso 1 de 3</div>
                </div>
                <div style={q}>¿Cuál es tu objetivo principal?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 20px" }}>
                  {GOALS.map(({ label, Icon }) => {
                    const on = goals.includes(label);
                    return (
                      <button key={label} onClick={() => toggle(label)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, border: `1px solid ${on ? "#111827" : "#E2E8F0"}`, background: "#FFF", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ width: 32, height: 32, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={18} color="#374151" /></span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{label}</span>
                        <CheckCircle size={16} color={on ? "#22C55E" : "#CBD5E1"} style={{ marginLeft: "auto" }} />
                      </button>
                    );
                  })}
                </div>
                <button disabled={!goals.length} onClick={() => setStep(2)} style={btn(goals.length > 0)}>Continuar</button>
              </>
            )}
            {step === 2 && (
              <>
                <div style={{ padding: "20px 20px 0" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Disponibilidad</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Paso 2 de 3</div>
                </div>
                <div style={q}>¿Cuántos días por semana podés entrenar?</div>
                <div style={{ display: "flex", gap: 8, padding: "0 20px", justifyContent: "center" }}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button key={n} onClick={() => setDays(n)} style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${days === n ? "#111827" : "#E2E8F0"}`, background: days === n ? "#111827" : "#FFF", color: days === n ? "#FFF" : "#374151", fontSize: 20, fontWeight: 700, cursor: "pointer" }}>{n}</button>
                  ))}
                </div>
                <div style={q}>¿Tenés experiencia entrenando?</div>
                <div style={{ display: "flex", gap: 8, padding: "0 20px" }}>
                  {["Principiante", "Intermedio", "Avanzado"].map((e) => (
                    <button key={e} onClick={() => setExp(e)} style={{ border: `1px solid ${exp === e ? "#111827" : "#E2E8F0"}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, background: exp === e ? "#111827" : "#FFF", color: exp === e ? "#FFF" : "#374151", cursor: "pointer" }}>{e}</button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#94A3B8", margin: "16px 20px 6px" }}>¿Algo más que quieras contarle a tu futuro coach?</div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Lesiones, preferencias, horarios disponibles…" style={{ display: "block", width: "calc(100% - 40px)", height: 80, border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, margin: "0 20px", fontSize: 13, color: "#374151", resize: "none" }} />
                <button disabled={!days || !exp} onClick={() => setStep(3)} style={{ ...btn(!!days && !!exp), marginTop: 16 }}>Continuar</button>
                <button onClick={() => setStep(1)} style={link}>Atrás</button>
              </>
            )}
            {step === 3 && (
              <>
                <svg viewBox="0 0 240 100" style={{ display: "block", height: 100, margin: "16px auto 0" }}>
                  {[[50, Dumbbell], [120, User], [190, Calendar]].map(([x, I], i) => {
                    const Ic = I as typeof User;
                    return (
                      <g key={i}>
                        <circle cx={x as number} cy={50} r={28} fill={i === 1 ? "#111827" : "#F1F5F9"} stroke="#FFF" strokeWidth={3} />
                        <foreignObject x={(x as number) - 11} y={39} width={22} height={22}><Ic size={22} color={i === 1 ? "#FFF" : "#374151"} /></foreignObject>
                      </g>
                    );
                  })}
                  <path d="M80 50h8M150 50h8" stroke="#CBD5E1" strokeWidth={2} markerEnd="url(#a)" />
                  <defs><marker id="a" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="#CBD5E1" /></marker></defs>
                </svg>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", textAlign: "center", margin: "16px 20px 4px" }}>¡Casi listo!</div>
                <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", margin: "0 20px 20px", lineHeight: 1.6 }}>Tu solicitud le llegará al equipo de CrossFit Palermo. Te asignarán un coach según tu perfil y objetivos.</div>
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "14px 16px", margin: "0 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                  {[[Target, goals.join(", ")], [Calendar, `${days} días por semana`], [TrendingUp, exp]].map(([I, t], i) => {
                    const Ic = I as typeof User;
                    return <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}><Ic size={12} color="#CBD5E1" />{t as string}</div>;
                  })}
                </div>
                <button onClick={send} style={{ ...btn(), fontSize: 15, fontWeight: 700 }}>Enviar solicitud</button>
                <button onClick={onClose} style={{ ...link, marginTop: 12 }}>Cancelar</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Inicio banner: request CTA → pending card → coach-assigned notice. Gym members only. */
export function CoachPlanBanner({ onOpen }: { onOpen: () => void }) {
  const ctx = useUserContext();
  const req = useMyCoachRequest();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => setDismissed(localStorage.getItem(DISMISS_KEY) === "1"), []);
  if (ctx.type !== "gym_member" || ctx.alsoCoached) return null;
  const wrap: React.CSSProperties = { borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 14, margin: "16px 16px 0", position: "relative" };

  if (req?.coach) {
    if (req.seenByMember) return null;
    return (
      <div style={{ ...wrap, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><PartyPopper size={18} color="#16A34A" /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>¡Ya tenés tu coach!</div>
          <div style={{ fontSize: 11, color: "#15803D", lineHeight: 1.4 }}>{req.coach} te acompañará en tu planificación. Mirá la pestaña Calendario.</div>
        </div>
        <button aria-label="Cerrar" onClick={markSeen} style={{ position: "absolute", top: 8, right: 8, background: "none", border: 0, cursor: "pointer" }}><X size={14} color="#86EFAC" /></button>
      </div>
    );
  }
  if (req) {
    return (
      <div style={{ ...wrap, gap: 12, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Clock size={18} color="#D97706" /></span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Solicitud enviada</div>
          <div style={{ fontSize: 11, color: "#B45309", lineHeight: 1.4 }}>El gym está revisando tu perfil. Te notificamos cuando te asignen un coach.</div>
        </div>
      </div>
    );
  }
  if (dismissed) return null;
  return (
    <div onClick={onOpen} style={{ ...wrap, background: "#FFF", border: "1px solid #E2E8F0", cursor: "pointer" }}>
      <span style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, #111827 0%, #374151 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Dumbbell size={20} color="#FFF" /></span>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>¿Querés entrenar con un plan?</span>
        <span style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.4 }}>Sumá planificación personalizada con un coach del gym.</span>
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 600, color: "#111827", marginTop: 10 }}>Ver más<ChevronRight size={12} color="#CBD5E1" /></span>
      <button aria-label="Descartar" onClick={(e) => { e.stopPropagation(); localStorage.setItem(DISMISS_KEY, "1"); setDismissed(true); }} style={{ position: "absolute", top: 8, right: 8, background: "none", border: 0, cursor: "pointer" }}><X size={14} color="#CBD5E1" /></button>
    </div>
  );
}
