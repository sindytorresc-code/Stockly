import { ArrowRight, Package } from "lucide-react";
import { money } from "../lib/money.js";
import StockPill from "./ui/StockPill.jsx";

export function rankFeaturedProducts(products = [], limit = 3) {
  return products
    .map((product) => ({
      product,
      inventoryValue: Number(product.price || 0) * Number(product.stock || 0),
    }))
    .filter(({ product, inventoryValue }) => Number(product.stock) > 0 && Number(product.price) > 0 && Number.isFinite(inventoryValue))
    .sort((left, right) => right.inventoryValue - left.inventoryValue || String(left.product.name).localeCompare(String(right.product.name), "es"))
    .slice(0, limit)
    .map(({ product }) => product);
}

export default function FeaturedProducts({ products = [], theme, isAtain = false, onViewAll }) {
  const featured = rankFeaturedProducts(products);
  const title = isAtain ? "Activos destacados" : "Productos destacados";
  const valueLabel = isAtain ? "Valor registrado" : "Precio de venta";

  return (
    <section aria-labelledby="featured-products-title" className={`flex min-w-0 flex-col rounded-2xl border p-5 shadow-sm sm:p-6 ${theme.panel}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="featured-products-title" className="text-lg font-extrabold">{title}</h2>
          <p className={`mt-1 text-xs leading-5 ${theme.muted}`}>Ordenados por valor registrado de inventario (precio × existencias).</p>
        </div>
        <button type="button" onClick={onViewAll} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--brand-accent,#475569)] transition hover:opacity-75">
          Ver todos <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>

      {featured.length ? (
        <ul className="grid flex-1 content-start gap-2">
          {featured.map((product) => (
            <li key={product.dbId || product.code} className={`grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3 rounded-xl border p-3 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] ${theme.row}`}>
              {product.image ? <img src={product.image} alt="" className="size-11 rounded-lg object-cover" /> : <span className={`grid size-11 place-items-center rounded-lg ${theme.softAccent}`}><Package size={18} aria-hidden="true" /></span>}
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold" title={product.name}>{product.name}</span>
                <span className={`mt-0.5 block truncate text-xs ${theme.muted}`}>{product.category || "Sin categoría"} · {product.stock} unidades</span>
                <span className="mt-1 inline-flex"><StockPill product={product} /></span>
              </span>
              <span className="col-start-2 flex items-center justify-between gap-3 sm:col-start-auto sm:block sm:text-right">
                <span className={`text-[10px] ${theme.muted}`}>{valueLabel}</span>
                <span className="block whitespace-nowrap text-sm font-extrabold">{money.format(product.price)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`grid min-h-40 flex-1 place-items-center rounded-xl border border-dashed px-4 py-8 text-center text-sm leading-6 ${theme.panelSoft} ${theme.muted}`}>
          No hay artículos con existencias y precio registrados para ordenar por valor de inventario.
        </p>
      )}
    </section>
  );
}
