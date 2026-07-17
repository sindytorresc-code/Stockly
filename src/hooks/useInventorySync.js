import { useCallback, useEffect, useRef, useState } from "react";
import { defaultProducts } from "../data/businesses.js";
import { loadProducts, saveProducts } from "../lib/storage.js";
import {
  deleteAllSupabaseProducts,
  deleteSupabaseProduct,
  ensureSupabaseClient,
  initSupabase,
  isSupabaseConfigured,
  seedSupabaseProductsIfEmpty,
  upsertSupabaseProduct,
  upsertSupabaseProductsInBatches,
} from "../lib/supabase.js";
import { formatSupabaseError } from "../lib/supabaseErrors.js";
import { mergeProductsByCode } from "../lib/products.js";

async function canUseSupabase() {
  return Boolean(await initSupabase());
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
        const products = await seedSupabaseProductsIfEmpty(clientId, business.products);
        updateBusinessProducts(business.id, products);
        setDataSource("Supabase");
      } catch (error) {
        console.error(error);
        setDataSource("Error Supabase");
        showToast(formatSupabaseError(error, "No pude cargar datos desde Supabase"));
      } finally {
        setIsLoadingProducts(false);
      }
    },
    [getClientIdForBusiness, showToast, updateBusinessProducts],
  );

  const saveProduct = useCallback(
    async (business, product, editingProduct) => {
      if (!(await canUseSupabase())) {
        const savedProduct = { ...product, dbId: editingProduct?.dbId };
        updateBusinessProducts(business.id, (currentProducts) =>
          editingProduct
            ? currentProducts.map((item) => (item.code === editingProduct.code ? savedProduct : item))
            : [savedProduct, ...currentProducts.filter((item) => item.code !== savedProduct.code)],
        );
        return savedProduct;
      }

      const clientId = await getClientIdForBusiness(business);
      const savedProduct = await upsertSupabaseProduct(clientId, product);
      updateBusinessProducts(business.id, (currentProducts) =>
        editingProduct
          ? currentProducts.map((item) => (item.code === editingProduct.code ? savedProduct : item))
          : [savedProduct, ...currentProducts.filter((item) => item.code !== savedProduct.code)],
      );
      setDataSource("Supabase");
      return savedProduct;
    },
    [getClientIdForBusiness, updateBusinessProducts],
  );

  const deleteProduct = useCallback(
    async (business, product) => {
      if (await canUseSupabase()) {
        const clientId = await getClientIdForBusiness(business);
        await deleteSupabaseProduct(clientId, product);
        setDataSource("Supabase");
      }

      updateBusinessProducts(business.id, (currentProducts) =>
        currentProducts.filter((item) => item.code !== product.code),
      );
    },
    [getClientIdForBusiness, updateBusinessProducts],
  );

  const importProducts = useCallback(
    async (business, imported) => {
      if ((await canUseSupabase()) && imported.length) {
        const clientId = await getClientIdForBusiness(business);
        const rows = await upsertSupabaseProductsInBatches(clientId, imported);
        const synced = rows.length ? rows : imported;
        updateBusinessProducts(business.id, (currentProducts) => mergeProductsByCode(currentProducts, synced));
        setDataSource("Supabase");
        return imported.length;
      }

      updateBusinessProducts(business.id, (currentProducts) => mergeProductsByCode(currentProducts, imported));
      return imported.length;
    },
    [getClientIdForBusiness, updateBusinessProducts],
  );

  const clearAllProducts = useCallback(
    async (business) => {
      if (await canUseSupabase()) {
        const clientId = await getClientIdForBusiness(business);
        await deleteAllSupabaseProducts(clientId);
        setDataSource("Supabase");
      }

      updateBusinessProducts(business.id, []);
    },
    [getClientIdForBusiness, updateBusinessProducts],
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
