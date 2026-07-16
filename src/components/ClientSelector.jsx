import { businesses } from "../data/businesses.js";
import { iconMap } from "../lib/icons.js";

export default function ClientSelector({ onSelect }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10 text-slate-950">
      <section className="w-full max-w-3xl text-center">
        <h1 className="text-4xl font-extrabold tracking-normal">Sistema de Inventario</h1>
        <p className="mt-3 text-slate-500">Selecciona tu negocio para continuar</p>
        <div className="mt-11 grid gap-5 text-left sm:grid-cols-2">
          {businesses.map((business) => {
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
        </div>
      </section>
    </main>
  );
}
