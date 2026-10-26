import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, X } from "lucide-react";
import { fetchCompanyAccessCodeStatus, rotateCompanyAccessCode } from "../lib/supabase.js";

export default function CompanyAccessCodesManager({ businesses, onClose }) {
  const [statuses, setStatuses] = useState({});
  const [errors, setErrors] = useState({});
  const [busyId, setBusyId] = useState("");
  const [pending, setPending] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all(businesses.map(async (business) => {
      try {
        const status = await fetchCompanyAccessCodeStatus(business.clientId);
        if (!cancelled) setStatuses((current) => ({ ...current, [business.clientId]: status }));
      } catch (error) {
        if (!cancelled) setErrors((current) => ({ ...current, [business.clientId]: error.message || "No tienes permiso para administrar esta llave." }));
      }
    }));
    return () => { cancelled = true; };
  }, [businesses]);

  async function confirmGenerate() {
    if (!pending) return;
    const business = pending;
    setPending(null);
    setBusyId(business.clientId);
    setErrors((current) => ({ ...current, [business.clientId]: "" }));
    setGenerated(null);
    setCopyMessage("");
    try {
      const code = await rotateCompanyAccessCode(business.clientId);
      setGenerated({ clientId: business.clientId, name: business.name, code });
      setStatuses((current) => ({ ...current, [business.clientId]: { active: true, everGenerated: true } }));
    } catch (error) {
      setErrors((current) => ({ ...current, [business.clientId]: error.message || "No se pudo generar la llave." }));
    } finally {
      setBusyId("");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(generated.code);
      setCopyMessage("Llave copiada.");
    } catch {
      setCopyMessage("No se pudo copiar; selecciona la llave y cópiala manualmente.");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="access-codes-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-slate-950 shadow-2xl sm:p-7">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div><h2 id="access-codes-title" className="text-xl font-extrabold">Llaves de acceso</h2><p className="mt-1 text-sm text-slate-600">Estado por empresa. Las llaves activas no se pueden recuperar; solo se muestran al generarlas.</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg border p-2"><X size={18} /></button>
        </header>
        <div className="space-y-3">
          {businesses.map((business) => {
            const status = statuses[business.clientId];
            const error = errors[business.clientId];
            return <article key={business.clientId} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="font-bold">{business.name}</h3><p className="mt-1 text-sm text-slate-600">{error ? "Sin permiso de gestión" : !status ? "Consultando estado…" : status.active ? "Llave activa" : status.everGenerated ? "Sin llave activa · requiere renovación" : "Nunca se ha generado una llave"}</p></div>
                <button type="button" disabled={!status || Boolean(error) || Boolean(busyId)} onClick={() => setPending(business)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"><KeyRound size={16} />{busyId === business.clientId ? "Generando…" : status?.active ? "Renovar llave" : "Generar llave"}</button>
              </div>
              {error && <p role="alert" className="mt-2 break-words text-sm text-red-700">{error}</p>}
              {generated?.clientId === business.clientId && <div className="mt-3 rounded-lg bg-emerald-50 p-3"><p className="break-all font-mono text-sm">{generated.code}</p><p className="mt-1 text-xs text-emerald-900">Cópiala ahora. No se guarda en texto plano y no se podrá volver a consultar.</p><button type="button" onClick={copyCode} className="mt-2 inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-bold"><Copy size={15} /> Copiar llave</button>{copyMessage && <p role="status" className="mt-2 text-sm font-semibold">{copyMessage}</p>}</div>}
            </article>;
          })}
          {!businesses.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No hay empresas disponibles para gestionar.</p>}
        </div>
        {pending && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4"><section role="alertdialog" aria-labelledby="rotate-company-key-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h3 id="rotate-company-key-title" className="text-lg font-extrabold">{statuses[pending.clientId]?.active ? "Renovar llave activa" : "Generar llave de acceso"}</h3><p className="mt-3 text-sm text-slate-600">{statuses[pending.clientId]?.active ? `La llave actual de ${pending.name} dejará de funcionar inmediatamente. La nueva llave se mostrará una sola vez.` : `Se generará una llave nueva para ${pending.name}; se mostrará una sola vez.`}</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setPending(null)} className="rounded-lg border px-4 py-2 font-bold">Cancelar</button><button type="button" onClick={confirmGenerate} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white"><Check size={15} className="mr-2 inline" />Confirmar y generar</button></div></section></div>}
      </section>
    </div>
  );
}
