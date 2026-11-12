import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  plan: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      console.log("profile:", data, "error:", error);
      setProfile(data);
      setLoading(false);
    });
  }, []);

  return { profile, loading };
}
