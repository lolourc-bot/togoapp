alter table public.institutions add column if not exists description text;
alter table public.institutions add column if not exists address text;
alter table public.institutions add column if not exists city text;
alter table public.institutions add column if not exists country text;
alter table public.institutions add column if not exists phone text;
alter table public.institutions add column if not exists website text;

insert into storage.buckets (id, name, public) values ('institution-logos', 'institution-logos', true) on conflict (id) do nothing;

create policy "Institution owner uploads own logo" on storage.objects for insert with check (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Institution owner updates own logo" on storage.objects for update using (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Institution owner deletes own logo" on storage.objects for delete using (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text);
