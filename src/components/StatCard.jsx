export default function StatCard({ theme, icon: Icon, value, label, warning, danger, emphasis = false }) {
  const iconClass = emphasis
    ? theme.softAccent
    : danger
      ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
      : warning
        ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
        : theme.softAccent;

  return (
    <article className={`relative flex min-h-28 min-w-0 items-center gap-4 overflow-hidden rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${theme.panel}`}>
      {emphasis && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-[var(--brand-accent,#475569)]" />}
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${iconClass}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-2xl font-bold tracking-tight sm:text-3xl">{value}</strong>
        <span className={`mt-1 block text-xs font-medium ${theme.muted}`}>{label}</span>
      </span>
    </article>
  );
}
