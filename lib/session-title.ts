/**
 * Calendar sessions (athlete, team, program days) don't need a name; only Lab sessions do. Wherever a session is
 * shown, an empty name reads as its kind instead of a blank.
 */
export function sessionTitle(s: { name?: string | null; field?: unknown } | null | undefined): string {
  const n = s?.name?.trim();
  if (n) return n;
  return s?.field ? "Sesión de campo" : "Sesión de fuerza";
}
