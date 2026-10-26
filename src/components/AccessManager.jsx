import { useEffect, useState } from "react";
import { UserRoundX, X } from "lucide-react";
import {
  deactivateCompanyAccessCode,
  deactivateClientMembership,
  fetchAccessConfiguration,
  rotateCompanyAccessCode,
  saveClientMembership,
} from "../lib/supabase.js";

export default function AccessManager({ clientId, businessName, onClose }) {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(true);
  const [busyUserId, setBusyUserId] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [newCode, setNewCode] = useState("");

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const data = await fetchAccessConfiguration(clientId);
      setRoles(data.roles);
      setMembers(data.memberships);
    } catch (e) {
      setError(e.message || "No tienes permiso para administrar usuarios en esta empresa.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { refresh(); }, [clientId]);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setNotice("");
    try {
      await saveClientMembership(clientId, String(data.get("userId")).trim(), String(data.get("roleId")));
      form.reset();
      setNotice("Acceso guardado para esta empresa.");
      await refresh();
    } catch (e) {
      setError(e.message || "No se pudo guardar el acceso.");
    }
  }

  async function rotateCode() {
    setError(""); setNotice(""); setNewCode("");
    try { setNewCode(await rotateCompanyAccessCode(clientId)); }
    catch (e) { setError(e.message || "No se pudo renovar el código."); }
  }

  async function deactivateCode() {
    setError(""); setNotice(""); setNewCode("");
    try { await deactivateCompanyAccessCode(clientId); setNotice("Código de acceso desactivado."); }
    catch (e) { setError(e.message || "No se pudo desactivar el código."); }
  }

  async function confirmRemoval() {
    if (!pendingRemoval) return;
    const target = pendingRemoval;
    setBusyUserId(target.user_id);
    setError(""); setNotice("");
    try {
      const result = await deactivateClientMembership(clientId, target.user_id);
      if (!result.ok) {
        setError(result.message);
      } else {
        setNotice(result.message);
        setPendingRemoval(null);
        await refresh();
      }
    } catch (e) {
      setError(e.message || "No se pudo retirar el acceso. Comprueba tus permisos en esta empresa.");
    } finally {
      setBusyUserId("");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 text-slate-950 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div><h2 className="text-xl font-extrabold">Usuarios y roles</h2><p className="text-sm text-slate-500">Acceso a {businessName}</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X /></button>
        </div>
        {busy ? <p>Cargando…</p> : <>
          <section className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <h3 className="font-bold">Código de acceso a la empresa</h3>
            <p className="mt-1 text-sm text-slate-600">Comparte este código con las personas que deban vincularse. La renovación invalida el código anterior.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={rotateCode} className="rounded bg-blue-700 px-3 py-2 text-sm font-bold text-white">Generar o renovar código</button>
              <button type="button" onClick={deactivateCode} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-bold">Desactivar código</button>
            </div>
            {newCode && <p className="mt-3 break-all rounded bg-white p-3 font-mono text-sm" aria-live="polite">{newCode}<span className="mt-1 block font-sans text-xs text-amber-700">Cópialo ahora; no se puede volver a consultar.</span></p>}
          </section>
          <form onSubmit={submit} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1fr_180px_auto]">
            <label className="text-sm font-bold">ID de usuario<input name="userId" required pattern="[0-9a-fA-F-]{36}" placeholder="UUID de Supabase Auth" className="mt-1 h-10 w-full rounded border px-2 font-normal" /></label>
            <label className="text-sm font-bold">Rol<select name="roleId" required className="mt-1 h-10 w-full rounded border px-2 font-normal">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <button className="self-end rounded bg-blue-700 px-4 py-2 font-bold text-white">Asignar</button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-100 text-left"><th className="p-3">Correo</th><th className="p-3">ID de usuario</th><th className="p-3">Rol</th><th className="p-3">Estado</th><th className="p-3">Acceso</th></tr></thead>
              <tbody>{members.map((member) => (
                <tr key={member.user_id} className="border-t">
                  <td className="p-3">{member.email || "No disponible en el perfil de Supabase"}</td>
                  <td className="p-3 font-mono text-xs">{member.user_id}</td>
                  <td className="p-3">{roles.find((role) => role.id === member.role_id)?.name || "—"}</td>
                  <td className="p-3">{member.active ? "Activo" : "Desactivado"}</td>
                  <td className="p-3">
                    {member.active ? <button type="button" disabled={Boolean(busyUserId)} onClick={() => setPendingRemoval(member)} className="inline-flex items-center gap-2 rounded border border-red-200 px-3 py-2 font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><UserRoundX size={16} />Retirar</button> : <span className="text-slate-500">Retirado</span>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {members.length === 0 && <p className="p-4 text-sm text-slate-500">No hay membresías para esta empresa.</p>}
          </div>
        </>}
        {notice && <p role="status" className="mt-4 text-sm font-bold text-green-700">{notice}</p>}
        {error && <p role="alert" className="mt-4 break-words text-sm text-red-700">{error}</p>}
      </section>
      {pendingRemoval && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/70 p-4">
        <section role="alertdialog" aria-labelledby="remove-member-title" aria-describedby="remove-member-message" className="w-full max-w-md rounded-xl bg-white p-6 text-slate-950 shadow-2xl">
          <h3 id="remove-member-title" className="text-lg font-extrabold">Retirar acceso a {businessName}</h3>
          <p id="remove-member-message" className="mt-3 text-sm text-slate-600">Se desactivará la membresía de {pendingRemoval.email || pendingRemoval.user_id} en esta empresa. Su cuenta y sus accesos a otras empresas no se modificarán.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={Boolean(busyUserId)} onClick={() => setPendingRemoval(null)} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-50">Cancelar</button>
            <button type="button" disabled={Boolean(busyUserId)} onClick={confirmRemoval} className="rounded-lg bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-50">{busyUserId ? "Retirando…" : "Confirmar retiro"}</button>
          </div>
        </section>
      </div>}
    </div>
  );
}
