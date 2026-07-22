import {
  ArrowLeft,
  Database,
  DollarSign,
  Package,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  TrendingUp,
  Upload,
} from "lucide-react";
import { ATAIN_ASSET_FILTERS, ATAIN_BODEGA, atainCampaigns } from "../data/businesses.js";
import { iconMap } from "../lib/icons.js";
import { money } from "../lib/money.js";
import AtainAssetPieChart from "./AtainAssetPieChart.jsx";
import ProductRow from "./ProductRow.jsx";
import StatCard from "./StatCard.jsx";

function AtainSelectFilter({ label, value, options, theme, onChange }) {
  return (
    <label className={`flex h-11 min-w-[200px] items-center gap-2 rounded-lg border px-3 text-sm font-bold ${theme.input}`}>
      <span className={`shrink-0 ${theme.muted}`}>{label}:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent py-0 pl-0 pr-6 text-sm font-extrabold outline-none [color-scheme:dark] ${theme.text}`}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="bg-slate-950 text-white">
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function InventoryDashboard({
  business,
  theme,
  stats,
  query,
  filter,
  campaignFilter,
  atainChartProducts = [],
  atainScopeProducts = [],
  products,
  isLoadingProducts,
  dataSource,
  onBack,
  onQuery,
  onFilter,
  onCampaignFilter,
  onAdd,
  onEdit,
  onDelete,
  onImport,
  onChangePassword,
  onClearAll,
}) {
  const Icon = iconMap[business.icon];
  const sourceText = `${dataSource}${isLoadingProducts ? " sincronizando..." : ""}`;
  const isAtain = business.id === "atain";
  const filterOptions = isAtain
    ? ATAIN_ASSET_FILTERS
    : [
        ["all", "Todos"],
        ["stock", "En stock"],
        ["low", "Stock bajo"],
        ["empty", "Agotados"],
      ];
  const activeFilterLabel =
    campaignFilter === ATAIN_BODEGA && filter === "all"
      ? ATAIN_BODEGA
      : filterOptions.find(([value]) => value === filter)?.[1] ?? "Activos";

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
                <Plus size={18} /> Agregar activo
              </button>
              {isAtain && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300/40 bg-red-500/20 px-4 font-bold text-white hover:bg-red-500/30"
                >
                  <Trash2 size={18} /> Borrar todo
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {isAtain ? (
          <div className="mb-8">
            <AtainAssetPieChart
              products={atainChartProducts}
              scopeProducts={atainScopeProducts}
              activeFilter={filter}
              campaignFilter={campaignFilter}
              theme={theme}
              onFilter={onFilter}
              onCampaignFilter={onCampaignFilter}
            />
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard theme={theme} icon={Package} value={stats.total} label="Productos" />
            <StatCard theme={theme} icon={DollarSign} value={money.format(stats.value)} label="Valor total" />
            <StatCard theme={theme} icon={TriangleAlert} value={stats.low} label="Stock bajo" warning />
            <StatCard theme={theme} icon={TrendingUp} value={stats.empty} label="Agotados" danger />
          </section>
        )}

        <section className="my-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className={`flex h-11 w-full max-w-xl items-center gap-3 rounded-lg border px-3 ${theme.input}`}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              className="w-full bg-transparent outline-none"
              placeholder={
                isAtain
                  ? "Buscar por spot, serial, campana, bodega, tipo o hostname..."
                  : "Buscar producto, categoria, codigo, campana o comentario..."
              }
            />
          </label>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filterOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onFilter(value)}
                  className={`h-11 shrink-0 rounded-lg border px-4 text-sm font-extrabold ${filter === value ? theme.accent : `${theme.panelSoft} ${theme.text}`}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {isAtain && (
              <AtainSelectFilter
                label="Campana"
                value={campaignFilter}
                theme={theme}
                onChange={onCampaignFilter}
                options={[
                  ["all", "Todas"],
                  [ATAIN_BODEGA, ATAIN_BODEGA],
                  ...atainCampaigns.map((campaign) => [campaign, campaign]),
                ]}
              />
            )}
          </div>
        </section>

        <section className={`overflow-hidden rounded-lg border ${theme.panel}`}>
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse ${isAtain ? "min-w-[980px]" : "min-w-[1120px]"} table-fixed`}>
              <thead className={theme.tableHead}>
                <tr className="text-left text-xs font-extrabold uppercase tracking-wide">
                  {isAtain ? (
                    <>
                      <th className="w-[10%] px-4 py-4">Spot</th>
                      <th className="w-[11%] px-4 py-4">Tipo</th>
                      <th className="w-[20%] px-4 py-4">Activo</th>
                      <th className="w-[15%] px-4 py-4">Serial</th>
                      <th className="w-[14%] px-4 py-4">Campana</th>
                      <th className="w-[11%] px-4 py-4">Estado</th>
                      <th className="w-[17%] px-4 py-4">Detalle</th>
                    </>
                  ) : (
                    <>
                      <th className="w-[22%] px-4 py-4">Producto</th>
                      <th className="w-[11%] px-4 py-4">Categoria</th>
                      <th className="w-[10%] px-4 py-4">Precio</th>
                      <th className="w-[12%] px-4 py-4">Existencias</th>
                      <th className="w-[11%] px-4 py-4">Estado</th>
                      <th className="w-[16%] px-4 py-4">Comentarios</th>
                    </>
                  )}
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
              {isAtain && products.length > 0 && (
                <tfoot className={`border-t ${theme.tableHead}`}>
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-right text-sm font-extrabold uppercase tracking-wide">
                      Total {activeFilterLabel}: {products.length}
                    </td>
                    <td className="px-4 py-4" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {products.length === 0 && (
            <p className={`py-10 text-center font-semibold ${theme.muted}`}>
              {isAtain
                ? "No hay activos que coincidan con la busqueda o el filtro."
                : "No hay productos que coincidan con la busqueda."}
            </p>
          )}
        </section>
      </main>
    </>
  );
}
