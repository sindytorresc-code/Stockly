import { useCallback, useRef, useState } from "react";
import { saveProducts } from "../lib/storage.js";
import {
  dbProductToApp,
  deleteSupabaseProduct,
  fetchSupabaseClient,
  hasSupabaseConfig,
  seedSupabaseProductsIfEmpty,
  upsertSupabaseProduct,
  upsertSupabaseProducts,
} from "../lib/supabase.js";
import { mergeProductsByCode } from "../lib/products.js";

export function useInventorySync(initialProducts, showToast) {
  const [productsByBusiness, setProductsByBusiness] = useState(initialProducts);
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
      try {
        saveProducts(next);
      } catch (error) {
        console.error(error);
        showToast("No hay espacio local para guardar los datos");
        return current;
      }
      return next;
    });
  }, [showToast]);

  const getClientIdForBusiness = useCallback(async (business) => {
    if (clientIdsRef.current[business.id]) return clientIdsRef.current[business.id];

    const client = await fetchSupabaseClient(business.id);
    if (!client) throw new Error(`No existe el cliente ${business.id} en Supabase`);

    setClientIdsByBusiness((current) => ({ ...current, [business.id]: client.id }));
    return client.id;
  }, []);

  const loadInventory = useCallback(
    async (business) => {
      if (!hasSupabaseConfig) {
        setDataSource("Local");
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
        setDataSource("Local");
        showToast("No pude conectar Supabase; usando datos locales");
      } finally {
        setIsLoadingProducts(false);
      }
    },
    [getClientIdForBusiness, showToast, updateBusinessProducts],
  );

  const saveProduct = useCallback(
    async (business, product, editingProduct) => {
      let savedProduct = { ...product, dbId: editingProduct?.dbId };

      if (hasSupabaseConfig) {
        try {
          const clientId = await getClientIdForBusiness(business);
          savedProduct = await upsertSupabaseProduct(clientId, product);
          setDataSource("Supabase");
        } catch (error) {
          console.error(error);
          setDataSource("Local");
          showToast("No pude guardar en Supabase; guardado local");
        }
      }

      updateBusinessProducts(business.id, (currentProducts) =>
        editingProduct
          ? currentProducts.map((item) => (item.code === editingProduct.code ? savedProduct : item))
          : [savedProduct, ...currentProducts.filter((item) => item.code !== savedProduct.code)],
      );

      return savedProduct;
    },
    [getClientIdForBusiness, showToast, updateBusinessProducts],
  );

  const deleteProduct = useCallback(
    async (business, product) => {
      if (hasSupabaseConfig && product) {
        try {
          const clientId = await getClientIdForBusiness(business);
          await deleteSupabaseProduct(clientId, product);
          setDataSource("Supabase");
        } catch (error) {
          console.error(error);
          setDataSource("Local");
          showToast("No pude borrar en Supabase; borrado local");
        }
      }

      updateBusinessProducts(business.id, (currentProducts) =>
        currentProducts.filter((item) => item.code !== product.code),
      );
    },
    [getClientIdForBusiness, showToast, updateBusinessProducts],
  );

  const importProducts = useCallback(
    async (business, imported) => {
      if (hasSupabaseConfig && imported.length) {
        try {
          const clientId = await getClientIdForBusiness(business);
          const rows = await upsertSupabaseProducts(clientId, imported);
          const synced = rows?.map(dbProductToApp) || imported;
          updateBusinessProducts(business.id, (currentProducts) => mergeProductsByCode(currentProducts, synced));
          setDataSource("Supabase");
          return imported.length;
        } catch (error) {
          console.error(error);
          setDataSource("Local");
          showToast("No pude importar en Supabase; importado local");
        }
      }

      updateBusinessProducts(business.id, (currentProducts) => mergeProductsByCode(currentProducts, imported));
      return imported.length;
    },
    [getClientIdForBusiness, showToast, updateBusinessProducts],
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
