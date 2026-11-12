import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AuthedMember = { id: string; full_name: string; institution_id: string };

export function useInstitutionMemberAuth() {
  const [member, setMember] = useState<AuthedMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const resolve = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) { setMember(null); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("institution_members")
        .select("id, full_name, institution_id")
        .eq("auth_user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cancelled) { setMember(data ?? null); setLoading(false); }
    };

    supabase.auth.getSession().then(({ data: { session } }) => resolve(session?.user.id));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      resolve(session?.user.id);
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  return { member, loading };
}
