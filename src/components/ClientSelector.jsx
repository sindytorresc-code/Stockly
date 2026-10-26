
import { useState } from "react";
import { Plus, X, KeyRound } from "lucide-react";
import { businesses } from "../data/businesses.js";
import { iconMap } from "../lib/icons.js";
import BrandingEditor from "./BrandingEditor.jsx";
import { businessThemeStyle, isValidHexColor } from "../lib/businessTheme.js";

export default function ClientSelector({
  onSelect,
  businesses: availableBusinesses = businesses,
  onCreate,
  onSignOut,
  onJoinCompany,
  onManageAccessCodes,
}) {
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [brand, setBrand] = useState({ brandColor: "#4f46e5", icon: "package", logoDataUrl: "" });

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const type = String(form.get("type") || "").trim();

    if (!name || !type) {
      setError("Completa el nombre y el tipo de empresa.");
      return;
    }
    if (!isValidHexColor(brand.brandColor)) {
      setError("Escribe un color HEX válido antes de guardar.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onCreate({
        name,
        type,
        description: String(form.get("description") || "").trim(),
        ...brand,
      });
      setCreating(false);
      setError("");
    } catch (e) {
      setError(e.message || "No se pudo guardar la empresa.");
    } finally {
      setSaving(false);
    }
  }

  async function submitJoin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("companyCode") || "").trim();

    if (!code) {
      setError("Introduce el código de acceso de la empresa.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await onJoinCompany(code);
      setSuccess("¡Te has unido a la empresa! Ya puedes seleccionarla.");
      event.currentTarget.reset();
    } catch (e) {
      setError(e.message || "No fue posible unirse a la empresa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10 text-slate-950">
      <section className="w-full max-w-3xl text-center">
        <h1 className="text-4xl font-extrabold tracking-normal">
          Sistema de Inventario
        </h1>
        <p className="mt-3 text-slate-500">
          Selecciona tu negocio para continuar
        </p>

        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-3 text-sm font-bold text-blue-700"
          >
            Cerrar sesión
          </button>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setJoining(!joining);
              setCreating(false);
              setError("");
              setSuccess("");
            }}
            className="flex min-h-20 items-center justify-center gap-3 rounded-lg border-2 border-dashed border-blue-300 bg-white p-5 font-bold text-blue-700 transition hover:border-blue-500"
          >
            <KeyRound size={22} />
            Unirme a una empresa
          </button>

          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setJoining(false);
              setError("");
              setSuccess("");
              setBrand({ brandColor: "#4f46e5", icon: "package", logoDataUrl: "" });
            }}
            className="flex min-h-20 items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-white p-5 font-bold text-slate-700 transition hover:border-blue-500 hover:text-blue-700"
          >
            <Plus size={22} />
            Agregar empresa nueva
          </button>
          {onManageAccessCodes && <button type="button" onClick={onManageAccessCodes} className="flex min-h-20 items-center justify-center gap-3 rounded-lg border-2 border-dashed border-emerald-300 bg-white p-5 font-bold text-emerald-800 transition hover:border-emerald-500 sm:col-span-2"><KeyRound size={22} />Administrar llaves de acceso</button>}
        </div>

        {joining && (
          <form
            onSubmit={submitJoin}
            className="mt-5 rounded-xl bg-white p-6 text-left shadow-lg"
          >
            <h2 className="text-xl font-extrabold">
              Unirme a una empresa existente
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Introduce el código que te proporcionó el administrador de la
              empresa.
            </p>

            <label className="mt-4 block text-sm font-bold">
              Código de acceso
              <input
                name="companyCode"
                required
                autoComplete="off"
                maxLength={32}
                className="mt-1 h-11 w-full rounded-lg border px-3 font-mono uppercase"
                placeholder="Pega aquí el código"
              />
            </label>

            {error && (
              <p role="alert" className="mt-3 break-words text-sm text-red-700">
                {error}
              </p>
            )}

            {success && (
              <p role="status" className="mt-3 text-sm text-green-700">
                {success}
              </p>
            )}

            <button
              disabled={saving}
              className="mt-4 h-11 w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60"
            >
              {saving ? "Verificando código…" : "Unirme a la empresa"}
            </button>
          </form>
        )}

        {success && !joining && (
          <p role="status" className="mt-4 text-sm text-green-700">
            {success}
          </p>
        )}

        <div className="mt-8 grid gap-5 text-left sm:grid-cols-2">
          {availableBusinesses.map((business) => {
            const Icon = iconMap[business.icon] || iconMap.package;

            return (
              <button
                key={business.id}
                type="button"
                onClick={() => onSelect(business)}
                className="overflow-hidden rounded-lg bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <span
                  className={`flex min-h-36 items-center gap-4 bg-gradient-to-br ${
                    business.cardGradient || "from-blue-600 to-cyan-500"
                  } p-6 text-white`}
                  style={businessThemeStyle(business.theme)}
                >
                  <span className="grid size-12 place-items-center rounded-lg bg-white/20">
                    {business.brandConfig?.logoDataUrl ? <img src={business.brandConfig.logoDataUrl} alt="" className="size-12 rounded-lg bg-white object-contain p-1" /> : <Icon size={24} />}
                  </span>
                  <span>
                    <span className="block text-xs font-extrabold text-white/80">
                      {business.type}
                    </span>
                    <span className="block text-lg font-extrabold">
                      {business.name}
                    </span>
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

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
          <form
            onSubmit={submit}
            aria-label="Agregar empresa"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 text-slate-950 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Agregar empresa</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Se guardará en Supabase y tendrá su propio inventario.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setCreating(false)}
                aria-label="Cerrar"
              >
                <X />
              </button>
            </div>

            <label className="mb-3 block text-sm font-bold">
              Nombre
              <input
                name="name"
                required
                maxLength={80}
                className="mt-1 h-11 w-full rounded-lg border px-3"
              />
            </label>

            <label className="mb-3 block text-sm font-bold">
              Tipo de negocio
              <input
                name="type"
                required
                maxLength={60}
                className="mt-1 h-11 w-full rounded-lg border px-3"
              />
            </label>

            <label className="mb-4 block text-sm font-bold">
              Descripción
              <input
                name="description"
                maxLength={200}
                className="mt-1 h-11 w-full rounded-lg border px-3"
              />
            </label>

            <BrandingEditor value={brand} onChange={setBrand} error={error} onError={setError} />

            {error && !error.includes("HEX") && !error.includes("logo") && (
              <p role="alert" className="mb-3 break-words text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              disabled={saving}
              className="h-11 w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar y configurar acceso"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
