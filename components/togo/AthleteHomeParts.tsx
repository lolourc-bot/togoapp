import { BellRing, ChevronLeft, ChevronRight, Clock, PlayCircle, ShoppingBag, User } from "lucide-react";
import { Dumbbell } from "@/components/togo/icons/Dumbbell";

/**
 * Presentational pieces of the athlete "Hoy" screen (routes/hoy.tsx), shared with the landing's mockup so
 * it shows the real screen. No data loading here: everything comes in through props.
 */

export type BlockPreview = {
  label: string;
  content: React.ReactNode;
  right?: React.ReactNode;
};

export type Day = {
  letter: string;
  number: number;
  /** ISO-ish key unique across weeks */
  key: string;
  past: boolean;
  session: Session[] | null;
};

export type Session = {
  id?: string;
  title: string;
  minutes: number;
  coach: string;
  blocks: BlockPreview[];
  equipment: string[];
};


export function DayColumn({
  day,
  isToday,
  isSelected,
  onSelect,
}: {
  day: Day;
  isToday: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const hasSession = day.session !== null;

  const numberColor = isSelected
    ? "#FFFFFF"
    : day.past || !hasSession
      ? "#CBD5E1"
      : "#111827";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Día ${day.number}`}
      aria-pressed={isSelected}
      className="flex flex-1 flex-col items-center"
      style={{ gap: 4 }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "#94A3B8",
          textTransform: "uppercase",
        }}
      >
        {day.letter}
      </span>

      <div
        className="flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: isSelected ? "#111827" : "transparent",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: isSelected ? 600 : 500,
            color: numberColor,
          }}
        >
          {day.number}
        </span>
      </div>

      {/* today marker when not selected */}
      <span
        style={{
          width: isToday && !isSelected ? 14 : 0,
          height: 3,
          borderRadius: 2,
          backgroundColor: "#111827",
        }}
      />

      {/* session dot */}
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: hasSession ? (day.past ? "#E2E8F0" : "#111827") : "transparent",
        }}
      />
    </button>
  );
}

export function SessionPreviewCard({
  session,
  onStart,
}: {
  session: Session;
  onStart: () => void;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        border: "1px solid #E2E8F0",
        padding: 20,
      }}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col" style={{ gap: 6, minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {session.title.replace(/ — .*$/, "")}
          </span>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Clock size={13} color="#94A3B8" />
            <span style={{ fontSize: 13, color: "#64748B" }}>~{session.minutes} min</span>
            <span style={{ fontSize: 13, color: "#64748B" }}>·</span>
            <span style={{ fontSize: 13, color: "#64748B" }}>
              {session.blocks.length} bloques
            </span>
          </div>
        </div>
        <span
          className="flex items-center"
          style={{
            gap: 5,
            backgroundColor: "#F1F5F9",
            borderRadius: 20,
            padding: "4px 10px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <User size={12} color="#64748B" />
          <span style={{ fontSize: 12, color: "#64748B" }}>{session.coach}</span>
        </span>
      </div>

      {/* BLOCK PREVIEW LIST */}
      <div style={{ marginTop: 16 }}>
        {session.blocks.map((block, i) => (
          <div
            key={block.label}
            className="flex items-center"
            style={{
              height: 44,
              gap: 10,
              borderBottom: i < session.blocks.length - 1 ? "1px solid #F8FAFC" : "none",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: "#F1F5F9",
                color: "#64748B",
                borderRadius: 6,
                padding: "2px 7px",
                minWidth: 22,
                textAlign: "center",
              }}
            >
              {block.label}
            </span>
            <span
              className="flex-1"
              style={{ fontSize: 13, fontWeight: 500, color: "#111827", minWidth: 0 }}
            >
              {block.content}
            </span>
            {block.right != null && (
              <span style={{ fontSize: 12, color: "#94A3B8", flexShrink: 0 }}>
                {block.right}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* EQUIPMENT NEEDED */}
      {session.equipment.length > 0 ? (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
          <div className="flex items-center" style={{ gap: 6, marginBottom: 8 }}>
            <Dumbbell size={13} color="#94A3B8" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>Necesitás</span>
          </div>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {session.equipment.map((eq) => (
              <span key={eq} style={{ fontSize: 12, color: "#374151", background: "#F1F5F9", borderRadius: 999, padding: "4px 10px" }}>{eq}</span>
            ))}
          </div>
        </div>
      ) : null}

      {/* START BUTTON */}
      <button
        type="button"
        onClick={onStart}
        className="flex w-full items-center justify-center"
        style={{
          marginTop: 20,
          height: 52,
          borderRadius: 14,
          backgroundColor: "#111827",
          color: "#FFFFFF",
          gap: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        <PlayCircle size={18} color="#FFFFFF" />
        <span style={{ fontSize: 15, fontWeight: 600 }}>Empezar sesión</span>
      </button>
    </div>
  );
}


export function HoyTopBar({
  range,
  unread,
  onPrevWeek,
  onNextWeek,
  onNotifications,
  onMarketplace,
}: {
  range: string;
  unread: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onNotifications: () => void;
  onMarketplace: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "16px 20px" }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: "#E2E8F0",
        }}
      >
        <span style={{ fontSize: 12, color: "#94A3B8" }}>AT</span>
      </div>

      <div className="flex items-center" style={{ gap: 8 }}>
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={onPrevWeek}
        >
          <ChevronLeft size={16} color="#94A3B8" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
          {range}
        </span>
        <button
          type="button"
          aria-label="Semana siguiente"
          onClick={onNextWeek}
        >
          <ChevronRight size={16} color="#94A3B8" />
        </button>
      </div>

      <div className="flex items-center" style={{ gap: 16 }}>
        <button
          type="button"
          aria-label="Notificaciones"
          onClick={onNotifications}
          style={{ position: "relative" }}
        >
          <BellRing size={20} color="#94A3B8" />
          {unread && (
            <span
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: "#EF4444",
                border: "1.5px solid #FFFFFF",
              }}
            />
          )}
        </button>
        <button
          type="button"
          aria-label="Marketplace"
          onClick={onMarketplace}
        >
          <ShoppingBag size={20} color="#94A3B8" />
        </button>
      </div>
    </div>
  );
}
