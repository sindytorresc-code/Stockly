-- Esquema recomendado para Supabase o PostgreSQL.
-- Ejecuta este archivo en el SQL Editor de Supabase.

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  business_type text not null,
  description text,
  icon text not null default 'package',
  pin_hash text,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  code text not null,
  category text not null,
  price numeric(12, 2) not null default 0,
  stock integer not null default 0,
  status text not null default 'En stock',
  comments text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, code)
);

create index if not exists products_client_id_idx on products(client_id);
create index if not exists products_category_idx on products(category);
create index if not exists products_status_idx on products(status);

-- Datos iniciales de clientes. Para PIN real, guarda un hash, no el PIN plano.
insert into clients (slug, name, business_type, description, icon, theme)
values
  ('atain', 'ATAIN', 'TECNOLOGIA', 'Distribuidora de electronicos y gadgets', 'monitor', '{"mode":"dark","accent":"blue"}'),
  ('sabor', 'Sabor Fresco', 'ALIMENTOS Y BEBIDAS', 'Alimentos organicos y bebidas artesanales', 'utensils', '{"mode":"light","accent":"green"}'),
  ('vogue', 'Estilo Vogue', 'MODA', 'Ropa de disenador y accesorios de autor', 'shirt', '{"mode":"light","accent":"gold"}'),
  ('mara', 'Maquillaje de Mara', 'REVESTIR', 'Tienda de cosmeticos y productos de cuidado', 'sparkles', '{"mode":"light","accent":"pink"}')
on conflict (slug) do nothing;
