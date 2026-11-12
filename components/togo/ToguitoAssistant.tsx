import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { askToguito, type ToguitoMessage } from "@/lib/toguito";

const GREETING: ToguitoMessage = {
  role: "assistant",
  content: "¡Hola! Soy Toguito 🐺 Preguntame lo que necesites sobre cómo usar TOGO, cobrarle a tus atletas o armar tus programas.",
};

export function ToguitoAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ToguitoMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  if (!user) return null;

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    askToguito({ data: { messages: next } })
      .then((res) => setMessages((prev) => [...prev, { role: "assistant", content: res.text }]))
      .catch(() =>
        setMessages((prev) => [...prev, { role: "assistant", content: "Tuve un problema para responder. Probá de nuevo." }]),
      )
      .finally(() => setLoading(false));
  };

  return (
    <>
      {open ? (
        <div
          className="flex flex-col"
          style={{
            position: "fixed",
            bottom: 108,
            right: 24,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            height: 480,
            maxHeight: "calc(100vh - 140px)",
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            border: "1px solid #E2E8F0",
            overflow: "hidden",
            zIndex: 90,
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", backgroundColor: "#111827" }}
          >
            <div className="flex items-center" style={{ gap: 10 }}>
              <div
                className="flex items-center justify-center"
                style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#FFFFFF", flexShrink: 0 }}
              >
                <img src="/toguito.png" alt="" width={22} height={22} style={{ objectFit: "contain" }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>Toguito</span>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
              style={{ color: "#CBD5E1", cursor: "pointer", background: "none", border: "none", display: "flex" }}
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex flex-col" style={{ flex: 1, overflowY: "auto", padding: 14, gap: 10 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  backgroundColor: m.role === "user" ? "#111827" : "#F1F5F9",
                  color: m.role === "user" ? "#FFFFFF" : "#111827",
                  borderRadius: 12,
                  padding: "8px 12px",
                  fontSize: 13,
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {loading ? (
              <div
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#F1F5F9",
                  color: "#64748B",
                  borderRadius: 12,
                  padding: "8px 12px",
                  fontSize: 13,
                }}
              >
                Toguito está pensando...
              </div>
            ) : null}
          </div>

          <div className="flex items-center" style={{ gap: 8, padding: 12, borderTop: "1px solid #F1F5F9" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Escribile a Toguito..."
              aria-label="Mensaje para Toguito"
              style={{
                flex: 1,
                height: 38,
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                padding: "0 12px",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              type="button"
              aria-label="Enviar"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "none",
                backgroundColor: "#111827",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Send size={15} color="#FFFFFF" />
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Abrir a Toguito"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 88,
          height: 88,
          borderRadius: "50%",
          border: "none",
          backgroundColor: "#FFFFFF",
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 90,
          padding: 0,
        }}
      >
        <img src="/toguito.png" alt="Toguito" width={50} height={64} style={{ height: 64, width: "auto", objectFit: "contain" }} />
      </button>
    </>
  );
}
