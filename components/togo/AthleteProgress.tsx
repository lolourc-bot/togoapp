import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, Search, Trophy, X, Zap } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchAthleteProgress, computeProfileStats, parseWeight, type AthleteProgressRaw } from "@/lib/athlete-progress";

const PERIODS = ["1 mes", "3 meses", "6 meses", "1 año"] as const;
const PERIOD_DAYS: Record<string, number> = { "1 mes": 30, "3 meses": 90, "6 meses": 180, "1 año": 365 };
const METRICS = ["Peso", "Reps", "Volumen"] as const;
type Metric = (typeof METRICS)[number];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type Rec = { date: Date; sets: number; reps: number; weight: number; volume: number; note: string };

function realRecords(raw: AthleteProgressRaw, exercise: string, periodDays: number): Rec[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - periodDays);
  const out: Rec[] = [];
  for (const s of raw.sessions) {
    if (s.status !== "done") continue;
    const d = new Date(`${s.date}T00:00`);
    if (d < cutoff) continue;
    const item = s.items.find((i) => i.name === exercise);
    if (!item) continue;
    const sets = (raw.setsBySession[s.id] ?? []).filter((x) => x.itemId === item.id && x.done);
    if (!sets.length) continue;
    let topWeight = 0;
    let topReps = 0;
    let volume = 0;
    let note = "";
    for (const set of sets) {
      const w = parseWeight(set.weight) ?? 0;
      const r = parseInt(set.reps, 10) || 0;
      volume += w * r;
      if (w >= topWeight) {
        topWeight = w;
        topReps = r;
      }
    }
    out.push({ date: d, sets: sets.length, reps: topReps, weight: topWeight, volume, note });
  }
  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}

const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const num = (v: number) => v.toLocaleString("es-AR");
const value = (r: Rec, m: Metric) => (m === "Peso" ? r.weight : m === "Reps" ? r.reps : r.volume);
const unit = (m: Metric) => (m === "Peso" ? "kg" : m === "Reps" ? "reps" : "kg");

const chip = (on: boolean): React.CSSProperties => ({
  border: "1px solid",
  borderColor: on ? "#111827" : "#E2E8F0",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 12,
  backgroundColor: on ? "#111827" : "#FFFFFF",
  color: on ? "#FFFFFF" : "#374151",
  cursor: "pointer",
});

function ExerciseSelect({
  value: sel,
  onChange,
  options,
  dashed,
  exclude,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: string[];
  dashed?: boolean;
  exclude?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const items = options.filter((i) => i !== exclude && (!t || i.toLowerCase().includes(t)));
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQ("");
        }}
        className="flex items-center justify-between"
        style={{ gap: 8, border: `1px ${dashed ? "dashed" : "solid"} ${dashed ? "#3B82F6" : "#E2E8F0"}`, borderRadius: 10, height: 40, padding: "0 14px", backgroundColor: "#FFFFFF", cursor: "pointer", minWidth: 220 }}
      >
        <span style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? "#111827" : "#94A3B8" }}>{sel ?? "Seleccionar ejercicio…"}</span>
        <ChevronDown size={12} color="#CBD5E1" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0" style={{ zIndex: 29 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: 44, left: 0, zIndex: 30, minWidth: 280, backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", overflow: "hidden" }}>
            <div className="relative">
              <Search size={12} color="#CBD5E1" style={{ position: "absolute", left: 14, top: 12 }} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio…" aria-label="Buscar ejercicio" style={{ width: "100%", height: 36, border: "none", borderBottom: "1px solid #E2E8F0", padding: "0 12px 0 36px", fontSize: 13, outline: "none" }} />
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto", padding: "4px 0" }}>
              {items.length === 0 ? (
                <div style={{ padding: "12px", fontSize: 12, color: "#94A3B8" }}>Sin ejercicios registrados todavía.</div>
              ) : (
                items.map((i) => (
                  <button key={i} type="button" onClick={() => { onChange(i); setOpen(false); }} className="block w-full text-left hover:bg-[#F8FAFC]" style={{ padding: "8px 12px", fontSize: 13, color: "#374151", background: i === sel ? "#F8FAFC" : undefined, border: "none", cursor: "pointer" }}>
                    {i}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ icon, label, big, sub }: { icon: React.ReactNode; label: string; big: string; sub: string }) {
  return (
    <div className="flex flex-col" style={{ backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 16, gap: 6 }}>
      <div className="flex items-center" style={{ gap: 8, fontSize: 12, color: "#374151", fontWeight: 500 }}>{icon}{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>{big}</div>
      <div style={{ fontSize: 11, color: "#94A3B8" }}>{sub}</div>
    </div>
  );
}

export function AthleteProgress({ athleteId }: { athleteId: string }) {
  const [raw, setRaw] = useState<AthleteProgressRaw>({ sessions: [], setsBySession: {} });
  const [ex, setEx] = useState<string | null>(null);
  const [ex2, setEx2] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [period, setPeriod] = useState<string>("3 meses");
  const [metric, setMetric] = useState<Metric>("Peso");

  useEffect(() => {
    fetchAthleteProgress(athleteId).then(setRaw);
  }, [athleteId]);

  const exerciseNames = useMemo(() => [...new Set(raw.sessions.flatMap((s) => s.items.map((i) => i.name)))].sort(), [raw]);
  const stats = useMemo(() => computeProfileStats(raw), [raw]);

  const periodDays = PERIOD_DAYS[period] ?? 90;
  const recs = useMemo(() => (ex ? realRecords(raw, ex, periodDays) : []), [raw, ex, periodDays]);
  const recs2 = useMemo(() => (ex2 ? realRecords(raw, ex2, periodDays) : []), [raw, ex2, periodDays]);
  const data = recs.map((r, i) => ({ label: fmt(r.date), a: value(r, metric), ...(recs2[i] ? { b: value(recs2[i]!, metric) } : {}) }));
  const allVals = data.flatMap((d) => [d.a, d.b ?? 0]);
  const yMax = allVals.length ? Math.ceil((Math.max(...allVals) * 1.1) / 4) * 4 : 100;
  const pr = recs.length ? Math.max(...recs.map((r) => r.weight)) : 0;
  const last5 = [...recs].reverse().slice(0, 5);

  return (
    <div className="flex flex-col" style={{ flex: 1, overflowY: "auto", padding: "24px 32px", gap: 20 }}>
      <div className="flex flex-wrap items-center" style={{ gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Ejercicio:</span>
        <ExerciseSelect value={ex} onChange={setEx} options={exerciseNames} exclude={ex2} />
        {compare ? (
          <div className="flex items-center" style={{ gap: 6 }}>
            <ExerciseSelect value={ex2} onChange={setEx2} options={exerciseNames} dashed exclude={ex} />
            <button type="button" aria-label="Quitar comparación" onClick={() => { setCompare(false); setEx2(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={14} color="#94A3B8" />
            </button>
          </div>
        ) : null}
        <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }}>Período:</span>
        <div className="flex" style={{ gap: 6 }}>
          {PERIODS.map((p) => (
            <button key={p} type="button" onClick={() => setPeriod(p)} style={chip(period === p)}>{p}</button>
          ))}
        </div>
        {!compare ? (
          <button type="button" onClick={() => setCompare(true)} style={{ fontSize: 12, color: "#3B82F6", background: "none", border: "none", cursor: "pointer" }}>
            + Comparar con otro ejercicio
          </button>
        ) : null}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Stat icon={<Calendar size={18} color="#94A3B8" />} label="Sesiones completadas" big={String(stats.sessionsCount)} sub="Últimos ~3 meses" />
        <Stat icon={<Zap size={18} color="#D97706" />} label="Racha actual" big={`${stats.weekStreak} semanas`} sub="sin faltar" />
        <Stat icon={<Trophy size={18} color="#D97706" />} label="En su mejor marca" big={String(stats.prCount)} sub="ejercicios al día de hoy" />
      </div>

      {ex ? (
        <>
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20, position: "relative" }}>
            <div className="flex items-center" style={{ marginBottom: 16, paddingRight: 110 }}>
              <div className="min-w-0 flex-1">
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{ex}</span>
                {ex2 ? <span style={{ fontSize: 14, fontWeight: 700, color: "#3B82F6" }}>{` vs ${ex2}`}</span> : null}
                <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }}>{`· Progresión de ${metric === "Peso" ? "peso (kg)" : metric === "Reps" ? "repeticiones" : "volumen (kg)"}`}</span>
              </div>
              <div className="flex" style={{ gap: 6 }}>
                {METRICS.map((m) => (
                  <button key={m} type="button" onClick={() => setMetric(m)} style={chip(metric === m)}>{m}</button>
                ))}
              </div>
            </div>
            {recs.length > 0 ? (
              <span style={{ position: "absolute", top: 16, right: 16, backgroundColor: "#FFFBEB", borderRadius: 8, border: "1px solid #FDE68A", padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "#92400E" }}>
                {`🏆 PR: ${num(pr)} kg`}
              </span>
            ) : null}
            {data.length > 0 ? (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="4 4" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, yMax]} tickCount={5} width={36} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => num(v)} />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 8, border: "1px solid #E2E8F0", padding: "8px 12px", fontSize: 11 }}>
                            <div style={{ color: "#94A3B8", marginBottom: 2 }}>{label}</div>
                            {payload.map((p) => (
                              <div key={String(p.dataKey)} style={{ color: p.dataKey === "b" ? "#3B82F6" : "#111827", fontWeight: 600 }}>
                                {`${p.dataKey === "b" ? ex2 : ex}: ${num(Number(p.value))} ${unit(metric)}`}
                              </div>
                            ))}
                          </div>
                        ) : null
                      }
                    />
                    <Line type="monotone" dataKey="a" stroke="#111827" strokeWidth={2} dot={{ r: 3, fill: "#FFFFFF", stroke: "#111827", strokeWidth: 2 }} activeDot={{ r: 4 }} />
                    {ex2 ? <Line type="monotone" dataKey="b" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: "#FFFFFF", stroke: "#3B82F6", strokeWidth: 2 }} activeDot={{ r: 4 }} /> : null}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "32px 0" }}>
                Todavía no hay sesiones completadas de este ejercicio en el período elegido.
              </p>
            )}
          </div>

          {last5.length > 0 ? (
            <div style={{ backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    {["Fecha", "Sets × Reps", "Peso (kg)", "Vol. total", "Notas"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#94A3B8", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {last5.map((r, i) => (
                    <tr key={r.date.toISOString()} style={{ backgroundColor: i % 2 ? "#FAFAFA" : "#FFFFFF", borderBottom: "1px solid #F1F5F9", fontSize: 12, color: "#374151" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 500, color: "#111827" }}>{`${fmt(r.date)} ${r.date.getFullYear()}`}</td>
                      <td style={{ padding: "10px 16px" }}>{`${r.sets} × ${r.reps}`}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span className="inline-flex items-center" style={{ gap: 4 }}>
                          {`${num(r.weight)} kg`}
                          {r.weight === pr && i === last5.findIndex((x) => x.weight === pr) ? <Trophy size={11} color="#D97706" /> : null}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px" }}>{`${num(r.volume)} kg`}</td>
                      <td style={{ padding: "10px 16px", color: r.note ? "#374151" : "#94A3B8" }}>{r.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ border: "1.5px dashed #E2E8F0", borderRadius: 12, padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
          Elegí un ejercicio para ver su progresión.
        </div>
      )}
    </div>
  );
}
