-- Ejecuta esto en Supabase > SQL Editor si guardar productos falla
-- con errores como: Could not find the 'campaign' column of 'products'

alter table products add column if not exists purchase_price numeric(12, 2) not null default 0;
alter table products add column if not exists min_stock integer not null default 3;
alter table products add column if not exists brand text not null default '';
alter table products add column if not exists spot text not null default '';
alter table products add column if not exists campaign text not null default '';

create index if not exists products_campaign_idx on products(campaign);

-- Politicas publicas (solo si aun no las ejecutaste)
-- Copia tambien database/public-demo-policies.sql si insert/update/delete fallan por RLS.
