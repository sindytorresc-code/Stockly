
import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "../lib/supabase.js";

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
    };

    if (!draft.name || !draft.type) {
      setError("Completa el nombre y el tipo de empresa.");
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
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <section className="w-full max-w-md">
        <form
          onSubmit={submit}
          className="w-full rounded-xl bg-white p-8 text-slate-950 shadow-xl"
        >
          <h1 className="text-3xl font-extrabold">Stockly</h1>

          <p className="mb-6 mt-2 text-slate-500">
            {registering
              ? "Crea tu cuenta personal para comenzar."
              : "Inicia sesión para acceder a tus empresas."}
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={submitGoogle}
            className="mb-5 h-11 w-full rounded-lg border border-slate-300 font-bold text-slate-800 disabled:opacity-60"
          >
            {busy ? "Conectando…" : "Continuar con Google"}
          </button>

          <div className="mb-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            o con correo y contraseña
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <label className="mb-4 block text-sm font-bold">
            Correo
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 h-11 w-full rounded-lg border px-3"
            />
          </label>

          <label className="mb-5 block text-sm font-bold">
            Contraseña
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={registering ? "new-password" : "current-password"}
              className="mt-1 h-11 w-full rounded-lg border px-3"
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
            className="h-11 w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60"
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
            className="mt-4 w-full text-sm font-semibold text-blue-700 hover:underline"
          >
            {registering
              ? "Ya tengo una cuenta. Iniciar sesión"
              : "¿No tienes cuenta? Crear cuenta personal"}
          </button>
        </form>

        <div className="mt-5 rounded-xl bg-white/80 p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-600">
            ¿Tu empresa aún no está registrada?
          </p>

          <button
            type="button"
            onClick={() => {
              setError("");
              setCreatingCompany(true);
            }}
            className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-5 font-bold text-slate-700 transition hover:border-blue-500 hover:text-blue-700"
          >
            <Plus size={18} /> Agregar empresa
          </button>
        </div>

        {creatingCompany && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
            <form
              onSubmit={submitCompany}
              aria-label="Registrar empresa"
              className="w-full max-w-md rounded-xl bg-white p-6 text-slate-950 shadow-2xl"
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

              <label className="mb-3 block text-sm font-bold">
                Nombre de la empresa
                <input
                  name="companyName"
                  required
                  maxLength={80}
                  autoComplete="organization"
                  className="mt-1 h-11 w-full rounded-lg border px-3"
                />
              </label>

              <label className="mb-3 block text-sm font-bold">
                Tipo de negocio
                <input
                  name="companyType"
                  required
                  maxLength={60}
                  className="mt-1 h-11 w-full rounded-lg border px-3"
                />
              </label>

              <label className="mb-4 block text-sm font-bold">
                Descripción
                <input
                  name="companyDescription"
                  maxLength={200}
                  className="mt-1 h-11 w-full rounded-lg border px-3"
                />
              </label>

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
                className="h-11 w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60"
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
