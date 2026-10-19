import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchAccessConfiguration, saveClientMembership } from "../lib/supabase.js";

export default function AccessManager({ clientId, businessName, onClose }) {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  async function refresh() {
    setBusy(true); setError("");
    try { const data = await fetchAccessConfiguration(clientId); setRoles(data.roles); setMembers(data.memberships); }
    catch (e) { setError(e.message || "No tienes permiso para administrar usuarios en esta empresa."); }
    finally { setBusy(false); }
  }
  useEffect(() => { refresh(); }, [clientId]);
  async function submit(event) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    try { await saveClientMembership(clientId, String(data.get("userId")).trim(), String(data.get("roleId"))); event.currentTarget.reset(); await refresh(); }
    catch (e) { setError(e.message || "No se pudo guardar el acceso."); }
  }
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4"><section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6 text-slate-950 shadow-2xl">
    <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-extrabold">Usuarios y roles</h2><p className="text-sm text-slate-500">Acceso a {businessName}</p></div><button type="button" onClick={onClose} aria-label="Cerrar"><X /></button></div>
    {busy ? <p>Cargando…</p> : <><form onSubmit={submit} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1fr_180px_auto]">
      <label className="text-sm font-bold">ID de usuario<input name="userId" required pattern="[0-9a-fA-F-]{36}" placeholder="UUID de Supabase Auth" className="mt-1 h-10 w-full rounded border px-2 font-normal" /></label>
      <label className="text-sm font-bold">Rol<select name="roleId" required className="mt-1 h-10 w-full rounded border px-2 font-normal">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
      <button className="self-end rounded bg-blue-700 px-4 py-2 font-bold text-white">Asignar</button>
    </form><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-100 text-left"><th className="p-3">Usuario (UUID)</th><th className="p-3">Rol</th><th className="p-3">Estado</th></tr></thead><tbody>{members.map((member) => <tr key={member.user_id} className="border-t"><td className="p-3 font-mono text-xs">{member.user_id}</td><td className="p-3">{roles.find((role) => role.id === member.role_id)?.name || "—"}</td><td className="p-3">{member.active ? "Activo" : "Desactivado"}</td></tr>)}</tbody></table></div></>}
    {error && <p role="alert" className="mt-4 break-words text-sm text-red-700">{error}</p>}
  </section></div>;
}
