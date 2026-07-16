export function formatSupabaseError(error, fallback = "No pude conectar con Supabase") {
  const raw = error?.message || String(error || "");
  try {
    const parsed = JSON.parse(raw);
    const message = parsed.message || raw;

    if (/Could not find the '([^']+)' column/.test(message)) {
      if (message.includes("pin_hash")) {
        return "Falta la columna pin_hash en clients. Ejecuta database/migrate-missing-columns.sql en Supabase.";
      }
      return "La base de datos necesita actualizarse. Ejecuta database/migrate-missing-columns.sql en Supabase.";
    }
    if (/row-level security|RLS|permission denied/i.test(message)) {
      return "Supabase bloqueo la operacion. Ejecuta database/public-demo-policies.sql en Supabase.";
    }

    return message;
  } catch {
    return raw || fallback;
  }
}
