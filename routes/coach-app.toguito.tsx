import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PhoneFrame } from "@/components/togo/Entrenamiento";
import { CoachAppBottomNav } from "@/components/togo/CoachAppBottomNav";
import { getCoachId } from "@/lib/programs";
import { supabase } from "@/lib/supabase";
import { fetchLibraryExercises } from "@/lib/exercise-data";
import { insertAthleteSession, fetchAthleteSessionById, deleteAthleteSession, moveAthleteSessionDate } from "@/lib/athlete-sessions";
import { emptyCircuitConfig, type CircuitConfig } from "@/components/togo/CircuitModal";
import type { DaySession } from "@/components/togo/AthleteSessionCard";
import { draftSessionWithToguito, type DraftCircuit, type PlannerMessage, type RecentSession, type SessionDraft } from "@/lib/toguito-planner";

/** "20kg" / "45 lb" / "" → { weight: "20", unit: "kg" } */
function parseWeight(raw: string): { weight: string; unit: "kg" | "lb" } {
  const match = raw.trim().match(/^([\d.,]+)\s*(kg|lb)?/i);
  return { weight: match?.[1] ?? "", unit: match?.[2]?.toLowerCase() === "lb" ? "lb" : "kg" };
}

function draftCircuitToConfig(c: DraftCircuit): CircuitConfig {
  const base = emptyCircuitConfig();
  return {
    ...base,
    name: c.name,
    type: c.circuitType,
    exercises: c.exercises.map((e) => ({ name: e.name, reps: e.reps, ...parseWeight(e.weight ?? "") })),
    ...(c.amrapMinutes ? { amrapSeconds: c.amrapMinutes * 60 } : {}),
    ...(c.emomIntervalSeconds ? { emomInterval: c.emomIntervalSeconds } : {}),
    ...(c.emomRounds ? { emomRounds: c.emomRounds } : {}),
    ...(c.workSeconds ? { work: c.workSeconds } : {}),
    ...(c.restSeconds ? { rest: c.restSeconds } : {}),
    ...(c.tabataRounds ? { tabataRounds: c.tabataRounds } : {}),
  };
}

export const Route = createFileRoute("/coach-app/toguito")({
  head: () => ({ meta: [{ title: "Toguito · TOGO" }] }),
  component: ToguitoPlanner,
});

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// El texto-a-voz del navegador a veces lee en voz alta la descripción del emoji
// ("cabeza de lobo" 🐺) en vez de ignorarlo — lo sacamos solo de lo que se habla,
// el emoji se puede seguir viendo en el texto de la pantalla.
function stripEmojiForSpeech(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}‍️]/gu, "").replace(/\s{2,}/g, " ").trim();
}

function pickSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const byLang = (lang: string) => voices.find((v) => v.lang.toLowerCase() === lang);
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith("es") && /natural|premium|google/i.test(v.name)) ||
    byLang("es-ar") ||
    byLang("es-419") ||
    byLang("es-mx") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("es")) ||
    null
  );
}

const VOICE_PREF_KEY = "togo-toguito-voice-uri";
/** Español primero, el resto después — así siempre hay algo para elegir aunque el
    dispositivo no tenga voces en español instaladas. */
function sortVoicesForPicker(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const aEs = a.lang.toLowerCase().startsWith("es") ? 0 : 1;
    const bEs = b.lang.toLowerCase().startsWith("es") ? 0 : 1;
    return aEs - bEs || a.name.localeCompare(b.name);
  });
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

function ToguitoPlanner() {
  const navigate = useNavigate();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  // Toguito necesita saber qué sesiones ya existen para poder abrir/duplicar/borrar/mover
  // por voz — no solo crear nuevas. Se recarga después de cualquier acción que las cambie.
  const recentSessionsRef = useRef<RecentSession[]>([]);

  const loadRecentSessions = async (cid: string) => {
    const today = new Date();
    const from = new Date(today); from.setDate(from.getDate() - 14);
    const to = new Date(today); to.setDate(to.getDate() + 14);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const { data } = await supabase
      .from("athlete_sessions")
      .select("id, name, date, athlete_id, athletes(full_name)")
      .eq("coach_id", cid)
      .gte("date", fmt(from))
      .lte("date", fmt(to))
      .order("date", { ascending: false })
      .limit(60);
    recentSessionsRef.current = (data ?? []).map((r: any) => ({
      id: r.id, athleteId: r.athlete_id, athleteName: r.athletes?.full_name ?? "Atleta", name: r.name, date: r.date,
    }));
  };

  // Ref, no state: nada en pantalla depende de la conversación (la UI es solo el orbe), y
  // usar useState acá generaba un bug de closures obsoletos — cada reconocimiento de voz
  // nuevo se arma dentro del callback de uno anterior, y leer `messages` así siempre traía
  // la versión vieja (vacía) del momento en que ese callback se creó, no la actual.
  const messagesRef = useRef<PlannerMessage[]>([]);
  const [text, setText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [caption, setCaption] = useState("");
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const [voiceOptions, setVoiceOptions] = useState<SpeechSynthesisVoice[]>([]);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const voiceSupported = getSpeechRecognition() !== null;
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const applyVoice = (v: SpeechSynthesisVoice | null) => {
    voiceRef.current = v;
    setSelectedVoiceURI(v?.voiceURI ?? null);
  };

  useEffect(() => {
    if (ttsSupported) {
      const loadVoice = () => {
        const all = window.speechSynthesis.getVoices();
        setVoiceOptions(sortVoicesForPicker(all));
        if (voiceRef.current) return; // ya elegida (a mano o ya cargada antes)
        const savedURI = typeof window !== "undefined" ? window.localStorage.getItem(VOICE_PREF_KEY) : null;
        const saved = savedURI ? all.find((v) => v.voiceURI === savedURI) : null;
        applyVoice(saved ?? pickSpanishVoice(all));
      };
      loadVoice();
      window.speechSynthesis.onvoiceschanged = loadVoice;
    }
    return () => {
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      if (ttsSupported) window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    };
  }, [ttsSupported]);

  const startListening = () => {
    const SR = getSpeechRecognition();
    if (!SR || recognitionRef.current) return;
    if (ttsSupported) window.speechSynthesis.cancel();
    const rec = new SR();
    rec.lang = "es-AR";
    rec.continuous = false;
    rec.interimResults = true;
    transcriptRef.current = "";
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as any).map((r: any) => r[0].transcript).join(" ");
      transcriptRef.current = transcript;
      setCaption(transcript || "Escuchando…");
    };
    rec.onend = () => {
      recognitionRef.current = null;
      const finalText = transcriptRef.current.trim();
      if (finalText) {
        setState("thinking");
        send(finalText);
      } else {
        setState("idle");
        setCaption("Tocá el orbe y decile a Toguito qué sesión armar.");
      }
    };
    rec.onerror = () => { recognitionRef.current = null; setState("idle"); };
    recognitionRef.current = rec;
    setState("listening");
    setCaption("Escuchando…");
    rec.start();
  };

  const stopListening = () => recognitionRef.current?.stop();

  // Habla la respuesta en voz real para que la conversación sea de verdad hands-free —
  // y si todavía estamos juntando info (sin borrador todavía), reabre el micrófono solo
  // al terminar de hablar, como una conversación continua de verdad.
  const speak = (replyText: string, autoListenAfter: boolean) => {
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    setCaption(replyText);
    if (!ttsSupported) {
      setState("speaking");
      const durationMs = Math.min(4500, Math.max(900, replyText.length * 35));
      speakingTimeoutRef.current = setTimeout(() => {
        if (autoListenAfter && voiceSupported) startListening();
        else setState("idle");
      }, durationMs);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(stripEmojiForSpeech(replyText));
    utter.lang = voiceRef.current?.lang || "es-AR";
    if (voiceRef.current) utter.voice = voiceRef.current;
    utter.onstart = () => setState("speaking");
    utter.onend = () => {
      if (autoListenAfter && voiceSupported) startListening();
      else setState("idle");
    };
    utter.onerror = () => setState("idle");
    window.speechSynthesis.speak(utter);
  };

  const selectVoice = (v: SpeechSynthesisVoice) => {
    applyVoice(v);
    window.localStorage.setItem(VOICE_PREF_KEY, v.voiceURI);
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance("Hola, así sueno yo.");
    utter.voice = v;
    utter.lang = v.lang;
    window.speechSynthesis.speak(utter);
  };

  // Tocar el orbe: si está hablando, lo interrumpís (barge-in) y arrancás a hablar vos;
  // si está escuchando, para; si está quieto, arranca a escuchar.
  const tapOrb = () => {
    if (state === "speaking") { if (ttsSupported) window.speechSynthesis.cancel(); startListening(); return; }
    if (state === "listening") { stopListening(); return; }
    if (state === "thinking") return;
    startListening();
  };

  useEffect(() => {
    (async () => {
      try {
        const cid = await getCoachId();
        if (!cid) { navigate({ to: "/coach-app/ingresar" }); return; }
        setCoachId(cid);
        const [{ data: rows }, lib] = await Promise.all([
          supabase.from("athletes").select("id, full_name").eq("coach_id", cid).eq("status", "active"),
          fetchLibraryExercises(cid),
          loadRecentSessions(cid),
        ]);
        setAthletes((rows ?? []).map((r) => ({ id: r.id, name: r.full_name })));
        setExerciseNames(lib.map((e) => e.name));
        setCaption(
          voiceSupported
            ? "Tocá el orbe y decile a Toguito qué sesión armar."
            : "Tu navegador no soporta voz — escribí tu pedido abajo.",
        );
        // Conversación fluida: arranca escuchando sola apenas entrás, sin tocar nada.
        if (voiceSupported) startListening();
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const send = async (utterance: string) => {
    if (!utterance.trim() || !coachId) return;
    const nextMessages: PlannerMessage[] = [...messagesRef.current, { role: "user", content: utterance.trim() }];
    messagesRef.current = nextMessages;
    setText("");
    setState("thinking");
    setCaption("Toguito está pensando…");
    try {
      const result = await draftSessionWithToguito({ data: { messages: nextMessages, athletes, exerciseNames, recentSessions: recentSessionsRef.current } });

      if (result.type === "draft") {
        const reply = `Armé un borrador: "${result.draft.name}" para ${result.draft.athleteName}.`;
        setDraft(result.draft);
        messagesRef.current = [...nextMessages, { role: "assistant", content: reply }];
        speak(reply, false);
        return;
      }

      if (result.type === "clarify") {
        messagesRef.current = [...nextMessages, { role: "assistant", content: result.text }];
        speak(result.text, true);
        return;
      }

      if (result.type === "open") {
        const reply = `Abriendo la sesión de ${result.athleteName}.`;
        messagesRef.current = [];
        speak(reply, false);
        navigate({ to: "/coach-app/sesion/$athleteId", params: { athleteId: result.athleteId }, search: { sessionId: result.sessionId } });
        return;
      }

      if (result.type === "duplicate") {
        try {
          const existing = await fetchAthleteSessionById(result.sessionId);
          if (existing && coachId) {
            await insertAthleteSession(coachId, result.athleteId, existing.date, { ...existing, id: crypto.randomUUID(), name: `${existing.name} (copia)`, status: "draft" });
          }
          const reply = `Listo, duplicada "${result.sessionName}" de ${result.athleteName}.`;
          messagesRef.current = [...nextMessages, { role: "assistant", content: reply }];
          speak(reply, true);
          if (coachId) loadRecentSessions(coachId);
        } catch {
          speak("No pude duplicar esa sesión.", true);
        }
        return;
      }

      if (result.type === "delete") {
        try {
          await deleteAthleteSession(result.sessionId);
          const reply = `Listo, borré "${result.sessionName}" de ${result.athleteName}.`;
          messagesRef.current = [...nextMessages, { role: "assistant", content: reply }];
          speak(reply, true);
          if (coachId) loadRecentSessions(coachId);
        } catch {
          speak("No pude borrar esa sesión.", true);
        }
        return;
      }

      if (result.type === "move") {
        try {
          await moveAthleteSessionDate(result.sessionId, result.newDate);
          const reply = `Listo, moví "${result.sessionName}" de ${result.athleteName} al ${result.newDate}.`;
          messagesRef.current = [...nextMessages, { role: "assistant", content: reply }];
          speak(reply, true);
          if (coachId) loadRecentSessions(coachId);
        } catch {
          speak("No pude mover esa sesión.", true);
        }
        return;
      }
    } catch {
      toast.error("Toguito no pudo responder, probá de nuevo");
      setState("idle");
    }
  };

  const updateDraftItem = (i: number, patch: Partial<SessionDraft["items"][number]>) => {
    if (!draft) return;
    setDraft({ ...draft, items: draft.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  };
  const removeDraftItem = (i: number) => {
    if (!draft) return;
    setDraft({ ...draft, items: draft.items.filter((_, idx) => idx !== i) });
  };

  const discardDraft = () => {
    setDraft(null);
    messagesRef.current = [];
    setCaption("Tocá el orbe y decile a Toguito qué sesión armar.");
    setState("idle");
  };

  const confirmDraft = async () => {
    if (!draft || !coachId) return;
    if (!draft.athleteId) { toast.error("Falta identificar el atleta"); return; }
    if (draft.items.length === 0 && draft.circuits.length === 0) { toast.error("La sesión no tiene ejercicios ni circuitos"); return; }
    setSaving(true);
    try {
      const session: DaySession = {
        id: crypto.randomUUID(),
        name: draft.name,
        status: "published",
        minutes: draft.minutes || 45,
        items: draft.items.map((it, i) => ({ id: `row${Date.now()}${i}`, name: it.name, sets: it.sets, reps: it.reps, weight: it.weight, chain: false })),
        circuits: draft.circuits.map(draftCircuitToConfig),
      };
      await insertAthleteSession(coachId, draft.athleteId, draft.date, session);
      toast.success("Sesión guardada ✓");
      setDraft(null);
      messagesRef.current = [];
      setCaption("Tocá el orbe y decile a Toguito qué sesión armar.");
      setState("idle");
      loadRecentSessions(coachId);
    } catch {
      toast.error("No se pudo guardar la sesión");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <PhoneFrame><div /></PhoneFrame>;

  const orbClass =
    state === "listening" ? "toguito-orb-listening" :
    state === "thinking" ? "toguito-orb-thinking" :
    state === "speaking" ? "toguito-orb-speaking" :
    "toguito-orb-idle";

  const statusLabel =
    state === "listening" ? "Escuchando…" :
    state === "thinking" ? "Pensando…" :
    state === "speaking" ? "Hablando…" :
    "Tocá para hablar";

  return (
    <PhoneFrame>
      <div className="flex items-center" style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0", gap: 12 }}>
        <button type="button" onClick={() => navigate({ to: "/coach-app" })} aria-label="Volver" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
          <ChevronLeft size={22} color="#111827" />
        </button>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#111827" }}>Toguito</span>
        {ttsSupported ? (
          <button type="button" onClick={() => setVoicePickerOpen(true)} aria-label="Cambiar voz" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
            <Settings2 size={18} color="#6B7280" />
          </button>
        ) : null}
      </div>

      {voicePickerOpen ? (
        <div className="flex flex-col" style={{ position: "absolute", inset: 0, zIndex: 30, background: "#FFF" }}>
          <div className="flex items-center" style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0", gap: 12 }}>
            <button type="button" onClick={() => setVoicePickerOpen(false)} aria-label="Cerrar" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
              <ChevronLeft size={22} color="#111827" />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Voz de Toguito</span>
          </div>
          <div className="flex flex-col overflow-y-auto" style={{ padding: 12, gap: 4 }}>
            {voiceOptions.length === 0 ? (
              <p style={{ fontSize: 12, color: "#94A3B8", padding: 12 }}>Tu navegador no expone voces para elegir.</p>
            ) : (
              voiceOptions.map((v) => (
                <button
                  key={v.voiceURI}
                  type="button"
                  onClick={() => selectVoice(v)}
                  className="flex items-center"
                  style={{ gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #E2E8F0", background: selectedVoiceURI === v.voiceURI ? "#EFF6FF" : "#FFF", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827" }}>{v.name}</span>
                    <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>{v.lang}</span>
                  </span>
                  {selectedVoiceURI === v.voiceURI ? <Check size={16} color="#2563EB" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {draft ? (
        <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: 16, overflowX: "hidden" }}>
          <div style={{ background: "#FFFFFF", border: "2px solid #111827", borderRadius: 14, padding: 14 }}>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ width: "100%", fontSize: 14, fontWeight: 700, color: "#111827", border: "none", outline: "none", marginBottom: 4 }} />
            <p style={{ fontSize: 11, color: "#94A3B8", marginBottom: 10 }}>{draft.athleteName} · {draft.date}</p>
            <div className="flex flex-col" style={{ gap: 6 }}>
              {draft.items.map((it, i) => (
                <div key={i} className="flex items-center" style={{ gap: 6 }}>
                  <span style={{ flex: 1, fontSize: 12, color: "#111827" }}>{it.name}</span>
                  <input value={it.sets} onChange={(e) => updateDraftItem(i, { sets: e.target.value })} style={{ width: 36, height: 26, border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 11, textAlign: "center" }} />
                  <span style={{ fontSize: 10, color: "#CBD5E1" }}>×</span>
                  <input value={it.reps} onChange={(e) => updateDraftItem(i, { reps: e.target.value })} style={{ width: 36, height: 26, border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 11, textAlign: "center" }} />
                  <button type="button" onClick={() => removeDraftItem(i)} aria-label="Quitar" style={{ background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}>
                    <Trash2 size={12} color="#CBD5E1" />
                  </button>
                </div>
              ))}
            </div>
            {draft.circuits.length > 0 ? (
              <div className="flex flex-col" style={{ gap: 6, marginTop: draft.items.length > 0 ? 10 : 0 }}>
                {draft.circuits.map((c, i) => (
                  <div key={i} style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E" }}>{c.name} · {c.circuitType}</p>
                    <p style={{ fontSize: 11, color: "#B45309", marginTop: 2 }}>{c.exercises.map((e) => `${e.name} (${e.reps}${e.weight ? ` · ${e.weight}` : ""})`).join(", ")}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex" style={{ gap: 8, marginTop: 12 }}>
              <button type="button" onClick={discardDraft} style={{ flex: 1, height: 36, borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFF", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>Descartar</button>
              <button type="button" onClick={confirmDraft} disabled={saving} style={{ flex: 1, height: 36, borderRadius: 8, border: 0, background: "#111827", color: "#FFF", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Guardando…" : "Guardar sesión"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center" style={{ padding: 24, gap: 24 }}>
          <button
            type="button"
            onClick={tapOrb}
            aria-label={statusLabel}
            className={`toguito-orb ${orbClass} flex items-center justify-center`}
            style={{ border: "none", cursor: voiceSupported ? "pointer" : "default", padding: 0 }}
          >
            <img src="/toguito.png" alt="" width={110} height={110} style={{ objectFit: "contain" }} />
          </button>
          <div style={{ textAlign: "center", maxWidth: 280 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{statusLabel}</p>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{caption}</p>
          </div>
        </div>
      )}

      {!draft ? (
        <div style={{ padding: "0 16px 16px" }}>
          {!voiceSupported || showTextInput ? (
            <div className="flex items-center" style={{ gap: 8 }}>
              <input
                autoFocus={showTextInput}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(text); }}
                placeholder="Escribí tu pedido…"
                style={{ flex: 1, height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13 }}
              />
              <button type="button" onClick={() => send(text)} disabled={!text.trim() || state === "thinking"} style={{ height: 40, padding: "0 16px", borderRadius: 10, border: 0, background: "#111827", color: "#FFF", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !text.trim() || state === "thinking" ? 0.5 : 1 }}>
                Enviar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowTextInput(true)} style={{ width: "100%", textAlign: "center", fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", padding: 6 }}>
              Prefiero escribir
            </button>
          )}
        </div>
      ) : null}

      <CoachAppBottomNav active="Toguito" />
    </PhoneFrame>
  );
}
