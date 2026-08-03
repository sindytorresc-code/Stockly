import { useCallback, useEffect, useRef, useState } from "react";
import { defaultProducts } from "../data/businesses.js";
import { loadProducts, saveProducts } from "../lib/storage.js";
import {
  deleteAllSupabaseProducts,
  deleteSupabaseProduct,
  ensureSupabaseClient,
  fetchSupabaseProducts,
  initSupabase,
  isSupabaseConfigured,
  seedSupabaseProductsIfEmpty,
  upsertSupabaseProduct,
  upsertSupabaseProductsInBatches,
  dbProductToApp,
} from "../lib/supabase.js";
import { formatSupabaseError } from "../lib/supabaseErrors.js";
import { mergeProductsByCode } from "../lib/products.js";

async function canUseSupabase() {
  return Boolean(await initSupabase());
}

function sameProduct(a, b) {
  if (!a || !b) return false;
  if (a.dbId && b.dbId) return a.dbId === b.dbId;
  return String(a.code || "").trim() === String(b.code || "").trim();
}

function withoutProduct(list, product) {
  return list.filter((item) => !sameProduct(item, product));
}

export function useInventorySync(showToast) {
  const [productsByBusiness, setProductsByBusiness] = useState(loadProducts);
  const [clientIdsByBusiness, setClientIdsByBusiness] = useState({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [dataSource, setDataSource] = useState("Local");
  const clientIdsRef = useRef(clientIdsByBusiness);

  clientIdsRef.current = clientIdsByBusiness;

  useEffect(() => {
    initSupabase().then((config) => {
      if (config) setDataSource("Supabase");
    });
  }, []);

  const updateBusinessProducts = useCallback((businessId, updater) => {
    setProductsByBusiness((current) => {
      const currentList = current[businessId] || [];
      const nextList = typeof updater === "function" ? updater(currentList) : updater;
      const next = { ...current, [businessId]: nextList };

      // Keep localStorage as fallback cache only when Supabase is unavailable.
      if (!isSupabaseConfigured()) {
        try {
          saveProducts(next);
        } catch (error) {
          console.error(error);
          showToast("No hay espacio local para guardar los datos");
          return current;
        }
      }

      return next;
    });
  }, [showToast]);

  const getClientIdForBusiness = useCallback(async (business) => {
    if (clientIdsRef.current[business.id]) return clientIdsRef.current[business.id];

    const client = await ensureSupabaseClient(business);
    if (!client) throw new Error(`No pude crear el cliente ${business.id} en Supabase`);

    setClientIdsByBusiness((current) => ({ ...current, [business.id]: client.id }));
    return client.id;
  }, []);

  const refreshFromSupabase = useCallback(
    async (business, clientId) => {
      const rows = await fetchSupabaseProducts(clientId);
      const products = rows.map(dbProductToApp);
      updateBusinessProducts(business.id, products);
      // Drop stale local cache so deleted codes cannot resurrect after reload.
      try {
        localStorage.removeItem("inventory-products-react");
      } catch {
        /* ignore */
      }
      return products;
    },
    [updateBusinessProducts],
  );

  const loadInventory = useCallback(
    async (business) => {
      if (!(await canUseSupabase())) {
        setDataSource("Local");
        setProductsByBusiness((current) => ({
          ...current,
          [business.id]: current[business.id] || defaultProducts[business.id] || [],
        }));
        return;
      }

      setIsLoadingProducts(true);
      try {
        const clientId = await getClientIdForBusiness(business);
        await seedSupabaseProductsIfEmpty(clientId, business.products);
        await refreshFromSupabase(business, clientId);
        setDataSource("Supabase");
      } catch (error) {
        console.error(error);
        setDataSource("Error Supabase");
        showToast(formatSupabaseError(error, "No pude cargar datos desde Supabase"));
      } finally {
        setIsLoadingProducts(false);
      }
    },
    [getClientIdForBusiness, refreshFromSupabase, showToast],
  );

  const saveProduct = useCallback(
    async (business, product, editingProduct) => {
      if (!(await canUseSupabase())) {
        const savedProduct = { ...product, dbId: editingProduct?.dbId };
        updateBusinessProducts(business.id, (currentProducts) =>
          editingProduct
            ? currentProducts.map((item) => (sameProduct(item, editingProduct) ? savedProduct : item))
            : [savedProduct, ...withoutProduct(currentProducts, savedProduct)],
        );
        return savedProduct;
      }

      const clientId = await getClientIdForBusiness(business);
      const payload = { ...product, dbId: product.dbId || editingProduct?.dbId };
      const savedProduct = await upsertSupabaseProduct(clientId, payload);

      // Re-read from DB so UI always matches what was persisted.
      await refreshFromSupabase(business, clientId);
      setDataSource("Supabase");
      return savedProduct;
    },
    [getClientIdForBusiness, refreshFromSupabase, updateBusinessProducts],
  );

  const deleteProduct = useCallback(
    async (business, product) => {
      if (await canUseSupabase()) {
        const clientId = await getClientIdForBusiness(business);
        await deleteSupabaseProduct(clientId, product);
        await refreshFromSupabase(business, clientId);
        setDataSource("Supabase");
        return;
      }

      updateBusinessProducts(business.id, (currentProducts) => withoutProduct(currentProducts, product));
    },
    [getClientIdForBusiness, refreshFromSupabase, updateBusinessProducts],
  );

  const importProducts = useCallback(
    async (business, imported) => {
      if ((await canUseSupabase()) && imported.length) {
        const clientId = await getClientIdForBusiness(business);
        await upsertSupabaseProductsInBatches(clientId, imported);
        await refreshFromSupabase(business, clientId);
        setDataSource("Supabase");
        return imported.length;
      }

      updateBusinessProducts(business.id, (currentProducts) => mergeProductsByCode(currentProducts, imported));
      return imported.length;
    },
    [getClientIdForBusiness, refreshFromSupabase, updateBusinessProducts],
  );

  const clearAllProducts = useCallback(
    async (business) => {
      if (await canUseSupabase()) {
        const clientId = await getClientIdForBusiness(business);
        await deleteAllSupabaseProducts(clientId);
        await refreshFromSupabase(business, clientId);
        setDataSource("Supabase");
        return;
      }

      updateBusinessProducts(business.id, []);
    },
    [getClientIdForBusiness, refreshFromSupabase, updateBusinessProducts],
  );

  return {
    productsByBusiness,
    isLoadingProducts,
    dataSource,
    loadInventory,
    saveProduct,
    deleteProduct,
    importProducts,
    clearAllProducts,
  };
}
