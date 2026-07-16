import { Delete, X } from "lucide-react";
import { iconMap } from "../lib/icons.js";

export default function PinModal({ business, pin, error, loading, onClose, onKey }) {
  const Icon = iconMap[business.icon];
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"];

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-slate-950/65 p-5 backdrop-blur-md"
      onClick={onClose}
    >
      <section
        className="w-full max-w-xs overflow-hidden rounded-3xl bg-white text-slate-950 shadow-soft"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="pin-title"
      >
        <div className={`relative min-h-40 bg-gradient-to-br ${business.theme.header} p-6 text-white`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 grid size-8 place-items-center rounded-full bg-white/20"
            aria-label="Cerrar acceso"
          >
            <X size={18} />
          </button>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-white/20">
              <Icon size={23} />
            </span>
            <span>
              <span className="block text-xs font-extrabold text-white/80">{business.type}</span>
              <span className="block text-lg font-extrabold">{business.name}</span>
            </span>
          </div>
          <p id="pin-title" className="mb-4 text-sm font-semibold">
            Ingresa tu codigo de acceso
          </p>
          <div className="flex gap-3" aria-live="polite">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className={`size-3 rounded-full ${index < pin.length ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </div>
        <p className="min-h-8 pt-3 text-center text-xs font-extrabold text-red-600">{error}</p>
        {loading ? (
          <p className="pb-7 text-center text-sm font-semibold text-slate-500">Cargando clave...</p>
        ) : (
        <div className="grid grid-cols-3 gap-x-5 gap-y-3 px-5 pb-7">
          {keys.map((key, index) =>
            key ? (
              <button
                key={key}
                type="button"
                onClick={() => onKey(key)}
                className="grid h-14 place-items-center rounded-2xl text-xl font-semibold hover:bg-slate-100"
                aria-label={key === "backspace" ? "Borrar digito" : `Digito ${key}`}
              >
                {key === "backspace" ? <Delete size={20} /> : key}
              </button>
            ) : (
              <span key={index} />
            ),
          )}
        </div>
        )}
      </section>
    </div>
  );
}
