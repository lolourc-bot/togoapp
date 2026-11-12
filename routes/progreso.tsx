import { Lock } from "lucide-react";
import { Link as RLink } from "@tanstack/react-router";
import { useUserContext } from "@/lib/user-context";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { useHasCoach } from "@/components/togo/AthleteBottomNav";
import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  Home,
  Info,
  MessageCircle,
  TrendingUp,
  User,
} from "lucide-react";
import { fetchAthleteProgress, countBlocks, parseWeight, type AthleteProgressRaw } from "@/lib/athlete-progress";
import { useAthleteAuth } from "@/hooks/useAthleteAuth";

export const Route = createFileRoute("/progreso")({
  validateSearch: (search: Record<string, unknown>): { athleteId?: string } =>
    typeof search["athleteId"] === "string" ? { athleteId: search["athleteId"] as string } : {},
  head: () => ({
    meta: [
      { title: "Progreso del atleta · TOGO" },
      {
        name: "description",
        content:
          "Adherencia, racha, evolución de pesos e historial de sesiones del atleta en las últimas 4 semanas.",
      },
      { property: "og:title", content: "Progreso del atleta · TOGO" },
      {
        property: "og:description",
        content:
          "Seguimiento de adherencia, evolución de cargas e historial de entrenamientos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressScreen,
});

const PERIODS = ["1 semana", "4 semanas", "3 meses"];
const PERIOD_DAYS: Record<string, number> = { "1 semana": 7, "4 semanas": 28, "3 meses": 90 };
const PERIOD_LABEL: Record<string, string> = { "1 semana": "Última semana", "4 semanas": "Últimas 4 semanas", "3 meses": "Últimos 3 meses" };

function dateLabel(iso: string) {
  const d = new Date(`${iso}T00:00`);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "numeric" });
}

function daysAgo(iso: string) {
  const d = new Date(`${iso}T00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / 86_400_000);
}

function computeProgress(raw: AthleteProgressRaw, period: string, exercise: string | null) {
  const windowDays = PERIOD_DAYS[period] ?? 28;
  const inWindow = raw.sessions.filter((s) => daysAgo(s.date) >= 0 && daysAgo(s.date) < windowDays);
  const done = inWindow.filter((s) => s.status === "done");

  const adherencePct = inWindow.length ? Math.round((done.length / inWindow.length) * 100) : null;

  const byDateDesc = [...raw.sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  let streak = 0;
  for (const s of byDateDesc) {
    if (daysAgo(s.date) < 0) continue;
    if (s.status === "done") streak++;
    else break;
  }

  const exerciseNames = [...new Set(raw.sessions.flatMap((s) => s.items.map((i) => i.name)))].sort();

  const points: { date: string; weight: number }[] = [];
  if (exercise) {
    for (const s of done) {
      const item = s.items.find((i) => i.name === exercise);
      if (!item) continue;
      const sets = (raw.setsBySession[s.id] ?? []).filter((x) => x.itemId === item.id && x.done);
      const weights = sets.map((x) => parseWeight(x.weight)).filter((w): w is number => w != null);
      if (weights.length) points.push({ date: s.date, weight: Math.max(...weights) });
    }
    points.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  const history = done
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8)
    .map((s) => ({
      id: s.id,
      name: s.name,
      meta: `${dateLabel(s.date)} · ${s.minutes} min · ${countBlocks(s.items, s.circuitCount)} bloques`,
      feelingLabel: s.feelingLabel,
    }));

  return {
    label: PERIOD_LABEL[period] ?? period,
    chips: [
      { number: adherencePct != null ? `${adherencePct}%` : "—", label: "ADHERENCIA" },
      { number: String(done.length), label: "SESIONES" },
      { number: `🔥 ${streak}`, label: "RACHA" },
    ],
    axis: points.map((p) => dateLabel(p.date)),
    series: points.map((p) => p.weight),
    exerciseNames,
    history,
  };
}

const TABS = [
  { icon: Home, label: "Inicio", to: "/hoy" },
  { icon: MessageCircle, label: "Chat", to: "/chat", unread: true },
  { icon: TrendingUp, label: "Progreso", to: "/progreso" },
  { icon: User, label: "Perfil", to: "/perfil" },
];

function Dropdown({
  value,
  options,
  onSelect,
  small,
}: {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center"
        style={{
          gap: 4,
          fontSize: small ? 11 : 12,
          fontWeight: 500,
          color: "#64748B",
          backgroundColor: small ? "#F8FAFC" : "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: small ? 8 : 20,
          padding: small ? "4px 8px" : "6px 12px",
          cursor: "pointer",
        }}
      >
        {value}
        <ChevronDown size={small ? 11 : 12} color="#94A3B8" />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 20,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            overflow: "hidden",
            minWidth: 110,
          }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onSelect(opt);
                setOpen(false);
              }}
              className="flex w-full items-center"
              style={{
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: opt === value ? 600 : 400,
                color: opt === value ? "#111827" : "#64748B",
                background: "none",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WeightChart({ data }: { data: number[] }) {
  const w = 300;
  const h = 100;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 8) + 4;
    const y = h - 12 - ((v - min) / span) * (h - 26);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const lastPt = pts[pts.length - 1]!;
  const firstPt = pts[0]!;
  const area = `${line} L ${lastPt[0]} ${h} L ${firstPt[0]} ${h} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: "100%", height: 100, display: "block" }}
        preserveAspectRatio="none"
      >
        <path d={area} fill="rgba(17,24,39,0.05)" />
        <path
          d={line}
          fill="none"
          stroke="#111827"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill="#111827" />
        ))}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <span style={{ fontSize: 10, color: "#94A3B8", textAlign: "left" }}>
          {data[0]} kg
        </span>
        <span style={{ fontSize: 10, color: "#94A3B8", textAlign: "right" }}>
          {data[data.length - 1]} kg
        </span>
      </div>
    </div>
  );
}

function ProgressScreen() {
  const ctx = useUserContext();
  const hasCoach = useHasCoach();
  const { athleteId: athleteIdParam } = Route.useSearch();
  const { athlete } = useAthleteAuth();
  const athleteId = athleteIdParam ?? athlete?.id;
  if (ctx.type === "gym_member" && !hasCoach) {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col items-center justify-center" style={{ padding: "40px 24px" }}>
          <Lock size={32} color="#CBD5E1" />
          <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 12 }}>El progreso estará disponible una vez que tengas un coach asignado.</div>
          <RLink to="/hoy" style={{ fontSize: 12, color: "#3B82F6", marginTop: 8 }}>Solicitar coach</RLink>
        </div>
        <AthleteBottomNav active="Progreso" />
      </PhoneFrame>
    );
  }
  return <ProgressContent athleteId={athleteId} />;
}

function ProgressContent({ athleteId }: { athleteId?: string | undefined }) {
  const [period, setPeriod] = useState("4 semanas");
  const [exercise, setExercise] = useState<string | null>(null);
  const [raw, setRaw] = useState<AthleteProgressRaw>({ sessions: [], setsBySession: {} });

  useEffect(() => {
    if (!athleteId) return;
    fetchAthleteProgress(athleteId).then(setRaw);
  }, [athleteId]);

  const pdata = computeProgress(raw, period, exercise);
  useEffect(() => {
    if (!exercise && pdata.exerciseNames.length) setExercise(pdata.exerciseNames[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdata.exerciseNames.join(",")]);
  const series = pdata.series;
  const firstVal = series[0] ?? 0;
  const lastVal = series[series.length - 1] ?? 0;
  const delta = lastVal - firstVal;


  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#F1F5F9", padding: 24 }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: 375,
          height: 812,
          backgroundColor: "#F8FAFC",
          borderRadius: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        <div className="flex-1 overflow-y-auto">
          {/* TOP BAR */}
          <div
            className="flex items-center justify-between"
            style={{ padding: "16px 20px 0" }}
          >
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: 0 }}>
              Progreso
            </h1>
            <Dropdown value={period} options={PERIODS} onSelect={setPeriod} />
          </div>

          {/* SECTION 1 — ADHERENCIA Y RACHA */}
          <div
            style={{
              margin: "16px 16px 0",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center" style={{ gap: 4, position: "relative" }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>
                  Adherencia
                </h2>
                <span
                  style={{ display: "inline-flex", position: "relative" }}
                  className="togo-info-wrap"
                >
                  <Info size={13} color="#CBD5E1" />
                  <span className="togo-info-tip">
                    De cada 10 sesiones que te manda el coach, ¿cuántas
                    completás? 85% = 8 o 9 de 10.
                  </span>
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{pdata.label}</span>
            </div>

            <div className="flex" style={{ gap: 10, marginTop: 12 }}>
              {pdata.chips.map((c) => ({
                ...c,
                tip:
                  c.label === "RACHA"
                    ? "Entrenamientos seguidos sin faltar ninguno."
                    : "",
              })).map((chip) => (
                <div
                  key={chip.label}
                  className="flex flex-1 flex-col items-center justify-center"
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10,
                    padding: "10px 14px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#111827",
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {chip.number}
                  </span>
                  <div
                    className="flex items-center"
                    style={{ gap: 4, marginTop: 2, position: "relative" }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: "#94A3B8",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {chip.label}
                    </span>
                    {chip.tip && (
                      <span
                        style={{ display: "inline-flex", position: "relative" }}
                        className="togo-info-wrap"
                      >
                        <Info size={11} color="#CBD5E1" />
                        <span className="togo-info-tip togo-info-tip--left">
                          {chip.tip}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* SECTION 2 — EVOLUCIÓN DE RM */}
          <div
            style={{
              margin: "12px 16px 0",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center" style={{ gap: 4 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>
                  Evolución de RM
                </h2>
                <span
                  style={{ display: "inline-flex", position: "relative" }}
                  className="togo-info-wrap"
                >
                  <Info size={11} color="#CBD5E1" />
                  <span className="togo-info-tip">
                    El RM (repetición máxima) es el peso máximo que podés mover
                    en una sola repetición. Se calcula a partir de tus series
                    registradas.
                  </span>
                </span>
              </div>
              {pdata.exerciseNames.length ? (
                <Dropdown
                  small
                  value={exercise ?? pdata.exerciseNames[0]!}
                  options={pdata.exerciseNames}
                  onSelect={setExercise}
                />
              ) : null}
            </div>

            <div style={{ marginTop: 12 }}>
              {series.length > 0 ? (
                <>
                  <WeightChart data={series} />
                  <div className="flex" style={{ marginTop: 6 }}>
                    {pdata.axis.map((a, i) => (
                      <span
                        key={i}
                        className="flex-1 text-center"
                        style={{ fontSize: 10, color: "#94A3B8" }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", padding: "12px 0" }}>
                  Todavía no hay series registradas para este ejercicio.
                </p>
              )}
            </div>

            {series.length >= 2 ? (
              <div className="flex items-center" style={{ gap: 4, marginTop: 8 }}>
                <TrendingUp size={12} color={delta >= 0 ? "#16A34A" : "#DC2626"} />
                <span style={{ fontSize: 12, fontWeight: 600, color: delta >= 0 ? "#16A34A" : "#DC2626" }}>
                  {delta >= 0 ? "+" : ""}
                  {delta} kg de RM en {pdata.label.toLowerCase()}
                </span>
              </div>
            ) : null}
          </div>

          {/* SECTION 3 — HISTORIAL */}
          <div style={{ margin: "12px 16px 16px" }}>
            <div
              className="flex items-center justify-between"
              style={{ padding: "0 0 10px" }}
            >
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>
                Historial
              </h2>
              <button
                type="button"
                style={{
                  fontSize: 11,
                  color: "#94A3B8",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Ver todo →
              </button>
            </div>

            <div className="flex flex-col" style={{ gap: 8 }}>
              {pdata.history.map((s, i) => {
                return (
                  <div
                    key={i}
                    className="flex items-center"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: 12,
                      padding: "12px 14px",
                    }}
                  >
                    <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        {s.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#94A3B8",
                          marginTop: 2,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.meta}
                      </span>
                    </div>
                    {s.feelingLabel ? (
                      <div
                        className="flex items-center"
                        style={{
                          gap: 4,
                          backgroundColor: "#F1F5F9",
                          borderRadius: 20,
                          padding: "3px 10px",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#111827",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.feelingLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {pdata.history.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", padding: "16px 0" }}>
                  Todavía no hay sesiones completadas en este período.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <AthleteBottomNav active="Progreso" />
      </div>
    </div>
  );
}
