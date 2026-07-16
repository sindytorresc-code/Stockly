import { useCallback, useEffect, useMemo, useState } from "react";
import { businesses } from "./data/businesses.js";
import ClientSelector from "./components/ClientSelector.jsx";
import ConfirmDialog from "./components/ui/ConfirmDialog.jsx";
import InventoryDashboard from "./components/InventoryDashboard.jsx";
import PasswordModal from "./components/PasswordModal.jsx";
import PinModal from "./components/PinModal.jsx";
import ProductDrawer from "./components/ProductDrawer.jsx";
import Toast from "./components/ui/Toast.jsx";
import { useInventorySync } from "./hooks/useInventorySync.js";
import { useToast } from "./hooks/useToast.js";
import {
  computeStats,
  matchesFilter,
  matchesSearch,
  parseCsvProducts,
  parseProductForm,
  validateProduct,
} from "./lib/products.js";
import { formatSupabaseError } from "./lib/supabaseErrors.js";
import { businessFromPath, businessPath, clientsPath, navigateToPath } from "./lib/routing.js";
import { getBusinessPin, loadPins, savePins } from "./lib/storage.js";

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
  } = useInventorySync(showToast);

  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [pinBusiness, setPinBusiness] = useState(initialRouteBusiness);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingProduct, setEditingProduct] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pinsByBusiness, setPinsByBusiness] = useState(loadPins);
  const [productToDelete, setProductToDelete] = useState(null);

  const theme = selectedBusiness?.theme || pinBusiness?.theme || businesses[0].theme;
  const products = selectedBusiness ? productsByBusiness[selectedBusiness.id] || [] : [];

  const visibleProducts = useMemo(
    () =>
      products
        .filter((product) => matchesSearch(product, query))
        .filter((product) => matchesFilter(product, filter)),
    [products, query, filter],
  );

  const stats = useMemo(() => computeStats(products), [products]);

  const resetSessionFilters = useCallback(() => {
    setFilter("all");
    setQuery("");
  }, []);

  const openPin = useCallback(
    (business) => {
      navigateToPath(businessPath(business));
      setPinBusiness(business);
      setPin("");
      setPinError("");
    },
    [],
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

      const nextPin = key === "backspace" ? pin.slice(0, -1) : `${pin}${key}`.slice(0, 4);
      setPin(nextPin);

      if (nextPin.length !== 4) return;

      if (nextPin === getBusinessPin(pinBusiness, pinsByBusiness)) {
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
    [pin, pinBusiness, pinsByBusiness, resetSessionFilters],
  );

  useEffect(() => {
    function handlePopState() {
      const routeBusiness = businessFromPath();
      setSelectedBusiness(null);
      setPinBusiness(routeBusiness);
      setPin("");
      setPinError("");
      resetSessionFilters();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [resetSessionFilters]);

  useEffect(() => {
    if (selectedBusiness) loadInventory(selectedBusiness);
  }, [selectedBusiness, loadInventory]);

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

  function handleImportCsv(event) {
    const file = event.target.files?.[0];
    if (!file || !selectedBusiness) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = parseCsvProducts(reader.result);
        if (!imported.length) {
          showToast("El archivo no tiene productos validos");
          return;
        }

        const count = await importProducts(selectedBusiness, imported);
        showToast(`${count} productos cargados`);
      } catch (error) {
        console.error(error);
        showToast("No pude leer el archivo CSV");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function handleChangePassword(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPin = String(form.get("currentPin") || "").trim();
    const newPin = String(form.get("newPin") || "").trim();
    const confirmPin = String(form.get("confirmPin") || "").trim();
    const activePin = getBusinessPin(selectedBusiness, pinsByBusiness);

    if (currentPin !== activePin) {
      showToast("La clave actual no coincide");
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      showToast("La nueva clave debe tener 4 numeros");
      return;
    }
    if (newPin !== confirmPin) {
      showToast("La confirmacion no coincide");
      return;
    }

    const nextPins = { ...pinsByBusiness, [selectedBusiness.id]: newPin };
    setPinsByBusiness(nextPins);
    savePins(nextPins);
    setPasswordModalOpen(false);
    showToast("Clave actualizada");
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
          products={visibleProducts}
          isLoadingProducts={isLoadingProducts}
          dataSource={dataSource}
          onBack={backToClients}
          onQuery={setQuery}
          onFilter={setFilter}
          onAdd={() => openProductForm()}
          onEdit={openProductForm}
          onDelete={setProductToDelete}
          onImport={handleImportCsv}
          onChangePassword={() => setPasswordModalOpen(true)}
        />
      )}

      {pinBusiness && (
        <PinModal
          business={pinBusiness}
          pin={pin}
          error={pinError}
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

      {productToDelete && (
        <ConfirmDialog
          title="Eliminar producto"
          message={`Seguro que deseas eliminar "${productToDelete.name}"? Esta accion no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={confirmDeleteProduct}
          onCancel={() => setProductToDelete(null)}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}
