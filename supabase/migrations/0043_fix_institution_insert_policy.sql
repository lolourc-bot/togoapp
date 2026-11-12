-- Bug de la 0040: institution_has_full_access() busca el owner_id haciendo una subconsulta
-- contra la propia tabla institutions, lo cual no funciona en el INSERT que crea la institución
-- (la fila todavía no existe para esa subconsulta cuando se evalúa el with check). Para la
-- tabla institutions puntualmente, comparamos owner_id directo contra auth.uid() sin pasar
-- por la función, que sí funciona para INSERT porque mira la columna de la fila nueva.
drop policy "Full access manages institution" on public.institutions;
create policy "Full access manages institution" on public.institutions
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.institution_staff s
      where s.institution_id = institutions.id and s.auth_user_id = auth.uid()
        and s.status = 'active' and s.permission = 'full_access'
    )
  )
  with check (
    owner_id = auth.uid()
    or exists (
      select 1 from public.institution_staff s
      where s.institution_id = institutions.id and s.auth_user_id = auth.uid()
        and s.status = 'active' and s.permission = 'full_access'
    )
  );
