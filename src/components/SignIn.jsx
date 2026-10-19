import { useState } from "react";
import { signInWithGoogle, signInWithPassword } from "../lib/supabase.js";

export default function SignIn({ onSignedIn, initialError = "" }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try { await signInWithPassword(String(data.get("email")), String(data.get("password")), companyCode); onSignedIn(); }
    catch (e) { setError(e.message || "No fue posible iniciar sesión."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-8 text-slate-950 shadow-xl">
    <h1 className="text-3xl font-extrabold">Stockly</h1><p className="mb-6 mt-2 text-slate-500">Inicia sesión para acceder a tus empresas.</p>
    <label className="mb-4 block text-sm font-bold">Código de acceso de la empresa<input value={companyCode} onChange={(event) => setCompanyCode(event.target.value)} type="text" autoComplete="off" required maxLength={80} className="mt-1 h-11 w-full rounded-lg border px-3 font-mono" /></label>
    <button type="button" disabled={busy || !companyCode.trim()} onClick={async () => { setBusy(true); setError(""); try { await signInWithGoogle(companyCode); } catch (e) { setError(e.message || "No fue posible iniciar con Google."); setBusy(false); } }} className="mb-5 h-11 w-full rounded-lg border border-slate-300 font-bold text-slate-800 disabled:opacity-60">{busy ? "Conectando…" : "Continuar con Google"}</button>
    <div className="mb-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />o con correo y contraseña<span className="h-px flex-1 bg-slate-200" /></div>
    <label className="mb-4 block text-sm font-bold">Correo<input name="email" type="email" required autoComplete="username" className="mt-1 h-11 w-full rounded-lg border px-3" /></label>
    <label className="mb-5 block text-sm font-bold">Contraseña<input name="password" type="password" required autoComplete="current-password" className="mt-1 h-11 w-full rounded-lg border px-3" /></label>
    {(error || initialError) && <p role="alert" className="mb-3 break-words text-sm text-red-700">{error || initialError}</p>}<button disabled={busy} className="h-11 w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60">{busy ? "Ingresando…" : "Iniciar sesión"}</button>
  </form></main>;
}
