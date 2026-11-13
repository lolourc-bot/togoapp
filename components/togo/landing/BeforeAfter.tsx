import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { animate, useInView } from "framer-motion";
import { ArrowRight, Bell, CheckCheck, FileSpreadsheet, GripVertical, Phone, Search, Video } from "lucide-react";
import { ActivityFeed } from "../ActivityFeed";
import { UrgentCard } from "../RightPanel";
import { LoadControlCard } from "../LoadControlCard";
import type { FeedItem } from "@/lib/dashboard";

/**
 * Before/after slider. "Con TOGO" is the coach's real home (ActivityFeed, UrgentCard, LoadControlCard with
 * sample data); "Con Excel y WhatsApp" is the everyday mess it replaces. Both stages are laid out at a fixed
 * design size and scaled to the box (portrait layout on phones). The handle nudges once to show it drags.
 */

const LANDSCAPE = { w: 1100, h: 600 };
const PORTRAIT = { w: 600, h: 820 };

const FEED: FeedItem[] = [
  { athleteId: "d1", athleteName: "Martina López", sessionName: "Fuerza tren inferior", timeAgo: "hace 12 min", blocks: 3, minutes: 50, feelingLabel: "Excelente" },
  { athleteId: "d3", athleteName: "Sofía Díaz", sessionName: "Pasadas 6×400", timeAgo: "hace 1 h", blocks: 2, minutes: 55, feelingLabel: "Bien" },
  { athleteId: "d2", athleteName: "Juan Pérez", sessionName: "Rodaje Z2", timeAgo: "hace 3 h", blocks: 1, minutes: 45, feelingLabel: "Difícil" },
  { athleteId: "d5", athleteName: "Lucía Fernández", sessionName: "Fuerza tren superior", timeAgo: "ayer", blocks: 3, minutes: 45, feelingLabel: "Bien" },
];
const UNPLANNED = [{ id: "d6", name: "Tomás Ruiz" }];
const LOAD_GROUPS = {
  atencion: [{ id: "d6", name: "Tomás Ruiz" }],
  precaucion: [{ id: "d2", name: "Juan Pérez" }],
  enForma: [
    { id: "d1", name: "Martina López" },
    { id: "d3", name: "Sofía Díaz" },
  ],
};

function AfterStage({ portrait }: { portrait: boolean }) {
  const today = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  // Same markup as the coach home (routes/index.tsx): TopBar header, then feed + aside. Sidebar left out.
  return (
    <div className="flex h-full flex-col bg-background" style={{ paddingTop: 44 }}>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
        <h1 className="text-[1.25rem] font-bold text-foreground">Inicio</h1>
        {portrait ? null : (
          <div className="flex items-center gap-3">
            <div className="relative w-[220px]">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <div className="flex h-9 w-full items-center rounded-md border border-border bg-surface pl-8 pr-3 text-[0.8125rem] text-subtle">Buscar atleta...</div>
            </div>
            <Bell size={18} className="text-muted-foreground" />
            <span className="chip bg-surface-hover text-muted-foreground">{today}</span>
          </div>
        )}
      </header>
      <main className="grid flex-1 gap-5 bg-background p-6" style={{ gridTemplateColumns: portrait ? "1fr" : "1fr 380px" }}>
        <ActivityFeed items={portrait ? FEED.slice(0, 3) : FEED} />
        <aside className="flex flex-col gap-4">
          <UrgentCard unplanned={UNPLANNED} />
          {portrait ? null : <LoadControlCard loadGroups={LOAD_GROUPS} />}
        </aside>
      </main>
    </div>
  );
}

const SHEET = [
  ["Atleta", "Lun", "Mar", "Mié", "Pagó?"],
  ["Martina", "Sent 4x8??", "trote 40'", "#REF!", "sí (transf)"],
  ["Juan", "ver audio", "—", "Pecho+tri", "???"],
  ["Sofi", "Pasadas", "#REF!", "copiar de sem 2", "debe oct"],
  ["Tomás", "lesión?", "", "", "#¡VALOR!"],
  ["Lucía", "Fuerza", "Fuerza", "=B5*1,1", "sí"],
  ["Nico (nuevo)", "", "", "", ""],
];

const CHAT: { me?: boolean; text: string; time: string }[] = [
  { text: "profe mañana q hago??", time: "22:41" },
  { text: "no me llegó la planilla 😅", time: "22:43" },
  { me: true, text: "te la mando de nuevo", time: "23:05" },
  { text: "¿era 4x8 o 3x10?", time: "23:12" },
  { text: "hoy no puedo, ¿lo paso al jueves?", time: "07:02" },
  { text: "te transferí, va el comprobante", time: "07:30" },
];

function BeforeStage({ portrait }: { portrait: boolean }) {
  const sheet = (
    <div className="overflow-hidden rounded-[10px] border border-[#D1D5DB] bg-white shadow-[0_10px_30px_rgba(127,29,29,0.12)]">
      <div className="flex items-center gap-2 bg-[#1D6F42] px-3 py-1.5 text-[12px] font-medium text-white">
        <FileSpreadsheet size={14} /> plan_FINAL_v3 (2) - copia.xlsx
        <span className="ml-auto text-[10px] text-white/70">Solo lectura · versión de otro dispositivo</span>
      </div>
      <div className="grid text-[12px]" style={{ gridTemplateColumns: "28px 1.2fr 1fr 1fr 1.2fr 1fr" }}>
        <span className="border-b border-r border-[#E5E7EB] bg-[#F3F4F6]" />
        {["A", "B", "C", "D", "E"].map((c) => (
          <span key={c} className="border-b border-r border-[#E5E7EB] bg-[#F3F4F6] py-0.5 text-center text-[10px] text-[#6B7280]">{c}</span>
        ))}
        {SHEET.map((row, r) => (
          <Fragment key={r}>
            <span className="border-b border-r border-[#E5E7EB] bg-[#F3F4F6] py-1 text-center text-[10px] text-[#6B7280]">{r + 1}</span>
            {row.map((cell, c) => {
              const err = cell.startsWith("#");
              const head = r === 0;
              const hl = (r === 2 && c === 4) || (r === 4 && c === 1) || (r === 3 && c === 4);
              return (
                <span
                  key={`${r}-${c}`}
                  className={`truncate border-b border-r border-[#E5E7EB] px-1.5 py-1 ${head ? "font-semibold text-[#111827]" : "text-[#374151]"} ${err ? "font-semibold text-[#DC2626]" : ""} ${hl ? "bg-[#FEF08A]" : ""}`}
                >
                  {cell}
                </span>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );

  const chat = (
    <div className="overflow-hidden rounded-[14px] border border-[#D1D5DB] bg-[#EFEAE2] shadow-[0_10px_30px_rgba(127,29,29,0.14)]">
      <div className="flex items-center gap-2.5 bg-[#008069] px-3 py-2 text-white">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-[11px] font-bold">A</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">Alumnos 2026 🏃‍♂️💪</span>
          <span className="block truncate text-[10px] text-white/80">Juan, Martina, Sofi, Tomás y 14 más</span>
        </span>
        <Video size={15} />
        <Phone size={14} />
      </div>
      <div className="flex flex-col gap-1.5 p-2.5">
        {CHAT.map((m, i) => (
          <div
            key={i}
            className={`max-w-[82%] rounded-[8px] px-2.5 py-1.5 text-[12.5px] leading-snug text-[#111B21] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${
              m.me ? "self-end bg-[#D9FDD3]" : "self-start bg-white"
            }`}
          >
            {m.text}
            <span className="ml-2 inline-flex items-center gap-0.5 align-bottom text-[10px] text-[#667781]">
              {m.time}
              {m.me ? <CheckCheck size={12} className="text-[#53BDEB]" /> : null}
            </span>
          </div>
        ))}
        <span className="mx-auto mt-1 rounded-full bg-[#DC2626] px-2.5 py-0.5 text-[11px] font-bold text-white">47 mensajes sin leer</span>
      </div>
    </div>
  );

  const receipt = (
    <div className="w-[210px] rotate-[4deg] rounded-[10px] border border-[#E5E7EB] bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.15)]">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Comprobante de transferencia</span>
      <span className="mt-1 block text-[20px] font-extrabold text-[#111827]">$25.000</span>
      <span className="block text-[11px] text-[#6B7280]">De: M. L. · CVU …4821</span>
      <span className="mt-1.5 inline-block rounded bg-[#FEE2E2] px-1.5 py-0.5 text-[10px] font-semibold text-[#B91C1C]">¿de quién era este?</span>
    </div>
  );

  const note = (
    <div className="w-[170px] -rotate-[5deg] bg-[#FDE68A] p-3 font-[cursive] text-[13px] leading-snug text-[#78350F] shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
      cobrar a Juan!!
      <br />
      Sofi debe oct
      <br />
      pasar plan a Nico
    </div>
  );

  if (portrait) {
    return (
      <div className="relative h-full bg-[#FEF2F2]" style={{ padding: "64px 24px 24px" }}>
        <div className="flex flex-col gap-5">
          <div className="-rotate-[1.5deg]">{sheet}</div>
          <div className="rotate-[1deg] px-6">{chat}</div>
        </div>
        <div className="absolute bottom-8 right-6">{receipt}</div>
      </div>
    );
  }
  const reminder = (
    <div className="w-[260px] rounded-[14px] border border-white/70 bg-white/90 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.14)]">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Recordatorio · atrasado</span>
      <span className="mt-1 block text-[13px] font-semibold text-[#111827]">Cobrar cuotas de noviembre</span>
      <span className="block text-[11px] text-[#DC2626]">Faltan 5 de 18 alumnos</span>
    </div>
  );
  // Busy across the whole stage, with the chat straddling the middle so it shows at any handle position.
  return (
    <div className="relative h-full bg-[#FEF2F2]">
      <div className="absolute left-8 top-[70px] w-[560px] -rotate-[1.5deg]">{sheet}</div>
      <div className="absolute left-[430px] top-[200px] w-[340px] rotate-[2deg]">{chat}</div>
      <div className="absolute bottom-12 left-12">{note}</div>
      <div className="absolute right-10 top-[78px]">{reminder}</div>
      <div className="absolute bottom-16 right-16">{receipt}</div>
    </div>
  );
}

/** A design-size stage scaled to the slider box; inert so drags reach the slider and links never fire. */
function Stage({ size, scale, children }: { size: { w: number; h: number }; scale: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 select-none"
      style={{ width: size.w, height: size.h, transform: `scale(${scale})`, transformOrigin: "top left" }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

const COMPARE = [
  ["Planillas que nadie actualiza", "Programas en el Lab, por semana"],
  ["Mensajes perdidos en WhatsApp", "Comentarios y mensajes dentro de TOGO"],
  ["Perseguir transferencias", "Cuotas cobradas automáticamente"],
] as const;

export function BeforeAfter() {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1100);
  // Handle position from the left: TOGO is revealed on the left, the mess fills the rest (starts at 95%).
  const [pos, setPos] = useState(5);
  const dragging = useRef(false);
  const touched = useRef(false);
  const inView = useInView(box, { once: true, amount: 0.6 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // One gentle sweep the first time it's seen, so visitors notice the handle drags.
  useEffect(() => {
    if (!inView || touched.current) return;
    const c = animate(5, [5, 24, 5], {
      duration: 1.8,
      ease: "easeInOut",
      delay: 0.4,
      onUpdate: (v) => !touched.current && setPos(v),
    });
    return () => c.stop();
  }, [inView]);

  const portrait = width < 640;
  const stage = portrait ? PORTRAIT : LANDSCAPE;
  const scale = width / stage.w;

  const moveTo = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div className="flex flex-col gap-8">
      <div
        ref={box}
        className="relative w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-[20px] border border-[#E2E8F0] shadow-[0_24px_60px_rgba(1,23,38,0.10)]"
        style={{ height: stage.h * scale }}
        onPointerDown={(e) => {
          touched.current = true;
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          moveTo(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <Stage size={stage} scale={scale}>
          <AfterStage portrait={portrait} />
        </Stage>
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <Stage size={stage} scale={scale}>
            <BeforeStage portrait={portrait} />
          </Stage>
        </div>
        <div className="absolute inset-y-0 w-[2px] bg-[#011726]" style={{ left: `${pos}%` }}>
          <button
            type="button"
            aria-label="Deslizar comparación"
            onKeyDown={(e) => {
              touched.current = true;
              if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
              if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
            }}
            className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#011726] shadow-[0_4px_20px_rgba(1,23,38,0.2)]"
          >
            <GripVertical size={18} />
          </button>
        </div>
        <span
          className="pointer-events-none absolute left-3 top-3 rounded-full bg-[#0272B7] px-3 py-1 text-[12px] font-semibold text-white transition-opacity"
          style={{ opacity: pos > 18 ? 1 : 0 }}
        >
          Con TOGO
        </span>
        <span
          className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#DC2626] px-3 py-1 text-[12px] font-semibold text-white transition-opacity"
          style={{ opacity: pos < 82 ? 1 : 0 }}
        >
          Con Excel y WhatsApp
        </span>
        {pos < 12 && (
          <span className="pointer-events-none absolute left-[calc(5%+30px)] top-1/2 -translate-y-1/2 rounded-full bg-[#011726] px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg">
            Deslizá para ver TOGO →
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {COMPARE.map(([before, after]) => (
          <div key={before} className="flex flex-col gap-2 rounded-[14px] border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(1,23,38,0.04),0_8px_24px_rgba(1,23,38,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(2,114,183,0.14)]">
            <span className="text-[13px] text-[#9CA3AF] line-through decoration-[#DC2626]/60">{before}</span>
            <span className="flex items-center gap-2 text-[14px] font-semibold text-[#011726]">
              <ArrowRight size={15} className="shrink-0 text-[#0272B7]" />
              {after}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
