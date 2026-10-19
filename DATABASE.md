# Base de datos y despliegue

Stockly usa Supabase Auth y PostgreSQL en el modo protegido. `database/schema.sql` conserva la estructura anterior para demo; `database/production-security.sql` instala membresías, roles, permisos, inventario, movimientos, auditoría e índices; `database/google-company-access.sql` agrega el registro por Google con código empresarial hasheado y alta automática como `employee`. RLS continúa activa: ninguna de estas instrucciones instala las políticas públicas de demo.

## Preparar un proyecto Supabase

1. En un proyecto nuevo ejecuta `database/schema.sql` en SQL Editor.
2. Ejecuta `database/production-security.sql`. Ya está aplicado en el proyecto Stockly revisado.
3. Ejecuta `database/google-company-access.sql` después de `production-security.sql`; crea la función de ingreso, el almacenamiento de hashes, y el rol de empleado. La tabla de códigos no concede acceso directo a `anon` ni a `authenticated`. Esta migración ya se aplicó al proyecto Stockly revisado.
4. Para habilitar Google, en Google Cloud Console crea un OAuth Client ID de tipo **Web application**. Añade como origen autorizado el dominio de la app (por ejemplo, `https://sindytorresc-code.github.io`) y como URI de redireccionamiento autorizada la callback que muestra Supabase: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. No es la URL de Pages: Google devuelve a Supabase y Supabase devuelve al sitio.
5. En Supabase abre **Authentication → Sign In / Providers → Google**, habilita Google y guarda el Client ID y Client Secret de Google en los campos de proveedor. En **Authentication → URL Configuration**, configura la Site URL de GitHub Pages y permite como Redirect URL la URL de la app con `/Stockly/` (y `http://localhost:5173/Stockly/` para desarrollo). Supabase debe permitir exactamente el destino que usa el cliente. Configura además la pantalla de consentimiento y los usuarios de prueba/publicación en Google Cloud.
6. Para el primer administrador —solo una vez por instalación— habilita su cuenta desde **Supabase → Authentication → Users** (puede registrarse con Google después de habilitarlo), copia su UUID y autorízalo como administrador de la empresa desde **SQL Editor**. Sustituye el UUID y el `slug` de empresa:

```sql
insert into client_memberships(client_id, user_id, role_id)
select c.id, 'UUID-DEL-USUARIO'::uuid, r.id
from clients c cross join roles r
where c.slug = 'atain' and r.name = 'admin'
on conflict (client_id, user_id) do update set role_id = excluded.role_id, active = true;
```

Este paso de arranque requiere una persona autorizada; no uses un `service_role` en el navegador. Para habilitar a la persona que administrará la creación de empresas, establece su marca protegida de `app_metadata` desde un proceso administrativo de Supabase (por ejemplo, SQL Editor con el UUID ya verificado):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"stockly_platform_admin": true}'::jsonb
where id = 'UUID-VERIFICADO-DEL-ADMIN';
```

El usuario debe iniciar sesión de nuevo para recibir el claim actualizado. Una vez que un administrador de empresa pueda entrar, desde **Usuarios y roles** genera un código de acceso y lo comparte con los usuarios que deben entrar. Cada usuario elige **Continuar con Google**, ingresa el código, y Supabase Auth crea la cuenta al completar el primer OAuth. El RPC valida el código en el servidor y lo añade como `employee`; el navegador no envía ningún rol. Para cambiar roles, un administrador puede asignar un rol a una cuenta Auth existente desde **Usuarios y roles**. Las invitaciones de Auth no las envía Stockly.

El código empresarial es aleatorio de 128 bits, se muestra una sola vez y solo se almacena su hash. Renovarlo invalida el anterior; desactivarlo impide nuevos vínculos. Usuarios ya vinculados conservan su membresía. La gestión de códigos y miembros requiere el permiso `users.manage` de esa empresa.

Crear una empresa otorga `admin` a quien la crea; por eso la migración restringe el RPC existente a usuarios cuyo `app_metadata.stockly_platform_admin` esté establecido en `true` por una persona administradora de Supabase (nunca desde `user_metadata` ni desde el navegador). El usuario de arranque autorizado debe tener ese claim protegido antes de usar **Crear empresa**. Esto conserva la función existente sin permitir que un empleado se convierta en administrador de una empresa arbitraria.

En el proyecto real de Stockly ya se ejecutaron `schema.sql` y `production-security.sql`. La última revisión encontró cuatro empresas y 138 productos, pero ninguna cuenta Auth ni membresía. La migración existente reemplazó las políticas anteriores de `clients`, `products` y `roles`, y dejó las tablas legadas `users`/`user_roles` sin acceso desde anon/authenticated. Aplica `google-company-access.sql` para desplegar la nueva incorporación por código; no se ha podido comprobar un inicio de sesión real porque todavía no hay cuentas Auth ni configuración OAuth de Google.

7. Configura `.env` local (ignorado por Git) con `VITE_REQUIRE_AUTH=true`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` usando los valores del proyecto; reinicia Vite. No pongas Client Secret de Google ni `service_role` en `.env` de frontend.
8. En el repositorio configura las variables Actions `SUPABASE_URL` y `SUPABASE_ANON_KEY` en **Settings → Secrets and variables → Actions → Variables**. El workflow las valida y compila con `VITE_REQUIRE_AUTH=true`. La clave pública/anon se incrusta en el bundle y depende de las reglas RLS para proteger datos. No publiques claves privadas.
9. En **Settings → Pages**, confirma que la fuente sea GitHub Actions. El push a `main` ejecuta pruebas, build y despliegue.
10. Nunca ejecutes `database/public-demo-policies.sql` en producción.

La pantalla **Usuarios y roles** muestra los miembros de la empresa, permite asignar rol a una cuenta Auth ya registrada y administrar el código empresarial. La política de membresías solo admite gestión por usuarios con `users.manage`; la unión por código siempre asigna `employee`. Las operaciones de productos se registran mediante un trigger y el historial/exportación solo lee movimientos visibles bajo RLS.

## Pruebas de autorización entre empresas

`database/tests/company-access-security.sql` es una prueba de integración reversible para dos cuentas Auth y dos empresas. Requiere que existan al menos dos usuarios de prueba y que estén aplicadas ambas migraciones de producción. Selecciona las dos primeras cuentas y empresas, prepara membresías temporales, verifica que cada usuario no pueda leer la empresa/productos del otro, que un código aleatorio no vincule una empresa, y que un empleado no pueda promoverse a admin; al final hace `ROLLBACK`. No la ejecutes simultáneamente con actividad de usuarios sobre esas cuentas.

## Modo demo

Sin `VITE_REQUIRE_AUTH=true`, se conserva el acceso antiguo por PIN y el respaldo local. `database/public-demo-policies.sql` concede acceso público y solo sirve para demostraciones sin datos sensibles. El PIN antiguo no es autenticación de producción.

## Respaldo Excel

Exportar Excel genera un libro `.xls` XML compatible con Excel/LibreOffice y sus hojas Empresa, Inventario, Dashboard y Movimientos. En Supabase incluye todas las páginas del historial accesibles para la sesión. En modo local incluye empresa/inventario/dashboard y deja movimientos vacío porque el modo demo no registra auditoría remota.
