/**
 * Names must be unique within each kind of thing a coach saves (exercises, programs, circuits, Lab sessions).
 * Comparison ignores case, accents and extra spaces, so "Sentadilla Búlgara" and "sentadilla bulgara " collide.
 */

export const nameKey = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

/** True when `name` matches one of `taken` (an item keeping its own current name, `ownName`, doesn't count). */
export function isNameTaken(name: string, taken: Iterable<string>, ownName?: string | null): boolean {
  const k = nameKey(name);
  if (!k) return false;
  if (ownName != null && nameKey(ownName) === k) return false;
  for (const t of taken) if (nameKey(t) === k) return true;
  return false;
}

/** `base`, or "base 2", "base 3"… whichever is still free. */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const keys = new Set([...taken].map(nameKey));
  if (!keys.has(nameKey(base))) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!keys.has(nameKey(candidate))) return candidate;
  }
}

export const NAME_TAKEN_MSG = "Ese nombre ya está en uso. Cambialo para poder guardar.";
