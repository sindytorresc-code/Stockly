import { useMemo, useState } from "react";
import { atainCampaigns } from "../data/businesses.js";
import { useEscapeKey } from "../hooks/useEscapeKey.js";
import { parseAtainImport } from "../lib/products.js";
import { Upload, X } from "lucide-react";

export default function AtainImportModal({ theme, fileName, text, onClose, onConfirm }) {
  const [campaign, setCampaign] = useState("");
  useEscapeKey(onClose, true);
  const parsed = useMemo(() => parseAtainImport(text, { campaign }), [text, campaign]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <section
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${theme.panel}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <span>
            <span className="block text-lg font-extrabold">Importar activos ATAIN</span>
            <span className={`mt-1 block text-sm ${theme.muted}`}>
              Selecciona la campana del archivo {fileName ? `"${fileName}"` : "Excel o CSV"}.
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
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            className={`h-[43px] w-full rounded-lg border px-3 text-sm outline-none transition focus:ring-2 [color-scheme:dark] ${theme.input} ${theme.formBorder}`}
          >
            <option value="" disabled>
              Selecciona una campana
            </option>
            {atainCampaigns.map((campaign) => (
              <option key={campaign} value={campaign} className="bg-slate-950 text-white">
                {campaign}
              </option>
            ))}
          </select>
        </label>

        <div className={`mt-4 rounded-lg bg-white/5 p-3 text-sm ${theme.muted}`}>
          <p className="font-extrabold text-white">{parsed.products.length} activos listos para importar</p>
          {parsed.duplicateCount > 0 && <p className="mt-1">{parsed.duplicateCount} seriales repetidos se ajustarán para evitar duplicados.</p>}
          {!parsed.products.length && campaign && <p className="mt-1">No encontré activos válidos para esta campaña. Revisa las columnas Spot, Modelo y Serial.</p>}
        </div>

        <button type="button" disabled={!campaign || !parsed.products.length} onClick={() => onConfirm(campaign, parsed)} className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg font-bold disabled:opacity-40 ${theme.accent}`}>
          <Upload size={18} /> Importar activos
        </button>
      </section>
    </div>
  );
}
