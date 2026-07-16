import { useCallback, useRef, useState } from "react";
import { defaultProducts } from "../data/businesses.js";
import { loadProducts, saveProducts } from "../lib/storage.js";
import {
  dbProductToApp,
  deleteSupabaseProduct,
  ensureSupabaseClient,
  hasSupabaseConfig,
  seedSupabaseProductsIfEmpty,
  upsertSupabaseProduct,
  upsertSupabaseProducts,
} from "../lib/supabase.js";
import { mergeProductsByCode } from "../lib/products.js";

function initialProductsState() {
  return hasSupabaseConfig ? {} : loadProducts();
}

export function useInventorySync(showToast) {
  const [productsByBusiness, setProductsByBusiness] = useState(initialProductsState);
  const [clientIdsByBusiness, setClientIdsByBusiness] = useState({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [dataSource, setDataSource] = useState(hasSupabaseConfig ? "Supabase" : "Local");
  const clientIdsRef = useRef(clientIdsByBusiness);

  clientIdsRef.current = clientIdsByBusiness;

  const updateBusinessProducts = useCallback((businessId, updater) => {
    setProductsByBusiness((current) => {
      const currentList = current[businessId] || [];
      const nextList = typeof updater === "function" ? updater(currentList) : updater;
      const next = { ...current, [businessId]: nextList };

      if (!hasSupabaseConfig) {
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
      if (!hasSupabaseConfig) {
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
        showToast("No pude cargar datos desde Supabase");
      } finally {
        setIsLoadingProducts(false);
      }
    },
    [getClientIdForBusiness, showToast, updateBusinessProducts],
  );

  const saveProduct = useCallback(
    async (business, product, editingProduct) => {
      if (!hasSupabaseConfig) {
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
      if (hasSupabaseConfig) {
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
      if (hasSupabaseConfig && imported.length) {
        const clientId = await getClientIdForBusiness(business);
        const rows = await upsertSupabaseProducts(clientId, imported);
        const synced = rows?.map(dbProductToApp) || imported;
        updateBusinessProducts(business.id, (currentProducts) => mergeProductsByCode(currentProducts, synced));
        setDataSource("Supabase");
        return imported.length;
      }

      updateBusinessProducts(business.id, (currentProducts) => mergeProductsByCode(currentProducts, imported));
      return imported.length;
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
  };
}
