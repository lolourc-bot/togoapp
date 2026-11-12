import { useState, useEffect, useCallback } from "react";
import {
  PlayCircle,
  BatteryLow,
  BatteryMedium,
  Battery,
  BatteryFull,
  Zap,
  Coffee,
  Bed,
  Minus,
  Moon,
  Star,
  AlertTriangle,
  Frown,
  Meh,
  Smile,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";

type Question = {
  id: string;
  label: string;
  options: { icon: LucideIcon; label: string }[];
};

export const QUESTIONS: Question[] = [
  {
    id: "energia",
    label: "¿Cómo está tu energía?",
    options: [
      { icon: Battery, label: "Baja" },
      { icon: BatteryLow, label: "Regular" },
      { icon: BatteryMedium, label: "Bien" },
      { icon: BatteryFull, label: "Alta" },
      { icon: Zap, label: "Máxima" },
    ],
  },
  {
    id: "sueno",
    label: "¿Cómo dormiste?",
    options: [
      { icon: Coffee, label: "Muy mal" },
      { icon: Bed, label: "Mal" },
      { icon: Minus, label: "Regular" },
      { icon: Moon, label: "Bien" },
      { icon: Star, label: "Muy bien" },
    ],
  },
  {
    id: "cuerpo",
    label: "¿Cómo está tu cuerpo?",
    options: [
      { icon: AlertTriangle, label: "Con dolor" },
      { icon: Frown, label: "Cargado" },
      { icon: Meh, label: "Tenso" },
      { icon: Smile, label: "Bien" },
      { icon: Dumbbell, label: "Perfecto" },
    ],
  },
];

type Props = {
  show: boolean;
  /** dismiss the sheet (e.g. back to Home) */
  onClose: () => void;
  /** start the session (navigate to active session); receives whatever answers were picked */
  onStart: (answers: Record<string, number>) => void;
};

export default function WellnessSheet({ show, onClose, onStart }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [closing, setClosing] = useState(false);

  // reset closing whenever the sheet re-opens
  useEffect(() => {
    if (show) setClosing(false);
  }, [show]);

  const dismiss = useCallback(
    (action: () => void) => {
      setClosing(true);
      setTimeout(action, 320);
    },
    [],
  );

  const handleClose = useCallback(() => dismiss(onClose), [dismiss, onClose]);
  const handleStart = useCallback(() => dismiss(() => onStart(answers)), [dismiss, onStart, answers]);

  const selectOption = (qId: string, index: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: index }));
  };

  const open = show && !closing;

  return (
    <>
      {/* Dimmed overlay — sits above Home content (z-20).
          Tapping it dismisses the sheet. */}
      <div
        onClick={handleClose}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 20,
          backgroundColor: "rgba(0, 0, 0, 0.35)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 320ms ease",
        }}
      />

      {/* Bottom sheet — sits above the overlay (z-30) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "50%",
          maxHeight: "50vh",
          zIndex: 30,
          backgroundColor: "#FFFFFF",
          borderRadius: "20px 20px 0 0",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.12)",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 36,
            height: 4,
            backgroundColor: "#E2E8F0",
            borderRadius: 2,
            margin: "0 auto 16px",
            flexShrink: 0,
          }}
        />

        {/* Heading + Saltar row */}
        <div
          className="flex items-end justify-between"
          style={{ marginBottom: 16, flexShrink: 0 }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#111827",
              margin: 0,
            }}
          >
            Wellness
          </h2>
          <button
            type="button"
            onClick={handleStart}
            style={{
              fontSize: 12,
              color: "#94A3B8",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Saltar →
          </button>
        </div>

        {/* Questions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            flex: 1,
            minHeight: 0,
          }}
        >
          {QUESTIONS.map((q) => (
            <div key={q.id}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                {q.label}
              </div>
              <div className="flex" style={{ gap: 6 }}>
                {q.options.map((opt, i) => {
                  const selected = answers[q.id] === i;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectOption(q.id, i)}
                      className="flex flex-1 flex-col items-center justify-center"
                      style={{
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: selected ? "#111827" : "#FFFFFF",
                        border: selected
                          ? "1px solid #111827"
                          : "1px solid #E2E8F0",
                        color: selected ? "#FFFFFF" : "#64748B",
                        gap: 2,
                        cursor: "pointer",
                        transition: "all 120ms ease",
                      }}
                    >
                      <Icon
                        size={14}
                        color={selected ? "#FFFFFF" : "#64748B"}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          lineHeight: 1,
                          color: selected ? "#FFFFFF" : "#64748B",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Empezar button */}
        <button
          type="button"
          onClick={handleStart}
          className="flex w-full items-center justify-center"
          style={{
            height: 48,
            marginTop: 16,
            borderRadius: 12,
            backgroundColor: "#111827",
            color: "#FFFFFF",
            gap: 8,
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <PlayCircle size={18} color="#FFFFFF" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Empezar</span>
        </button>
      </div>
    </>
  );
}
