export default function Pill({ children, className }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full px-3 text-xs font-extrabold ${className}`}
    >
      {children}
    </span>
  );
}
