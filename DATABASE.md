# Base de datos

La app actual guarda datos en `localStorage`, que sirve para una demo local. Para un sistema real necesitas una base de datos fuera del navegador.

## Recomendacion

Usa **Supabase** si quieres avanzar rapido:

- Es PostgreSQL.
- Tiene panel web para ver tablas.
- Tiene API automatica.
- Funciona bien con React/Vite.
- Puedes manejar login y permisos despues.

## Donde se hace

1. Entra a Supabase y crea un proyecto.
2. Abre `SQL Editor`.
3. Copia y ejecuta el archivo `database/schema.sql`.
4. Crea un archivo `.env` en este proyecto con tus claves:

```bash
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

## Alternativas

- **Firebase**: buena opcion si quieres algo simple y en tiempo real, pero no es SQL.
- **MySQL/PostgreSQL propio**: mejor si ya tienes hosting/backend, pero requiere crear API.
- **LocalStorage**: solo para pruebas, no para produccion.

## Tablas sugeridas

- `clients`: negocios/clientes, tema visual y datos generales.
- `products`: inventario de cada cliente, incluyendo precio, stock, estado y comentarios.

El archivo `database/schema.sql` ya trae esa estructura.
