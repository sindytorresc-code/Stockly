import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  DollarSign,
  FileDown,
  Menu,
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
import { computeCategoryBreakdown } from "../lib/products.js";
import AtainAssetPieChart from "./AtainAssetPieChart.jsx";
import CategoryInventoryChart from "./CategoryInventoryChart.jsx";
import FeaturedProducts from "./FeaturedProducts.jsx";
import InventoryFilters from "./InventoryFilters.jsx";
import { InventorySidebar } from "./InventorySidebar.jsx";
import ProductRow from "./ProductRow.jsx";
import StatCard from "./StatCard.jsx";

function AtainSelectFilter({ label, value, options, theme, onChange }) {
  return (
    <label className={`flex h-11 min-w-[200px] items-center gap-2 rounded-xl border px-3 text-sm font-bold ${theme.input}`}>
      <span className={`shrink-0 ${theme.muted}`}>{label}:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent py-0 pl-0 pr-6 text-sm font-extrabold outline-none [color-scheme:dark] ${theme.text}`}
      >
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue} className="bg-slate-950 text-white">{optionLabel}</option>)}
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
  categoryFilter = "all",
  categoryOverviewProducts = [],
  atainChartProducts = [],
  atainScopeProducts = [],
  products,
  isLoadingProducts,
  dataSource,
  onBack,
  onQuery,
  onFilter,
  onCampaignFilter,
  onCategoryFilter,
  onAdd,
  onEdit,
  onDelete,
  onImport,
  onChangePassword,
  onClearAll,
  onExport,
  movements = [],
  showHistory = false,
  onToggleHistory,
  onManageAccess,
  onManageBranding,
  onSignOut,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const Icon = iconMap[business.icon] || iconMap.package;
  const sourceText = `${dataSource}${isLoadingProducts ? " sincronizando…" : ""}`;
  const isAtain = business.id === "atain";
  const headerSurface = theme.mode === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const actionSurface = theme.mode === "dark" ? theme.panelSoft : theme.panel;
  const filterOptions = isAtain
    ? ATAIN_ASSET_FILTERS
    : [["all", "Todos"], ["stock", "En stock"], ["low", "Stock bajo"], ["empty", "Agotados"]];
  const activeFilterLabel = campaignFilter === ATAIN_BODEGA && filter === "all"
    ? ATAIN_BODEGA
    : filterOptions.find(([value]) => value === filter)?.[1] ?? "Activos";
  const categories = !isAtain ? computeCategoryBreakdown(categoryOverviewProducts) : [];

  useEffect(() => {
    if (activeSection === "history" && showHistory) {
      document.getElementById("movement-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSection, showHistory]);

  function navigateToSection(section) {
    setActiveSection(section);
    if (section === "history") {
      if (!showHistory) onToggleHistory();
      return;
    }
    const ids = { overview: "dashboard-overview", products: "inventory-table", categories: "inventory-chart" };
    document.getElementById(ids[section])?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleHistory() {
    const opening = !showHistory;
    setActiveSection(opening ? "history" : "overview");
    onToggleHistory();
  }

  const sidebarProps = {
    business,
    theme,
    activeSection,
    onNavigate: navigateToSection,
    onBack,
    onManageAccess,
    onManageBranding,
    onChangePassword,
    onSignOut,
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <InventorySidebar {...sidebarProps} />
      <InventorySidebar {...sidebarProps} mobile open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="min-w-0">
        <header className={`relative border-b px-4 py-4 shadow-sm sm:px-6 ${headerSurface} ${theme.text}`}>
          <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${theme.accent}`} />
          <div className="mx-auto max-w-[1600px]">
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
              <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menú" aria-expanded={mobileNavOpen} className={`grid size-10 place-items-center rounded-xl border lg:hidden ${actionSurface}`}>
                <Menu size={19} aria-hidden="true" />
              </button>
              <div className="flex min-w-0 items-center gap-3">
                <span className={`hidden size-11 shrink-0 place-items-center overflow-hidden rounded-xl border sm:grid ${theme.panelSoft} ${theme.softAccent}`}>
                  {business.brandConfig?.logoDataUrl ? <img src={business.brandConfig.logoDataUrl} alt={`${business.name} logo`} className="size-full object-contain p-1" /> : <Icon size={22} />}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.muted}`}>{business.type}</span>
                  <span className="block truncate text-lg font-bold tracking-tight sm:text-xl">{business.name}</span>
                </span>
              </div>
              <label className={`col-span-2 flex h-11 min-w-0 items-center gap-3 rounded-xl border px-3 lg:col-span-1 ${theme.input}`}>
                <Search size={18} aria-hidden="true" className={theme.muted} />
                <input
                  value={query}
                  onChange={(event) => onQuery(event.target.value)}
                  aria-label="Buscar en el inventario"
                  placeholder={isAtain ? "Buscar spot, serial, campaña o activo…" : "Buscar producto, categoría, código o comentario…"}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-70"
                />
              </label>
              <span className={`col-span-2 inline-flex min-h-9 items-center gap-2 justify-self-start rounded-full border px-3 text-xs font-semibold lg:col-span-1 lg:row-start-1 ${theme.panelSoft} ${theme.muted}`}>
                <Activity size={14} aria-hidden="true" className="text-[var(--brand-accent,#64748b)]" />
                {sourceText}
              </span>
            </div>

            <div role="group" aria-label="Acciones del inventario" className={`mt-4 flex flex-wrap items-center gap-2 border-t pt-4 ${theme.row}`}>
              <button type="button" onClick={onAdd} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition hover:opacity-90 ${theme.accent}`}>
                <Plus size={18} aria-hidden="true" /> {isAtain ? "Agregar activo" : "Agregar producto"}
              </button>
              <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition hover:opacity-80 ${actionSurface} ${theme.text}`}>
                <Upload size={18} aria-hidden="true" /> Cargar archivo
                <input type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" className="hidden" onChange={onImport} />
              </label>
              {onExport && <button type="button" onClick={onExport} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition hover:opacity-80 ${actionSurface} ${theme.text}`}><FileDown size={18} aria-hidden="true" /> Exportar Excel</button>}
              <button type="button" onClick={toggleHistory} aria-expanded={showHistory} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition hover:opacity-80 ${actionSurface} ${theme.text}`}>Historial</button>
              {onManageAccess && <button type="button" onClick={onManageAccess} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition hover:opacity-80 ${actionSurface} ${theme.text}`}>Usuarios y roles</button>}
              {onManageBranding && <button type="button" onClick={onManageBranding} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition hover:opacity-80 ${actionSurface} ${theme.text}`}>Personalizar marca</button>}
              {onChangePassword && <button type="button" onClick={onChangePassword} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition hover:opacity-80 ${actionSurface} ${theme.text}`}>Cambiar clave</button>}
              {isAtain && <button type="button" onClick={onClearAll} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-300/60 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"><Trash2 size={18} aria-hidden="true" /> Borrar todo</button>}
            </div>
          </div>
        </header>

        <main className="mx-auto min-w-0 max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
          <section id="dashboard-overview" aria-label="Indicadores del inventario" className="mb-5 grid scroll-mt-6 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard theme={theme} icon={Package} value={stats.total} label={isAtain ? "Total general · activos" : "Total general · productos"} emphasis />
            <StatCard theme={theme} icon={DollarSign} value={money.format(stats.value)} label="Valor del inventario" />
            <StatCard theme={theme} icon={TriangleAlert} value={stats.low} label="Stock bajo" warning />
            <StatCard theme={theme} icon={TrendingUp} value={stats.empty} label="Agotados" danger />
          </section>

          <section aria-label="Análisis del inventario" className="mb-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.9fr)] 2xl:gap-5">
            <div id="inventory-chart" className="min-w-0 scroll-mt-6">
              {isAtain ? (
                <AtainAssetPieChart products={atainChartProducts} scopeProducts={atainScopeProducts} activeFilter={filter} campaignFilter={campaignFilter} theme={theme} onFilter={onFilter} onCampaignFilter={onCampaignFilter} />
              ) : (
                <CategoryInventoryChart products={categoryOverviewProducts} theme={theme} categoryFilter={categoryFilter} onCategoryFilter={onCategoryFilter} />
              )}
            </div>
            <FeaturedProducts products={categoryOverviewProducts} theme={theme} isAtain={isAtain} onViewAll={() => navigateToSection("products")} />
          </section>

          {isAtain ? (
            <section id="inventory-filters" aria-label="Buscar y filtrar activos" className={`my-5 grid min-w-0 gap-4 rounded-2xl border p-4 shadow-sm sm:p-5 ${theme.panel}`}>
              <label className={`flex h-11 w-full min-w-0 items-center gap-3 rounded-xl border px-3 ${theme.input}`}>
                <Search size={18} aria-hidden="true" className={theme.muted} />
                <input value={query} onChange={(event) => onQuery(event.target.value)} aria-label="Buscar activos" className="w-full min-w-0 bg-transparent text-sm outline-none" placeholder="Buscar por spot, serial, campaña, bodega, tipo o hostname…" />
              </label>
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <fieldset className="min-w-0">
                  <legend className={`mb-2 text-xs font-bold uppercase tracking-wide ${theme.muted}`}>Tipo de activo</legend>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {filterOptions.map(([value, label]) => <button key={value} type="button" onClick={() => onFilter(value)} aria-pressed={filter === value} className={`min-h-10 shrink-0 rounded-xl border px-4 text-sm font-semibold ${filter === value ? theme.accent : `${theme.panelSoft} ${theme.text}`}`}>{label}</button>)}
                  </div>
                </fieldset>
                <AtainSelectFilter label="Campaña / bodega" value={campaignFilter} theme={theme} onChange={onCampaignFilter} options={[["all", "Todas"], [ATAIN_BODEGA, ATAIN_BODEGA], ...atainCampaigns.map((campaign) => [campaign, campaign])]} />
              </div>
            </section>
          ) : (
            <div id="inventory-filters" className="scroll-mt-6">
              <InventoryFilters theme={theme} query={query} onQuery={onQuery} filter={filter} onFilter={onFilter} filterOptions={filterOptions} categories={categories} categoryFilter={categoryFilter} onCategoryFilter={onCategoryFilter} />
            </div>
          )}

          <section id="inventory-table" aria-label={isAtain ? "Tabla de activos" : "Tabla de productos"} className={`scroll-mt-6 overflow-hidden rounded-2xl border shadow-sm ${theme.panel}`}>
            <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 ${theme.tableHead}`}>
              <div>
                <h2 className="font-extrabold">{isAtain ? "Activos registrados" : "Productos registrados"}</h2>
                <p className={`mt-0.5 text-xs ${theme.muted}`}>{products.length} {isAtain ? "activos" : "productos"} con los filtros actuales</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.softAccent}`}>{activeFilterLabel}</span>
            </div>
            <div className="overflow-x-auto">
              <table className={`w-full border-collapse ${isAtain ? "min-w-[980px]" : "min-w-[1000px]"} table-fixed`}>
                <thead className={theme.tableHead}>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[0.12em]">
                    {isAtain ? <>
                      <th className="w-[10%] px-4 py-4">Spot</th><th className="w-[11%] px-4 py-4">Tipo</th><th className="w-[20%] px-4 py-4">Activo</th><th className="w-[15%] px-4 py-4">Serial</th><th className="w-[14%] px-4 py-4">Campaña</th><th className="w-[11%] px-4 py-4">Estado</th><th className="w-[17%] px-4 py-4">Detalle</th>
                    </> : <>
                      <th className="w-[22%] px-4 py-4">Producto</th><th className="w-[11%] px-4 py-4">Categoría</th><th className="w-[10%] px-4 py-4">Precio</th><th className="w-[12%] px-4 py-4">Existencias</th><th className="w-[21%] px-4 py-4">Comentarios</th>
                    </>}
                    <th className="w-[10%] px-4 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => <ProductRow key={product.dbId || product.code} product={product} theme={theme} isAtain={isAtain} onEdit={onEdit} onDelete={onDelete} />)}
                </tbody>
                {isAtain && products.length > 0 && <tfoot className={`border-t ${theme.tableHead}`}><tr><td colSpan={7} className="px-4 py-4 text-right text-sm font-extrabold uppercase tracking-wide">Total {activeFilterLabel}: {products.length}</td><td className="px-4 py-4" /></tr></tfoot>}
              </table>
            </div>
            {products.length === 0 && <p className={`px-4 py-10 text-center text-sm font-semibold ${theme.muted}`}>{isAtain ? "No hay activos que coincidan con la búsqueda o el filtro." : "No hay productos que coincidan con la búsqueda o el filtro."}</p>}
          </section>

          {showHistory && <section id="movement-history" aria-label="Movimientos recientes" className={`mt-5 scroll-mt-6 overflow-hidden rounded-2xl border shadow-sm ${theme.panel}`}>
            <h2 className={`px-4 py-3 font-extrabold ${theme.tableHead}`}>Movimientos recientes de {business.name}</h2>
            {movements.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className={theme.tableHead}><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Operación</th><th className="p-3 text-left">Elemento</th><th className="p-3 text-left">Código</th><th className="p-3 text-right">Cantidad</th></tr></thead><tbody>{movements.map((movement, index) => <tr key={`${movement.created_at}-${index}`} className={`border-t ${theme.row}`}><td className="p-3">{new Date(movement.created_at).toLocaleString()}</td><td className="p-3">{movement.movement_type}</td><td className="p-3">{movement.product_name}</td><td className="p-3">{movement.product_code}</td><td className="p-3 text-right">{movement.quantity}</td></tr>)}</tbody></table></div> : <p className={`p-5 ${theme.muted}`}>No hay movimientos registrados todavía.</p>}
          </section>}
        </main>
      </div>
    </div>
  );
}
