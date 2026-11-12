alter table public.teams add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do nothing;

-- Coaches upload/replace/remove photos under their own uid prefix: {coach_id}/{file}.
create policy "Coach uploads own team photos" on storage.objects
  for insert with check (bucket_id = 'team-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Coach updates own team photos" on storage.objects
  for update using (bucket_id = 'team-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Coach deletes own team photos" on storage.objects
  for delete using (bucket_id = 'team-photos' and (storage.foldername(name))[1] = auth.uid()::text);
-- Bucket is public, so reads work via the public URL without needing a SELECT policy.
