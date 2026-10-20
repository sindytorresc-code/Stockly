import { useCallback, useEffect, useMemo, useState } from "react";
import { businesses as initialBusinesses } from "./data/businesses.js";
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
import { consumePendingCompanyDraft, createSupabaseBusiness, fetchSupabaseClient, fetchSupabaseClients, hasAuthenticatedSession, initSupabase, registerCompanyWithGoogle, restoreAuthSession, signOut } from "./lib/supabase.js";
import { exportBusinessWorkbook } from "./lib/exportWorkbook.js";
import SignIn from "./components/SignIn.jsx";
import AccessManager from "./components/AccessManager.jsx";

export default function App() {
  const [businesses, setBusinesses] = useState(initialBusinesses);
  const authRequired = import.meta.env.VITE_REQUIRE_AUTH === "true";
  const [authenticated, setAuthenticated] = useState(!authRequired || hasAuthenticatedSession());
  const [authReady, setAuthReady] = useState(!authRequired);
  const [authError, setAuthError] = useState("");
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
    loadMovements,
  } = useInventorySync(showToast);
  const { pinsByBusiness, pinsReady, loadActivePin, savePin, verifyActivePin, hasRemotePins } = usePinSync(showToast);

  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [pinBusiness, setPinBusiness] = useState(authRequired ? null : initialRouteBusiness);
  const [pinLoading, setPinLoading] = useState(!authRequired && Boolean(initialRouteBusiness));
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [accessCompany, setAccessCompany] = useState(null);

  useEffect(() => {
    if (!authRequired) return;
    restoreAuthSession().then((valid) => { setAuthenticated(valid); setAuthReady(true); })
      .catch((error) => { setAuthError(error.message || "No se pudo restaurar la sesión."); setAuthenticated(false); setAuthReady(true); signOut(); });
  }, [authRequired]);

  const theme = selectedBusiness?.theme || pinBusiness?.theme || businesses[0]?.theme || initialBusinesses[0].theme;
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

  const refreshAuthorizedBusinesses = useCallback(async () => {
    const rows = await fetchSupabaseClients();
    const mapped = rows.map((row) => {
      const existing = initialBusinesses.find((item) => item.id === row.slug);
      return existing ? { ...existing, name: row.name, type: row.business_type, description: row.description || "" } : {
        id: row.slug, name: row.name, type: row.business_type, description: row.description || "", icon: row.icon || "package",
        cardGradient: "from-blue-600 to-cyan-500", pin: "", products: [], theme: initialBusinesses[0].theme,
      };
    });
    setBusinesses(mapped);
    if (authRequired) {
      const routeSlug = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) || "").toLowerCase();
      const routeBusiness = mapped.find((business) => business.id.toLowerCase() === routeSlug);
      if (routeBusiness) setSelectedBusiness(routeBusiness);
    }
    return mapped;
  }, [authRequired]);
  useEffect(() => {
    if (authRequired && authReady && authenticated) refreshAuthorizedBusinesses().catch((error) => { console.error(error); setAuthenticated(false); signOut(); });
  }, [authRequired, authReady, authenticated, refreshAuthorizedBusinesses]);

  const handleCreateBusiness = useCallback(async ({ name, type, description }) => {
    const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug || businesses.some((business) => business.id === slug)) throw new Error("Ya existe una empresa con ese nombre.");
    const business = { id: slug, type: type.toLocaleUpperCase(), name, description, icon: "package", cardGradient: "from-blue-600 to-cyan-500", pin: "", products: [], theme: initialBusinesses[0].theme };
    if (!authRequired) {
      setBusinesses((current) => [...current, business]);
      showToast("Empresa agregada en modo demo; activa el acceso seguro para guardarla en Supabase.");
      return;
    }
    if (!(await initSupabase())) throw new Error("Configura Supabase para guardar empresas de forma persistente.");
    try {
      await createSupabaseBusiness(business);
    } catch (error) {
      if (String(error.message).includes("not_authorized_to_create_company")) {
        throw new Error("Solo un administrador con permiso para gestionar usuarios puede crear empresas.");
      }
      throw error;
    }
    const refreshedBusinesses = await refreshAuthorizedBusinesses();
    const createdBusiness = refreshedBusinesses.find((item) => item.id === slug);
    if (!createdBusiness) throw new Error("La empresa se guardó, pero no apareció en tu lista. Comprueba tu membresía en Supabase.");
    const client = await fetchSupabaseClient(createdBusiness.id);
    if (!client) throw new Error("La empresa se guardó, pero no se pudo abrir su configuración.");
    setSelectedBusiness(createdBusiness);
    setPinBusiness(null);
    resetSessionFilters();
    navigateToPath(businessPath(createdBusiness), true);
    setAccessCompany({ id: client.id, name: createdBusiness.name });
    showToast("Empresa creada. Genera su código de acceso y configura a sus usuarios.");
  }, [businesses, showToast, authRequired, refreshAuthorizedBusinesses, resetSessionFilters]);

  useEffect(() => {
    if (!authRequired || !authReady || !authenticated) return;
    const pendingDraft = consumePendingCompanyDraft();
    if (!pendingDraft) return;
    handleCreateBusiness(pendingDraft).catch((error) => {
      console.error(error);
      showToast(error.message || "No se pudo registrar la empresa.");
    });
  }, [authRequired, authReady, authenticated, handleCreateBusiness, showToast]);

  const handleExport = useCallback(async () => {
    if (!selectedBusiness) return;
    try {
      const movements = await loadMovements(selectedBusiness);
      exportBusinessWorkbook(selectedBusiness, products, movements);
      showToast("Respaldo Excel descargado");
    } catch (error) {
      console.error(error);
      showToast(formatSupabaseError(error, "No pude cargar los movimientos para el respaldo"));
    }
  }, [selectedBusiness, products, loadMovements, showToast]);

  const handleToggleHistory = useCallback(async () => {
    if (historyOpen) { setHistoryOpen(false); return; }
    try { setHistoryRows(await loadMovements(selectedBusiness)); setHistoryOpen(true); }
    catch (error) { console.error(error); showToast(formatSupabaseError(error, "No pude cargar el historial")); }
  }, [historyOpen, loadMovements, selectedBusiness, showToast]);

  const handleManageAccess = useCallback(async () => {
    try {
      const client = await fetchSupabaseClient(selectedBusiness.id);
      if (!client) throw new Error("No se encontró la empresa en la base de datos.");
      setAccessCompany({ id: client.id, name: selectedBusiness.name });
    } catch (error) { showToast(formatSupabaseError(error, "No pude abrir la administración de usuarios")); }
  }, [selectedBusiness, showToast]);

  const openPin = useCallback(
    async (business) => {
      if (authRequired) {
        setSelectedBusiness(business);
        setPinBusiness(null);
        navigateToPath(businessPath(business), true);
        resetSessionFilters();
        return;
      }
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
    [loadActivePin, showToast, authRequired, resetSessionFilters],
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
    if (!initialRouteBusiness || authRequired) return;

    loadActivePin(initialRouteBusiness.id)
      .catch((error) => console.error(error))
      .finally(() => setPinLoading(false));
  }, [initialRouteBusiness, loadActivePin, authRequired]);

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

    const normalizedCode = String(product.code || "").trim();
    const duplicate = products.some((item) => {
      if (String(item.code || "").trim() !== normalizedCode) return false;
      // Same product being edited (by db id or by original code).
      if (editingProduct?.dbId && item.dbId === editingProduct.dbId) return false;
      if (editingProduct && String(item.code || "").trim() === String(editingProduct.code || "").trim()) {
        return false;
      }
      return true;
    });
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
      {authRequired && !authReady ? <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-500">Restaurando sesión…</main> : authRequired && !authenticated ? <SignIn initialError={authError} onRegisterCompany={registerCompanyWithGoogle} onSignedIn={() => { setAuthError(""); setAuthenticated(true); }} /> : !selectedBusiness ? (
        <ClientSelector businesses={businesses} onSelect={openPin} onCreate={handleCreateBusiness} onSignOut={authRequired ? () => { signOut(); setAuthenticated(false); setSelectedBusiness(null); } : undefined} />
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
          onChangePassword={authRequired ? undefined : () => setPasswordModalOpen(true)}
          onClearAll={() => setClearAllConfirmOpen(true)}
          onExport={handleExport}
          movements={historyRows}
          showHistory={historyOpen}
          onToggleHistory={handleToggleHistory}
          onManageAccess={authRequired ? handleManageAccess : undefined}
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

      {accessCompany && <AccessManager clientId={accessCompany.id} businessName={accessCompany.name} onClose={() => setAccessCompany(null)} />}

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
