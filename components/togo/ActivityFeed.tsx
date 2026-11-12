import { Clock, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { FeedItem } from "@/lib/dashboard";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function BlockDots({ total }: { total: number }) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="inline-block h-[10px] w-[10px] rounded-full"
          style={{ backgroundColor: "#111827", border: "1.5px solid #111827" }}
        />
      ))}
    </span>
  );
}

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <section>
      <h2 className="mb-3 text-[0.9375rem] font-semibold text-foreground">Actividad reciente</h2>

      {items.length === 0 ? (
        <p className="text-[0.8125rem] text-subtle">Todavía no hay sesiones completadas.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((s, i) => (
            <Link
              key={`${s.athleteId}-${i}`}
              to="/atletas/$athleteId"
              params={{ athleteId: s.athleteId }}
              className="card-surface block w-full px-4 py-3.5 transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-border text-[0.8125rem] font-semibold text-foreground">
                    {initials(s.athleteName)}
                  </div>
                  <div>
                    <p className="text-[0.875rem] font-semibold text-foreground">{s.athleteName}</p>
                    <p className="text-[0.75rem] text-subtle">{s.sessionName}</p>
                  </div>
                </div>
                <span className="text-[0.75rem] text-subtle">{s.timeAgo}</span>
              </div>

              <div
                className="mt-2.5 grid items-center overflow-hidden"
                style={{ gridTemplateColumns: "140px 100px 1fr", gap: 8 }}
              >
                <span className="flex w-[140px] min-w-[140px] max-w-[140px] flex-nowrap items-center justify-start gap-1.5 whitespace-nowrap">
                  <span className="text-[11px]" style={{ color: "#94A3B8" }}>
                    Bloques
                  </span>
                  <BlockDots total={s.blocks} />
                </span>

                <span
                  className="flex items-center gap-1 whitespace-nowrap text-[11px]"
                  style={{ color: "#94A3B8" }}
                >
                  <Clock size={12} />
                  {`~${s.minutes} min`}
                </span>

                {s.feelingLabel ? (
                  <span className="flex items-center justify-end whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-medium"
                      style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}
                    >
                      <Zap size={12} color="#D97706" />
                      {s.feelingLabel}
                    </span>
                  </span>
                ) : (
                  <span />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
