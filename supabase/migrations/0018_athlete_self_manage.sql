-- Let an authenticated athlete edit/delete their own athletes row (profile screen self-service).
create policy "Athlete updates own row" on public.athletes
  for update using (auth.uid() = auth_user_id);

create policy "Athlete deletes own row" on public.athletes
  for delete using (auth.uid() = auth_user_id);
