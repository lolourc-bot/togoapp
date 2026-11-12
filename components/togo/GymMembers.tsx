import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { COACHES, MEMBER_NAMES, initials } from "@/lib/gym-classes";
import { assignCoach, useCoachRequests, type CoachRequest } from "@/lib/coach-requests";

type Filter = "Todos" | "Activos" | "Inactivos" | "Solicitan coach";
const PLANS = ["Plan Básico", "Plan Pro", "Plan Elite"];
const INACTIVE = new Set(["Agustina Esposito", "Bruno Pereyra", "Gonzalo Zárate"]);
const COACH_INFO: Record<string, { spec: string; color: string; load: number }> = {
  "Martín Gutiérrez": { spec: "Fuerza · CrossFit", color: "#EF4444", load: 8 },
  "Lucía Fernández": { spec: "Yoga · Movilidad", color: "#8B5CF6", load: 5 },
  "Diego Romero": { spec: "Hipertrofia", color: "#3B82F6", load: 14 },
  "Camila Sosa": { spec: "Funcional · Pérdida de peso", color: "#22C55E", load: 6 },
  "Joaquín Paz": { spec: "Running · Resistencia", color: "#F59E0B", load: 12 },
  "Valentina Ruiz": { spec: "Rehabilitación", color: "#06B6D4", load: 3 },
};
const COLS = "2fr 1fr 90px 1.4fr";

export function GymMembers({ notify, initialFilter = "Todos" }: { notify: (m: string) => void; initialFilter?: Filter }) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const requests = useCoachRequests();
  const [assigning, setAssigning] = useState<CoachRequest | null>(null);
  const reqOf = (n: string) => requests.find((r) => r.member === n);
  const names = [...new Set([...MEMBER_NAMES, ...requests.map((r) => r.member)])];
  const rows = names.filter((n) =>
    filter === "Todos" ? true : filter === "Activos" ? !INACTIVE.has(n) : filter === "Inactivos" ? INACTIVE.has(n) : !!reqOf(n),
  );
  const pending = requests.filter((r) => !r.coach).length;

  return (
    <div style={{ padding: "28px 32px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Socios</h1>
      <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>{names.length} socios · {pending} solicitudes de coach sin asignar</p>
      <div style={{ display: "flex", gap: 8, margin: "18px 0 14px" }}>
        {(["Todos", "Activos", "Inactivos", "Solicitan coach"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ height: 30, padding: "0 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${filter === f ? "#111827" : "#E2E8F0"}`, background: filter === f ? "#111827" : "#FFF", color: filter === f ? "#FFF" : "#374151" }}>
            {f}{f === "Solicitan coach" && pending ? ` · ${pending}` : ""}
          </button>
        ))}
      </div>
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#94A3B8", borderBottom: "1px solid #E2E8F0" }}>
          <span>Socio</span><span>Plan</span><span>Estado</span><span>Coach asignado</span>
        </div>
        {rows.map((n, i) => {
          const r = reqOf(n);
          return (
            <div key={n} style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #F1F5F9", fontSize: 13 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#F1F5F9", fontSize: 11, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(n)}</span>
                <span style={{ color: "#111827", fontWeight: 500 }}>{n}</span>
              </span>
              <span style={{ fontSize: 12, color: "#374151" }}>{PLANS[i % 3]}</span>
              <span style={{ fontSize: 11, color: INACTIVE.has(n) ? "#94A3B8" : "#16A34A" }}>{INACTIVE.has(n) ? "Inactivo" : "Activo"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!r ? <span style={{ fontSize: 12, color: "#CBD5E1" }}>—</span> : r.coach ? (
                  <>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#111827", color: "#FFF", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(r.coach)}</span>
                    <span style={{ fontSize: 12, color: "#374151" }}>{r.coach}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>— Sin asignar</span>
                    <button onClick={() => setAssigning(r)} style={{ background: "#111827", color: "#FFF", borderRadius: 6, height: 26, padding: "0 10px", fontSize: 11, fontWeight: 600, border: 0, cursor: "pointer" }}>Asignar</button>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
      {assigning && (
        <AssignModal req={assigning} onClose={() => setAssigning(null)} onDone={(coach, msg) => { assignCoach(assigning.id, coach, msg); notify("Entrenador asignado ✓"); setAssigning(null); }} />
      )}
    </div>
  );
}

export function AssignModal({ req, onClose, onDone }: { req: CoachRequest; onClose: () => void; onDone: (coach: string, msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [coach, setCoach] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, background: "#FFF", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}>
        <div style={{ background: "#111827", borderRadius: "16px 16px 0 0", padding: "18px 24px", display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#FFF", flex: 1 }}>Asignar coach</span>
          <button aria-label="Cerrar" onClick={onClose} style={{ background: "none", border: 0, cursor: "pointer" }}><X size={16} color="#FFF" /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 14px" }}>
            <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "none", border: 0, cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#E2E8F0", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(req.member)}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111827" }}>{req.member}</span>
                <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>Solicita coaching personalizado</span>
              </span>
              <ChevronDown size={12} color="#CBD5E1" style={{ transform: open ? "rotate(180deg)" : undefined }} />
            </button>
            {open && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#374151", display: "flex", flexDirection: "column", gap: 4, paddingLeft: 48 }}>
                <span><b>Objetivos:</b> {req.goals.join(", ")}</span>
                <span><b>Días por semana:</b> {req.days}</span>
                <span><b>Experiencia:</b> {req.experience}</span>
                {req.notes && <span><b>Notas:</b> {req.notes}</span>}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Elegir coach</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
              {COACHES.map((c) => {
                const info = COACH_INFO[c] ?? { spec: "General", color: "#94A3B8", load: 5 };
                const on = coach === c;
                return (
                  <button key={c} onClick={() => setCoach(c)} className="hover:border-slate-300" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${on ? "#111827" : "#E2E8F0"}`, background: "#FFF", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", background: "#F1F5F9", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {initials(c)}
                      <span style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: info.color, border: "1.5px solid #FFF" }} />
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827" }}>{c}</span>
                      <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>{info.spec}</span>
                      <span style={{ display: "block", fontSize: 10, color: "#CBD5E1" }}>{info.load} atletas activos</span>
                    </span>
                    <span style={{ fontSize: 10, color: info.load >= 10 ? "#EAB308" : "#22C55E" }}>{info.load >= 10 ? `Cargado (${info.load} atletas)` : "Disponible"}</span>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${on ? "#111827" : "#E2E8F0"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#111827" }} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>Mensaje de bienvenida (opcional)</div>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ej. ¡Hola! Soy Martín, tu nuevo coach. Esta semana empezamos con una evaluación…" style={{ width: "100%", height: 72, border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, fontSize: 13, color: "#374151", resize: "none" }} />
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ height: 42, padding: "0 18px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFF", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          <button disabled={!coach} onClick={() => coach && onDone(coach, msg)} style={{ height: 42, padding: "0 22px", borderRadius: 10, border: 0, background: coach ? "#111827" : "#CBD5E1", color: "#FFF", fontSize: 13, fontWeight: 600, cursor: coach ? "pointer" : "default" }}>Asignar coach</button>
        </div>
      </div>
    </div>
  );
}
