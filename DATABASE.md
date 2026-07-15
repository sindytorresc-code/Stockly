# Base de datos

La app usa Supabase cuando las variables de entorno estan configuradas. Si Supabase no responde o las tablas no existen, Stockly usa `localStorage` como respaldo temporal.

## Proyecto configurado

URL del proyecto:

```bash
VITE_SUPABASE_URL=https://ashgqegyqnfwjytdsrzn.supabase.co
```

La `anon public key` debe ir en `.env` como:

```bash
VITE_SUPABASE_ANON_KEY=tu_anon_public_key
```

## Paso obligatorio

Antes de que la web guarde productos en Supabase debes ejecutar SQL en Supabase:

1. Entra a Supabase.
2. Abre `SQL Editor`.
3. Copia y ejecuta todo el contenido de `database/schema.sql`.
4. Copia y ejecuta todo el contenido de `database/public-demo-policies.sql`.

`schema.sql` crea:

- `clients`
- `products`
- columnas extra como `brand`, `purchase_price`, `min_stock`, `spot` y `campaign`
- clientes iniciales: `atain`, `sabor`, `vogue`, `mara`

`public-demo-policies.sql` crea politicas RLS para que la app publicada pueda leer, crear, editar y borrar usando la `anon public key`.

## Como funciona ahora

- Al entrar a un cliente, Stockly busca sus productos en Supabase.
- Si no hay productos, siembra los productos de ejemplo.
- Agregar, editar, eliminar e importar CSV intentan guardar en Supabase.
- Si Supabase falla, se usa `localStorage` como respaldo.

## Seguridad

La `anon public key` puede vivir en frontend. La `service_role key` nunca debe ponerse en la app.

`public-demo-policies.sql` esta pensado para demo publica. Para produccion real, lo ideal es migrar el PIN a Supabase Auth o una Edge Function que valide hashes del lado servidor, y usar politicas por usuario/cliente.

