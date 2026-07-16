import {
  ArrowLeft,
  ClipboardCheck,
  Database,
  DollarSign,
  Package,
  Plus,
  Search,
  TriangleAlert,
  TrendingUp,
  Upload,
} from "lucide-react";
import { iconMap } from "../lib/icons.js";
import { money } from "../lib/money.js";
import ProductRow from "./ProductRow.jsx";
import StatCard from "./StatCard.jsx";

export default function InventoryDashboard({
  business,
  theme,
  stats,
  query,
  filter,
  products,
  isLoadingProducts,
  dataSource,
  onBack,
  onQuery,
  onFilter,
  onAdd,
  onEdit,
  onDelete,
  onImport,
  onChangePassword,
}) {
  const Icon = iconMap[business.icon];
  const sourceText = `${dataSource}${isLoadingProducts ? " sincronizando..." : ""}`;
  const isAtain = business.id === "atain";
  const filterOptions = [
    ["all", "Todos"],
    ["stock", "En stock"],
    ["low", "Stock bajo"],
    ["empty", "Agotados"],
  ];

  return (
    <>
      <header className={`bg-gradient-to-br ${theme.header} px-4 py-5 text-white`}>
        <div className="mx-auto max-w-7xl">
          <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 font-medium">
            <ArrowLeft size={18} /> Volver a clientes
          </button>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-white/20">
                <Icon size={28} />
              </span>
              <span>
                <span className="block text-xs font-extrabold text-white/80">{business.type}</span>
                <span className="block text-3xl font-extrabold">{business.name}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/20 px-4 text-sm font-extrabold">
                <Database size={18} /> Datos: {sourceText}
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-4 font-bold">
                <Upload size={18} /> Cargar archivo
                <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={onImport} />
              </label>
              <button
                type="button"
                onClick={onChangePassword}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-4 font-bold"
              >
                Cambiar clave
              </button>
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/20 px-4 font-bold"
              >
                <Plus size={18} /> Agregar Producto
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className={`grid gap-4 ${isAtain ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
          <StatCard theme={theme} icon={Package} value={stats.total} label={isAtain ? "Activos" : "Productos"} />
          {!isAtain && (
            <StatCard theme={theme} icon={DollarSign} value={money.format(stats.value)} label="Valor total" />
          )}
          {isAtain && (
            <StatCard theme={theme} icon={ClipboardCheck} value={stats.assigned ?? 0} label="Asignados" />
          )}
          <StatCard theme={theme} icon={TriangleAlert} value={stats.low} label="Stock bajo" warning />
          <StatCard theme={theme} icon={TrendingUp} value={stats.empty} label="Agotados" danger />
        </section>

        <section className="my-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className={`flex h-11 w-full max-w-xl items-center gap-3 rounded-lg border px-3 ${theme.input}`}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              className="w-full bg-transparent outline-none"
              placeholder="Buscar producto, categoria, codigo, campana o comentario..."
            />
          </label>
          <div className="flex gap-2 overflow-x-auto">
            {filterOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onFilter(value)}
                className={`h-11 rounded-lg border px-4 text-sm font-extrabold ${filter === value ? theme.accent : `${theme.panelSoft} ${theme.text}`}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className={`overflow-hidden rounded-lg border ${theme.panel}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] table-fixed border-collapse">
              <thead className={theme.tableHead}>
                <tr className="text-left text-xs font-extrabold uppercase tracking-wide">
                  <th className="w-[22%] px-4 py-4">Producto</th>
                  <th className="w-[11%] px-4 py-4">Categoria</th>
                  <th className="w-[10%] px-4 py-4">{isAtain ? "Spot" : "Precio"}</th>
                  {isAtain && <th className="w-[14%] px-4 py-4">Campana</th>}
                  <th className="w-[12%] px-4 py-4">Existencias</th>
                  <th className="w-[11%] px-4 py-4">Estado</th>
                  <th className="w-[16%] px-4 py-4">Comentarios</th>
                  <th className="w-[10%] px-4 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <ProductRow
                    key={product.code}
                    product={product}
                    theme={theme}
                    isAtain={isAtain}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {products.length === 0 && (
            <p className={`py-10 text-center font-semibold ${theme.muted}`}>
              No hay productos que coincidan con la busqueda.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
