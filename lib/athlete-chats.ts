export type AMsg =
  | { kind: "date"; text: string }
  | { kind: "in"; text: string; time: string; sender?: string }
  | { kind: "out"; text: string; time: string }
  | { kind: "session"; name: string; exercises: number; time: string };

export type AConv = {
  id: string;
  name: string;
  initials: string;
  group?: { a: string; b: string };
  context: string;
  preview: string;
  time: string;
  unread: number;
  messages: AMsg[];
};

export const ATHLETE_CHATS: AConv[] = [
  {
    id: "pablo", name: "Coach Pablo", initials: "CP", context: "Tu coach · Fuerza base",
    preview: "Te mandé la sesión del jueves. Revisala cuando puedas.", time: "10:45", unread: 1,
    messages: [
      { kind: "date", text: "Hoy" },
      { kind: "in", text: "Hola! ¿Cómo te sentiste en el entrenamiento de ayer?", time: "09:15" },
      { kind: "out", text: "Muy bien, me costaron las últimas series de sentadilla pero lo completé todo 💪", time: "09:22" },
      { kind: "in", text: "Perfecto. La semana que viene subimos 2.5 kg.", time: "09:24" },
      { kind: "session", name: "Sesión del jueves", exercises: 4, time: "10:44" },
      { kind: "in", text: "Te mandé la sesión del jueves. Revisala cuando puedas.", time: "10:45" },
    ],
  },
  {
    id: "equipo", name: "Equipo Sub-16", initials: "S16", group: { a: "CP", b: "ML" }, context: "Equipo · 14 miembros",
    preview: "Mañana sesión a las 8hs, no falten", time: "Ayer", unread: 0,
    messages: [
      { kind: "date", text: "Ayer" },
      { kind: "in", sender: "Mateo López", text: "¿Mañana es en la cancha 2?", time: "19:02" },
      { kind: "in", sender: "Coach Pablo", text: "Mañana sesión a las 8hs, no falten", time: "19:10" },
    ],
  },
  {
    id: "togo", name: "TOGO", initials: "T", context: "Soporte",
    preview: "Bienvenido/a a TOGO. Estamos aquí para ayudarte.", time: "Lun", unread: 0,
    messages: [
      { kind: "date", text: "Lunes" },
      { kind: "in", text: "Bienvenido/a a TOGO. Estamos aquí para ayudarte.", time: "12:00" },
    ],
  },
];

export const hasUnreadChats = () => ATHLETE_CHATS.some((c) => c.unread > 0);

/** Opens (or creates) a conversation with a marketplace coach. Local-only. */
export function ensureChat(id: string, name: string): AConv {
  const found = ATHLETE_CHATS.find((c) => c.id === id);
  if (found) return found;
  const conv: AConv = {
    id, name, initials: name.split(" ").map((p) => p[0]).slice(0, 2).join(""),
    context: "Coach · Marketplace", preview: "Nueva conversación", time: "Ahora", unread: 0,
    messages: [{ kind: "date", text: "Hoy" }],
  };
  ATHLETE_CHATS.unshift(conv);
  return conv;
}
