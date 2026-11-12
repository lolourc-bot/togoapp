import { supabase } from "@/lib/supabase";
import type { CircuitConfig } from "@/components/togo/CircuitModal";

export type CircuitTemplate = { id: string; config: CircuitConfig };

export async function fetchCircuitTemplates(coachId: string): Promise<CircuitTemplate[]> {
  const { data, error } = await supabase
    .from("circuit_templates")
    .select("id, config")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, config: r.config as CircuitConfig }));
}

export async function createCircuitTemplate(coachId: string, config: CircuitConfig): Promise<string> {
  const { data, error } = await supabase
    .from("circuit_templates")
    .insert({ coach_id: coachId, config })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateCircuitTemplate(id: string, config: CircuitConfig) {
  const { error } = await supabase.from("circuit_templates").update({ config }).eq("id", id);
  if (error) throw error;
}

export async function deleteCircuitTemplate(id: string) {
  const { error } = await supabase.from("circuit_templates").delete().eq("id", id);
  if (error) throw error;
}
