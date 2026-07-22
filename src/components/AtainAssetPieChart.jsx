import { ATAIN_BODEGA } from "../data/businesses.js";
import { ATAIN_ASSET_CHART, computeAtainAssetBreakdown, countAtainBodegaAssets } from "../lib/atainStats.js";

function polarToCartesian(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function donutSlicePath(cx, cy, outerR, innerR, startAngle, endAngle) {
  const sweep = Math.min(endAngle - startAngle, 359.999);
  const end = startAngle + sweep;
  const startOuter = polarToCartesian(cx, cy, outerR, end);
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner = polarToCartesian(cx, cy, innerR, end);
  const largeArc = sweep <= 180 ? 0 : 1;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

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
    <section className={`rounded-lg border p-6 ${theme.panel}`}>
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
                <span className="text-lg font-extrabold">{segment.count}</span>
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
