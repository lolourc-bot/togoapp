-- Coach-uploaded videos are visible to the whole coach community (like a
-- shared feed), not gated by follow. "Follow" becomes a curation/notify
-- mechanism (Seguidos tab + new-video notifications) rather than an access
-- control, so coaches can browse a "Descubrir" list of not-yet-followed
-- coaches and their videos before deciding to follow them.

drop policy "Coach reads own or followed videos" on public.coach_videos;

create policy "Any coach reads coach videos" on public.coach_videos
  for select using (auth.uid() is not null);
