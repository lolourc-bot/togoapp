-- Tope de uso del Toguito público de la landing (visitantes sin cuenta). Cada pregunta escrita
-- llama a la IA y tiene costo, así que contamos por visitante (hash del IP, nunca el IP en claro)
-- y por día. Solo el servidor (service role) lee y escribe esta tabla.
create table public.toguito_public_usage (
  visitor_hash text not null,
  day date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  questions integer not null default 0,
  primary key (visitor_hash, day)
);

alter table public.toguito_public_usage enable row level security;
-- Sin policies: ni anon ni usuarios logueados pueden tocarla; el service role las saltea.

-- Suma una pregunta y devuelve cuántas lleva ese visitante hoy y cuántas van en total hoy,
-- en una sola llamada atómica.
create or replace function public.toguito_public_hit(p_visitor_hash text)
returns table (visitor_today integer, total_today integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  insert into public.toguito_public_usage (visitor_hash, day, questions)
  values (p_visitor_hash, v_day, 1)
  on conflict (visitor_hash, day) do update set questions = public.toguito_public_usage.questions + 1;

  return query
    select
      (select questions from public.toguito_public_usage where visitor_hash = p_visitor_hash and day = v_day),
      (select coalesce(sum(questions), 0)::integer from public.toguito_public_usage where day = v_day);
end;
$$;

revoke all on function public.toguito_public_hit(text) from public, anon, authenticated;

-- Limpieza: no hace falta guardar más de unos días.
create index toguito_public_usage_day_idx on public.toguito_public_usage(day);
