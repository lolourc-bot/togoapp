create or replace function public.coach_athlete_count(target_coach_id uuid)
returns bigint
language sql security definer set search_path = public as $$
  select count(*) from public.athletes where coach_id = target_coach_id and status = 'active';
$$;
