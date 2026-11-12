import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, CopyPlus, EyeOff, Send, Trash2, X } from "lucide-react";

/** Sel id = `${cellKey}::${sessionId}`; cellKey ends with YYYY-MM-DD */
export const selId = (key: string, id: string) => `${key}::${id}`;
export const splitSel = (s: string) => {
  const i = s.lastIndexOf("::");
  return { key: s.slice(0, i), id: s.slice(i + 2) };
};
const keyDate = (key: string) => {
  const [y, m, d] = key.slice(-10).split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
export const shiftKey = (key: string, days: number) => {
  const d = keyDate(key);
  d.setDate(d.getDate() + days);
  return `${key.slice(0, -10)}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const dayDiff = (a: string, b: string) => Math.round((keyDate(a).getTime() - keyDate(b).getTime()) / 86400000);

type Rect = { x0: number; y0: number; x1: number; y1: number };

export function useDragSelect() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rect, setRect] = useState<Rect | null>(null);
  const rectRef = useRef<Rect | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest("[data-sel], button, input, textarea, select, a, [role=dialog]")) return;
    const r = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
    rectRef.current = r;
    setRect(r);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!rect) return;
    const move = (e: MouseEvent) => {
      const r = { ...rectRef.current!, x1: e.clientX, y1: e.clientY };
      rectRef.current = r;
      setRect(r);
      const l = Math.min(r.x0, r.x1), rt = Math.max(r.x0, r.x1), tp = Math.min(r.y0, r.y1), bt = Math.max(r.y0, r.y1);
      const next = new Set<string>();
      containerRef.current?.querySelectorAll<HTMLElement>("[data-sel]").forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.right >= l && b.left <= rt && b.bottom >= tp && b.top <= bt) next.add(el.dataset["sel"]!);
      });
      if (Math.abs(r.x1 - r.x0) > 4 || Math.abs(r.y1 - r.y0) > 4) setSelected(next);
    };
    const up = () => {
      const r = rectRef.current;
      if (r && Math.abs(r.x1 - r.x0) <= 4 && Math.abs(r.y1 - r.y0) <= 4) setSelected(new Set());
      rectRef.current = null;
      setRect(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [rect !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const overlay = rect
    ? createPortal(
        <div
          style={{
            position: "fixed",
            left: Math.min(rect.x0, rect.x1),
            top: Math.min(rect.y0, rect.y1),
            width: Math.abs(rect.x1 - rect.x0),
            height: Math.abs(rect.y1 - rect.y0),
            border: "1.5px solid #3B82F6",
            backgroundColor: "rgba(59,130,246,0.06)",
            pointerEvents: "none",
            zIndex: 15,
          }}
        />,
        document.body,
      )
    : null;

  return { containerRef, selected, setSelected, toggle, onMouseDown, overlay, clear: () => setSelected(new Set()) };
}

/** Wrap a session card: handles ctrl/cmd-click toggle and draws the selected state. */
export function Selectable({
  id,
  selected,
  onToggle,
  radius = 8,
  children,
}: {
  id: string;
  selected: boolean;
  onToggle: (id: string) => void;
  radius?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      data-sel={id}
      className="relative"
      onClickCapture={(e) => {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          onToggle(id);
        }
      }}
    >
      {children}
      {selected ? (
        <>
          <div style={{ position: "absolute", inset: 0, border: "1px solid #3B82F6", backgroundColor: "rgba(59,130,246,0.04)", borderRadius: radius, pointerEvents: "none" }} />
          <span className="flex items-center justify-center" style={{ position: "absolute", top: -5, left: -5, width: 16, height: 16, borderRadius: 999, backgroundColor: "#3B82F6", pointerEvents: "none", zIndex: 2 }}>
            <Check size={10} color="#FFFFFF" strokeWidth={3} />
          </span>
        </>
      ) : null}
    </div>
  );
}

const btn: React.CSSProperties = { height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", fontSize: 12, fontWeight: 500, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" };
const Div = () => <span style={{ width: 1, height: 20, backgroundColor: "#E2E8F0", flexShrink: 0 }} />;

export function SelectionToolbar({
  count,
  hasDraft,
  hasPublished,
  onCopy,
  onDuplicate,
  onPublish,
  onUnpublish,
  onDelete,
  onCancel,
}: {
  count: number;
  hasDraft: boolean;
  hasPublished: boolean;
  onCopy: () => void;
  onDuplicate: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (count < 2) return null;
  const say = (t: string) => {
    setNote(t);
    window.setTimeout(() => setNote(null), 1800);
  };
  return createPortal(
    <div
      className="animate-fade-in"
      style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 50, backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, minWidth: 480 }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{note ?? `${count} sesiones seleccionadas`}</span>
      <Div />
      {confirm ? (
        <div className="flex items-center" style={{ gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", whiteSpace: "nowrap" }}>{`¿Eliminar ${count} sesiones?`}</span>
          <button type="button" onClick={() => { setConfirm(false); onDelete(); }} style={{ height: 28, padding: "0 12px", borderRadius: 6, border: "none", backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Confirmar
          </button>
          <button type="button" onClick={() => setConfirm(false)} style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex items-center" style={{ gap: 6 }}>
          <button type="button" onClick={() => { onCopy(); say("Copiadas · elegí un día y tocá “Pegar aquí”"); }} className="hover:bg-[#F8FAFC]" style={btn}>
            <Copy size={13} />Copiar
          </button>
          <button type="button" onClick={() => { onDuplicate(); say("Duplicadas en la semana siguiente"); }} className="hover:bg-[#F8FAFC]" style={btn}>
            <CopyPlus size={13} />Duplicar
          </button>
          {hasDraft ? (
            <button type="button" onClick={onPublish} style={{ ...btn, color: "#22C55E", border: "1px solid #DCFCE7", backgroundColor: "#F0FDF4" }}>
              <Send size={13} color="#22C55E" />Publicar
            </button>
          ) : null}
          {hasPublished ? (
            <button type="button" onClick={onUnpublish} className="hover:bg-[#F8FAFC]" style={{ ...btn, color: "#94A3B8" }}>
              <EyeOff size={13} />Retirar
            </button>
          ) : null}
          <Div />
          <button type="button" onClick={() => setConfirm(true)} className="hover:bg-[#FEE2E2]" style={{ ...btn, color: "#EF4444", fontWeight: 600, border: "1px solid #FEE2E2", backgroundColor: "#FFF5F5" }}>
            <Trash2 size={13} color="#EF4444" />Eliminar
          </button>
        </div>
      )}
      <Div />
      <button type="button" aria-label="Cancelar selección" onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", lineHeight: 0 }}>
        <X size={13} color="#94A3B8" />
      </button>
    </div>,
    document.body,
  );
}

/** Generic session map ops (sessions keyed by cellKey). */
export function mapOps<S extends { id: string }>(
  setSessions: React.Dispatch<React.SetStateAction<Record<string, S[]>>>,
  clone: (s: S) => S,
) {
  const collect = (prev: Record<string, S[]>, sel: Set<string>) =>
    [...sel].map(splitSel).flatMap(({ key, id }) => {
      const s = (prev[key] ?? []).find((x) => x.id === id);
      return s ? [{ key, s }] : [];
    });
  return {
    collect,
    remove: (sel: Set<string>) =>
      setSessions((prev) => {
        const next = { ...prev };
        for (const { key, id } of [...sel].map(splitSel)) next[key] = (next[key] ?? []).filter((x) => x.id !== id);
        return next;
      }),
    patch: (sel: Set<string>, fn: (s: S) => S) =>
      setSessions((prev) => {
        const next = { ...prev };
        for (const { key, id } of [...sel].map(splitSel)) next[key] = (next[key] ?? []).map((x) => (x.id === id ? fn(x) : x));
        return next;
      }),
    place: (items: { key: string; s: S }[], offsetDays: number) => {
      const created: { key: string; s: S }[] = [];
      setSessions((prev) => {
        const next = { ...prev };
        for (const { key, s } of items) {
          const k = shiftKey(key, offsetDays);
          const ns = clone(s);
          created.push({ key: k, s: ns });
          next[k] = [...(next[k] ?? []), ns];
        }
        return next;
      });
      return created;
    },
  };
}
