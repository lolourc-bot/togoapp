import { supabase } from "@/lib/supabase";

export type InstitutionMode = "club" | "gym";
export type Institution = {
  id: string; ownerId: string; name: string; mode: InstitutionMode; logoUrl: string | null;
  description: string | null; address: string | null; city: string | null; country: string | null;
  phone: string | null; website: string | null;
};

type Row = {
  id: string; owner_id: string; name: string; mode: string; logo_url: string | null;
  description: string | null; address: string | null; city: string | null; country: string | null;
  phone: string | null; website: string | null;
};

function rowToInstitution(row: Row): Institution {
  return {
    id: row.id, ownerId: row.owner_id, name: row.name, mode: row.mode as InstitutionMode, logoUrl: row.logo_url,
    description: row.description, address: row.address, city: row.city, country: row.country,
    phone: row.phone, website: row.website,
  };
}

/** The logged-in user's own institution (role must be 'institution'), or null if not created yet. */
export async function fetchMyInstitution(ownerId: string): Promise<Institution | null> {
  const { data, error } = await supabase.from("institutions").select("*").eq("owner_id", ownerId).maybeSingle();
  if (error || !data) return null;
  return rowToInstitution(data as Row);
}

/** Any institution by id — readable by its owner or by a claimed member. */
export async function fetchInstitutionById(id: string): Promise<Institution | null> {
  const { data, error } = await supabase.from("institutions").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToInstitution(data as Row);
}

export type InstitutionAccess = { institution: Institution; permission: "owner" | "full_access" | "read_only" };

/**
 * The institution this user can administer — either because they're the owner, or because
 * they accepted a staff invite (Accesos y roles). Null if neither applies.
 */
export async function fetchInstitutionAccessForUser(userId: string): Promise<InstitutionAccess | null> {
  const owned = await fetchMyInstitution(userId);
  if (owned) return { institution: owned, permission: "owner" };

  const { data } = await supabase
    .from("institution_staff")
    .select("permission, institutions(*)")
    .eq("auth_user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const inst = data["institutions"] as Row | Row[] | null;
  const row = Array.isArray(inst) ? inst[0] : inst;
  if (!row) return null;
  return { institution: rowToInstitution(row), permission: data["permission"] as "full_access" | "read_only" };
}

export async function createInstitution(ownerId: string, name: string, mode: InstitutionMode): Promise<Institution> {
  const { data, error } = await supabase.from("institutions").insert({ owner_id: ownerId, name, mode }).select("*").single();
  if (error) throw error;
  return rowToInstitution(data as Row);
}

export type InstitutionProfileInput = {
  name?: string; logoUrl?: string | null; description?: string | null; address?: string | null;
  city?: string | null; country?: string | null; phone?: string | null; website?: string | null;
};

export async function updateInstitution(id: string, patch: InstitutionProfileInput) {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload["name"] = patch.name;
  if (patch.logoUrl !== undefined) payload["logo_url"] = patch.logoUrl;
  if (patch.description !== undefined) payload["description"] = patch.description;
  if (patch.address !== undefined) payload["address"] = patch.address;
  if (patch.city !== undefined) payload["city"] = patch.city;
  if (patch.country !== undefined) payload["country"] = patch.country;
  if (patch.phone !== undefined) payload["phone"] = patch.phone;
  if (patch.website !== undefined) payload["website"] = patch.website;
  const { error } = await supabase.from("institutions").update(payload).eq("id", id);
  if (error) throw error;
}

export async function uploadInstitutionLogo(ownerId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("institution-logos").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("institution-logos").getPublicUrl(path);
  return data.publicUrl;
}
