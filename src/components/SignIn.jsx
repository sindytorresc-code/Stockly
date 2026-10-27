
import { useState } from "react";
import { Boxes, Plus, X } from "lucide-react";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "../lib/supabase.js";
import BrandingEditor from "./BrandingEditor.jsx";
import { isValidHexColor } from "../lib/businessTheme.js";

export default function SignIn({
  onSignedIn,
  initialError = "",
  onRegisterCompany,
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [companyBrand, setCompanyBrand] = useState({ brandColor: "#4f46e5", icon: "package", logoDataUrl: "" });

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    try {
      if (registering) {
        const result = await signUpWithPassword(email, password);

        if (result.needsEmailConfirmation) {
          setMessage(
            "Tu cuenta fue registrada. Revisa tu correo y confirma la cuenta antes de iniciar sesión."
          );
          setRegistering(false);
        } else {
          onSignedIn();
        }
      } else {
        await signInWithPassword(email, password);
        onSignedIn();
      }
    } catch (e) {
      setError(e.message || "No fue posible completar la operación.");
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogle() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e.message || "No fue posible continuar con Google.");
      setBusy(false);
    }
  }

  async function submitCompany(event) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const draft = {
      name: String(data.get("companyName") || "").trim(),
      type: String(data.get("companyType") || "").trim(),
      description: String(data.get("companyDescription") || "").trim(),
      ...companyBrand,
    };

    if (!draft.name || !draft.type) {
      setError("Completa el nombre y el tipo de empresa.");
      return;
    }
    if (!isValidHexColor(draft.brandColor)) {
      setError("Escribe un color HEX válido antes de guardar.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await onRegisterCompany(draft);
    } catch (e) {
      setError(e.message || "No fue posible registrar la empresa.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--stockly-bg)] px-4 py-10 text-[var(--stockly-ink)] sm:px-6">
      <section className="w-full max-w-md">
        <form
          onSubmit={submit}
          className="w-full rounded-2xl border border-[var(--stockly-border)] bg-[var(--stockly-surface)] p-6 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--stockly-selected)] text-[var(--stockly-brand)]"><Boxes size={23} aria-hidden="true" /></span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--stockly-muted)]">Inventarios empresariales</span>
              <span className="block text-2xl font-bold tracking-tight">Stockly</span>
            </span>
          </div>

          <h1 className="text-xl font-semibold tracking-tight">
            {registering
              ? "Crea tu cuenta personal"
              : "Inicia sesión"}
          </h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-[var(--stockly-muted)]">
            {registering ? "Regístrate para comenzar a gestionar tus empresas." : "Accede de forma segura a tus empresas e inventarios."}
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={submitGoogle}
            className="mb-5 h-11 w-full rounded-xl border border-[var(--stockly-border)] bg-white font-semibold text-[var(--stockly-ink)] transition hover:bg-slate-50 disabled:opacity-60"
          >
            {busy ? "Conectando…" : "Continuar con Google"}
          </button>

          <div className="mb-5 flex items-center gap-3 text-xs text-[var(--stockly-muted)]">
            <span className="h-px flex-1 bg-[var(--stockly-border)]" />
            o con correo y contraseña
            <span className="h-px flex-1 bg-[var(--stockly-border)]" />
          </div>

          <label className="mb-4 block text-sm font-semibold text-[var(--stockly-ink)]">
            Correo
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 h-11 w-full rounded-xl border border-[var(--stockly-border)] bg-white px-3 text-[var(--stockly-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--stockly-brand)] focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="mb-5 block text-sm font-semibold text-[var(--stockly-ink)]">
            Contraseña
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={registering ? "new-password" : "current-password"}
              className="mt-1 h-11 w-full rounded-xl border border-[var(--stockly-border)] bg-white px-3 text-[var(--stockly-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--stockly-brand)] focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          {(error || initialError) && (
            <p role="alert" className="mb-3 break-words text-sm text-red-700">
              {error || initialError}
            </p>
          )}

          {message && (
            <p role="status" className="mb-3 text-sm text-green-700">
              {message}
            </p>
          )}

          <button
            disabled={busy}
            className="stockly-primary h-11 w-full rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Procesando…"
              : registering
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRegistering(!registering);
              setError("");
              setMessage("");
            }}
            className="mt-4 min-h-11 w-full text-sm font-semibold text-slate-600 transition hover:text-[var(--stockly-ink)] hover:underline"
          >
            {registering
              ? "Ya tengo una cuenta. Iniciar sesión"
              : "¿No tienes cuenta? Crear cuenta personal"}
          </button>
        </form>

        <div className="mt-4 rounded-2xl border border-[var(--stockly-border)] bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-[var(--stockly-muted)]">
            ¿Tu empresa aún no está registrada?
          </p>

          <button
            type="button"
            onClick={() => {
              setError("");
              setCreatingCompany(true);
                setCompanyBrand({ brandColor: "#4f46e5", icon: "package", logoDataUrl: "" });
            }}
            className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--stockly-border)] px-5 font-semibold text-[var(--stockly-ink)] transition hover:border-[var(--stockly-brand)] hover:bg-cyan-50"
          >
            <Plus size={18} /> Agregar empresa
          </button>
        </div>

        {creatingCompany && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
            <form
              onSubmit={submitCompany}
              aria-label="Registrar empresa"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--stockly-border)] bg-white p-5 text-[var(--stockly-ink)] shadow-2xl sm:p-7"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold">Registrar empresa</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Se guardará en Supabase con tu cuenta de Google.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCreatingCompany(false)}
                  aria-label="Cerrar"
                >
                  <X />
                </button>
              </div>

              <label className="mb-3 block text-sm font-semibold">
                Nombre de la empresa
                <input
                  name="companyName"
                  required
                  maxLength={80}
                  autoComplete="organization"
                  className="mt-1 h-11 w-full rounded-xl border border-[var(--stockly-border)] bg-white px-3 outline-none focus:border-[var(--stockly-brand)] focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="mb-3 block text-sm font-semibold">
                Tipo de negocio
                <input
                  name="companyType"
                  required
                  maxLength={60}
                  className="mt-1 h-11 w-full rounded-xl border border-[var(--stockly-border)] bg-white px-3 outline-none focus:border-[var(--stockly-brand)] focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="mb-4 block text-sm font-semibold">
                Descripción
                <input
                  name="companyDescription"
                  maxLength={200}
                  className="mt-1 h-11 w-full rounded-xl border border-[var(--stockly-border)] bg-white px-3 outline-none focus:border-[var(--stockly-brand)] focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <BrandingEditor value={companyBrand} onChange={setCompanyBrand} error={error} onError={setError} />

              <p className="mb-4 text-xs text-slate-500">
                Continuarás con Google. La cuenta que complete el registro
                administrará esta empresa y podrá generar su código de acceso.
              </p>

              {error && (
                <p role="alert" className="mb-3 break-words text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                disabled={busy}
                className="stockly-primary h-11 w-full rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Conectando con Google…" : "Continuar con Google y guardar"}
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
