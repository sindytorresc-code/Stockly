# Sistema de Inventario React

Proyecto hecho con React, Vite y Tailwind CSS.

## Ejecutar

```bash
npm install
npm run dev
```

## Codigos de acceso

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

La version actual guarda temporalmente en `localStorage`.

Para produccion recomiendo **Supabase con PostgreSQL**. Ya deje una guia en `DATABASE.md` y un esquema inicial en `database/schema.sql`.

