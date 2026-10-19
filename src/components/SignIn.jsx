import { useState } from "react";
import { signInWithPassword } from "../lib/supabase.js";

export default function SignIn({ onSignedIn }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try { await signInWithPassword(String(data.get("email")), String(data.get("password"))); onSignedIn(); }
    catch (e) { setError(e.message || "No fue posible iniciar sesión."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-8 text-slate-950 shadow-xl">
    <h1 className="text-3xl font-extrabold">Stockly</h1><p className="mb-6 mt-2 text-slate-500">Inicia sesión para acceder a tus empresas.</p>
    <label className="mb-4 block text-sm font-bold">Correo<input name="email" type="email" required autoComplete="username" className="mt-1 h-11 w-full rounded-lg border px-3" /></label>
    <label className="mb-5 block text-sm font-bold">Contraseña<input name="password" type="password" required autoComplete="current-password" className="mt-1 h-11 w-full rounded-lg border px-3" /></label>
    {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="h-11 w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60">{busy ? "Ingresando…" : "Iniciar sesión"}</button>
  </form></main>;
}
