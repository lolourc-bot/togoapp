-- Marketplace programs: sport/discipline (to filter when searching) and a cover image.
alter table public.programs add column if not exists sport text;
alter table public.programs add column if not exists cover_url text;
-- Currency the coach set the price in (ARS → Mercado Pago; USD/EUR → Stripe). Null = old rows, treated by the
-- coach's billing currency at checkout.
alter table public.programs add column if not exists currency text check (currency in ('ARS', 'USD', 'EUR'));

insert into storage.buckets (id, name, public)
values ('program-covers', 'program-covers', true)
on conflict (id) do nothing;

create policy "Coach uploads own program covers" on storage.objects
  for insert with check (bucket_id = 'program-covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Coach updates own program covers" on storage.objects
  for update using (bucket_id = 'program-covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Coach deletes own program covers" on storage.objects
  for delete using (bucket_id = 'program-covers' and (storage.foldername(name))[1] = auth.uid()::text);
