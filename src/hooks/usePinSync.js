import { useCallback, useEffect, useMemo, useState } from "react";
import { businesses } from "../data/businesses.js";
import { loadPins, savePins } from "./storage.js";
import {
  fetchSupabasePins,
  hasSupabaseConfig,
  syncSupabasePins,
  updateSupabasePin,
} from "./supabase.js";

export function usePinSync(showToast) {
  const defaultPinsByBusiness = useMemo(
    () => Object.fromEntries(businesses.map((business) => [business.id, business.pin])),
    [],
  );

  const [pinsByBusiness, setPinsByBusiness] = useState(() =>
    hasSupabaseConfig ? defaultPinsByBusiness : loadPins(),
  );
  const [pinsReady, setPinsReady] = useState(!hasSupabaseConfig);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setPinsByBusiness(loadPins());
      setPinsReady(true);
      return;
    }

    let cancelled = false;

    syncSupabasePins(defaultPinsByBusiness)
      .then((merged) => {
        if (cancelled) return;
        setPinsByBusiness(merged);
        savePins(merged);
        setPinsReady(true);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          showToast("No pude cargar las claves desde Supabase");
          setPinsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [defaultPinsByBusiness, showToast]);

  const savePin = useCallback(async (businessId, newPin) => {
    if (hasSupabaseConfig) {
      await updateSupabasePin(businessId, newPin);
    }

    setPinsByBusiness((current) => {
      const next = { ...current, [businessId]: newPin };
      savePins(next);
      return next;
    });
  }, []);

  const refreshPinForBusiness = useCallback(
    async (businessId) => {
      if (!hasSupabaseConfig) return pinsByBusiness[businessId] || defaultPinsByBusiness[businessId];

      const remote = await fetchSupabasePins();
      const pin = remote[businessId] || defaultPinsByBusiness[businessId];

      setPinsByBusiness((current) => {
        const next = { ...current, [businessId]: pin };
        savePins(next);
        return next;
      });

      return pin;
    },
    [defaultPinsByBusiness, pinsByBusiness],
  );

  return {
    pinsByBusiness,
    pinsReady,
    savePin,
    refreshPinForBusiness,
  };
}
