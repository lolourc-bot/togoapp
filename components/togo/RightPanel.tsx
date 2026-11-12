import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { NameItem } from "@/lib/dashboard";

export function UrgentCard({ unplanned }: { unplanned: NameItem[] }) {
  return (
    <section className="card-surface p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-danger" />
        <h2 className="text-[0.875rem] font-semibold text-foreground">Planificación urgente</h2>
      </div>

      <div className="mt-2">
        {unplanned.length === 0 ? (
          <p className="py-2.5 text-[0.75rem] text-subtle">Todos tus atletas tienen la semana planificada.</p>
        ) : (
          unplanned.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-surface-hover py-2.5 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <p className="max-w-[140px] truncate text-[0.8125rem] font-medium text-foreground">{item.name}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="chip bg-warning-soft py-1 text-[0.6875rem] text-warning">Sin planificar</span>
                <Link
                  to="/atletas/$athleteId"
                  params={{ athleteId: item.id }}
                  className="rounded-sm bg-primary px-2.5 py-1 text-[0.6875rem] font-medium text-primary-foreground transition-colors hover:opacity-90"
                >
                  Planificar
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

