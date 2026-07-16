import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { businesses } from "../data/businesses.js";
import { loadPins, savePins } from "../lib/storage.js";
import { fetchSupabasePin, initSupabase, updateSupabasePin } from "../lib/supabase.js";

export function usePinSync(showToast) {
  const defaultPinsByBusiness = useMemo(
    () => Object.fromEntries(businesses.map((business) => [business.id, business.pin])),
    [],
  );

  const activePinRef = useRef(null);
  const remotePinsRef = useRef(false);
  const [remotePinsEnabled, setRemotePinsEnabled] = useState(false);
  const [pinsByBusiness, setPinsByBusiness] = useState(loadPins);
  const [pinsReady, setPinsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    initSupabase()
      .then((config) => {
        if (cancelled) return;
        const enabled = Boolean(config);
        remotePinsRef.current = enabled;
        setRemotePinsEnabled(enabled);
        if (!enabled) {
          setPinsByBusiness(loadPins());
        }
        setPinsReady(true);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          showToast("No pude conectar con Supabase para las claves");
          setPinsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const loadActivePin = useCallback(
    async (businessId) => {
      const config = await initSupabase();
      if (config) {
        remotePinsRef.current = true;
        setRemotePinsEnabled(true);

        const remotePin = await fetchSupabasePin(businessId);
        const pin = remotePin ?? defaultPinsByBusiness[businessId];
        activePinRef.current = pin;
        return pin;
      }

      remotePinsRef.current = false;
      setRemotePinsEnabled(false);
      const pin = pinsByBusiness[businessId] || defaultPinsByBusiness[businessId];
      activePinRef.current = pin;
      return pin;
    },
    [defaultPinsByBusiness, pinsByBusiness],
  );

  const savePin = useCallback(async (businessId, newPin) => {
    const config = await initSupabase();
    if (config) {
      remotePinsRef.current = true;
      setRemotePinsEnabled(true);
      const saved = await updateSupabasePin(businessId, newPin);
      activePinRef.current = saved;
      return saved;
    }

    remotePinsRef.current = false;
    setRemotePinsEnabled(false);
    setPinsByBusiness((current) => {
      const next = { ...current, [businessId]: newPin };
      savePins(next);
      return next;
    });
    activePinRef.current = newPin;
    return newPin;
  }, []);

  const verifyActivePin = useCallback((attempt) => attempt === activePinRef.current, []);

  return {
    pinsByBusiness,
    pinsReady,
    loadActivePin,
    savePin,
    verifyActivePin,
    hasRemotePins: remotePinsEnabled,
  };
}
