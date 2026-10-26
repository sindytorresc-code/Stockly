import { useEffect, useMemo, useRef, useState } from "react";
import { computeCategoryBreakdown } from "../lib/products.js";
import { donutSlicePath } from "../lib/donutChart.js";

export default function CategoryInventoryChart({ products, theme, categoryFilter, onCategoryFilter }) {
  const accentProbe = useRef(null);
  const surfaceProbe = useRef(null);
  const softProbe = useRef(null);
  const [palette, setPalette] = useState({ accent: "currentColor", surface: "transparent", soft: "transparent" });
  const categories = useMemo(() => computeCategoryBreakdown(products), [products]);
  const total = categories.reduce((sum, category) => sum + category.count, 0);

  useEffect(() => {
    if (!accentProbe.current || !surfaceProbe.current || !softProbe.current) return;
    const accentStyle = getComputedStyle(accentProbe.current);
    const surfaceStyle = getComputedStyle(surfaceProbe.current);
    const softStyle = getComputedStyle(softProbe.current);
    setPalette({
      accent: accentStyle.backgroundColor,
      surface: surfaceStyle.backgroundColor,
      soft: softStyle.backgroundColor,
    });
  }, [theme.accent, theme.panel, theme.softAccent]);

  let cursor = 0;
  const slices = categories.map((category, index) => {
    const start = cursor;
    cursor += total ? (category.count / total) * 360 : 0;
    return {
      ...category,
      path: donutSlicePath(120, 120, 96, 57, start, cursor),
      mix: Math.max(46, 100 - index * (54 / Math.max(categories.length - 1, 1))),
    };
  });

  const chartStyle = {
    "--dashboard-accent": palette.accent,
    "--dashboard-surface": palette.surface,
    "--dashboard-soft": palette.soft,
  };

  return (
    <section className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${theme.panel}`} style={chartStyle}>
      <div className="pointer-events-none absolute -left-[10000px] top-0 flex" aria-hidden="true">
        <span ref={accentProbe} className={`size-4 ${theme.accent}`} />
        <span ref={surfaceProbe} className={`size-4 ${theme.panel}`} />
        <span ref={softProbe} className={`size-4 ${theme.softAccent}`} />
      </div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Inventario por categoría</h2>
          <p className={`mt-1 text-sm ${theme.muted}`}>Distribución de productos según su categoría</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${theme.softAccent}`}>{categories.length} categorías</span>
      </div>

      <div className="grid items-center gap-6 lg:grid-cols-[minmax(13rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="relative mx-auto w-full max-w-[17rem]">
          <svg viewBox="0 0 240 240" className="mx-auto w-full" role="img" aria-label={`Distribución de ${total} productos por categoría`}>
            <circle cx="120" cy="120" r="96" fill="var(--dashboard-soft)" opacity="0.38" />
            {slices.length ? slices.map((slice) => (
              <path
                key={slice.key}
                d={slice.path}
                fill={`color-mix(in srgb, var(--dashboard-accent) ${slice.mix}%, var(--dashboard-surface))`}
                stroke={categoryFilter === slice.key ? "var(--dashboard-surface)" : "transparent"}
                strokeWidth={categoryFilter === slice.key ? 3 : 0}
                className="transition-opacity"
              />
            )) : <circle cx="120" cy="120" r="85" fill="none" stroke="var(--dashboard-accent)" strokeWidth="18" opacity="0.3" />}
            <circle cx="120" cy="120" r="52" fill="var(--dashboard-surface)" />
            <text x="120" y="112" textAnchor="middle" className={`fill-current text-[29px] font-extrabold ${theme.text}`}>{total}</text>
            <text x="120" y="137" textAnchor="middle" className={`fill-current text-[12px] font-bold ${theme.muted}`}>Productos</text>
          </svg>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {categories.length ? categories.map((category, index) => {
            const isSelected = categoryFilter === category.key;
            const mix = Math.max(46, 100 - index * (54 / Math.max(categories.length - 1, 1)));
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => onCategoryFilter(isSelected ? "all" : category.key)}
                aria-pressed={isSelected}
                className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 ${isSelected ? theme.accent : `${theme.panelSoft} ${theme.text}`}`}
              >
                <span className="flex min-w-0 items-center gap-3 font-bold">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: `color-mix(in srgb, var(--dashboard-accent) ${mix}%, var(--dashboard-surface))` }} />
                  <span className="truncate">{category.label}</span>
                </span>
                <span className="text-lg font-extrabold">{category.count}</span>
              </button>
            );
          }) : <p className={`sm:col-span-2 rounded-xl border p-5 text-center text-sm ${theme.panelSoft} ${theme.muted}`}>Aún no hay productos con categoría para mostrar.</p>}
          {categoryFilter !== "all" && (
            <button type="button" onClick={() => onCategoryFilter("all")} className={`min-h-12 rounded-xl border px-4 text-sm font-extrabold sm:col-span-2 ${theme.panelSoft} ${theme.text}`}>
              Mostrar todas las categorías
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
