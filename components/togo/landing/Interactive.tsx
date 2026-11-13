import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Toguito: canned answers with a typing indicator.                   */
/* ------------------------------------------------------------------ */

export type ToguitoQA = { q: string; a: string };
type Msg = { from: "user" | "bot"; text: string; id: number };

export function ToguitoChat({ qa }: { qa: ToguitoQA[] }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "¡Hola! Soy Toguito. Elegí una pregunta y te cuento.", id: 0 },
  ]);
  const [typing, setTyping] = useState(false);
  const id = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const ask = (item: ToguitoQA) => {
    if (typing) return;
    setMsgs((m) => [...m, { from: "user", text: item.q, id: id.current++ }]);
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { from: "bot", text: item.a, id: id.current++ }]);
    }, 1100);
  };

  return (
    <div className="overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white shadow-[0_24px_60px_rgba(2,114,183,0.12)]">
      <div className="flex items-center gap-3 border-b border-[#E2E8F0] px-4 py-3">
        <img src="/toguito.png" alt="" className="h-9 w-auto" />
        <div>
          <div className="text-[14px] font-bold text-[#011726]">Toguito</div>
          <div className="text-[11px] text-[#16A34A]">En línea</div>
        </div>
      </div>
      <div ref={scroller} className="flex h-[300px] flex-col gap-2 overflow-y-auto px-4 py-4">
        <AnimatePresence initial={false}>
          {msgs.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[85%] rounded-[14px] px-3.5 py-2.5 text-[14px] leading-snug ${
                m.from === "user" ? "self-end rounded-br-[4px] bg-[#0272B7] text-white" : "self-start rounded-bl-[4px] bg-[#F1F5F9] text-[#011726]"
              }`}
            >
              {m.text}
            </motion.div>
          ))}
          {typing ? (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-1 self-start rounded-[14px] rounded-bl-[4px] bg-[#F1F5F9] px-4 py-3.5"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full bg-[#9CA3AF]"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[#E2E8F0] p-3">
        {qa.map((item) => (
          <button
            key={item.q}
            type="button"
            disabled={typing}
            onClick={() => ask(item)}
            className="rounded-full border border-[#0272B7]/40 px-3 py-1.5 text-[12px] font-medium text-[#0272B7] transition hover:bg-[#E8F3FA]"
          >
            {item.q}
          </button>
        ))}
      </div>
    </div>
  );
}
