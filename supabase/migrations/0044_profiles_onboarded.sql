-- El estado de "ya completó el onboarding" vivía solo en localStorage del navegador, así que
-- cualquier sesión nueva (incógnito, otro dispositivo, caché limpiada) volvía a mostrar el
-- wizard de bienvenida aunque la cuenta ya existiera. Lo pasamos a la base, que es lo real.
-- Las cuentas que ya existen quedan marcadas como ya onboardeadas (no son cuentas nuevas);
-- las cuentas nuevas arrancan en false y se marcan true al terminar el wizard.
alter table public.profiles add column if not exists onboarded boolean not null default false;
update public.profiles set onboarded = true where onboarded = false;
