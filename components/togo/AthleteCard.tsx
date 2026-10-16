import { MessageCircle, Calendar } from "lucide-react";

export type Athlete = {
  name: string;
  last: string;
  next: string | null;
  load: number;
  tone: "success" | "warning" | "danger";
};

export const athletes: Athlete[] = [
  { name: "Santiago Pérez", last: "ayer", next: "mañana", load: 82, tone: "danger" },
  { name: "Valentina García", last: "hace 3 días", next: "hoy", load: 65, tone: "warning" },
  { name: "Lucía Torres", last: "hoy", next: "jueves", load: 45, tone: "success" },
  { name: "Matías López", last: "hace 5 días", next: null, load: 20, tone: "success" },
  { name: "Camila Sánchez", last: "ayer", next: "pasado mañana", load: 71, tone: "warning" },
  { name: "Federico Díaz", last: "hoy", next: "viernes", load: 55, tone: "success" },
  { name: "Agustina Ruiz", last: "hace 2 días", next: "mañana", load: 88, tone: "danger" },
  { name: "Tomás Fernández", last: "hace 7 días", next: null, load: 10, tone: "success" },
];

const barColor = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

const labelColor = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
} as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AthleteCard({ athlete }: { athlete: Athlete }) {
  const overload = athlete.load >= 80;

  return (
    <article
      className={`card-surface w-full px-4 py-3.5 ${overload ? "border-l-[3px] border-l-danger" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-border text-[0.8125rem] font-semibold text-foreground">
            {initials(athlete.name)}
          </div>
          <div>
            <p className="text-[0.875rem] font-semibold text-foreground">{athlete.name}</p>
            <p className="text-[0.75rem] text-subtle">Última sesión: {athlete.last}</p>
          </div>
        </div>

        <div className="flex w-[160px] flex-col items-end gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-[3px] bg-border">
            <div
              className={`h-full rounded-[3px] ${barColor[athlete.tone]}`}
              style={{ width: `${athlete.load}%` }}
            />
          </div>
          <span className={`text-[0.6875rem] font-medium ${labelColor[athlete.tone]}`}>
            {athlete.load}%
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        {athlete.next ? (
          <span className="chip bg-success-soft py-1 text-[0.6875rem] text-success">
            Próxima: {athlete.next}
          </span>
        ) : (
          <span className="chip bg-warning-soft py-1 text-[0.6875rem] text-warning">
            Sin sesión planificada
          </span>
        )}

        <div className="flex items-center gap-3 text-subtle">
          <button type="button" aria-label={`Mensaje a ${athlete.name}`}>
            <MessageCircle size={15} />
          </button>
          <button type="button" aria-label={`Planificar sesión de ${athlete.name}`}>
            <Calendar size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
