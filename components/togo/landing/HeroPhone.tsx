import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { motion } from "framer-motion";
import { AthleteNavBar } from "../AthleteBottomNav";
import { AthleteSessionView, type Block, type SetRow } from "../AthleteSessionView";

/**
 * Photo-real iPhone (titanium frame, Dynamic Island, side buttons, glass glare) running the real athlete
 * session screen (AthleteSessionView in demo mode), so the hero always shows the actual app.
 */

function StatusBar() {
  return (
    <div className="flex h-[56px] items-center justify-between px-8 pt-0.5 text-[14px] font-semibold text-[#011726]">
      <span className="w-[54px] text-center">9:41</span>
      <span className="flex items-center gap-[5px]">
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="#011726">
          <rect x="0" y="7" width="3" height="4" rx="0.8" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.8" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.8" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.8" />
        </svg>
        {/* wifi */}
        <svg width="15" height="11" viewBox="0 0 15 11" fill="#011726">
          <path d="M7.5 2.2c2.1 0 4 .8 5.5 2.1l1.1-1.1A9.4 9.4 0 0 0 7.5.6 9.4 9.4 0 0 0 .9 3.2L2 4.3a7.8 7.8 0 0 1 5.5-2.1Z" />
          <path d="M7.5 5.3c1.3 0 2.4.5 3.3 1.2l1.1-1.1a6.3 6.3 0 0 0-8.8 0l1.1 1.1c.9-.7 2-1.2 3.3-1.2Z" />
          <path d="M7.5 8.3c.5 0 .9.2 1.2.5L7.5 10 6.3 8.8c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        {/* battery */}
        <span className="relative ml-0.5 flex h-[12px] w-[25px] items-center rounded-[4px] border border-[#011726]/40 p-[1.5px]">
          <span className="h-full w-[78%] rounded-[2px] bg-[#011726]" />
          <span className="absolute -right-[3px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r bg-[#011726]/40" />
        </span>
      </span>
    </div>
  );
}

const set = (reps: string, weight: string, done = false): SetRow => ({ reps, weight, done, note: "", noteOpen: false });

/** Sample session shown in the hero, rendered with the real athlete screen in demo mode. */
const DEMO_META = { id: "demo", coachId: "demo", name: "Fuerza tren inferior" };
// Exercises and videos straight from the TOGO video library ("Sentadilla con barra", "RDL con barra").
const DEMO_BLOCKS: Block[] = [
  {
    letter: "A",
    exercises: [
      {
        id: "a1",
        label: "A1",
        name: "Sentadilla con barra",
        suggestion: "",
        videoUrl: "https://youtube.com/watch?v=EiIctqP-Zog",
        sets: [set("5", "80", true), set("5", "80", true), set("5", "82.5")],
      },
    ],
  },
  {
    letter: "B",
    exercises: [
      {
        id: "b1",
        label: "B1",
        name: "RDL con barra",
        note: "Cadera atrás, espalda neutra y la barra pegada a las piernas.",
        suggestion: "",
        videoUrl: "https://youtube.com/watch?v=JeNxGnaJbjQ",
        sets: [set("8", "60"), set("8", "60"), set("8", "60"), set("8", "60")],
      },
    ],
  },
];

const APP_W = 375;
const STATUS_H = 56;

/** Swallows clicks, drags, keys and focus in the capture phase: hover still reacts, nothing can be used. */
const swallow = (e: SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};
export const lookOnlyHandlers = {
  onClickCapture: swallow,
  onDoubleClickCapture: swallow,
  onMouseDownCapture: swallow,
  onPointerDownCapture: swallow,
  onTouchStartCapture: swallow,
  onContextMenuCapture: swallow,
  onDragStartCapture: swallow,
  onKeyDownCapture: swallow,
  onFocusCapture: (e: SyntheticEvent) => (e.target as HTMLElement).blur(),
};

/**
 * Lays a real 375px-wide app screen out under an iOS status bar and scales it to the phone glass.
 * `lookOnly` makes it a picture: nothing inside can be tapped, typed into or scrolled by dragging.
 */
export function PhoneScreen({ children, lookOnly = false }: { children: ReactNode; lookOnly?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 302, h: 687 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = box.w / APP_W;
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-white">
      <div
        style={{ width: APP_W, height: box.h / scale, transform: `scale(${scale})`, transformOrigin: "top left" }}
        className={`flex flex-col ${lookOnly ? "select-none [&_*]:!cursor-default" : ""}`}
        {...(lookOnly ? { ...lookOnlyHandlers, "aria-hidden": true } : {})}
      >
        <div style={{ height: STATUS_H }} className="shrink-0 bg-white">
          <StatusBar />
        </div>
        {children}
        <div style={{ height: 22 }} className="shrink-0 bg-white" />
      </div>
    </div>
  );
}

/**
 * iPhone 16 Pro hardware drawn to real proportions (71.6 × 147.6 mm body, ~2.4% bezels, Dynamic Island 32% of the
 * glass): black-titanium frame with a polished edge, side buttons, thin black bezel and a faint glass reflection.
 * Every size is in container units (cqw) so the phone looks the same at any width.
 */
const titanium = "linear-gradient(90deg,#1a1a1c 0%,#4a4a4e 12%,#2a2a2d 30%,#232325 70%,#4a4a4e 88%,#1a1a1c 100%)";
const button = (side: "left" | "right", top: string, height: string) => (
  <span
    className="absolute"
    style={{
      [side]: "-0.75cqw",
      top,
      height,
      width: "1.1cqw",
      borderRadius: side === "left" ? "0.6cqw 0 0 0.6cqw" : "0 0.6cqw 0.6cqw 0",
      background: `linear-gradient(${side === "left" ? 90 : 270}deg,#5c5c60 0%,#2c2c2f 55%,#1c1c1e 100%)`,
      boxShadow: "inset 0 0.2cqw 0.2cqw rgba(255,255,255,0.18), inset 0 -0.2cqw 0.2cqw rgba(0,0,0,0.5)",
    }}
  />
);

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative" style={{ containerType: "inline-size" }}>
      {button("left", "17%", "4.6%")}
      {button("left", "24.5%", "8%")}
      {button("left", "34%", "8%")}
      {button("right", "27%", "12.5%")}
      {/* frame */}
      <div
        className="relative aspect-[71.6/147.6]"
        style={{
          borderRadius: "17.5cqw",
          padding: "1.15cqw",
          background: titanium,
          boxShadow: [
            "inset 0 0 0 0.22cqw rgba(255,255,255,0.16)", // polished outer chamfer
            "inset 0 0 0.5cqw 0.35cqw rgba(0,0,0,0.55)",
            "0 1px 2px rgba(0,0,0,0.30)",
            "0 6px 12px rgba(1,23,38,0.22)",
            "0 22px 44px -6px rgba(1,23,38,0.40)",
            "0 50px 100px -10px rgba(1,23,38,0.50)",
            "0 90px 160px -40px rgba(2,114,183,0.35)",
          ].join(","),
        }}
      >
        {/* bezel */}
        <div
          className="relative h-full bg-black"
          style={{ borderRadius: "16.4cqw", padding: "2.5cqw", boxShadow: "inset 0 0 0 0.15cqw rgba(255,255,255,0.05)" }}
        >
          {/* glass */}
          <div className="relative h-full overflow-hidden bg-white" style={{ borderRadius: "13.9cqw" }}>
            {children}
            <span
              className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black"
              style={{ top: "1.35%", width: "32%", aspectRatio: "3.4" }}
            >
              <span
                className="absolute top-1/2 aspect-square -translate-y-1/2 rounded-full"
                style={{ right: "11%", height: "34%", background: "radial-gradient(circle at 35% 35%,#2f3b55,#07090e 70%)" }}
              />
            </span>
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.03)_32%,transparent_46%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroPhone() {
  return (
    <div className="relative mx-auto w-[300px] [perspective:1600px] sm:w-[330px]">
      {/* floor shadow */}
      <div className="absolute -bottom-10 left-1/2 h-10 w-[80%] -translate-x-1/2 rounded-[50%] bg-[#011726]/25 blur-2xl" />
      <motion.div
        initial={{ opacity: 0, y: 60, rotateY: -28, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateY: -14, rotateX: 4 }}
        transition={{ delay: 0.4, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative [transform-style:preserve-3d]"
      >
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
          <PhoneShell>
            <PhoneScreen>
              <div className="min-h-0 flex-1">
                <AthleteSessionView meta={DEMO_META} initialBlocks={DEMO_BLOCKS} demo />
              </div>
              <AthleteNavBar labels={["Training", "Mensajes", "Timer", "Progreso", "Perfil"]} current="Training" demo />
            </PhoneScreen>
          </PhoneShell>
        </motion.div>
      </motion.div>

    </div>
  );
}

/** The same session screen as the hero, as a still picture (nothing inside can be used). */
export function SessionPhone() {
  return (
    <PhoneShell>
      <PhoneScreen lookOnly>
        <div className="min-h-0 flex-1">
          <AthleteSessionView meta={DEMO_META} initialBlocks={DEMO_BLOCKS} demo />
        </div>
        <AthleteNavBar labels={["Training", "Mensajes", "Timer", "Progreso", "Perfil"]} current="Training" demo />
      </PhoneScreen>
    </PhoneShell>
  );
}
