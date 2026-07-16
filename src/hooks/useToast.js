import { useCallback, useRef, useState } from "react";

export function useToast(duration = 2200) {
  const [toast, setToast] = useState("");
  const timerRef = useRef(null);

  const showToast = useCallback(
    (message) => {
      setToast(message);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setToast(""), duration);
    },
    [duration],
  );

  const clearToast = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast("");
  }, []);

  return { toast, showToast, clearToast };
}
