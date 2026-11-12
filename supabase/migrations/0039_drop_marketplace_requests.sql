-- Los programas del marketplace ya no pueden ser gratis: toda compra pasa directo por
-- program_purchases (ver 0038), sin que el coach tenga que aceptar una solicitud. El
-- inbox de "Solicitudes" se reemplazó por un listado de ventas (program_purchases) en
-- /marketplace-coach — marketplace_requests queda sin ningún código que la use.
alter table public.program_purchases drop column if exists marketplace_request_id;
drop table if exists public.marketplace_requests;
