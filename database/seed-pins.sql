-- Ejecuta esto en Supabase SQL Editor para inicializar claves en la base de datos.
-- Despues de cambiar una clave desde la app, el valor queda en pin_hash para todos los dispositivos.

update clients set pin_hash = '1234' where slug = 'atain' and (pin_hash is null or pin_hash = '');
update clients set pin_hash = '2026' where slug = 'sabor' and (pin_hash is null or pin_hash = '');
update clients set pin_hash = '4455' where slug = 'vogue' and (pin_hash is null or pin_hash = '');
update clients set pin_hash = '7788' where slug = 'mara' and (pin_hash is null or pin_hash = '');

-- Verifica:
-- select slug, pin_hash from clients order by slug;
