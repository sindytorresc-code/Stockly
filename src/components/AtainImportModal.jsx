import { Upload, X } from "lucide-react";
import { atainCampaigns } from "../data/businesses.js";
import { useEscapeKey } from "../hooks/useEscapeKey.js";

export default function AtainImportModal({ theme, fileName, onClose, onConfirm }) {
  useEscapeKey(onClose, true);

  function handleSubmit(event) {
    event.preventDefault();
    const campaign = String(new FormData(event.currentTarget).get("campaign") || "").trim();
    if (!campaign) return;
    onConfirm(campaign);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <form
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${theme.panel}`}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <span>
            <span className="block text-lg font-extrabold">Importar activos ATAIN</span>
            <span className={`mt-1 block text-sm ${theme.muted}`}>
              Selecciona la campana del archivo {fileName ? `"${fileName}"` : "CSV"}.
            </span>
          </span>
          <button type="button" onClick={onClose} className={`grid size-9 place-items-center rounded-lg ${theme.panelSoft}`}>
            <X size={18} />
          </button>
        </div>

        <label className="grid gap-2">
          <span className={`text-sm font-bold ${theme.muted}`}>Campana</span>
          <select
            name="campaign"
            required
            defaultValue=""
            className={`h-[43px] w-full rounded-lg border px-3 text-sm outline-none transition focus:ring-2 ${theme.input} ${theme.formBorder}`}
          >
            <option value="" disabled>
              Selecciona una campana
            </option>
            {atainCampaigns.map((campaign) => (
              <option key={campaign} value={campaign}>
                {campaign}
              </option>
            ))}
          </select>
        </label>

        <p className={`mt-4 text-xs leading-relaxed ${theme.muted}`}>
          El archivo debe tener columnas como spot, modelo, serial, hostname, pantalla 1, pantalla 2, headset, mouse y teclado.
          Si viene de Excel, exportalo como CSV antes de subirlo.
        </p>

        <button type="submit" className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg font-bold ${theme.accent}`}>
          <Upload size={18} /> Importar activos
        </button>
      </form>
    </div>
  );
}
