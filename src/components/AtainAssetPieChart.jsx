import { ATAIN_BODEGA } from "../data/businesses.js";
import { ATAIN_ASSET_CHART, computeAtainAssetBreakdown, countAtainBodegaAssets } from "../lib/atainStats.js";
import { donutSlicePath } from "../lib/donutChart.js";

export default function AtainAssetPieChart({
  products,
  scopeProducts,
  activeFilter,
  campaignFilter,
  theme,
  onFilter,
  onCampaignFilter,
}) {
  const segments = computeAtainAssetBreakdown(products).filter((segment) => segment.count > 0);
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const scopeTotal = scopeProducts.length;
  const bodegaCount = countAtainBodegaAssets(scopeProducts);
  const viewingBodega = campaignFilter === ATAIN_BODEGA;
  const activeSegment = segments.find((segment) => segment.key === activeFilter);
  const centerValue = activeFilter === "all" ? total : activeSegment?.count ?? 0;
  const centerLabel =
    viewingBodega && activeFilter === "all"
      ? ATAIN_BODEGA
      : activeFilter === "all"
        ? "Activos"
        : ATAIN_ASSET_CHART.find((item) => item.key === activeFilter)?.label ?? "Activos";

  let cursor = 0;
  const slices = segments.map((segment) => {
    const sweep = total ? (segment.count / total) * 360 : 0;
    const startAngle = cursor;
    const endAngle = cursor + sweep;
    cursor = endAngle;
    const isActive = activeFilter === "all" || activeFilter === segment.key;

    return {
      ...segment,
      path: donutSlicePath(120, 120, 96, 58, startAngle, endAngle),
      isActive,
    };
  });

  return (
    <section className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${theme.panel}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Inventario tecnológico</h2>
          <p className={`mt-1 text-sm ${theme.muted}`}>Distribución de activos por tipo y estado de bodega.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${theme.softAccent}`}>{scopeTotal} activos</span>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onCampaignFilter("all")}
          className={`h-11 rounded-lg border px-4 text-sm font-extrabold transition ${
            !viewingBodega ? theme.accent : `${theme.panelSoft} ${theme.text} hover:opacity-90`
          }`}
        >
          Todos los activos ({scopeTotal})
        </button>
        <button
          type="button"
          onClick={() => onCampaignFilter(ATAIN_BODEGA)}
          className={`h-11 rounded-lg border px-4 text-sm font-extrabold transition ${
            viewingBodega ? theme.accent : `${theme.panelSoft} ${theme.text} hover:opacity-90`
          }`}
        >
          Bodega ({bodegaCount})
        </button>
      </div>

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative shrink-0">
          <svg viewBox="0 0 240 240" className="size-56" role="img" aria-label="Distribucion de activos por tipo">
            <circle cx="120" cy="120" r="96" className="fill-slate-800/80" />
            {slices.length ? (
              slices.map((slice) => (
                <path
                  key={slice.key}
                  d={slice.path}
                  fill={slice.color}
                  stroke={activeFilter === slice.key ? "#ffffff" : "transparent"}
                  strokeWidth={activeFilter === slice.key ? 3 : 0}
                  opacity={slice.isActive ? 1 : 0.35}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                  onClick={() => onFilter(slice.key)}
                />
              ))
            ) : (
              <circle cx="120" cy="120" r="96" fill="none" stroke="#334155" strokeWidth="20" />
            )}
            <circle cx="120" cy="120" r="52" className="fill-slate-900" />
            <text x="120" y="112" textAnchor="middle" className="fill-white text-[28px] font-extrabold">
              {centerValue}
            </text>
            <text x="120" y="136" textAnchor="middle" className={`fill-slate-400 text-[12px] font-bold ${theme.muted}`}>
              {centerLabel}
            </text>
          </svg>
        </div>

        <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
          {computeAtainAssetBreakdown(products).map((segment) => {
            const isSelected = activeFilter === segment.key;
            return (
              <button
                key={segment.key}
                type="button"
                onClick={() => onFilter(segment.key)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                  isSelected ? theme.accent : `${theme.panelSoft} ${theme.text} hover:opacity-90`
                }`}
              >
                <span className="flex items-center gap-3 font-extrabold">
                  <span className="size-3 rounded-full" style={{ backgroundColor: segment.color }} />
                  {segment.label}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-extrabold leading-tight">{segment.count}</span>
                  <span className={`text-[11px] font-semibold ${theme.muted}`}>{total ? Math.round((segment.count / total) * 100) : 0}%</span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onFilter("all")}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition sm:col-span-2 ${
              activeFilter === "all" ? theme.accent : `${theme.panelSoft} ${theme.text} hover:opacity-90`
            }`}
          >
            <span className="font-extrabold">{viewingBodega ? "Todos en bodega" : "Todos los tipos"}</span>
            <span className="text-lg font-extrabold">{total}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
