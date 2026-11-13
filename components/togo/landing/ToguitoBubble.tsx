import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, X } from "lucide-react";
import { askToguitoPublic, type PublicToguitoMessage } from "@/lib/toguito-public";
import type { ToguitoQA } from "./Interactive";

/**
 * Floating Toguito for landing visitors. Suggested questions answer instantly from `qa`; anything typed goes to
 * the public Toguito (Claude) with the conversation so far. A small "¿Dudas?" nudge shows once after a while.
 */

const GREETING = "¡Hola! Soy Toguito 🐺 ¿Tenés alguna duda sobre TOGO? Preguntame lo que quieras.";

export function ToguitoBubble({ qa, onSignUp }: { qa: ToguitoQA[]; onSignUp: () => void }) {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [messages, setMessages] = useState<PublicToguitoMessage[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const asked = messages.some((m) => m.role === "user");

  useEffect(() => {
    const t = setTimeout(() => setNudge(true), 6000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);
  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  const toggle = () => {
    setNudge(false);
    setOpen((v) => !v);
  };

  const pickSuggestion = (item: ToguitoQA) => {
    if (loading) return;
    setMessages((m) => [...m, { role: "user", content: item.q }]);
    setLoading(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content: item.a }]);
      setLoading(false);
    }, 700);
  };

  const send = () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: PublicToguitoMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    askToguitoPublic({ data: { messages: next } })
      .then((res) => setMessages((m) => [...m, { role: "assistant", content: res.text }]))
      .catch(() => setMessages((m) => [...m, { role: "assistant", content: "Tuve un problema para responder. Probá de nuevo." }]))
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            style={{ transformOrigin: "bottom right" }}
            className="flex h-[min(540px,calc(100dvh-120px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white shadow-[0_2px_6px_rgba(1,23,38,0.06),0_30px_80px_rgba(1,23,38,0.22)]"
            role="dialog"
            aria-label="Chat con Toguito"
          >
            <div className="flex items-center gap-3 bg-[linear-gradient(135deg,#0272B7,#015A92)] px-4 py-3 text-white">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                <img src="/toguito.png" alt="" className="h-8 w-auto" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold leading-tight">Toguito</div>
                <div className="flex items-center gap-1.5 text-[11.5px] text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" /> Respondo al instante
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={toggle}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div ref={scroller} className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#F8FAFC] px-4 py-4">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-[14px] px-3.5 py-2.5 text-[14px] leading-snug ${
                    m.role === "user"
                      ? "self-end rounded-br-[4px] bg-[#0272B7] text-white"
                      : "self-start rounded-bl-[4px] border border-[#E2E8F0] bg-white text-[#011726] shadow-[0_1px_2px_rgba(1,23,38,0.05)]"
                  }`}
                >
                  {m.content}
                </motion.div>
              ))}
              {loading ? (
                <div className="flex gap-1 self-start rounded-[14px] rounded-bl-[4px] border border-[#E2E8F0] bg-white px-4 py-3.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 rounded-full bg-[#9CA3AF]"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              ) : null}
              {!asked ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {qa.map((item) => (
                    <button
                      key={item.q}
                      type="button"
                      onClick={() => pickSuggestion(item)}
                      className="rounded-full border border-[#0272B7]/30 bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#0272B7] shadow-[0_1px_2px_rgba(1,23,38,0.05)] transition hover:border-[#0272B7] hover:bg-[#E8F3FA]"
                    >
                      {item.q}
                    </button>
                  ))}
                </div>
              ) : null}
              {asked && !loading ? (
                <button
                  type="button"
                  onClick={onSignUp}
                  className="mt-1 self-start rounded-full bg-[#E8F3FA] px-3 py-1.5 text-[12.5px] font-semibold text-[#0272B7] transition hover:bg-[#0272B7] hover:text-white"
                >
                  Empezar gratis →
                </button>
              ) : null}
            </div>

            <form
              className="flex items-center gap-2 border-t border-[#E2E8F0] bg-white p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={800}
                placeholder="Escribile a Toguito…"
                aria-label="Mensaje para Toguito"
                className="h-10 min-w-0 flex-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[14px] text-[#011726] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0272B7] focus:bg-white"
              />
              <button
                type="submit"
                aria-label="Enviar"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0272B7] text-white shadow-[0_4px_12px_rgba(2,114,183,0.3)] transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
              >
                <ArrowUp size={18} />
              </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <AnimatePresence>
          {nudge && !open ? (
            <motion.div
              key="nudge"
              initial={{ opacity: 0, x: 12, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.9 }}
              className="relative hidden sm:block"
            >
              <button
                type="button"
                onClick={toggle}
                className="rounded-[14px] rounded-br-[4px] border border-[#E2E8F0] bg-white px-4 py-2.5 text-left text-[13.5px] font-semibold text-[#011726] shadow-[0_12px_32px_rgba(1,23,38,0.14)]"
              >
                ¿Dudas? Preguntale a Toguito 👋
              </button>
              <button
                type="button"
                aria-label="Ocultar"
                onClick={() => setNudge(false)}
                className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#6B7280] shadow-sm hover:text-[#011726]"
              >
                <X size={11} />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <motion.button
          type="button"
          aria-label={open ? "Cerrar chat con Toguito" : "Abrir chat con Toguito"}
          onClick={toggle}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 18 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#E2E8F0] bg-white shadow-[0_4px_10px_rgba(1,23,38,0.08),0_16px_40px_rgba(2,114,183,0.28)]"
        >
          {!open ? <span className="absolute inset-0 animate-ping rounded-full bg-[#0272B7]/15 [animation-duration:2.5s]" /> : null}
          {open ? (
            <X size={24} className="text-[#011726]" />
          ) : (
            <img src="/toguito.png" alt="" className="relative h-11 w-auto" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
