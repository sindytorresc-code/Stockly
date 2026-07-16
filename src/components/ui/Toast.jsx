export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-white px-4 py-3 font-extrabold text-slate-950 shadow-soft">
      {message}
    </div>
  );
}
