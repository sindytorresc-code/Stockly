const buildConfig =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? {
        url: import.meta.env.VITE_SUPABASE_URL,
        key: import.meta.env.VITE_SUPABASE_ANON_KEY,
      }
    : null;

let resolvedConfig = buildConfig;
let initPromise = null;

export function getSupabaseConfig() {
  return resolvedConfig;
}

export function isSupabaseConfigured() {
  return Boolean(resolvedConfig);
}

export async function initSupabase() {
  if (resolvedConfig) return resolvedConfig;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const base = import.meta.env.BASE_URL || "/";
    try {
      const response = await fetch(`${base}stockly-config.json`, { cache: "no-store" });
      if (!response.ok) return null;

      const data = await response.json();
      if (!data.supabaseUrl || !data.supabaseAnonKey) return null;

      resolvedConfig = {
        url: data.supabaseUrl,
        key: data.supabaseAnonKey,
      };
      return resolvedConfig;
    } catch (error) {
      console.error("No pude cargar stockly-config.json", error);
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export async function requireSupabaseConfig() {
  const config = getSupabaseConfig() || (await initSupabase());
  if (!config) throw new Error("Supabase no esta configurado");
  return config;
}

// Compatibilidad con codigo existente evaluado en build.
export const hasSupabaseConfig = Boolean(buildConfig);
