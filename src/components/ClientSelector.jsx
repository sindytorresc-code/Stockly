import { businesses } from "../data/businesses.js";
import { iconMap } from "../lib/icons.js";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export default function ClientSelector({ onSelect, businesses: availableBusinesses = businesses, onCreate, onSignOut }) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const type = String(form.get("type") || "").trim();
    if (!name || !type) return setError("Completa el nombre y el tipo de empresa.");
    try { await onCreate({ name, type, description: String(form.get("description") || "").trim() }); setCreating(false); setError(""); }
    catch (e) { setError(e.message || "No se pudo guardar la empresa."); }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10 text-slate-950">
      <section className="w-full max-w-3xl text-center">
        <h1 className="text-4xl font-extrabold tracking-normal">Sistema de Inventario</h1>
        <p className="mt-3 text-slate-500">Selecciona tu negocio para continuar</p>
        {onSignOut && <button type="button" onClick={onSignOut} className="mt-3 text-sm font-bold text-blue-700">Cerrar sesión</button>}
        <div className="mt-11 grid gap-5 text-left sm:grid-cols-2">
          {availableBusinesses.map((business) => {
            const Icon = iconMap[business.icon];
            return (
              <button
                key={business.id}
                type="button"
                onClick={() => onSelect(business)}
                className="overflow-hidden rounded-lg bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <span
                  className={`flex min-h-36 items-center gap-4 bg-gradient-to-br ${business.cardGradient} p-6 text-white`}
                >
                  <span className="grid size-12 place-items-center rounded-lg bg-white/20">
                    <Icon size={24} />
                  </span>
                  <span>
                    <span className="block text-xs font-extrabold text-white/80">{business.type}</span>
                    <span className="block text-lg font-extrabold">{business.name}</span>
                  </span>
                </span>
                <span className="flex min-h-10 items-center justify-between gap-4 px-5 text-xs text-slate-500">
                  <span className="truncate">{business.description}</span>
                  <span>Entrar →</span>
                </span>
              </button>
            );
          })}
          <button type="button" onClick={() => setCreating(true)} className="grid min-h-48 place-items-center rounded-lg border-2 border-dashed border-slate-300 bg-white/70 p-6 text-slate-600 transition hover:border-blue-500 hover:text-blue-700">
            <span className="flex items-center gap-2 font-bold"><Plus size={20} /> Crear empresa</span>
          </button>
        </div>
      </section>
      {creating && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-6 text-slate-950 shadow-2xl">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-extrabold">Nueva empresa</h2><button type="button" onClick={() => setCreating(false)} aria-label="Cerrar"><X /></button></div>
        <label className="mb-3 block text-sm font-bold">Nombre<input name="name" required maxLength="80" className="mt-1 h-11 w-full rounded-lg border px-3" /></label>
        <label className="mb-3 block text-sm font-bold">Tipo de negocio<input name="type" required maxLength="60" className="mt-1 h-11 w-full rounded-lg border px-3" /></label>
        <label className="mb-4 block text-sm font-bold">Descripción<input name="description" maxLength="200" className="mt-1 h-11 w-full rounded-lg border px-3" /></label>
        {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}<button className="h-11 w-full rounded-lg bg-blue-700 font-bold text-white">Guardar empresa</button>
      </form></div>}
    </main>
  );
}
