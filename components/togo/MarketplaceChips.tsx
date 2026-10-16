export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        flexShrink: 0,
        borderRadius: 20,
        padding: "0 14px",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        backgroundColor: selected ? "#111827" : "#FFFFFF",
        border: `1px solid ${selected ? "#111827" : "#E2E8F0"}`,
        color: selected ? "#FFFFFF" : "#64748B",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex"
      style={{
        padding: "0 16px",
        gap: 8,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {children}
    </div>
  );
}
