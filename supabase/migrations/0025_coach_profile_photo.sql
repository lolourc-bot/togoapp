alter table public.coach_marketplace_profiles add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('coach-profile-photos', 'coach-profile-photos', true)
on conflict (id) do nothing;

create policy "Coach uploads own profile photos" on storage.objects
  for insert with check (bucket_id = 'coach-profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Coach updates own profile photos" on storage.objects
  for update using (bucket_id = 'coach-profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Coach deletes own profile photos" on storage.objects
  for delete using (bucket_id = 'coach-profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
