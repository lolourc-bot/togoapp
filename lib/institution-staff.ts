import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type StaffPermission = "full_access" | "read_only";
export type StaffStatus = "pending" | "active" | "revoked";

export type InstitutionStaffMember = {
  id: string;
  email: string;
  fullName: string | null;
  permission: StaffPermission;
  status: StaffStatus;
  inviteToken: string;
  invitedAt: string;
  acceptedAt: string | null;
};

type Row = {
  id: string; email: string; full_name: string | null; permission: StaffPermission; status: StaffStatus;
  invite_token: string; invited_at: string; accepted_at: string | null;
};

function rowToStaff(r: Row): InstitutionStaffMember {
  return {
    id: r.id, email: r.email, fullName: r.full_name, permission: r.permission, status: r.status,
    inviteToken: r.invite_token, invitedAt: r.invited_at, acceptedAt: r.accepted_at,
  };
}

export async function fetchInstitutionStaff(institutionId: string): Promise<InstitutionStaffMember[]> {
  const { data, error } = await supabase
    .from("institution_staff")
    .select("id, email, full_name, permission, status, invite_token, invited_at, accepted_at")
    .eq("institution_id", institutionId)
    .neq("status", "revoked")
    .order("invited_at", { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(rowToStaff);
}

/** Invita (o re-invita si ya existía una invitación pendiente/revocada) a alguien con un permiso dado. */
export async function inviteInstitutionStaff(
  institutionId: string,
  input: { email: string; fullName: string | null; permission: StaffPermission },
): Promise<InstitutionStaffMember> {
  const { data: existing } = await supabase
    .from("institution_staff")
    .select("id, status")
    .eq("institution_id", institutionId)
    .ilike("email", input.email)
    .maybeSingle();

  if (existing?.status === "active") throw new Error("Esa persona ya tiene acceso a la institución");

  if (existing) {
    const { data, error } = await supabase
      .from("institution_staff")
      .update({ full_name: input.fullName, permission: input.permission, status: "pending", invite_token: crypto.randomUUID(), invited_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("id, email, full_name, permission, status, invite_token, invited_at, accepted_at")
      .single();
    if (error) throw error;
    return rowToStaff(data as Row);
  }

  const { data, error } = await supabase
    .from("institution_staff")
    .insert({ institution_id: institutionId, email: input.email, full_name: input.fullName, permission: input.permission })
    .select("id, email, full_name, permission, status, invite_token, invited_at, accepted_at")
    .single();
  if (error) throw error;
  return rowToStaff(data as Row);
}

export async function updateInstitutionStaffPermission(id: string, permission: StaffPermission) {
  const { error } = await supabase.from("institution_staff").update({ permission }).eq("id", id);
  if (error) throw error;
}

export async function revokeInstitutionStaff(id: string) {
  const { error } = await supabase.from("institution_staff").update({ status: "revoked" }).eq("id", id);
  if (error) throw error;
}

// --- Accept-invite flow ---
// El invite_token es la credencial de acceso (igual que program_purchases/completar-pago):
// quien visita /institucion-invitacion/$token todavía puede no tener cuenta ni ninguna fila
// en institution_staff vinculada a su auth_user_id, así que RLS no puede cubrir esta lectura
// ni esta escritura — van server-side con service-role, no por el cliente de Supabase.

export type StaffInviteDetails = {
  id: string;
  email: string;
  institutionName: string;
  institutionId: string;
  permission: StaffPermission;
  status: StaffStatus;
};

export const fetchStaffInviteByToken = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }): Promise<StaffInviteDetails | null> => {
    const admin = getSupabaseAdmin();
    const { data: row } = await admin
      .from("institution_staff")
      .select("id, email, permission, status, institution_id, institutions(name)")
      .eq("invite_token", data.token)
      .maybeSingle();
    if (!row) return null;
    const inst = row["institutions"] as { name: string } | { name: string }[] | null;
    const institutionName = Array.isArray(inst) ? (inst[0]?.name ?? "") : (inst?.name ?? "");
    return {
      id: row["id"] as string, email: row["email"] as string, institutionName,
      institutionId: row["institution_id"] as string, permission: row["permission"] as StaffPermission,
      status: row["status"] as StaffStatus,
    };
  });

export const acceptStaffInvite = createServerFn({ method: "POST" })
  .validator((data: { token: string; authUserId: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const admin = getSupabaseAdmin();
    const { data: row } = await admin.from("institution_staff").select("id, status").eq("invite_token", data.token).maybeSingle();
    if (!row || row["status"] !== "pending") throw new Error("Esta invitación no es válida o ya fue usada");
    const { error } = await admin
      .from("institution_staff")
      .update({ auth_user_id: data.authUserId, status: "active", accepted_at: new Date().toISOString() })
      .eq("id", row["id"] as string);
    if (error) throw error;
  });
