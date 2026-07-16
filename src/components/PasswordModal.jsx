import { X } from "lucide-react";
import { useEscapeKey } from "../hooks/useEscapeKey.js";
import ModalField from "./ui/ModalField.jsx";

export default function PasswordModal({ theme, onClose, onSubmit }) {
  useEscapeKey(onClose);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        className={`w-full max-w-sm rounded-lg border p-6 shadow-2xl ${theme.panel} ${theme.text}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-lg font-extrabold">Cambiar clave</h2>
          <button
            type="button"
            onClick={onClose}
            className={`grid size-7 place-items-center rounded-full hover:opacity-80 ${theme.panelSoft}`}
            aria-label="Cerrar cambio de clave"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4">
          <ModalField theme={theme} label="Clave actual" name="currentPin" type="password" inputMode="numeric" maxLength="4" required autoFocus />
          <ModalField theme={theme} label="Nueva clave" name="newPin" type="password" inputMode="numeric" maxLength="4" required />
          <ModalField theme={theme} label="Confirmar nueva clave" name="confirmPin" type="password" inputMode="numeric" maxLength="4" required />
        </div>
        <p className={`mt-4 text-xs font-semibold ${theme.muted}`}>
          La clave debe tener 4 numeros. Se guarda en Supabase para todos los dispositivos.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={`h-10 rounded-lg border px-5 text-sm font-extrabold ${theme.panelSoft}`}>
            Cancelar
          </button>
          <button type="submit" className={`h-10 rounded-lg px-6 text-sm font-extrabold text-white ${theme.formAccent || theme.accent}`}>
            Guardar clave
          </button>
        </div>
      </form>
    </div>
  );
}
