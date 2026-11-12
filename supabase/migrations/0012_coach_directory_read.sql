-- Let any logged-in coach read other coaches' basic profile (full_name),
-- needed to search for coaches to follow and to show the author's name on
-- followed coaches' videos in the "Seguidos" biblioteca tab.
create policy "Coaches read other coach profiles" on public.profiles
  for select using (role = 'coach' and auth.uid() is not null);
