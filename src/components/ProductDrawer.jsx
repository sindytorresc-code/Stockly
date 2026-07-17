import { X } from "lucide-react";
import { atainCampaigns, ATAIN_ASSET_CATEGORIES, ATAIN_WAREHOUSES, PRODUCT_TAGS } from "../data/businesses.js";
import { useEscapeKey } from "../hooks/useEscapeKey.js";
import ModalField from "./ui/ModalField.jsx";

export default function ProductDrawer({ business, theme, product, onClose, onSubmit }) {
  useEscapeKey(onClose);
  const title = product ? "Editar activo" : "Agregar activo";
  const isAtain = business?.id === "atain";
  const borderClass = theme.formBorder || "border-pink-300 focus:border-pink-500 focus:ring-pink-200";

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        className={`max-h-[92vh] w-full max-w-[512px] overflow-y-auto overflow-x-hidden rounded-lg border p-6 shadow-2xl ${theme.panel} ${theme.text}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={`grid size-7 place-items-center rounded-full hover:opacity-80 ${theme.panelSoft}`}
            aria-label="Cerrar formulario"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <ModalField theme={theme} label="Nombre *" name="name" defaultValue={product?.name} required autoFocus className="sm:col-span-6" />
          {isAtain ? (
            <label className="grid min-w-0 gap-2 sm:col-span-3">
              <span className={`text-sm font-bold ${theme.muted}`}>Tipo de activo *</span>
              <select
                name="category"
                defaultValue={product?.category || ""}
                required
                className={`h-[43px] w-full min-w-0 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 ${theme.input} ${borderClass}`}
              >
                <option value="">Seleccionar tipo</option>
                {ATAIN_ASSET_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <ModalField theme={theme} label="Categoria *" name="category" defaultValue={product?.category} required className="sm:col-span-3" />
          )}
          <ModalField theme={theme} label="Serial / Codigo *" name="code" defaultValue={product?.code} disabled={Boolean(product)} required className="sm:col-span-3" />

          {isAtain ? (
            <>
              <ModalField
                theme={theme}
                label="Spot *"
                name="spot"
                defaultValue={product?.spot || ""}
                placeholder="Ubicacion del activo en la campana"
                required
                className="sm:col-span-3"
              />
              <label className="grid min-w-0 gap-2 sm:col-span-3">
                <span className={`text-sm font-bold ${theme.muted}`}>Campana *</span>
                <select
                  name="campaign"
                  defaultValue={product?.campaign || ""}
                  required
                  className={`h-[43px] w-full min-w-0 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 ${theme.input} ${borderClass}`}
                >
                  <option value="">Seleccionar campana</option>
                  {atainCampaigns.map((campaign) => (
                    <option key={campaign} value={campaign}>
                      {campaign}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-0 gap-2 sm:col-span-6">
                <span className={`text-sm font-bold ${theme.muted}`}>Ubicacion *</span>
                <select
                  name="warehouse"
                  defaultValue={product?.brand || "STOCK"}
                  required
                  className={`h-[43px] w-full min-w-0 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 ${theme.input} ${borderClass}`}
                >
                  {ATAIN_WAREHOUSES.map((warehouse) => (
                    <option key={warehouse} value={warehouse}>
                      {warehouse}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <ModalField theme={theme} label="Precio *" name="price" type="number" min="0" defaultValue={product?.price} required className="sm:col-span-2" />
              <ModalField theme={theme} label="Stock *" name="stock" type="number" min="0" defaultValue={product?.stock} required className="sm:col-span-2" />
              <ModalField theme={theme} label="Stock Min." name="minStock" type="number" min="0" defaultValue={product?.minStock ?? 5} className="sm:col-span-2" />
              <ModalField theme={theme} label="Precio de compra" name="purchasePrice" type="number" min="0" defaultValue={product?.purchasePrice || ""} className="sm:col-span-3" />
              <ModalField theme={theme} label="Marca" name="brand" defaultValue={product?.brand || ""} className="sm:col-span-3" />
              <ModalField theme={theme} label="URL de Imagen" name="image" defaultValue={product?.image || ""} placeholder="https://..." className="sm:col-span-6" />
            </>
          )}

          <label className="grid min-w-0 gap-2 sm:col-span-6">
            <span className={`text-sm font-bold ${theme.muted}`}>Estado interno</span>
            <select
              name="tag"
              defaultValue={product?.tag || (isAtain ? "Asignado" : "En stock")}
              className={`h-[43px] w-full min-w-0 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 ${theme.input} ${borderClass}`}
            >
              {PRODUCT_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 sm:col-span-6">
            <span className={`text-sm font-bold ${theme.muted}`}>Descripcion</span>
            <textarea
              name="comments"
              defaultValue={product?.comments || ""}
              className={`min-h-[62px] w-full min-w-0 resize-y rounded-lg border px-3 py-3 text-sm outline-none transition focus:ring-2 ${theme.input} ${borderClass}`}
              placeholder="Ej: reservado, pendiente de garantia, proveedor..."
            />
          </label>
        </div>

        {!isAtain && (
          <p className={`mt-4 text-xs font-semibold ${theme.muted}`}>
            Si el stock es 0, el estado pasa a Agotado (excepto Reparacion).
          </p>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={`h-10 rounded-lg border px-5 text-sm font-extrabold ${theme.panelSoft}`}>
            Cancelar
          </button>
          <button type="submit" className={`h-10 rounded-lg px-7 text-sm font-extrabold text-white ${theme.formAccent || theme.accent}`}>
            {product ? "Guardar Cambios" : "Guardar activo"}
          </button>
        </div>
      </form>
    </div>
  );
}
