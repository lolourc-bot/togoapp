import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";

/**
 * Lays real app UI out at a desktop width and scales it to the box, as a picture: hover effects still
 * react, but clicks, drags, right-clicks, keys and focus are swallowed in the capture phase.
 */

const block = (e: SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

/** Lays `children` out at `designW` px wide and scales them to the box width; swallows every interaction. */
export function LookOnly({ designW, children }: { designW: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [innerH, setInnerH] = useState(600);
  useEffect(() => {
    const b = box.current;
    const i = inner.current;
    if (!b || !i) return;
    const ro = new ResizeObserver(() => {
      setScale(b.clientWidth / designW);
      setInnerH(i.offsetHeight);
    });
    ro.observe(b);
    ro.observe(i);
    return () => ro.disconnect();
  }, [designW]);
  return (
    <div ref={box} className="relative overflow-hidden" style={{ height: innerH * scale }}>
      <div
        ref={inner}
        style={{ width: designW, transform: `scale(${scale})`, transformOrigin: "top left" }}
        className="absolute left-0 top-0 select-none [&_*]:!cursor-default"
        onClickCapture={block}
        onDoubleClickCapture={block}
        onMouseDownCapture={block}
        onPointerDownCapture={block}
        onContextMenuCapture={block}
        onDragStartCapture={block}
        onKeyDownCapture={block}
        onFocusCapture={(e) => (e.target as HTMLElement).blur()}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

