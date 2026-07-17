import { Package, Pencil, Trash2 } from "lucide-react";
import { getAtainAssetIcon } from "../lib/atainIcons.js";
import { money } from "../lib/money.js";
import { tagClass } from "../lib/products.js";
import Pill from "./ui/Pill.jsx";
import StockPill from "./ui/StockPill.jsx";

export default function ProductRow({ product, theme, isAtain, onEdit, onDelete }) {
  if (isAtain) {
    const AssetIcon = getAtainAssetIcon(product.category);

    return (
      <tr className={`border-t ${theme.row}`}>
        <td className="px-4 py-3 font-extrabold">{product.spot || "Sin spot"}</td>
        <td className="px-4 py-3">
          <Pill className={theme.softAccent}>{product.category || "Activo"}</Pill>
        </td>
        <td className="px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid size-10 place-items-center rounded-lg ${theme.softAccent}`}>
              <AssetIcon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-extrabold">{product.name}</span>
            </span>
          </div>
        </td>
        <td className={`truncate px-4 py-3 font-mono text-sm font-bold ${theme.muted}`} title={product.code}>
          {product.code}
        </td>
        <td className={`truncate px-4 py-3 text-sm font-extrabold ${theme.muted}`} title={product.campaign || ""}>
          {product.campaign || "Sin campana"}
        </td>
        <td className="px-4 py-3">
          <Pill className={theme.softAccent}>{product.brand || "Sin ubicacion"}</Pill>
        </td>
        <td className="px-4 py-3">
          <Pill className={tagClass(product.tag)}>{product.tag}</Pill>
        </td>
        <td className={`truncate px-4 py-3 text-sm font-semibold ${theme.muted}`} title={product.comments || ""}>
          {product.comments || "Sin detalle"}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(product)}
              className={`grid size-9 place-items-center rounded-lg ${theme.panelSoft}`}
              aria-label={`Editar ${product.name}`}
            >
              <Pencil size={17} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(product)}
              className={`grid size-9 place-items-center rounded-lg ${theme.panelSoft}`}
              aria-label={`Eliminar ${product.name}`}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-t ${theme.row}`}>
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {product.image ? (
            <img src={product.image} alt={product.name} className="size-10 rounded-lg object-cover" />
          ) : (
            <span className={`grid size-10 place-items-center rounded-lg ${theme.softAccent}`}>
              <Package size={18} />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-extrabold">{product.name}</span>
            <span className={`block truncate text-xs ${theme.muted}`}>Codigo: {product.code}</span>
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Pill className={theme.softAccent}>{product.category}</Pill>
      </td>
      <td className="px-4 py-3 font-extrabold">{money.format(product.price)}</td>
      <td className="px-4 py-3 font-extrabold">
        {product.stock} <StockPill product={product} />
      </td>
      <td className="px-4 py-3">
        <Pill className={tagClass(product.tag)}>{product.tag}</Pill>
      </td>
      <td className={`truncate px-4 py-3 text-sm font-semibold ${theme.muted}`} title={product.comments || ""}>
        {product.comments || "Sin comentarios"}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(product)}
            className={`grid size-9 place-items-center rounded-lg ${theme.panelSoft}`}
            aria-label={`Editar ${product.name}`}
          >
            <Pencil size={17} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(product)}
            className={`grid size-9 place-items-center rounded-lg ${theme.panelSoft}`}
            aria-label={`Eliminar ${product.name}`}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </td>
    </tr>
  );
}
