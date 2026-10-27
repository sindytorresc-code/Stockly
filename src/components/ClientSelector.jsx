
import { useState } from "react";
import { ArrowRight, Boxes, KeyRound, Plus, X } from "lucide-react";
import { businesses } from "../data/businesses.js";
import { iconMap } from "../lib/icons.js";
import BrandingEditor from "./BrandingEditor.jsx";
import { businessThemeStyle, isValidHexColor } from "../lib/businessTheme.js";
import { completeCompanyJoin } from "../lib/companyJoin.js";

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
    // React clears currentTarget after the synchronous event handler returns.
    // Keep the actual form element before awaiting the Supabase request.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const code = String(form.get("companyCode") || "").trim();

    if (!code) {
      setError("Introduce el código de acceso de la empresa.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await completeCompanyJoin({
        code,
        form: formElement,
        onJoinCompany,
        onSuccess: () => setSuccess("¡Te has unido a la empresa! Ya puedes seleccionarla."),
      });
    } catch (error) {
      setError(error.message || "No fue posible unirse a la empresa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--stockly-bg)] px-4 py-8 text-[var(--stockly-ink)] sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--stockly-selected)] text-[var(--stockly-brand)]"><Boxes size={23} aria-hidden="true" /></span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--stockly-muted)]">Inventarios empresariales</span>
              <span className="block text-xl font-bold tracking-tight">Stockly</span>
            </span>
          </div>
          {onSignOut && <button type="button" onClick={onSignOut} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[var(--stockly-muted)] transition hover:bg-white hover:text-[var(--stockly-ink)]">Cerrar sesión</button>}
        </header>

        <div className="mb-7 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--stockly-brand)]">Espacio de trabajo</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Selecciona una empresa</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--stockly-muted)]">Elige una empresa para acceder a su inventario y herramientas.</p>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setJoining(!joining);
              setCreating(false);
              setError("");
              setSuccess("");
            }}
            className="flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--stockly-border)] bg-white p-5 text-left font-semibold text-[var(--stockly-ink)] shadow-sm transition hover:border-[var(--stockly-brand)] hover:shadow-md"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-[var(--stockly-brand)]"><KeyRound size={20} /></span>
            <span className="min-w-0 flex-1"><span className="block">Unirme a una empresa</span><span className="mt-1 block text-xs font-normal text-[var(--stockly-muted)]">Usar un código de acceso</span></span><ArrowRight size={17} className="text-[var(--stockly-muted)]" />
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
            className="flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--stockly-border)] bg-white p-5 text-left font-semibold text-[var(--stockly-ink)] shadow-sm transition hover:border-[var(--stockly-brand)] hover:shadow-md"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-[var(--stockly-ink)]"><Plus size={20} /></span>
            <span className="min-w-0 flex-1"><span className="block">Agregar empresa nueva</span><span className="mt-1 block text-xs font-normal text-[var(--stockly-muted)]">Crear un espacio de trabajo</span></span><ArrowRight size={17} className="text-[var(--stockly-muted)]" />
          </button>
          {onManageAccessCodes && <button type="button" onClick={onManageAccessCodes} className="flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--stockly-border)] bg-white px-5 py-4 text-left font-semibold text-[var(--stockly-ink)] shadow-sm transition hover:border-[var(--stockly-brand)] sm:col-span-2"><span className="grid size-9 place-items-center rounded-lg bg-slate-100"><KeyRound size={18} /></span>Administrar llaves de acceso<ArrowRight size={17} className="ml-auto text-[var(--stockly-muted)]" /></button>}
        </div>

        {joining && (
          <form
            onSubmit={submitJoin}
            className="mt-4 rounded-2xl border border-[var(--stockly-border)] bg-white p-5 text-left shadow-sm sm:p-6"
          >
            <h2 className="text-lg font-bold tracking-tight">
              Unirme a una empresa existente
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--stockly-muted)]">
              Introduce el código que te proporcionó el administrador de la
              empresa.
            </p>

            <label className="mt-4 block text-sm font-semibold">
              Código de acceso
              <input
                name="companyCode"
                required
                autoComplete="off"
                maxLength={32}
                className="mt-1 h-11 w-full rounded-xl border border-[var(--stockly-border)] bg-white px-3 font-mono uppercase outline-none focus:border-[var(--stockly-brand)] focus:ring-2 focus:ring-cyan-100"
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
              className="stockly-primary mt-4 h-11 w-full rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className="grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
          {availableBusinesses.length === 0 && <p className="rounded-2xl border border-dashed border-[var(--stockly-border)] bg-white px-5 py-8 text-center text-sm text-[var(--stockly-muted)] sm:col-span-2 lg:col-span-3">Aún no tienes empresas disponibles. Puedes unirte a una empresa con un código o crear una nueva.</p>}
          {availableBusinesses.map((business) => {
            const Icon = iconMap[business.icon] || iconMap.package;

            return (
              <button
                key={business.id}
                type="button"
                onClick={() => onSelect(business)}
                className="group overflow-hidden rounded-2xl border border-[var(--stockly-border)] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stockly-brand)] hover:shadow-md"
              >
                <span className="block p-5" style={businessThemeStyle(business.theme)}>
                  <span className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--brand-soft,#f1f5f9)] text-[var(--brand-accent,#172033)]">
                    {business.brandConfig?.logoDataUrl ? <img src={business.brandConfig.logoDataUrl} alt={`${business.name} logo`} className="size-full rounded-xl bg-white object-contain p-1" /> : <Icon size={23} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--stockly-muted)]">{business.type}</span>
                    <span className="mt-1 block truncate text-lg font-bold tracking-tight text-[var(--stockly-ink)]">
                      {business.name}
                    </span>
                  </span>
                  </span>
                  {business.description && <span className="mt-4 block line-clamp-2 min-h-10 text-sm leading-5 text-[var(--stockly-muted)]">{business.description}</span>}
                  <span className="mt-4 flex items-center justify-between border-t border-[var(--stockly-border)] pt-3 text-sm font-semibold text-[var(--stockly-ink)]">
                    Abrir empresa <ArrowRight size={16} className="text-[var(--brand-accent,#00b4d8)] transition-transform group-hover:translate-x-0.5" />
                  </span>
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
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--stockly-border)] bg-white p-5 text-[var(--stockly-ink)] shadow-2xl sm:p-7"
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

            <label className="mb-3 block text-sm font-semibold">
              Nombre
              <input
                name="name"
                required
                maxLength={80}
                className="mt-1 h-11 w-full rounded-xl border border-[var(--stockly-border)] bg-white px-3 outline-none focus:border-[var(--stockly-brand)] focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <label className="mb-3 block text-sm font-semibold">
              Tipo de negocio
              <input
                name="type"
                required
                maxLength={60}
                className="mt-1 h-11 w-full rounded-xl border border-[var(--stockly-border)] bg-white px-3 outline-none focus:border-[var(--stockly-brand)] focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <label className="mb-4 block text-sm font-semibold">
              Descripción
              <input
                name="description"
                maxLength={200}
                className="mt-1 h-11 w-full rounded-xl border border-[var(--stockly-border)] bg-white px-3 outline-none focus:border-[var(--stockly-brand)] focus:ring-2 focus:ring-cyan-100"
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
              className="stockly-primary h-11 w-full rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar y configurar acceso"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
