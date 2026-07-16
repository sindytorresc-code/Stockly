import Pill from "./Pill.jsx";
import { lowStockLimit } from "../../lib/products.js";

export default function StockPill({ product }) {
  if (product.stock === 0) {
    return <Pill className="bg-red-500/15 text-red-500">Agotado</Pill>;
  }
  if (product.stock <= lowStockLimit(product)) {
    return <Pill className="bg-amber-500/15 text-amber-500">Stock bajo</Pill>;
  }
  return <Pill className="bg-emerald-500/15 text-emerald-500">En stock</Pill>;
}
