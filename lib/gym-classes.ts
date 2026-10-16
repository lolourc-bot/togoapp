export const CLASS_TYPES = {
  "Musculación": "#111827",
  "CrossFit": "#3B82F6",
  "Yoga / Pilates": "#22C55E",
  "Cardio / Spinning": "#EF4444",
  "Natación": "#06B6D4",
  "Funcional": "#8B5CF6",
  "Personalizada": "#D97706",
} as const;
export type ClassType = keyof typeof CLASS_TYPES;

export type GymClass = {
  id: string;
  name: string;
  type: ClassType;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  duration: number;
  coach: string;
  room: string;
  capacity: number;
  booked: number;
  waitlistEnabled: boolean;
  waitlist: number;
  description?: string;
};

export const COACHES = ["Martín Gutiérrez", "Lucía Fernández", "Diego Romero", "Camila Sosa", "Joaquín Paz", "Valentina Ruiz"];
export const shortName = (n: string) => { const [a, b] = n.split(" "); return b ? `${a} ${b[0]}.` : a; };

const TEMPLATE: { name: string; type: ClassType; start: string; duration: number; coach: number; room: string; capacity: number; days: number[] }[] = [
  { name: "CrossFit WOD", type: "CrossFit", start: "07:00", duration: 60, coach: 0, room: "Box", capacity: 16, days: [0, 1, 2, 3, 4] },
  { name: "Yoga Flow", type: "Yoga / Pilates", start: "08:00", duration: 60, coach: 1, room: "Sala 2", capacity: 14, days: [0, 2, 4, 5] },
  { name: "CrossFit", type: "CrossFit", start: "09:00", duration: 60, coach: 0, room: "Sala principal", capacity: 20, days: [1, 3] },
  { name: "Musculación guiada", type: "Musculación", start: "10:30", duration: 90, coach: 2, room: "Sala de pesas", capacity: 12, days: [0, 1, 2, 3, 4] },
  { name: "Funcional", type: "Funcional", start: "12:30", duration: 45, coach: 3, room: "Sala principal", capacity: 18, days: [0, 2, 4] },
  { name: "Natación adultos", type: "Natación", start: "13:00", duration: 60, coach: 4, room: "Pileta", capacity: 10, days: [1, 3, 5] },
  { name: "Personalizada", type: "Personalizada", start: "16:00", duration: 60, coach: 2, room: "Box 3", capacity: 2, days: [1, 4] },
  { name: "Spinning", type: "Cardio / Spinning", start: "18:00", duration: 45, coach: 5, room: "Sala de bicis", capacity: 20, days: [0, 1, 2, 3, 4] },
  { name: "CrossFit Avanzado", type: "CrossFit", start: "19:00", duration: 60, coach: 0, room: "Box", capacity: 16, days: [0, 2, 3] },
  { name: "Pilates", type: "Yoga / Pilates", start: "20:00", duration: 50, coach: 1, room: "Sala 2", capacity: 12, days: [1, 3] },
  { name: "Funcional Full Body", type: "Funcional", start: "10:00", duration: 60, coach: 3, room: "Sala principal", capacity: 20, days: [5] },
];

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const TODAY = "2026-09-29";
export const WEEK_START = new Date(2026, 8, 28);

export function buildClasses(): GymClass[] {
  const out: GymClass[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(2026, 8, 28 + i);
    const wd = (d.getDay() + 6) % 7;
    TEMPLATE.forEach((t, ti) => {
      if (!t.days.includes(wd)) return;
      const seed = (ti * 7 + i * 3) % 11;
      let booked = Math.min(t.capacity, Math.round(t.capacity * (0.45 + seed * 0.06)));
      if (t.name === "CrossFit" && i === 1) booked = 14;
      const waitlist = booked === t.capacity && t.capacity > 2 ? (seed % 4) : 0;
      out.push({ id: `c${i}-${ti}`, name: t.name, type: t.type, date: iso(d), start: t.start, duration: t.duration, coach: COACHES[t.coach]!, room: t.room, capacity: t.capacity, booked, waitlistEnabled: t.capacity > 2, waitlist });
    });
  }
  return out;
}

export const toMin = (hm: string) => { const [h = 0, m = 0] = hm.split(":").map(Number); return h * 60 + m; };
export const endTime = (c: { start: string; duration: number }) => { const e = toMin(c.start) + c.duration; return `${pad(Math.floor(e / 60))}:${pad(e % 60)}`; };

export const DAY_ABBR = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const DAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const parseIso = (s: string) => { const [y = 2026, m = 1, d = 1] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const dayLabel = (s: string, full = true) => { const d = parseIso(s); const wd = (d.getDay() + 6) % 7; return `${(full ? DAY_FULL : DAY_ABBR)[wd]} ${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`; };

export const MEMBER_NAMES = ["Sofía Álvarez", "Tomás Benítez", "Julieta Castro", "Nicolás Díaz", "Agustina Esposito", "Federico Gómez", "Martina Herrera", "Ignacio López", "Paula Medina", "Santiago Núñez", "Rocío Ortiz", "Bruno Pereyra", "Carla Quiroga", "Lucas Ramírez", "Florencia Silva", "Mateo Torres", "Delfina Vega", "Gonzalo Zárate", "Micaela Acosta", "Emiliano Blanco"];
export const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");
