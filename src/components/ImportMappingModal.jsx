import { useMemo, useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey.js";
import { parseMappedProductImport } from "../lib/products.js";
import { Upload, X } from "lucide-react";

const fields = [
  ["name", "Nombre", true], ["code", "Código", true], ["price", "Precio de venta", true],
  ["purchasePrice", "Precio de compra", false], ["stock", "Stock", true],
  ["minStock", "Stock mínimo", false], ["category", "Categoría", true], ["brand", "Marca", false],
  ["tag", "Estado", false], ["comments", "Comentarios", false], ["image", "Imagen", false],
  ["spot", "Ubicación", false], ["campaign", "Campaña", false],
];

export default function ImportMappingModal({ theme, businessName, draft, onClose, onConfirm }) {
  const [mapping, setMapping] = useState(draft.mapping || {});
  const [firstDataRow, setFirstDataRow] = useState(0);
  useEscapeKey(onClose, true);
  const previewDraft = useMemo(() => ({ ...draft, startIndex: firstDataRow }), [draft, firstDataRow]);
  const result = useMemo(() => parseMappedProductImport(previewDraft, mapping), [previewDraft, mapping]);
  const rows = draft.rows.slice(firstDataRow, firstDataRow + 6);
  const columnLabel = (index) => `${draft.columns[index]}${String(draft.headers[index] ?? "").trim() ? ` · ${draft.headers[index]}` : ""}`;

  function updateMapping(field, value) {
    setMapping((current) => ({ ...current, [field]: value === "" ? "" : Number(value) }));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-mapping-title"
        className={`my-auto max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border p-5 shadow-2xl sm:p-6 ${theme.panel}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="import-mapping-title" className="text-lg font-extrabold">Revisar importación · {businessName}</h2>
            <p className={`mt-1 text-sm ${theme.muted}`}>{draft.fileName} · {draft.sheetName}</p>
            <p className={`mt-1 text-sm ${theme.muted}`}>
              {draft.headerDetected
                ? `Detecté encabezados en la fila ${draft.headerRow + 1}. Confirma las columnas antes de continuar.`
                : "No detecté encabezados confiables. Indica qué columna contiene cada dato; no se asignó ninguna automáticamente."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`grid size-9 shrink-0 place-items-center rounded-lg ${theme.panelSoft}`}><X size={18} /></button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {fields.map(([field, label, required]) => (
            <label key={field} className="grid gap-1 text-sm">
              <span className="font-bold">{label}{required && <span className="text-rose-400"> · obligatorio</span>}</span>
              <select
                value={mapping[field] ?? ""}
                onChange={(event) => updateMapping(field, event.target.value)}
                aria-label={`${label}${required ? " obligatorio" : " opcional"}`}
                className={`h-10 rounded-lg border px-2 outline-none ${theme.input} ${theme.formBorder}`}
              >
                <option value="">{required ? "Selecciona columna" : "Omitir"}</option>
                {draft.columns.map((column, index) => <option key={column} value={index}>{columnLabel(index)}</option>)}
              </select>
            </label>
          ))}
        </div>

        {!draft.headerDetected && draft.rows.length > 1 && (
          <label className="mt-4 inline-grid gap-1 text-sm">
            <span className="font-bold">Primera fila de datos</span>
            <select value={firstDataRow} onChange={(event) => setFirstDataRow(Number(event.target.value))} className={`h-10 rounded-lg border px-2 ${theme.input} ${theme.formBorder}`}>
              {draft.rows.map((_, index) => <option key={index} value={index}>Fila {index + 1}</option>)}
            </select>
          </label>
        )}

        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-white/5"><tr>{draft.columns.map((column, index) => <th key={column} className="whitespace-nowrap px-3 py-2">{columnLabel(index)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-white/10">{draft.columns.map((column, index) => <td key={column} className="max-w-56 truncate px-3 py-2">{String(row[index] ?? "") || <span className="opacity-40">—</span>}</td>)}</tr>)}</tbody>
          </table>
          {!rows.length && <p className={`p-3 text-sm ${theme.muted}`}>No hay filas para mostrar.</p>}
        </div>

        <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm">
          <p className="font-extrabold">{result.products.length} productos listos · {result.issues.length} filas con problemas</p>
          {result.missingFields.length > 0 && <p className="mt-1 text-rose-300">Asigna los campos obligatorios: {result.missingFields.join(", ")}.</p>}
          {result.mappingConflicts?.map((conflict) => <p key={conflict} className="mt-1 text-rose-300">{conflict}</p>)}
          {result.issues.length > 0 && <ul className="mt-2 max-h-24 list-inside list-disc overflow-y-auto text-amber-200">{result.issues.slice(0, 8).map((issue) => <li key={`${issue.row}-${issue.message}`}>Fila {issue.row}: {issue.message}</li>)}</ul>}
          {result.issues.length > 8 && <p className="mt-1 text-xs">Y {result.issues.length - 8} filas más con problemas.</p>}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={`min-h-11 rounded-lg px-4 font-bold ${theme.panelSoft}`}>Cancelar</button>
          <button
            type="button"
            disabled={!result.products.length || result.missingFields.length > 0 || result.mappingConflicts?.length > 0}
            onClick={() => onConfirm(result.products)}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-bold disabled:cursor-not-allowed disabled:opacity-40 ${theme.accent}`}
          ><Upload size={17} /> Confirmar e importar {result.products.length}</button>
        </div>
      </section>
    </div>
  );
}
