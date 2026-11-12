import { supabase } from "@/lib/supabase";

/** Sends a magic-link email that signs the athlete in directly (creates the auth user if needed). */
export async function resendAthleteInvite(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/ingresar-atleta`,
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
}

/** Sends a standard password-reset email for an athlete who already has an account. */
export async function sendAthletePasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/ingresar-atleta`,
  });
  if (error) throw error;
}
