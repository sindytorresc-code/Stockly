import { Search } from "lucide-react";

export default function InventoryFilters({
  theme,
  query,
  onQuery,
  filter,
  onFilter,
  filterOptions,
  categories,
  categoryFilter,
  onCategoryFilter,
}) {
  return (
    <section className={`my-7 grid min-w-0 gap-4 rounded-2xl border p-4 shadow-sm sm:gap-5 sm:p-5 ${theme.panel}`}>
      <label className={`flex h-11 w-full min-w-0 items-center gap-3 rounded-xl border px-3 ${theme.input}`}>
        <Search size={18} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          className="w-full min-w-0 bg-transparent outline-none"
          placeholder="Buscar producto, categoría, código o comentario..."
          aria-label="Buscar inventario"
        />
      </label>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,2fr)]">
        <fieldset className="min-w-0">
          <legend className={`mb-2 text-xs font-extrabold uppercase tracking-wide ${theme.muted}`}>Existencias</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4">
            {filterOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onFilter(value)}
                aria-pressed={filter === value}
                className={`flex min-h-11 min-w-0 items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold transition hover:border-[color:var(--brand-accent)] ${filter === value ? theme.accent : `${theme.panelSoft} ${theme.text}`}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {categories.length > 0 && (
          <fieldset className="min-w-0">
            <legend className={`mb-2 text-xs font-extrabold uppercase tracking-wide ${theme.muted}`}>Categorías</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4" aria-label="Filtrar por categoría">
              <button
                type="button"
                onClick={() => onCategoryFilter("all")}
                aria-pressed={categoryFilter === "all"}
                className={`flex min-h-11 min-w-0 items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold transition hover:border-[color:var(--brand-accent)] ${categoryFilter === "all" ? theme.accent : `${theme.panelSoft} ${theme.text}`}`}
              >
                Todas
              </button>
              {categories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => onCategoryFilter(categoryFilter === category.key ? "all" : category.key)}
                  aria-pressed={categoryFilter === category.key}
                  title={`${category.label} · ${category.count}`}
                  className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border px-3 py-2 text-center text-sm font-semibold transition hover:border-[color:var(--brand-accent)] ${categoryFilter === category.key ? theme.accent : `${theme.panelSoft} ${theme.text}`}`}
                >
                  <span className="truncate">{category.label}</span>
                  <span className="shrink-0 opacity-75">· {category.count}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </section>
  );
}
