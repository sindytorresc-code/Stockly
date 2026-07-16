export default function StatCard({ theme, icon: Icon, value, label, warning, danger }) {
  const iconClass = danger
    ? "bg-red-500/15 text-red-500"
    : warning
      ? "bg-amber-500/15 text-amber-500"
      : theme.softAccent;

  return (
    <article className={`flex min-h-24 items-center gap-4 rounded-lg border p-5 ${theme.panel}`}>
      <span className={`grid size-10 place-items-center rounded-lg ${iconClass}`}>
        <Icon size={20} />
      </span>
      <span>
        <strong className="block text-2xl font-extrabold">{value}</strong>
        <span className={`block text-xs ${theme.muted}`}>{label}</span>
      </span>
    </article>
  );
}
