import { useEffect, useState } from "react";

export type UserType = "gym_member" | "club_athlete" | "coached_athlete" | "explorer";
export type UserContext = { type: UserType; alsoCoached?: boolean };

const KEY = "togo-user-context";
const DEFAULT: UserContext = { type: "coached_athlete" };
const listeners = new Set<() => void>();

export function readUserContext(): UserContext | null {
  if (typeof window === "undefined") return null;
  try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as UserContext) : null; } catch { return null; }
}

export function setUserContext(ctx: UserContext) {
  localStorage.setItem(KEY, JSON.stringify(ctx));
  listeners.forEach((l) => l());
}

/** Returns the stored context after hydration (defaults to coached athlete). */
export function useUserContext(): UserContext {
  const [ctx, setCtx] = useState<UserContext>(DEFAULT);
  useEffect(() => {
    const sync = () => setCtx(readUserContext() ?? DEFAULT);
    sync();
    listeners.add(sync);
    return () => { listeners.delete(sync); };
  }, []);
  return ctx;
}
