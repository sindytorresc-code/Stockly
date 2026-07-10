-- Politicas demo para Stockly sin Supabase Auth.
-- Ejecuta esto en Supabase > SQL Editor si la API devuelve errores RLS.
-- Aviso: esto permite lectura/escritura publica con la anon key.
-- Para produccion real, reemplazar por Supabase Auth + politicas por usuario/cliente.

alter table clients enable row level security;
alter table products enable row level security;

drop policy if exists "stockly_public_clients_select" on clients;
drop policy if exists "stockly_public_clients_insert" on clients;
drop policy if exists "stockly_public_clients_update" on clients;

drop policy if exists "stockly_public_products_select" on products;
drop policy if exists "stockly_public_products_insert" on products;
drop policy if exists "stockly_public_products_update" on products;
drop policy if exists "stockly_public_products_delete" on products;

create policy "stockly_public_clients_select"
on clients for select
to anon
using (true);

create policy "stockly_public_clients_insert"
on clients for insert
to anon
with check (true);

create policy "stockly_public_clients_update"
on clients for update
to anon
using (true)
with check (true);

create policy "stockly_public_products_select"
on products for select
to anon
using (true);

create policy "stockly_public_products_insert"
on products for insert
to anon
with check (true);

create policy "stockly_public_products_update"
on products for update
to anon
using (true)
with check (true);

create policy "stockly_public_products_delete"
on products for delete
to anon
using (true);

insert into clients (slug, name, business_type, description, icon, theme)
values
  ('atain', 'ATAIN', 'TECNOLOGIA', 'Distribuidora de electronicos y gadgets', 'monitor', '{"mode":"dark","accent":"blue"}'),
  ('sabor', 'Sabor Fresco', 'ALIMENTOS Y BEBIDAS', 'Alimentos organicos y bebidas artesanales', 'utensils', '{"mode":"light","accent":"green"}'),
  ('vogue', 'Estilo Vogue', 'MODA', 'Ropa de disenador y accesorios de autor', 'shirt', '{"mode":"light","accent":"gold"}'),
  ('mara', 'Maquillaje de Mara', 'REVESTIR', 'Tienda de cosmeticos y productos de cuidado', 'sparkles', '{"mode":"light","accent":"pink"}')
on conflict (slug) do nothing;
