# Sistema de Inventario React

Proyecto hecho con React, Vite y Tailwind CSS.

## Ejecutar

```bash
npm install
npm run dev
```

## Inicio de sesión

Para activar el modo protegido configura `VITE_REQUIRE_AUTH=true` junto con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Los usuarios inician sesión con Supabase Auth; el token se conserva únicamente en `sessionStorage`. Sin esa variable, la app mantiene el modo demo por PIN y almacenamiento local ya existente.

## Códigos demo

- ATAIN: `1234`
- Sabor Fresco: `2026`
- Estilo Vogue: `4455`
- Maquillaje de Mara: `7788`

## CSV

Orden esperado de columnas:

```csv
nombre,codigo,categoria,precio,existencias,estado,comentarios
```

## Base de datos

La app admite Supabase con PostgreSQL. Consulta `DATABASE.md` para configurar el esquema y activar las políticas por empresa.

