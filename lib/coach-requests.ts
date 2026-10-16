import { useEffect, useState } from "react";

export type CoachRequest = {
  id: string;
  member: string;
  goals: string[];
  days: number;
  experience: string;
  notes: string;
  createdAt: string;
  coach?: string;
  welcome?: string;
  seenByMember?: boolean;
};

export const ME = "Lucas Ramírez"; // logged-in demo member
const KEY = "togo-coach-requests";
const SEED: CoachRequest[] = [
  { id: "r1", member: "Sofía Álvarez", goals: ["Bajar de peso"], days: 3, experience: "Principiante", notes: "Trabajo de mañana, puedo entrenar después de las 18.", createdAt: "2026-09-27" },
  { id: "r2", member: "Federico Gómez", goals: ["Ganar masa muscular", "Rendimiento deportivo"], days: 5, experience: "Intermedio", notes: "Juego al fútbol los sábados.", createdAt: "2026-09-28" },
  { id: "r3", member: "Martina Herrera", goals: ["Rehabilitación / Salud"], days: 2, experience: "Principiante", notes: "Molestia en rodilla derecha.", createdAt: "2026-09-29" },
];

const listeners = new Set<() => void>();
function read(): CoachRequest[] {
  if (typeof window === "undefined") return SEED;
  try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : SEED; } catch { return SEED; }
}
function write(list: CoachRequest[]) { localStorage.setItem(KEY, JSON.stringify(list)); listeners.forEach((l) => l()); }

export function useCoachRequests(): CoachRequest[] {
  const [list, setList] = useState<CoachRequest[]>(SEED);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    listeners.add(sync);
    window.addEventListener("storage", sync);
    return () => { listeners.delete(sync); window.removeEventListener("storage", sync); };
  }, []);
  return list;
}

export function submitRequest(r: Omit<CoachRequest, "id" | "member" | "createdAt">) {
  write([...read().filter((x) => x.member !== ME), { ...r, id: `r${Date.now()}`, member: ME, createdAt: "2026-09-29" }]);
}
export function assignCoach(id: string, coach: string, welcome: string) {
  write(read().map((r) => (r.id === id ? { ...r, coach, welcome } : r)));
}
export function markSeen() {
  write(read().map((r) => (r.member === ME ? { ...r, seenByMember: true } : r)));
}
