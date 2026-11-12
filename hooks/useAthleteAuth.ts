import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AuthedAthlete = { id: string; full_name: string; coach_id: string };

export function useAthleteAuth() {
  const [athlete, setAthlete] = useState<AuthedAthlete | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const resolve = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) { setAthlete(null); setLoading(false); }
        return;
      }
      // A person can have more than one athletes row (one per coach, e.g. after accepting
      // a marketplace request from a second coach) — .maybeSingle() would throw on >1 row.
      const { data } = await supabase
        .from("athletes")
        .select("id, full_name, coach_id")
        .eq("auth_user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cancelled) { setAthlete(data ?? null); setLoading(false); }
    };

    supabase.auth.getSession().then(({ data: { session } }) => resolve(session?.user.id));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      resolve(session?.user.id);
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  return { athlete, loading };
}
