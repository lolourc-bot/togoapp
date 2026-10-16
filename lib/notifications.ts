import { useEffect, useState } from "react";
import type { UserType } from "@/lib/user-context";

export type NotifCat = "Entrenamiento" | "Mensajes" | "Institución";
export type Notif = {
  id: string; kind: string; title: string; body: string; time: string; day: string;
  cat: NotifCat; unread: boolean; only?: UserType[];
};

export const NOTIF_STYLE: Record<string, { bg: string; fg: string }> = {
  session: { bg: "#EFF6FF", fg: "#3B82F6" },
  message: { bg: "#F0FDF4", fg: "#16A34A" },
  done: { bg: "#DCFCE7", fg: "#16A34A" },
  class: { bg: "#FFFBEB", fg: "#D97706" },
  fee: { bg: "#FFF7ED", fg: "#EA580C" },
  coach: { bg: "#F5F3FF", fg: "#7C3AED" },
  team: { bg: "#EFF6FF", fg: "#3B82F6" },
  reminder: { bg: "#F1F5F9", fg: "#64748B" },
  newAthlete: { bg: "#F5F3FF", fg: "#7C3AED" },
  inactive: { bg: "#FFF7ED", fg: "#EA580C" },
  request: { bg: "#FFFBEB", fg: "#D97706" },
  noWeek: { bg: "#F1F5F9", fg: "#64748B" },
};

const ATHLETE: Notif[] = [
  { id: "a1", kind: "session", title: "Nueva sesión publicada", body: "Tu entrenador publicó una sesión para mañana: Fuerza · Piernas.", time: "Hace 10 min", day: "Hoy", cat: "Entrenamiento", unread: true, only: ["coached_athlete", "gym_member"] },
  { id: "a2", kind: "message", title: "Mensaje nuevo", body: "Martín Gutiérrez: Revisá el video de la sentadilla.", time: "Hace 35 min", day: "Hoy", cat: "Mensajes", unread: true },
  { id: "a3", kind: "class", title: "Clase disponible", body: "Hay un lugar disponible en CrossFit 09:00 del miércoles.", time: "Hace 1 h", day: "Hoy", cat: "Institución", unread: true, only: ["gym_member"] },
  { id: "a4", kind: "team", title: "Práctica del equipo", body: "Práctica Sub-16 mañana a las 09:00 en Campo principal.", time: "Hace 2 h", day: "Hoy", cat: "Institución", unread: true, only: ["club_athlete"] },
  { id: "a5", kind: "reminder", title: "Recordatorio de sesión", body: "Tenés una sesión programada para hoy a las 18:00.", time: "08:00", day: "Hoy", cat: "Entrenamiento", unread: false, only: ["coached_athlete", "club_athlete", "gym_member"] },
  { id: "a6", kind: "done", title: "Sesión completada", body: "Registraste la sesión de hoy. ¡Seguí así!", time: "Ayer 19:40", day: "Ayer", cat: "Entrenamiento", unread: false, only: ["coached_athlete", "club_athlete", "gym_member"] },
  { id: "a7", kind: "fee", title: "Cuota próxima a vencer", body: "Tu membresía mensual vence en 3 días.", time: "Ayer 10:15", day: "Ayer", cat: "Institución", unread: false, only: ["gym_member"] },
  { id: "a8", kind: "coach", title: "Coach asignado", body: "CrossFit Palermo te asignó a Martín Gutiérrez como coach personal.", time: "Lun 6 oct · 12:30", day: "Lun 6 oct", cat: "Institución", unread: false, only: ["gym_member"] },
];

const COACH: Notif[] = [
  { id: "c1", kind: "done", title: "Atleta completó sesión", body: "Santiago Pérez completó la sesión de Fuerza · Piernas.", time: "Hace 5 min", day: "Hoy", cat: "Entrenamiento", unread: true },
  { id: "c2", kind: "message", title: "Mensaje nuevo", body: "Valentina García: '¿Puedo cambiar el día de mañana?'", time: "Hace 20 min", day: "Hoy", cat: "Mensajes", unread: true },
  { id: "c3", kind: "newAthlete", title: "Nuevo atleta asignado", body: "CrossFit Palermo te asignó un nuevo atleta: Lucas Herrera.", time: "Hace 1 h", day: "Hoy", cat: "Institución", unread: true },
  { id: "c4", kind: "inactive", title: "Atleta sin actividad", body: "Martina López no registra actividad hace 7 días.", time: "09:00", day: "Hoy", cat: "Entrenamiento", unread: false },
  { id: "c5", kind: "request", title: "Solicitud de coaching", body: "Un socio de CrossFit Palermo solicitó coach personal.", time: "Ayer 17:10", day: "Ayer", cat: "Institución", unread: false },
  { id: "c6", kind: "noWeek", title: "Semana sin sesiones publicadas", body: "Equipo A no tiene sesiones publicadas para la próxima semana.", time: "Ayer 09:00", day: "Ayer", cat: "Entrenamiento", unread: false },
];

const store: Record<"athlete" | "coach", Notif[]> = { athlete: ATHLETE, coach: COACH };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useNotifs(who: "athlete" | "coach") {
  const [list, setList] = useState(store[who]);
  useEffect(() => {
    const s = () => setList(store[who]);
    listeners.add(s);
    return () => { listeners.delete(s); };
  }, [who]);
  return {
    list,
    markAll: () => { store[who] = store[who].map((n) => ({ ...n, unread: false })); emit(); },
    markRead: (id: string) => { store[who] = store[who].map((n) => (n.id === id ? { ...n, unread: false } : n)); emit(); },
  };
}

export function forUser(list: Notif[], t: UserType) {
  return list.filter((n) => !n.only || n.only.includes(t));
}
