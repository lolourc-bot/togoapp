import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouterState } from "@tanstack/react-router";

/* ---- tiny shared stores: timer screen slot + running flag (for nav dot) ---- */
let slotEl: HTMLElement | null = null;
let runningFlag = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const setTimerSlot = (el: HTMLElement | null) => { slotEl = el; emit(); };
export const useTimerRunning = () => useSyncExternalStore(subscribe, () => runningFlag, () => false);
const useSlot = () => useSyncExternalStore(subscribe, () => slotEl, () => null);

const ATHLETE_PATHS = ["/timer", "/hoy", "/sesion-atleta", "/progreso", "/perfil", "/chat", "/wellness", "/marketplace", "/celebracion"];
const NAV_H = 64;

type Kind = "Cronómetro" | "Cuenta regresiva" | "AMRAP" | "TABATA" | "EMOM";
const KINDS: Kind[] = ["Cronómetro", "Cuenta regresiva", "AMRAP", "TABATA", "EMOM"];

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 3600 ? `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}` : `${pad(s / 60)}:${pad(s % 60)}`;
};
const stopwatch = (ms: number) => {
  const t = Math.floor(ms / 100);
  return `${pad(t / 600)}:${pad((t / 10) % 60)}.${t % 10}`;
};
const long = (ms: number) => {
  const t = Math.floor(ms / 100);
  return `${pad(t / 36000)}:${pad((t / 600) % 60)}:${pad((t / 10) % 60)}.${t % 10}`;
};

function beep(freq = 880, dur = 0.18) {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    o.start();
    o.stop(ctx.currentTime + dur);
    o.onended = () => void ctx.close();
  } catch {
    /* sin audio */
  }
}
const vibrate = (p: number | number[]) => navigator.vibrate?.(p);

const primary = (bg = "#111827"): React.CSSProperties => ({ height: 60, borderRadius: 16, backgroundColor: bg, color: "#FFFFFF", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", width: "100%" });
const secondary: React.CSSProperties = { height: 60, borderRadius: 16, border: "2px solid #E2E8F0", backgroundColor: "#FFFFFF", color: "#374151", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%" };
const numInput: React.CSSProperties = { width: 64, height: 48, border: "1px solid #E2E8F0", borderRadius: 10, textAlign: "center", fontSize: 22, fontWeight: 700, color: "#111827", outline: "none" };
const big: React.CSSProperties = { fontSize: 72, fontWeight: 800, color: "#111827", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: -2, textAlign: "center", margin: "0 0 32px" };

export function AthleteTimer() {
  const slot = useSlot();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const visible = ATHLETE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  const [kind, setKind] = useState<Kind>("Cronómetro");
  const [running, setRunning] = useState(false);
  const [acc, setAcc] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const [hms, setHms] = useState({ h: 0, m: 3, s: 0 });
  const [amrapMin, setAmrapMin] = useState("10");
  const [rounds, setRounds] = useState(0);
  const [tab, setTab] = useState({ work: "20", rest: "10", rounds: "8", ex: "" });
  const [emom, setEmom] = useState({ min: "10", desc: "" });
  const [toast, setToast] = useState<string | null>(null);
  const lastMark = useRef<string>("");

  useEffect(() => { runningFlag = running; emit(); }, [running]);

  const elapsed = acc + (running && startedAt !== null ? now - startedAt : 0);
  const active = running || elapsed > 0;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [running]);

  const flash = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 1800);
  };

  const start = () => {
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
    setRunning(true);
  };
  const pause = () => {
    setAcc(elapsed);
    setRunning(false);
    setStartedAt(null);
  };
  const reset = () => {
    setRunning(false);
    setAcc(0);
    setStartedAt(null);
    setLaps([]);
    setRounds(0);
    lastMark.current = "";
  };
  const toggle = () => (running ? pause() : start());

  // derived per type
  const timerTotal = (hms.h * 3600 + hms.m * 60 + hms.s) * 1000;
  const amrapTotal = (Number(amrapMin) || 0) * 60000;
  const work = (Number(tab.work) || 0) * 1000;
  const rest = (Number(tab.rest) || 0) * 1000;
  const tRounds = Number(tab.rounds) || 1;
  const cycle = work + rest || 1;
  const tabRound = Math.min(tRounds, Math.floor(elapsed / cycle) + 1);
  const inCycle = elapsed % cycle;
  const isWork = inCycle < work;
  const phaseLeft = isWork ? work - inCycle : cycle - inCycle;
  const emomTotal = (Number(emom.min) || 1) * 60000;
  const emomMinute = Math.min(Number(emom.min) || 1, Math.floor(elapsed / 60000) + 1);
  const emomLeft = 60000 - (elapsed % 60000);

  const total = kind === "Cuenta regresiva" ? timerTotal : kind === "AMRAP" ? amrapTotal : kind === "TABATA" ? tRounds * cycle : kind === "EMOM" ? emomTotal : Infinity;

  // end + cues
  useEffect(() => {
    if (!running) return;
    if (elapsed >= total) {
      setRunning(false);
      setAcc(total);
      setStartedAt(null);
      beep(660, 0.6);
      vibrate([300, 150, 300]);
      flash(kind === "Cuenta regresiva" ? "¡Tiempo! ⏱" : "¡Terminado! 💪");
      return;
    }
    const mark = kind === "TABATA" ? `${tabRound}-${isWork}` : kind === "EMOM" ? `${emomMinute}` : "";
    if (mark && mark !== lastMark.current) {
      if (lastMark.current) {
        beep(isWork || kind === "EMOM" ? 990 : 520);
        vibrate(120);
        if (kind === "EMOM") flash("¡Nuevo minuto!");
      }
      lastMark.current = mark;
    }
  }, [elapsed, running, total, kind, tabRound, isWork, emomMinute]);

  const display =
    kind === "Cronómetro" ? stopwatch(elapsed) : kind === "TABATA" ? mmss(phaseLeft) : kind === "EMOM" ? mmss(emomLeft) : mmss(total - elapsed);

  const changeKind = (k: Kind) => {
    if (k === kind) return;
    reset();
    setKind(k);
  };

  if (!visible || !slot) return null;

  const runControls = (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <button type="button" onClick={reset} style={secondary}>Reiniciar</button>
      <button type="button" onClick={toggle} style={primary(running ? "#EF4444" : "#111827")}>{running ? "Pausar" : "Reanudar"}</button>
    </div>
  );

  return createPortal(
    <div className="flex h-full flex-col" style={{ backgroundColor: "#FFFFFF" }}>
      <style>{`@keyframes togo-flash{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
        <div className="flex items-center" style={{ padding: "16px 20px 0" }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", flex: 1 }}>Temporizador</span>
          {running ? (
            <span className="flex items-center" style={{ gap: 6, fontSize: 11, color: "#22C55E", fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22C55E" }} />Corriendo
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 overflow-x-auto whitespace-nowrap" style={{ padding: "12px 16px", gap: 8 }}>
          {KINDS.map((k) => (
            <button key={k} type="button" onClick={() => changeKind(k)} className="shrink-0" style={{ borderRadius: 20, padding: "8px 18px", fontSize: 13, fontWeight: k === kind ? 600 : 400, cursor: "pointer", border: k === kind ? "1px solid #111827" : "1px solid #E2E8F0", backgroundColor: k === kind ? "#111827" : "#FFFFFF", color: k === kind ? "#FFFFFF" : "#374151" }}>
              {k}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col justify-center overflow-y-auto" style={{ padding: "0 20px 20px" }}>
        {kind === "Cronómetro" ? (
          <>
            <div style={{ padding: 20, textAlign: "center" }}>
              <div style={big}>{stopwatch(elapsed)}</div>
              <div style={{ fontSize: 13, color: "#94A3B8", fontFamily: "ui-monospace, monospace" }}>{long(elapsed)}</div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {!running && elapsed > 0 ? (
                <button type="button" onClick={reset} style={secondary}>Reiniciar</button>
              ) : (
                <button type="button" disabled={!running} onClick={() => setLaps((l) => [...l, elapsed])} style={{ ...secondary, opacity: running ? 1 : 0.5 }}>Vuelta</button>
              )}
              <button type="button" onClick={toggle} style={primary(running ? "#EF4444" : "#111827")}>{running ? "Pausar" : elapsed > 0 ? "Reanudar" : "Iniciar"}</button>
            </div>
            {laps.length ? (
              <div style={{ marginTop: 16, maxHeight: 140, overflowY: "auto", padding: "0 20px" }}>
                {[...laps].map((t, i) => ({ t, i, split: t - (laps[i - 1] ?? 0) })).reverse().map(({ t, i, split }) => (
                  <div key={i} className="flex" style={{ padding: "10px 16px", borderBottom: "1px solid #F1F5F9", fontSize: 12, color: "#374151" }}>
                    <span style={{ flex: 1, fontWeight: 600 }}>{`Vuelta ${i + 1}`}</span>
                    <span style={{ width: 90, fontFamily: "ui-monospace, monospace" }}>{stopwatch(split)}</span>
                    <span style={{ width: 90, textAlign: "right", color: "#94A3B8", fontFamily: "ui-monospace, monospace" }}>{stopwatch(t)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {kind === "Cuenta regresiva" ? (
          active ? (
            <>
              <div style={{ ...big, padding: 20 }}>{display}</div>
              {runControls}
            </>
          ) : (
            <>
              <div className="flex items-center justify-center" style={{ gap: 6, padding: "20px 16px 28px" }}>
                {(["h", "m", "s"] as const).map((u, i) => (
                  <div key={u} className="flex items-center" style={{ gap: 6 }}>
                    {i > 0 ? <span style={{ fontSize: 36, color: "#CBD5E1" }}>:</span> : null}
                    <div className="flex flex-col items-center">
                      <button type="button" aria-label={`Subir ${u}`} onClick={() => setHms((v) => ({ ...v, [u]: (v[u] + 1) % (u === "h" ? 24 : 60) }))} style={{ height: 40, background: "none", border: "none", color: "#CBD5E1", fontSize: 24, cursor: "pointer" }}>{pad((hms[u] + 1) % (u === "h" ? 24 : 60))}</button>
                      <span style={{ fontSize: 52, fontWeight: 700, color: "#111827", fontFamily: "ui-monospace, monospace", lineHeight: 1 }}>{pad(hms[u])}</span>
                      <button type="button" aria-label={`Bajar ${u}`} onClick={() => setHms((v) => ({ ...v, [u]: (v[u] + (u === "h" ? 23 : 59)) % (u === "h" ? 24 : 60) }))} style={{ height: 40, background: "none", border: "none", color: "#CBD5E1", fontSize: 24, cursor: "pointer" }}>{pad((hms[u] + (u === "h" ? 23 : 59)) % (u === "h" ? 24 : 60))}</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 0 }}>
                <button type="button" disabled={timerTotal === 0} onClick={start} style={{ ...primary(), opacity: timerTotal ? 1 : 0.5 }}>Iniciar</button>
              </div>
            </>
          )
        ) : null}

        {kind === "AMRAP" ? (
          <>
            {active ? (
              <>
                <div style={{ ...big, padding: 20 }}>{display}</div>
                {runControls}
              </>
            ) : (
              <>
                <MinutePicker value={amrapMin} onChange={setAmrapMin} />
                <div style={{ padding: 0 }}>
                  <button type="button" disabled={!amrapTotal} onClick={start} style={{ ...primary(), opacity: amrapTotal ? 1 : 0.5 }}>Iniciar</button>
                </div>
              </>
            )}
            <div className="flex flex-col items-center" style={{ gap: 8, paddingTop: 20, marginTop: 24, borderTop: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>Rondas</span>
              <span style={{ fontSize: 80, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{rounds}</span>
              <div className="flex" style={{ gap: 16 }}>
                <button type="button" aria-label="Restar ronda" onClick={() => setRounds((r) => Math.max(0, r - 1))} style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #E2E8F0", backgroundColor: "#FFFFFF", fontSize: 28, fontWeight: 300, color: "#374151", cursor: "pointer" }}>–</button>
                <button type="button" aria-label="Sumar ronda" onClick={() => setRounds((r) => r + 1)} style={{ width: 56, height: 56, borderRadius: "50%", border: "none", backgroundColor: "#111827", fontSize: 28, fontWeight: 300, color: "#FFFFFF", cursor: "pointer" }}>＋</button>
              </div>
            </div>
          </>
        ) : null}

        {kind === "TABATA" ? (
          active ? (
            <div className="flex flex-col" style={{ gap: 14 }}>
              <div style={{ borderRadius: 12, padding: 12, textAlign: "center", backgroundColor: isWork ? "#DCFCE7" : "#DBEAFE", color: isWork ? "#16A34A" : "#1D4ED8", fontSize: 18, fontWeight: 800 }}>
                {isWork ? "TRABAJO" : "DESCANSO"}{tab.ex && isWork ? ` · ${tab.ex}` : ""}
              </div>
              <div style={{ fontSize: 80, fontWeight: 800, color: "#111827", textAlign: "center", lineHeight: 1, margin: "8px 0" }}>{Math.ceil(phaseLeft / 1000)}</div>
              <div style={{ height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${100 - (phaseLeft / (isWork ? work : rest || 1)) * 100}%`, backgroundColor: isWork ? "#22C55E" : "#3B82F6", transition: "width 100ms linear" }} />
              </div>
              <span style={{ fontSize: 12, color: "#94A3B8", textAlign: "center" }}>{`Ronda ${tabRound} / ${tRounds}`}</span>
              {runControls}
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 14 }}>
              {([["work", "Trabajo:", "seg"], ["rest", "Descanso:", "seg"], ["rounds", "Rondas:", ""]] as const).map(([k, l, u]) => (
                <div key={k} className="flex items-center" style={{ gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 14, color: "#374151", fontWeight: 500 }}>{l}</span>
                  <input value={tab[k]} onChange={(e) => setTab({ ...tab, [k]: e.target.value.replace(/\D/g, "").slice(0, 3) })} inputMode="numeric" aria-label={l} style={numInput} />
                  <span style={{ width: 28, fontSize: 14, color: "#94A3B8" }}>{u}</span>
                </div>
              ))}
              <label className="flex flex-col" style={{ gap: 6, fontSize: 14, color: "#374151", fontWeight: 500 }}>
                Ejercicio (opcional):
                <input value={tab.ex} onChange={(e) => setTab({ ...tab, ex: e.target.value })} placeholder="Ej. Burpees" style={{ height: 44, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 14, outline: "none", fontWeight: 400 }} />
              </label>
              <button type="button" disabled={!work} onClick={start} style={{ ...primary(), opacity: work ? 1 : 0.5, marginTop: 6 }}>Iniciar</button>
            </div>
          )
        ) : null}

        {kind === "EMOM" ? (
          active ? (
            <div className="flex flex-col items-center" style={{ gap: 14 }}>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>{`Minuto ${emomMinute} de ${Number(emom.min) || 1}`}</span>
              <div style={big}>{display}</div>
              <svg width={140} height={140} viewBox="0 0 120 120" aria-hidden>
                <circle cx={60} cy={60} r={52} fill="none" stroke="#F1F5F9" strokeWidth={8} />
                <circle cx={60} cy={60} r={52} fill="none" stroke="#111827" strokeWidth={8} strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - emomLeft / 60000)} transform="rotate(-90 60 60)" />
                <text x={60} y={72} textAnchor="middle" fontSize={36} fontWeight={800} fill="#111827">{Math.ceil(emomLeft / 1000)}</text>
              </svg>
              {emom.desc ? <p style={{ fontSize: 13, color: "#374151", padding: "0 24px", textAlign: "center" }}>{emom.desc}</p> : null}
              <div className="w-full">{runControls}</div>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 14 }}>
              <MinutePicker value={emom.min} onChange={(v) => setEmom({ ...emom, min: v })} />
              <label className="flex flex-col" style={{ gap: 6, fontSize: 14, color: "#374151", fontWeight: 500 }}>
                Descripción del ejercicio (opcional):
                <textarea value={emom.desc} onChange={(e) => setEmom({ ...emom, desc: e.target.value })} placeholder="Ej. 5 pull-ups + 10 push-ups" style={{ height: 60, border: "1px solid #E2E8F0", borderRadius: 10, padding: 10, fontSize: 14, outline: "none", resize: "none", fontWeight: 400 }} />
              </label>
              <button type="button" onClick={start} style={{ ...primary(), marginTop: 6 }}>Iniciar</button>
            </div>
          )
        ) : null}
        </div>

      {toast ? (
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 5, backgroundColor: toast === "¡Nuevo minuto!" ? "#22C55E" : "#111827", color: "#FFFFFF", borderRadius: 12, padding: "12px 18px", fontSize: 14, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", animation: "togo-flash .5s ease-in-out 3", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      ) : null}
    </div>,
    slot,
  );
}

function MinutePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const n = Number(value) || 0;
  const circle = (dark: boolean): React.CSSProperties => ({ width: 52, height: 52, borderRadius: "50%", border: dark ? "none" : "2px solid #E2E8F0", backgroundColor: dark ? "#111827" : "#FFFFFF", color: dark ? "#FFFFFF" : "#374151", fontSize: 22, fontWeight: 300, cursor: "pointer" });
  return (
    <div className="flex items-center justify-center" style={{ gap: 14, padding: "8px 20px 20px" }}>
      <button type="button" aria-label="Restar minuto" onClick={() => onChange(String(Math.max(1, n - 1)))} style={circle(false)}>–</button>
      <span style={{ fontSize: 52, fontWeight: 800, color: "#111827", minWidth: 64, textAlign: "center" }}>{n}</span>
      <button type="button" aria-label="Sumar minuto" onClick={() => onChange(String(Math.min(180, n + 1)))} style={circle(true)}>+</button>
      <span style={{ fontSize: 16, color: "#94A3B8" }}>min</span>
    </div>
  );
}
