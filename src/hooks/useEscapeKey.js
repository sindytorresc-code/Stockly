import { useEffect } from "react";

export function useEscapeKey(onEscape, enabled = true) {
  useEffect(() => {
    if (!enabled || !onEscape) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscape();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEscape, enabled]);
}
