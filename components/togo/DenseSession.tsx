import { CheckCircle2, Clock, Droplets, Heart } from "lucide-react";

export type DenseRow = {
  label: string;
  kind: "single" | "superset" | "circuit";
  group?: string;
  name: string;
  detail?: string;
  note?: string;
};

type Status = "draft" | "published" | "done";
export const STATUS_COLOR: Record<Status, string> = { draft: "#CBD5E1", published: "#22C55E", done: "#111827" };

const LABEL_STYLE: Record<DenseRow["kind"], { bg: string; color: string }> = {
  single: { bg: "#F1F5F9", color: "#94A3B8" },
  superset: { bg: "#EFF6FF", color: "#3B82F6" },
  circuit: { bg: "#FFFBEB", color: "#D97706" },
};
const GROUP_COLOR = { superset: "#3B82F6", circuit: "#D97706" } as const;

function Row({ r }: { r: DenseRow }) {
  const st = LABEL_STYLE[r.kind];
  return (
    <div>
      <div className="flex items-start" style={{ gap: 5 }}>
        <span
          className="inline-flex shrink-0 items-center justify-center"
          style={{ width: 15, height: 15, borderRadius: "50%", fontSize: 8, fontWeight: 700, backgroundColor: st.bg, color: st.color, marginTop: 1 }}
        >
          {r.label}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate" style={{ fontSize: 10, fontWeight: 600, color: "#374151" }}>{r.name}</span>
          {r.detail ? <span className="truncate" style={{ fontSize: 9, color: "#94A3B8" }}>{r.detail}</span> : null}
        </div>
      </div>
      {r.note ? (
        <div
          style={{ backgroundColor: "#F8FAFC", borderLeft: "2px solid #E2E8F0", borderRadius: "0 4px 4px 0", padding: "3px 7px", fontSize: 9, color: "#6B7280", fontStyle: "italic", marginLeft: 20, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {r.note}
        </div>
      ) : null}
    </div>
  );
}

export function DenseExerciseList({ rows }: { rows: DenseRow[] }) {
  const groups: DenseRow[][] = [];
  rows.forEach((r) => {
    const last = groups[groups.length - 1];
    if (last && r.group && last[0]!.group === r.group && last[0]!.kind === r.kind) last.push(r);
    else groups.push([r]);
  });
  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      {groups.map((g, i) =>
        g[0]!.kind === "single" ? (
          <Row key={i} r={g[0]!} />
        ) : (
          <div
            key={i}
            className="flex flex-col"
            style={{
              gap: 2,
              borderLeft: `2px solid ${GROUP_COLOR[g[0]!.kind as "superset" | "circuit"]}`,
              paddingLeft: 6,
              marginLeft: 4,
              backgroundColor: g[0]!.kind === "superset" ? "rgba(59,130,246,0.03)" : "rgba(217,119,6,0.03)",
            }}
          >
            {g.map((r, k) => (
              <Row key={k} r={r} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}

export function DenseSessionBlock({
  name,
  status,
  rows,
  menu,
  onOpen,
}: {
  name: string;
  status: Status;
  rows: DenseRow[];
  menu?: React.ReactNode;
  onOpen?: () => void;
}) {
  const color = STATUS_COLOR[status];
  const meta: [React.ReactNode, string][] = [
    [<CheckCircle2 key="c" size={12} color="#22C55E" />, `${rows.length}/${rows.length}`],
    [<Droplets key="d" size={11} color="#CBD5E1" />, "—"],
    [<Clock key="t" size={11} color="#CBD5E1" />, status === "done" ? "105" : "—"],
    [<Heart key="h" size={11} color="#CBD5E1" />, status === "done" ? "10" : "—"],
  ];
  return (
    <div
      onClick={onOpen}
      style={{ borderLeft: `3px solid ${color}`, backgroundColor: "#FFFFFF", borderRadius: "0 4px 4px 0", padding: "6px 8px", cursor: onOpen ? "pointer" : undefined, boxShadow: "0 0 0 1px #F1F5F9" }}
    >
      <div className="flex items-center" style={{ gap: 6, marginBottom: 5 }}>
        <span className="shrink-0" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate" style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{name}</span>
        {menu ? <span onClick={(e) => e.stopPropagation()}>{menu}</span> : null}
      </div>
      {status !== "draft" ? (
        <div className="flex items-center overflow-hidden" style={{ gap: 6, marginBottom: 4 }}>
          {meta.map(([icon, v], i) => (
            <span key={i} className="inline-flex items-center" style={{ gap: 2, fontSize: 9, color: "#94A3B8" }}>
              {icon}
              {v}
            </span>
          ))}
        </div>
      ) : null}
      {rows.length ? <DenseExerciseList rows={rows} /> : <span style={{ fontSize: 9, color: "#CBD5E1" }}>Sin ejercicios</span>}
    </div>
  );
}

/** Style tokens for calendar day cells (shared by athlete + team calendars). */
export const denseCell = {
  cell: (outside: boolean, last: boolean): React.CSSProperties => ({
    borderRight: last ? "none" : "1px solid #E2E8F0",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minWidth: 0,
    padding: 0,
    backgroundColor: outside ? "#F8FAFC" : "#FFFFFF",
    position: "relative",
  }),
  header: { flexShrink: 0, padding: "7px 8px", borderBottom: "1px solid #F1F5F9", backgroundColor: "#FAFAFA", display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  dayNum: (today: boolean, outside: boolean): React.CSSProperties =>
    today
      ? { width: 24, height: 24, borderRadius: "50%", backgroundColor: "#111827", color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }
      : { fontSize: 13, fontWeight: 700, color: outside ? "#CBD5E1" : "#374151" },
  area: { flex: 1, padding: "6px 6px 0", display: "flex", flexDirection: "column", gap: 4 } as React.CSSProperties,
  addBtn: "flex shrink-0 cursor-pointer items-center justify-center transition-colors text-[#CBD5E1] hover:border-[#94A3B8] hover:text-[#374151]",
  addStyle: { margin: "4px 6px 6px", border: "1px dashed #E2E8F0", borderRadius: 5, padding: "4px 0", width: "calc(100% - 12px)", gap: 3, fontSize: 10, background: "none" } as React.CSSProperties,
  weekRow: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderBottom: "1px solid #E2E8F0" } as React.CSSProperties,
};

/** Dark top bar shared by the monthly calendars. */
export function CalendarTopBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center" style={{ position: "sticky", top: 0, zIndex: 12, height: 52, backgroundColor: "#111827", padding: "0 20px", gap: 16, flexShrink: 0 }}>
      {children}
    </div>
  );
}
