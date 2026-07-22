import { useCallback, useEffect, useMemo, useState } from "react";
import { businesses } from "./data/businesses.js";
import ClientSelector from "./components/ClientSelector.jsx";
import ConfirmDialog from "./components/ui/ConfirmDialog.jsx";
import InventoryDashboard from "./components/InventoryDashboard.jsx";
import PasswordModal from "./components/PasswordModal.jsx";
import AtainImportModal from "./components/AtainImportModal.jsx";
import PinModal from "./components/PinModal.jsx";
import ProductDrawer from "./components/ProductDrawer.jsx";
import Toast from "./components/ui/Toast.jsx";
import { useInventorySync } from "./hooks/useInventorySync.js";
import { usePinSync } from "./hooks/usePinSync.js";
import { useToast } from "./hooks/useToast.js";
import {
  computeStats,
  matchesFilter,
  matchesAtainCampaignFilter,
  matchesAtainFilters,
  matchesSearch,
  decodeCsvText,
  describeAtainImportFailure,
  isExcelWorkbook,
  parseAtainImport,
  parseCsvProducts,
  parseProductForm,
  validateProduct,
} from "./lib/products.js";
import { formatSupabaseError } from "./lib/supabaseErrors.js";
import { businessFromPath, businessPath, clientsPath, navigateToPath } from "./lib/routing.js";
import { getBusinessPin } from "./lib/storage.js";

export default function App() {
  const initialRouteBusiness = businessFromPath();
  const { toast, showToast } = useToast();
  const {
    productsByBusiness,
    isLoadingProducts,
    dataSource,
    loadInventory,
    saveProduct,
    deleteProduct,
    importProducts,
    clearAllProducts,
  } = useInventorySync(showToast);
  const { pinsByBusiness, pinsReady, loadActivePin, savePin, verifyActivePin, hasRemotePins } = usePinSync(showToast);

  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [pinBusiness, setPinBusiness] = useState(initialRouteBusiness);
  const [pinLoading, setPinLoading] = useState(Boolean(initialRouteBusiness));
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [editingProduct, setEditingProduct] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [atainImportDraft, setAtainImportDraft] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);

  const theme = selectedBusiness?.theme || pinBusiness?.theme || businesses[0].theme;
  const products = selectedBusiness ? productsByBusiness[selectedBusiness.id] || [] : [];

  const visibleProducts = useMemo(() => {
    const isAtain = selectedBusiness?.id === "atain";
    return products
      .filter((product) => matchesSearch(product, query))
      .filter((product) =>
        isAtain ? matchesAtainFilters(product, filter, campaignFilter) : matchesFilter(product, filter),
      );
  }, [products, query, filter, campaignFilter, selectedBusiness]);

  const atainChartProducts = useMemo(() => {
    if (selectedBusiness?.id !== "atain") return [];
    return products
      .filter((product) => matchesSearch(product, query))
      .filter((product) => matchesAtainCampaignFilter(product, campaignFilter));
  }, [products, query, campaignFilter, selectedBusiness]);

  const atainScopeProducts = useMemo(() => {
    if (selectedBusiness?.id !== "atain") return [];
    return products.filter((product) => matchesSearch(product, query));
  }, [products, query, selectedBusiness]);

  const stats = useMemo(
    () => computeStats(products, { isAtain: selectedBusiness?.id === "atain" }),
    [products, selectedBusiness],
  );

  const resetSessionFilters = useCallback(() => {
    setFilter("all");
    setCampaignFilter("all");
    setQuery("");
  }, []);

  const openPin = useCallback(
    async (business) => {
      navigateToPath(businessPath(business));
      setPinBusiness(business);
      setPin("");
      setPinError("");
      setPinLoading(true);
      try {
        await loadActivePin(business.id);
      } catch (error) {
        console.error(error);
        showToast(formatSupabaseError(error, "No pude cargar la clave"));
      } finally {
        setPinLoading(false);
      }
    },
    [loadActivePin, showToast],
  );

  const closePin = useCallback(() => {
    setPinBusiness(null);
    setPin("");
    setPinError("");
    if (!selectedBusiness) navigateToPath(clientsPath());
  }, [selectedBusiness]);

  const backToClients = useCallback(() => {
    setSelectedBusiness(null);
    setPinBusiness(null);
    setPin("");
    setPinError("");
    resetSessionFilters();
    navigateToPath(clientsPath());
  }, [resetSessionFilters]);

  const pressPinKey = useCallback(
    (key) => {
      if (!pinBusiness) return;

      if (!pinsReady || pinLoading) return;

      const nextPin = key === "backspace" ? pin.slice(0, -1) : `${pin}${key}`.slice(0, 4);
      setPin(nextPin);

      if (nextPin.length !== 4) return;

      const isValid = hasRemotePins
        ? verifyActivePin(nextPin)
        : nextPin === getBusinessPin(pinBusiness, pinsByBusiness);

      if (isValid) {
        setSelectedBusiness(pinBusiness);
        navigateToPath(businessPath(pinBusiness), true);
        setPinBusiness(null);
        setPin("");
        resetSessionFilters();
        return;
      }

      setPinError("Codigo incorrecto");
      setPin("");
    },
    [pin, pinBusiness, pinsByBusiness, pinsReady, pinLoading, hasRemotePins, verifyActivePin, resetSessionFilters],
  );

  useEffect(() => {
    function handlePopState() {
      const routeBusiness = businessFromPath();
      setSelectedBusiness(null);
      setPinBusiness(routeBusiness);
      setPin("");
      setPinError("");
      resetSessionFilters();
      if (routeBusiness) {
        setPinLoading(true);
        loadActivePin(routeBusiness.id)
          .catch((error) => console.error(error))
          .finally(() => setPinLoading(false));
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadActivePin, resetSessionFilters]);

  useEffect(() => {
    if (selectedBusiness) loadInventory(selectedBusiness);
  }, [selectedBusiness, loadInventory]);

  useEffect(() => {
    if (!initialRouteBusiness) return;

    loadActivePin(initialRouteBusiness.id)
      .catch((error) => console.error(error))
      .finally(() => setPinLoading(false));
  }, [initialRouteBusiness, loadActivePin]);

  useEffect(() => {
    if (!pinBusiness) return undefined;

    function handleKeyDown(event) {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        pressPinKey(event.key);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        pressPinKey("backspace");
      } else if (event.key === "Escape") {
        event.preventDefault();
        closePin();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pinBusiness, pressPinKey, closePin]);

  function openProductForm(product = null) {
    setEditingProduct(product);
    setDrawerOpen(true);
  }

  function closeProductForm() {
    setDrawerOpen(false);
    setEditingProduct(null);
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    if (!selectedBusiness) return;

    const isAtain = selectedBusiness.id === "atain";
    const product = parseProductForm(new FormData(event.currentTarget), editingProduct, isAtain);
    const validationError = validateProduct(product, isAtain);

    if (validationError) {
      showToast(validationError);
      return;
    }

    const duplicate = products.some(
      (item) => item.code === product.code && item.code !== editingProduct?.code,
    );
    if (duplicate) {
      showToast("Ya existe un producto con ese codigo");
      return;
    }

    try {
      await saveProduct(selectedBusiness, product, editingProduct);
      closeProductForm();
      showToast("Inventario actualizado");
    } catch (error) {
      console.error(error);
      showToast(formatSupabaseError(error, "No pude guardar en Supabase"));
    }
  }

  async function confirmDeleteProduct() {
    if (!selectedBusiness || !productToDelete) return;
    try {
      await deleteProduct(selectedBusiness, productToDelete);
      setProductToDelete(null);
      showToast("Producto eliminado");
    } catch (error) {
      console.error(error);
      showToast(formatSupabaseError(error, "No pude eliminar en Supabase"));
    }
  }

  async function importParsedProducts(imported, emptyMessage = "El archivo no tiene productos validos") {
    if (!imported.length) {
      showToast(emptyMessage);
      return;
    }

    const count = await importProducts(selectedBusiness, imported);
    showToast(`${count} productos cargados`);
  }

  async function handleAtainImportConfirm(campaign) {
    if (!atainImportDraft || !selectedBusiness) return;

    try {
      const { products: imported, duplicateCount } = parseAtainImport(atainImportDraft.text, { campaign });
      if (!imported.length) {
        showToast(describeAtainImportFailure(atainImportDraft.text));
        return;
      }

      const count = await importProducts(selectedBusiness, imported);
      setAtainImportDraft(null);
      showToast(
        duplicateCount
          ? `${count} activos cargados (${duplicateCount} seriales duplicados ajustados)`
          : `${count} activos cargados`,
      );
    } catch (error) {
      console.error(error);
      showToast(formatSupabaseError(error, "No pude guardar los activos. Revisa la conexion con Supabase."));
    }
  }

  async function confirmClearAllProducts() {
    if (!selectedBusiness) return;
    try {
      await clearAllProducts(selectedBusiness);
      setClearAllConfirmOpen(false);
      showToast("Todos los activos fueron eliminados");
    } catch (error) {
      console.error(error);
      showToast(formatSupabaseError(error, "No pude borrar los activos"));
    }
  }

  function handleImportCsv(event) {
    const file = event.target.files?.[0];
    if (!file || !selectedBusiness) return;

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      showToast("Exporta el Excel como CSV: Archivo → Guardar como → CSV UTF-8");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      showToast("No pude abrir el archivo seleccionado");
      event.target.value = "";
    };
    reader.onload = async () => {
      try {
        if (isExcelWorkbook(reader.result)) {
          showToast("Ese archivo es Excel (.xlsx). Exportalo primero como CSV UTF-8.");
          return;
        }

        const text = decodeCsvText(reader.result);
        if (!text.trim()) {
          showToast("El archivo esta vacio");
          return;
        }

        if (selectedBusiness.id === "atain") {
          setAtainImportDraft({ text, fileName: file.name });
          return;
        }

        const imported = parseCsvProducts(text, { businessId: selectedBusiness.id });
        await importParsedProducts(imported);
      } catch (error) {
        console.error(error);
        showToast(formatSupabaseError(error, "No pude procesar el archivo CSV"));
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPin = String(form.get("currentPin") || "").trim();
    const newPin = String(form.get("newPin") || "").trim();
    const confirmPin = String(form.get("confirmPin") || "").trim();

    if (!/^\d{4}$/.test(newPin)) {
      showToast("La nueva clave debe tener 4 numeros");
      return;
    }
    if (newPin !== confirmPin) {
      showToast("La confirmacion no coincide");
      return;
    }

    try {
      const activePin = await loadActivePin(selectedBusiness.id);
      if (currentPin !== activePin) {
        showToast("La clave actual no coincide");
        return;
      }

      await savePin(selectedBusiness.id, newPin);
      setPasswordModalOpen(false);
      showToast(hasRemotePins ? "Clave actualizada en Supabase" : "Clave actualizada");
    } catch (error) {
      console.error(error);
      showToast(formatSupabaseError(error, "No pude guardar la clave en Supabase"));
    }
  }

  return (
    <div className={`min-h-screen ${theme.appBg} ${theme.text}`}>
      {!selectedBusiness ? (
        <ClientSelector onSelect={openPin} />
      ) : (
        <InventoryDashboard
          business={selectedBusiness}
          theme={theme}
          stats={stats}
          query={query}
          filter={filter}
          campaignFilter={campaignFilter}
          atainChartProducts={atainChartProducts}
          atainScopeProducts={atainScopeProducts}
          products={visibleProducts}
          isLoadingProducts={isLoadingProducts}
          dataSource={dataSource}
          onBack={backToClients}
          onQuery={setQuery}
          onFilter={setFilter}
          onCampaignFilter={setCampaignFilter}
          onAdd={() => openProductForm()}
          onEdit={openProductForm}
          onDelete={setProductToDelete}
          onImport={handleImportCsv}
          onChangePassword={() => setPasswordModalOpen(true)}
          onClearAll={() => setClearAllConfirmOpen(true)}
        />
      )}

      {pinBusiness && (
        <PinModal
          business={pinBusiness}
          pin={pin}
          error={pinError}
          loading={!pinsReady || pinLoading}
          onClose={closePin}
          onKey={pressPinKey}
        />
      )}

      {drawerOpen && selectedBusiness && (
        <ProductDrawer
          business={selectedBusiness}
          theme={theme}
          product={editingProduct}
          onClose={closeProductForm}
          onSubmit={handleSaveProduct}
        />
      )}

      {passwordModalOpen && (
        <PasswordModal
          theme={theme}
          onClose={() => setPasswordModalOpen(false)}
          onSubmit={handleChangePassword}
        />
      )}

      {atainImportDraft && (
        <AtainImportModal
          theme={theme}
          fileName={atainImportDraft.fileName}
          onClose={() => setAtainImportDraft(null)}
          onConfirm={handleAtainImportConfirm}
        />
      )}

      {productToDelete && (
        <ConfirmDialog
          title="Eliminar producto"
          message={`Seguro que deseas eliminar "${productToDelete.name}"? Esta accion no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={confirmDeleteProduct}
          onCancel={() => setProductToDelete(null)}
        />
      )}

      {clearAllConfirmOpen && (
        <ConfirmDialog
          title="Borrar todos los activos"
          message="Estas segura de que deseas borrar todos los activos guardados de ATAIN? Esta accion no se puede deshacer."
          confirmLabel="Si, borrar todo"
          onConfirm={confirmClearAllProducts}
          onCancel={() => setClearAllConfirmOpen(false)}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}
