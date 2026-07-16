import { useEscapeKey } from "../../hooks/useEscapeKey.js";

export default function ConfirmDialog({ title, message, confirmLabel = "Confirmar", onConfirm, onCancel }) {
  useEscapeKey(onCancel);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-[1px]"
      onClick={onCancel}
    >
      <section
        className="w-full max-w-sm rounded-lg bg-white p-6 text-neutral-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h2 id="confirm-title" className="text-lg font-extrabold">
          {title}
        </h2>
        <p id="confirm-message" className="mt-3 text-sm font-semibold text-neutral-600">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-neutral-300 bg-white px-5 text-sm font-extrabold text-neutral-600 hover:bg-neutral-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-lg bg-red-600 px-5 text-sm font-extrabold text-white hover:bg-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
