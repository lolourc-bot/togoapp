import { useRef, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import {
  Camera, Building2, Plus, Trash2, CheckCircle, ChevronRight, UserPlus, LayoutDashboard, Users,
} from "lucide-react";

const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" };
const input: React.CSSProperties = { width: "100%", height: 40, border: "1px solid #E2E8F0", borderRadius: 9, padding: "0 12px", fontSize: 13, color: "#374151", outline: "none", background: "#FFF" };

function F({ l, children }: { l: string; children: React.ReactNode }) {
  return <label style={{ display: "block", flex: 1, minWidth: 0 }}><span style={label}>{l}</span>{children}</label>;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} style={{ border: `1px solid ${on ? "#111827" : "#E2E8F0"}`, background: on ? "#111827" : "#FFF", color: on ? "#FFF" : "#374151", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", transition: "all .15s" }}>{children}</button>;
}

function Upload({ square, onPick, src, text, Icon }: { square?: boolean; onPick: (s: string) => void; src: string | null; text: string; Icon: typeof Camera }) {
  const ref = useRef<HTMLInputElement>(null);
  const size = square ? 96 : 88;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
      <button type="button" onClick={() => ref.current?.click()} className="group" style={{ width: size, height: size, borderRadius: square ? 16 : "50%", border: src ? "0" : "2px dashed #E2E8F0", background: "#F8FAFC", position: "relative", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
        {src ? (
          <>
            <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <span className="opacity-0 group-hover:opacity-100" style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.5)", color: "#FFF", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity .15s" }}>Cambiar</span>
          </>
        ) : (<><Icon size={square ? 24 : 20} color="#CBD5E1" /><span style={{ fontSize: 11, color: "#94A3B8" }}>{text}</span></>)}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(URL.createObjectURL(f)); }} />
    </div>
  );
}

function Shell({ step, total, title, sub, children, footer }: { step: number; total: number; title: string; sub: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FFF" }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: 3, background: "#F1F5F9", zIndex: 50 }}>
        <div style={{ height: "100%", width: `${(step / total) * 100}%`, background: "#111827", transition: "width .35s ease" }} />
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "60px 24px 140px", display: "flex", flexDirection: "column" }}>
        <BrandLogo className="mb-6 h-12 w-12" />
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 }}>Paso {step} de {total}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 6 }}>{title}</h1>
        <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.5, marginBottom: 32 }}>{sub}</p>
        {children}
      </div>
      {footer && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#FFF" }}>
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 24px", display: "flex", gap: 10 }}>{footer}</div>
        </div>
      )}
    </div>
  );
}

function NavBtns({ step, onBack, onNext, disabled }: { step: number; onBack: () => void; onNext: () => void; disabled: boolean }) {
  return (
    <>
      {step > 1 && <button type="button" onClick={onBack} style={{ border: "1px solid #E2E8F0", borderRadius: 10, height: 46, flex: 1, fontSize: 14, color: "#374151", background: "#FFF", cursor: "pointer" }}>Atrás</button>}
      <button type="button" disabled={disabled} onClick={onNext} style={{ background: "#111827", color: "#FFF", borderRadius: 10, height: 46, flex: 1, fontSize: 14, fontWeight: 600, border: 0, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>Continuar</button>
    </>
  );
}

function Skip({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", background: "none", border: 0, cursor: "pointer", marginTop: 16 }}>Saltear por ahora</button>;
}

function Done({ cards }: { cards: { Icon: typeof Users; title: string; desc: string; onClick: () => void }[] }) {
  return (
    <>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><CheckCircle size={36} color="#22C55E" /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {cards.map(({ Icon, title, desc, onClick }) => (
          <button key={title} type="button" onClick={onClick} className="hover:border-[#111827]" style={{ background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: 18, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", transition: "border-color .15s" }}>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={18} color="#374151" /></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#111827" }}>{title}</span>
              <span style={{ display: "block", fontSize: 12, color: "#94A3B8" }}>{desc}</span>
            </span>
            <ChevronRight size={14} color="#CBD5E1" />
          </button>
        ))}
      </div>
    </>
  );
}

/* ═════════ COACH ═════════ */
type Prog = { id: number; name: string; weeks: string; days: string; level: string; price: string };
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function CoachOnboarding({ onFinish }: { onFinish: (to: "invite" | "panel") => void }) {
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [esp, setEsp] = useState("");
  const [bio, setBio] = useState("");
  const [mods, setMods] = useState<string[]>([]);
  const [ciudad, setCiudad] = useState("");
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, false, false]);
  const [from, setFrom] = useState("08:00");
  const [to, setTo] = useState("20:00");
  const [cupos, setCupos] = useState("20");
  const [progs, setProgs] = useState<Prog[]>([{ id: 1, name: "", weeks: "", days: "", level: "Principiante", price: "" }]);
  const needCity = mods.includes("Presencial") || mods.includes("Ambas");
  const toggleMod = (m: string) => setMods((a) => (a.includes(m) ? a.filter((x) => x !== m) : [...a, m]));
  const setP = (id: number, k: keyof Prog, v: string) => setProgs((ps) => ps.map((p) => (p.id === id ? { ...p, [k]: v } : p)));

  const valid = step === 1 ? !!(nombre.trim() && apellido.trim() && esp.trim() && mods.length && (!needCity || ciudad.trim()))
    : step === 2 ? days.some(Boolean) && !!from && !!to && Number(cupos) > 0
    : progs.length > 0 && progs.every((p) => p.name.trim() && p.weeks && p.days);

  const finish = (t: "invite" | "panel") => {
    localStorage.setItem("togo-coach-profile", JSON.stringify({ nombre, apellido, esp, bio, mods, ciudad, days, from, to, cupos, progs }));
    onFinish(t);
  };
  const nav = <NavBtns step={step} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)} disabled={!valid} />;

  if (step === 1) return (
    <Shell step={1} total={4} title="Contanos sobre vos" sub="Esto aparecerá en tu perfil público para los atletas." footer={nav}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Upload src={photo} onPick={setPhoto} text="Subir foto" Icon={Camera} />
        <div style={{ display: "flex", gap: 12 }}>
          <F l="Nombre"><input style={input} value={nombre} onChange={(e) => setNombre(e.target.value)} /></F>
          <F l="Apellido"><input style={input} value={apellido} onChange={(e) => setApellido(e.target.value)} /></F>
        </div>
        <F l="Especialidad"><input style={input} value={esp} onChange={(e) => setEsp(e.target.value)} placeholder="Ej. Fuerza y potencia, Running, CrossFit…" /></F>
        <F l="Bio">
          <textarea value={bio} maxLength={300} onChange={(e) => setBio(e.target.value)} placeholder="Contale a los atletas quién sos y cómo trabajás…" style={{ ...input, height: "auto", minHeight: 90, padding: "10px 12px", resize: "vertical", lineHeight: 1.5 }} />
          <span style={{ display: "block", textAlign: "right", fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{bio.length}/300</span>
        </F>
        <div>
          <span style={label}>Modalidad</span>
          <div style={{ display: "flex", gap: 8 }}>{["Online", "Presencial", "Ambas"].map((m) => <Chip key={m} on={mods.includes(m)} onClick={() => toggleMod(m)}>{m}</Chip>)}</div>
        </div>
        {needCity && <F l="Ciudad"><input style={input} value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ej. Buenos Aires" /></F>}
      </div>
    </Shell>
  );

  if (step === 2) return (
    <Shell step={2} total={4} title="¿Cuándo estás disponible?" sub="Los atletas verán esto al visitar tu perfil." footer={nav}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 20 }}>
        {DAYS.map((d, i) => (
          <button key={d} type="button" onClick={() => setDays((a) => a.map((x, j) => (j === i ? !x : x)))} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", background: "none", border: 0 }}>
            <span style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, background: days[i] ? "#111827" : "#FFF", color: days[i] ? "#FFF" : "#374151", fontWeight: days[i] ? 700 : 400, border: days[i] ? "0" : "1px solid #E2E8F0", transition: "all .15s" }}>{d.slice(0, 2)}</span>
            <span style={{ fontSize: 9, color: "#94A3B8", textTransform: "uppercase" }}>{d.slice(0, 3)}</span>
          </button>
        ))}
      </div>
      <span style={label}>Horario general</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: "#94A3B8" }}>De</span>
        <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...input, width: 110 }} />
        <span style={{ fontSize: 13, color: "#94A3B8" }}>a</span>
        <input type="time" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...input, width: 110 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>Cupos disponibles</span>
        <input type="number" min={1} value={cupos} onChange={(e) => setCupos(e.target.value)} style={{ ...input, width: 70, fontSize: 14, fontWeight: 600, color: "#111827", textAlign: "center" }} />
        <span style={{ fontSize: 13, color: "#94A3B8" }}>atletas</span>
      </div>
    </Shell>
  );

  if (step === 3) return (
    <Shell step={3} total={4} title="¿Cómo trabajás con tus atletas?" sub="Podés cambiar esto después. Agregá al menos un programa." footer={nav}>
      {progs.map((p) => (
        <div key={p.id} style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 16, display: "flex", flexDirection: "column", gap: 10, marginBottom: 10, position: "relative" }}>
          <button type="button" aria-label="Quitar programa" onClick={() => setProgs((ps) => ps.filter((x) => x.id !== p.id))} style={{ position: "absolute", top: 14, right: 14, background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}><Trash2 size={14} color="#CBD5E1" /></button>
          <F l="Nombre del programa"><input style={input} value={p.name} onChange={(e) => setP(p.id, "name", e.target.value)} placeholder="Ej. Fuerza base" /></F>
          <div style={{ display: "flex", gap: 12 }}>
            <F l="Duración (semanas)"><input type="number" min={1} style={input} value={p.weeks} onChange={(e) => setP(p.id, "weeks", e.target.value)} /></F>
            <F l="Días por semana"><input type="number" min={1} max={7} style={input} value={p.days} onChange={(e) => setP(p.id, "days", e.target.value)} /></F>
          </div>
          <div>
            <span style={label}>Nivel</span>
            <div style={{ display: "flex", gap: 8 }}>{["Principiante", "Intermedio", "Avanzado"].map((l) => <Chip key={l} on={p.level === l} onClick={() => setP(p.id, "level", l)}>{l}</Chip>)}</div>
          </div>
          <F l="Precio / mes">
            <span style={{ position: "relative", display: "block" }}>
              <span style={{ position: "absolute", left: 12, top: 11, fontSize: 13, color: "#94A3B8" }}>$</span>
              <input type="number" min={0} style={{ ...input, paddingLeft: 24 }} value={p.price} onChange={(e) => setP(p.id, "price", e.target.value)} placeholder="0" />
            </span>
          </F>
        </div>
      ))}
      <button type="button" onClick={() => setProgs((ps) => [...ps, { id: Date.now(), name: "", weeks: "", days: "", level: "Principiante", price: "" }])} className="hover:bg-[#F8FAFC]" style={{ border: "2px dashed #E2E8F0", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", background: "#FFF", marginBottom: 14 }}>
        <Plus size={16} color="#CBD5E1" /><span style={{ fontSize: 13, color: "#94A3B8" }}>Agregar programa</span>
      </button>
      <Skip onClick={() => { setProgs([]); setStep(4); }} />
    </Shell>
  );

  return (
    <Shell step={4} total={4} title={`¡Ya estás listo, ${nombre.trim() || "coach"}!`} sub="Tu perfil está configurado. Podés empezar a agregar atletas o esperar a que te encuentren en el marketplace.">
      <Done cards={[
        { Icon: UserPlus, title: "Invitar un atleta", desc: "Mandales un link para que descarguen la app.", onClick: () => finish("invite") },
        { Icon: LayoutDashboard, title: "Ir al panel", desc: "Empezá a explorar todas las funciones.", onClick: () => finish("panel") },
      ]} />
    </Shell>
  );
}

/* ═════════ INSTITUCIÓN ═════════ */

export function InstOnboarding({ mode, onFinish }: { mode: "club" | "gym"; onFinish: (name: string, to: "add" | "panel") => void }) {
  const gym = mode === "gym";
  const [step, setStep] = useState(1);
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [addr, setAddr] = useState("");
  const [tel, setTel] = useState("");
  const valid = step === 1 ? !!(name.trim() && city.trim() && (!gym || (addr.trim() && tel.trim()))) : true;
  const finish = (to: "add" | "panel") => {
    localStorage.setItem("togo-inst-profile", JSON.stringify({ name, city, addr, tel }));
    onFinish(name.trim(), to);
  };
  const nav = <NavBtns step={step} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)} disabled={!valid} />;

  if (step === 1) return (
    <Shell step={1} total={2} title="Configurá tu institución" sub="Estos datos aparecerán en tu panel." footer={nav}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Upload square src={logo} onPick={setLogo} text="Subir logo" Icon={Building2} />
        <F l="Nombre de la institución"><input style={input} value={name} onChange={(e) => setName(e.target.value)} /></F>
        <F l="Ciudad"><input style={input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej. Buenos Aires" /></F>
        {gym && (<>
          <F l="Dirección"><input style={input} value={addr} onChange={(e) => setAddr(e.target.value)} /></F>
          <F l="Teléfono de contacto"><input style={input} value={tel} onChange={(e) => setTel(e.target.value)} placeholder="+54 9 11…" /></F>
        </>)}
      </div>
    </Shell>
  );

  return (
    <Shell step={2} total={2} title={`¡${name.trim()} está lista!`} sub={gym ? "Elegí un plan para empezar a agregar socios y entrenadores." : "Elegí un plan para empezar a crear equipos y agregar atletas."}>
      <Done cards={[
        { Icon: LayoutDashboard, title: "Elegir un plan", desc: "Activá tu suscripción para poder agregar gente.", onClick: () => finish("panel") },
      ]} />
    </Shell>
  );
}
