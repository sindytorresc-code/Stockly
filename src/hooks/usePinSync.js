import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { businesses } from "../data/businesses.js";
import { loadPins, savePins } from "./storage.js";
import {
  fetchSupabasePin,
  fetchSupabasePins,
  hasSupabaseConfig,
  updateSupabasePin,
} from "./supabase.js";

export function usePinSync(showToast) {
  const defaultPinsByBusiness = useMemo(
    () => Object.fromEntries(businesses.map((business) => [business.id, business.pin])),
    [],
  );

  const activePinRef = useRef(null);
  const [pinsByBusiness, setPinsByBusiness] = useState(() =>
    hasSupabaseConfig ? {} : loadPins(),
  );
  const [pinsReady, setPinsReady] = useState(!hasSupabaseConfig);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setPinsByBusiness(loadPins());
      setPinsReady(true);
      return;
    }

    let cancelled = false;

    fetchSupabasePins()
      .then((remote) => {
        if (cancelled) return;
        const merged = { ...defaultPinsByBusiness, ...remote };
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

  const loadActivePin = useCallback(
    async (businessId) => {
      if (!hasSupabaseConfig) {
        const pin = pinsByBusiness[businessId] || defaultPinsByBusiness[businessId];
        activePinRef.current = pin;
        return pin;
      }

      const remotePin = await fetchSupabasePin(businessId);
      const pin = remotePin || defaultPinsByBusiness[businessId];
      activePinRef.current = pin;

      setPinsByBusiness((current) => {
        const next = { ...current, [businessId]: pin };
        savePins(next);
        return next;
      });

      return pin;
    },
    [defaultPinsByBusiness, pinsByBusiness],
  );

  const savePin = useCallback(async (businessId, newPin) => {
    if (hasSupabaseConfig) {
      await updateSupabasePin(businessId, newPin);
      activePinRef.current = newPin;
    }

    setPinsByBusiness((current) => {
      const next = { ...current, [businessId]: newPin };
      savePins(next);
      return next;
    });

    return newPin;
  }, []);

  const verifyActivePin = useCallback((attempt) => {
    return attempt === activePinRef.current;
  }, []);

  return {
    pinsByBusiness,
    pinsReady,
    loadActivePin,
    savePin,
    verifyActivePin,
    hasRemotePins: hasSupabaseConfig,
  };
}
