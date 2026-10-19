# Base de datos y despliegue

Stockly usa Supabase Auth y PostgreSQL en el modo protegido. `database/schema.sql` conserva la estructura anterior para demo y `database/production-security.sql` añade empresas/membresías, usuarios, roles, permisos, categorías, inventario, asignaciones, movimientos, auditoría e índices. Las claves foráneas y restricciones de unicidad evitan duplicados dentro de cada empresa; RLS limita consultas a las membresías y permisos del usuario autenticado.

## Preparar un proyecto Supabase

1. En un proyecto nuevo ejecuta `database/schema.sql` en SQL Editor.
2. Ejecuta `database/production-security.sql`. Este archivo elimina las políticas públicas de demo si estaban instaladas.
3. En Supabase Dashboard abre **Authentication → Users → Add user**. Elige **Create new user** para el primer administrador, o **Send invitation** para enviar una invitación a cada persona. La invitación y el establecimiento de contraseña ocurren en Supabase Auth; Stockly no envía correos. Copia el UUID que aparece en la fila del usuario.
4. Vincula el primer usuario a una empresa como `admin` desde **SQL Editor**. Sustituye el UUID y el `slug` de negocio:

```sql
insert into client_memberships(client_id, user_id, role_id)
select c.id, 'UUID-DEL-USUARIO'::uuid, r.id
from clients c cross join roles r
where c.slug = 'atain' and r.name = 'admin'
on conflict (client_id, user_id) do update set role_id = excluded.role_id, active = true;
```

Repite el vínculo para las empresas que le correspondan. Las empresas nuevas se crean desde Stockly y el usuario que las crea recibe el rol admin.

Para el resto de usuarios, repite la consulta y cambia `r.name` a `manager` o `viewer` según los permisos que necesiten. Después, un administrador puede usar **Usuarios y roles** en Stockly para asignar roles a usuarios Auth ya creados, pegando su UUID. El usuario debe existir primero en Authentication.

En el proyecto real de Stockly ya se ejecutaron ambos SQL. Hay 4 empresas y 138 productos, pero todavía no hay usuarios de Auth ni membresías. El esquema existente también tenía una tabla `roles` previa; la migración de producción agrega el campo faltante antes de asignar los roles nuevos. La migración reemplaza las políticas anteriores de `clients`, `products` y `roles`, y deja las tablas legadas `users`/`user_roles` sin acceso desde anon/authenticated.

5. Configura `.env` a partir de `.env.example` y establece `VITE_REQUIRE_AUTH=true`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Reinicia Vite después de cambiar variables.
6. Para GitHub Pages, configura las variables de Actions `SUPABASE_URL` y `SUPABASE_ANON_KEY` en **Settings → Secrets and variables → Actions → Variables** del repositorio. El workflow valida que existan y compila con `VITE_REQUIRE_AUTH=true`. La clave `anon` está diseñada para el cliente web y será visible en el bundle publicado; su seguridad depende de RLS. Nunca pongas la `service_role key` en el frontend ni en Actions variables.
7. En **Settings → Pages**, confirma que la fuente de publicación sea GitHub Actions. El push a `main` ejecuta las pruebas, compila y publica; también se puede iniciar `Deploy to GitHub Pages` manualmente desde Actions.
8. No ejecutes `database/public-demo-policies.sql` en producción.

La pantalla Usuarios y roles muestra los miembros de la empresa y permite asignarles un rol usando el UUID de Auth. Invita al usuario desde Supabase Auth primero. La política de membresías permite esta acción solo a administradores de esa empresa. Las operaciones de productos se registran mediante un trigger y el historial/exportación solo lee movimientos visibles bajo RLS.

## Modo demo

Sin `VITE_REQUIRE_AUTH=true`, se conserva el acceso antiguo por PIN y el respaldo local. `database/public-demo-policies.sql` concede acceso público y solo sirve para demostraciones sin datos sensibles. El PIN antiguo no es autenticación de producción.

## Respaldo Excel

Exportar Excel genera un libro `.xls` XML compatible con Excel/LibreOffice y sus hojas Empresa, Inventario, Dashboard y Movimientos. En Supabase incluye todas las páginas del historial accesibles para la sesión. En modo local incluye empresa/inventario/dashboard y deja movimientos vacío porque el modo demo no registra auditoría remota.
