-- La compra de un programa pago ya no pasa por marketplace_requests (sin intervención
-- del coach), así que necesitamos guardar quién compró directamente en program_purchases.
alter table public.program_purchases add column if not exists buyer_name text;
alter table public.program_purchases add column if not exists buyer_email text;

-- Hasta cuándo tiene acceso el atleta al programa comprado — más largo que la duración
-- nominal (weeks) para absorber pausas/atrasos, no un corte estricto a los N días exactos.
alter table public.program_assignments add column if not exists access_until date;
