export default function ModalField({ theme, label, className = "", ...props }) {
  const borderClass = theme?.formBorder || "border-pink-300 focus:border-pink-500 focus:ring-pink-200";

  return (
    <label className={`grid min-w-0 gap-2 ${className}`}>
      <span className={`text-sm font-bold ${theme?.muted || "text-neutral-600"}`}>{label}</span>
      <input
        {...props}
        className={`h-[43px] w-full min-w-0 rounded-lg border px-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${theme?.input || "bg-white text-neutral-900"} ${borderClass}`}
      />
    </label>
  );
}
