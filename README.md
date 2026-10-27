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

## Respaldo completo de inventario

El botón **Exportar Excel** genera hojas para `Productos`, `Categorías`, `Ubicaciones` (`inventory_items`), `Asignaciones` (`item_assignments`), `Movimientos` y `Resumen`. En Supabase las tablas se consultan filtradas por la empresa seleccionada, con conteo exacto y paginación; la exportación se cancela si las páginas no coinciden con el total reportado.

El respaldo incluye la URL almacenada en `products.image_url`, pero no descarga los archivos remotos a los que apunte. Los logos de empresa se guardan como `clients.theme.logoDataUrl`; por su tamaño y formato no se incluyen en el Excel y deben respaldarse aparte desde `clients.theme`. Las hojas no incluyen cuentas, correos, membresías, códigos de acceso ni bitácora de administración. El importador de Stockly restaura productos, no restaura automáticamente categorías, ubicaciones, asignaciones, movimientos, temas ni imágenes; por tanto, el Excel facilita revisar y conservar esos datos, pero no es una restauración integral de un clic.

