import { supabase } from "@/lib/supabase";

export type MemberBillingStatus = "none" | "pending" | "active" | "past_due" | "canceled";

export type InstitutionMember = {
  id: string; fullName: string; email: string | null; plan: string | null;
  status: "active" | "paused"; coachId: string | null; coachName: string | null;
  teamId: string | null; teamName: string | null;
  planAmount: number | null; planCurrency: string | null; billingStatus: MemberBillingStatus;
};

type Row = {
  id: string; full_name: string; email: string | null; plan: string | null; status: string;
  coach_id: string | null; institution_coaches: { full_name: string } | null;
  team_id: string | null; institution_teams: { name: string } | null;
  plan_amount: number | null; plan_currency: string | null; billing_status: string | null;
};

const SELECT = "id, full_name, email, plan, status, coach_id, institution_coaches(full_name), team_id, institution_teams(name), plan_amount, plan_currency, billing_status";

function rowToMember(r: Row): InstitutionMember {
  return {
    id: r.id, fullName: r.full_name, email: r.email, plan: r.plan,
    status: r.status as "active" | "paused", coachId: r.coach_id, coachName: r.institution_coaches?.full_name ?? null,
    teamId: r.team_id, teamName: r.institution_teams?.name ?? null,
    planAmount: r.plan_amount, planCurrency: r.plan_currency, billingStatus: (r.billing_status as MemberBillingStatus) ?? "none",
  };
}

export async function fetchInstitutionMembers(institutionId: string): Promise<InstitutionMember[]> {
  const { data, error } = await supabase
    .from("institution_members")
    .select(SELECT)
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as Row[]).map(rowToMember);
}

export async function createInstitutionMember(institutionId: string, input: { fullName: string; email: string | null; plan: string | null }): Promise<InstitutionMember> {
  const { data, error } = await supabase
    .from("institution_members")
    .insert({ institution_id: institutionId, full_name: input.fullName, email: input.email, plan: input.plan })
    .select(SELECT)
    .single();
  if (error) throw error;
  return rowToMember(data as unknown as Row);
}

export async function updateInstitutionMember(id: string, patch: { plan?: string | null; status?: "active" | "paused"; coachId?: string | null; teamId?: string | null }) {
  const payload: Record<string, unknown> = {};
  if (patch.plan !== undefined) payload["plan"] = patch.plan;
  if (patch.status !== undefined) payload["status"] = patch.status;
  if (patch.coachId !== undefined) payload["coach_id"] = patch.coachId;
  if (patch.teamId !== undefined) payload["team_id"] = patch.teamId;
  const { error } = await supabase.from("institution_members").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteInstitutionMember(id: string) {
  const { error } = await supabase.from("institution_members").delete().eq("id", id);
  if (error) throw error;
}
