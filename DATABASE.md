# Base de datos y despliegue

Stockly usa Supabase Auth y PostgreSQL en el modo protegido. `database/schema.sql` conserva la estructura anterior para demo; `database/production-security.sql` instala membresías, roles, permisos, inventario, movimientos, auditoría e índices; `database/google-company-access.sql` agrega el registro por Google con código empresarial hasheado y alta automática como `employee`. RLS continúa activa: ninguna de estas instrucciones instala las políticas públicas de demo.

## Preparar un proyecto Supabase

1. En un proyecto nuevo ejecuta `database/schema.sql` en SQL Editor.
2. Ejecuta `database/production-security.sql`. Ya está aplicado en el proyecto Stockly revisado.
3. Ejecuta `database/google-company-access.sql` después de `production-security.sql`; crea la función de ingreso, el almacenamiento de hashes, y el rol de empleado. La tabla de códigos no concede acceso directo a `anon` ni a `authenticated`. Esta migración ya se aplicó al proyecto Stockly revisado.
4. Para habilitar Google, en Google Cloud Console crea un OAuth Client ID de tipo **Web application**. Añade como origen autorizado el dominio de la app (por ejemplo, `https://sindytorresc-code.github.io`) y como URI de redireccionamiento autorizada la callback que muestra Supabase: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. No es la URL de Pages: Google devuelve a Supabase y Supabase devuelve al sitio.
5. En Supabase abre **Authentication → Sign In / Providers → Google**, habilita Google y guarda el Client ID y Client Secret de Google en los campos de proveedor. En **Authentication → URL Configuration**, configura la Site URL de GitHub Pages y permite como Redirect URL la URL de la app con `/Stockly/` (y `http://localhost:5173/Stockly/` para desarrollo). Supabase debe permitir exactamente el destino que usa el cliente. Configura además la pantalla de consentimiento y los usuarios de prueba/publicación en Google Cloud.
6. Como arranque único de la instalación, crea un código inicial desde **SQL Editor**. El siguiente bloque genera un código aleatorio y guarda solo su hash; copia el resultado una sola vez y compártelo con la persona que será administradora de arranque. Cambia `atain` si corresponde. Ejecútalo solo cuando la empresa no tenga ya un código activo:

```sql
with generated as materialized (
  select c.id as client_id, upper(encode(extensions.gen_random_bytes(16), 'hex')) as code
  from clients c where c.slug = 'atain'
), stored as (
  insert into company_access_codes(client_id, code_hash)
  select client_id, encode(extensions.digest(lower(code), 'sha256'), 'hex') from generated
  returning client_id
)
select generated.code as copy_once from generated join stored using (client_id);
```

La persona completa el primer ingreso con Google y ese código; así Supabase Auth crea su usuario y Stockly lo añade como `employee`. Luego una persona autorizada verifica el correo/UUID en **Supabase → Authentication → Users** y eleva esa única cuenta desde SQL Editor, estableciendo también el claim de plataforma que restringe la creación de empresas. No uses un `service_role` en el navegador:

```sql
begin;
do $$
declare changed integer;
begin
  update client_memberships m
  set role_id = r.id, active = true
  from clients c, roles r, auth.users u
  where m.client_id = c.id and c.slug = 'atain' and m.user_id = u.id
    and lower(u.email) = lower('CORREO-VERIFICADO-DEL-ADMIN') and r.name = 'admin';
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'expected_one_verified_membership_to_promote_got_%', changed; end if;
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"stockly_platform_admin": true}'::jsonb
  where lower(email) = lower('CORREO-VERIFICADO-DEL-ADMIN');
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'expected_one_verified_auth_user_got_%', changed; end if;
end $$;
commit;
```

Si un `UPDATE` no coincide con exactamente una fila, el bloque aborta y no se debe confirmar la transacción. La persona debe volver a iniciar sesión para recibir el claim actualizado. Después puede renovar el código de arranque desde **Usuarios y roles**; los demás usuarios se registran sin altas manuales, eligen **Continuar con Google**, ingresan un código activo y reciben siempre el rol `employee`. El navegador no envía roles. Para cambiar roles de miembros, un administrador puede usar esa pantalla; las invitaciones de Auth no las envía Stockly.

El código empresarial es aleatorio de 128 bits, se muestra una sola vez y solo se almacena su hash. Renovarlo invalida el anterior; desactivarlo impide nuevos vínculos. Usuarios ya vinculados conservan su membresía. La gestión de códigos y miembros requiere el permiso `users.manage` de esa empresa.

Crear una empresa otorga `admin` a quien la crea; por eso el RPC solo acepta a un miembro que tenga `users.manage` en una empresa existente, o a un usuario cuyo `app_metadata.stockly_platform_admin` haya sido asignado desde un proceso administrativo de Supabase. Nunca se confía en `user_metadata` ni en roles enviados por el navegador. Así un empleado no puede convertirse en administrador creando una empresa.

En el proyecto real de Stockly ya se ejecutaron `schema.sql`, `production-security.sql` y `google-company-access.sql`. La revisión encontró cuatro empresas, tres cuentas Auth, tres membresías y cuatro códigos activos; una membresía tiene rol administrador y no hay administradores de plataforma. La nueva regla permite que ese administrador cree otra empresa. No se puede probar la sesión desde el entorno de desarrollo sin usar una cuenta del usuario; las cuentas de Auth y los datos existentes no se modifican durante las pruebas locales.

7. Configura `.env` local (ignorado por Git) con `VITE_REQUIRE_AUTH=true`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` usando los valores del proyecto; reinicia Vite. No pongas Client Secret de Google ni `service_role` en `.env` de frontend.
8. En el repositorio configura las variables Actions `SUPABASE_URL` y `SUPABASE_ANON_KEY` en **Settings → Secrets and variables → Actions → Variables**. El workflow las valida y compila con `VITE_REQUIRE_AUTH=true`. La clave pública/anon se incrusta en el bundle y depende de las reglas RLS para proteger datos. No publiques claves privadas.
9. En **Settings → Pages**, confirma que la fuente sea GitHub Actions. El push a `main` ejecuta pruebas, build y despliegue.
10. Nunca ejecutes `database/public-demo-policies.sql` en producción.

La pantalla **Usuarios y roles** muestra los miembros de la empresa, permite asignar rol a una cuenta Auth ya registrada y administrar el código empresarial. La política de membresías solo admite gestión por usuarios con `users.manage`; la unión por código siempre asigna `employee`. Las operaciones de productos se registran mediante un trigger y el historial/exportación solo lee movimientos visibles bajo RLS.

## Pruebas de autorización entre empresas

`database/tests/company-access-security.sql` es una prueba de integración reversible que requiere dos cuentas Auth con rol `employee`, una cuenta administradora y dos empresas. Selecciona dos miembros empleados, crea una empresa temporal como admin, prueba rotar/desactivar el código, valida que un código inválido no vincule y que uno válido siempre asigna `employee`, verifica el aislamiento cruzado y que el empleado no puede autoasignarse `admin`; al final hace `ROLLBACK`. No la ejecutes simultáneamente con actividad de usuarios sobre esas cuentas.

## Modo demo

Sin `VITE_REQUIRE_AUTH=true`, se conserva el acceso antiguo por PIN y el respaldo local. `database/public-demo-policies.sql` concede acceso público y solo sirve para demostraciones sin datos sensibles. El PIN antiguo no es autenticación de producción.

## Respaldo Excel

Exportar Excel genera un libro `.xls` XML compatible con Excel/LibreOffice y sus hojas Empresa, Inventario, Dashboard y Movimientos. En Supabase incluye todas las páginas del historial accesibles para la sesión. En modo local incluye empresa/inventario/dashboard y deja movimientos vacío porque el modo demo no registra auditoría remota.
