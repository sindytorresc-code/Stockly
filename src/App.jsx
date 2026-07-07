import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Delete,
  DollarSign,
  Monitor,
  Package,
  Pencil,
  Plus,
  Search,
  Shirt,
  Sparkles,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Upload,
  Utensils,
  X,
} from "lucide-react";

const iconMap = {
  monitor: Monitor,
  utensils: Utensils,
  shirt: Shirt,
  sparkles: Sparkles,
};

const businesses = [
  {
    id: "atain",
    type: "TECNOLOGIA",
    name: "ATAIN",
    description: "Distribuidora de electronicos y gadgets",
    icon: "monitor",
    cardGradient: "from-blue-600 to-cyan-500",
    pin: "1234",
    theme: {
      mode: "dark",
      header: "from-blue-600 to-cyan-500",
      appBg: "bg-slate-950",
      panel: "bg-slate-900 border-blue-900/70",
      panelSoft: "bg-slate-800 border-slate-700",
      text: "text-slate-50",
      muted: "text-slate-400",
      input: "bg-slate-950 border-slate-700 text-white placeholder:text-slate-400",
      tableHead: "bg-slate-800/55 text-slate-400",
      row: "border-slate-800",
      accent: "bg-blue-600 hover:bg-blue-500 text-white",
      softAccent: "bg-blue-500/15 text-blue-300",
    },
    products: [
      { name: "Auriculares Jabra", code: "00406967062", category: "Audio", price: 850000, stock: 2, tag: "Asignado", comments: "Entregar a soporte comercial.", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=96&q=80" },
      { name: "Teclado Mecanico RGB", code: "TC-005", category: "Perifericos", price: 360000, stock: 30, tag: "Agotado", comments: "Revisar etiqueta de estado." },
      { name: "Portatil Dell 3410", code: "73X2Q93", category: "Portatiles", price: 4500000, stock: 15, tag: "Campana", comments: "Disponible para campana de renovacion.", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=96&q=80" },
      { name: "Pantalla Dell de 22 pulgadas", code: "CN1245ASD214ASD", category: "Pantallas", price: 2000000, stock: 8, tag: "En stock", comments: "Incluye cable HDMI.", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=96&q=80" },
      { name: "Monitor 4K de 27 pulgadas", code: "TC-004", category: "Monitores", price: 1800000, stock: 0, tag: "Reparacion", comments: "Pendiente diagnostico tecnico." },
    ],
  },
  {
    id: "sabor",
    type: "ALIMENTOS Y BEBIDAS",
    name: "Sabor Fresco",
    description: "Alimentos organicos y bebidas artesanales",
    icon: "utensils",
    cardGradient: "from-orange-500 via-amber-400 to-green-500",
    pin: "2026",
    theme: {
      mode: "light",
      header: "from-orange-500 to-green-500",
      appBg: "bg-green-50",
      panel: "bg-white border-green-200",
      panelSoft: "bg-green-50 border-green-200",
      text: "text-stone-950",
      muted: "text-stone-500",
      input: "bg-white border-green-200 text-stone-950 placeholder:text-stone-400",
      tableHead: "bg-green-50 text-stone-500",
      row: "border-green-100",
      accent: "bg-green-600 hover:bg-green-500 text-white",
      softAccent: "bg-green-100 text-green-700",
    },
    products: [
      { name: "Cafe Especial 500g", code: "CF-500", category: "Bebidas", price: 42000, stock: 18, tag: "En stock", comments: "Lote recien tostado." },
      { name: "Granola Frutos Rojos", code: "GR-102", category: "Despensa", price: 18500, stock: 4, tag: "Campana", comments: "Promocion de vitrina." },
      { name: "Kombucha Limon", code: "KB-021", category: "Bebidas", price: 12000, stock: 0, tag: "Agotado", comments: "Pedir al proveedor." },
    ],
  },
  {
    id: "vogue",
    type: "MODA",
    name: "Estilo Vogue",
    description: "Ropa de disenador y accesorios de autor",
    icon: "shirt",
    cardGradient: "from-neutral-950 to-yellow-700",
    pin: "4455",
    theme: {
      mode: "light",
      header: "from-neutral-950 to-yellow-700",
      appBg: "bg-stone-100",
      panel: "bg-white border-yellow-200",
      panelSoft: "bg-yellow-50 border-yellow-200",
      text: "text-neutral-950",
      muted: "text-stone-500",
      input: "bg-white border-yellow-200 text-neutral-950 placeholder:text-stone-400",
      tableHead: "bg-yellow-50 text-stone-500",
      row: "border-yellow-100",
      accent: "bg-yellow-700 hover:bg-yellow-600 text-white",
      softAccent: "bg-yellow-100 text-yellow-800",
    },
    products: [
      { name: "Chaqueta lino", code: "CH-LN-01", category: "Prendas", price: 280000, stock: 7, tag: "En stock", comments: "Tallas S, M y L." },
      { name: "Bolso piel vegana", code: "BG-210", category: "Accesorios", price: 190000, stock: 2, tag: "Asignado", comments: "Reservado para cliente frecuente." },
      { name: "Vestido gala", code: "VG-700", category: "Prendas", price: 620000, stock: 0, tag: "Agotado", comments: "Solicitar nueva coleccion." },
    ],
  },
  {
    id: "mara",
    type: "REVESTIR",
    name: "Maquillaje de Mara",
    description: "Tienda de cosmeticos y productos de cuidado",
    icon: "sparkles",
    cardGradient: "from-pink-500 to-violet-500",
    pin: "7788",
    theme: {
      mode: "light",
      header: "from-pink-500 to-violet-500",
      appBg: "bg-pink-50",
      panel: "bg-white border-pink-200",
      panelSoft: "bg-pink-50 border-pink-200",
      text: "text-stone-950",
      muted: "text-stone-500",
      input: "bg-white border-pink-200 text-stone-950 placeholder:text-stone-400",
      tableHead: "bg-pink-50 text-stone-500",
      row: "border-pink-100",
      accent: "bg-pink-600 hover:bg-pink-500 text-white",
      softAccent: "bg-pink-100 text-pink-700",
    },
    products: [
      { name: "Base mate tono 03", code: "BS-03", category: "Rostro", price: 56000, stock: 13, tag: "En stock", comments: "Alta rotacion." },
      { name: "Labial coral", code: "LB-88", category: "Labios", price: 26000, stock: 3, tag: "Campana", comments: "Exhibir cerca de caja." },
      { name: "Set brochas pro", code: "BR-PRO", category: "Accesorios", price: 98000, stock: 0, tag: "Agotado", comments: "Reposicion prioritaria." },
    ],
  },
];

const defaultProducts = Object.fromEntries(businesses.map((business) => [business.id, business.products]));
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function loadProducts() {
  try {
    return JSON.parse(localStorage.getItem("inventory-products-react")) || defaultProducts;
  } catch {
    return defaultProducts;
  }
}

function saveProducts(products) {
  localStorage.setItem("inventory-products-react", JSON.stringify(products));
}

export default function App() {
  const [productsByBusiness, setProductsByBusiness] = useState(loadProducts);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [pinBusiness, setPinBusiness] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingProduct, setEditingProduct] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");

  const theme = selectedBusiness?.theme || pinBusiness?.theme || businesses[0].theme;
  const products = selectedBusiness ? productsByBusiness[selectedBusiness.id] || [] : [];
  const visibleProducts = useMemo(() => {
    return products.filter((product) => matchesSearch(product, query)).filter((product) => matchesFilter(product, filter));
  }, [products, query, filter]);

  const stats = useMemo(() => ({
    total: products.length,
    value: products.reduce((sum, product) => sum + product.price * product.stock, 0),
    low: products.filter((product) => product.stock > 0 && product.stock <= lowStockLimit(product)).length,
    empty: products.filter((product) => product.stock === 0).length,
  }), [products]);

  function persist(nextProducts) {
    setProductsByBusiness(nextProducts);
    saveProducts(nextProducts);
  }

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 2200);
  }

  function openPin(business) {
    setPinBusiness(business);
    setPin("");
    setPinError("");
  }

  function closePin() {
    setPinBusiness(null);
    setPin("");
    setPinError("");
  }

  function pressPinKey(key) {
    const nextPin = key === "backspace" ? pin.slice(0, -1) : `${pin}${key}`.slice(0, 4);
    setPin(nextPin);
    if (nextPin.length === 4) {
      if (nextPin === pinBusiness.pin) {
        setSelectedBusiness(pinBusiness);
        setPinBusiness(null);
        setPin("");
        setFilter("all");
        setQuery("");
      } else {
        setPinError("Codigo incorrecto");
        setPin("");
      }
    }
  }

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
  }, [pinBusiness, pin]);

  function openProductForm(product = null) {
    setEditingProduct(product);
    setDrawerOpen(true);
  }

  function saveProduct(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const product = {
      name: String(form.get("name")).trim(),
      code: String(form.get("code")).trim(),
      category: String(form.get("category")).trim(),
      brand: String(form.get("brand") || "").trim(),
      price: Number(form.get("price")),
      purchasePrice: Number(form.get("purchasePrice") || 0),
      stock: Number(form.get("stock")),
      minStock: Number(form.get("minStock") || 0),
      image: String(form.get("image") || "").trim(),
      tag: editingProduct?.tag || "En stock",
      comments: String(form.get("comments")).trim(),
    };

    if (!product.name || !product.code || !product.category) return;
    const duplicate = products.some((item) => item.code === product.code && item.code !== editingProduct?.code);
    if (duplicate) {
      showToast("Ya existe un producto con ese codigo");
      return;
    }

    const nextProducts = editingProduct
      ? products.map((item) => item.code === editingProduct.code ? product : item)
      : [product, ...products];

    persist({ ...productsByBusiness, [selectedBusiness.id]: nextProducts });
    setDrawerOpen(false);
    setEditingProduct(null);
    showToast("Inventario actualizado");
  }

  function deleteProduct(code) {
    persist({ ...productsByBusiness, [selectedBusiness.id]: products.filter((product) => product.code !== code) });
    showToast("Producto eliminado");
  }

  function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = String(reader.result).split(/\r?\n/).filter(Boolean);
      const imported = rows.slice(1).map((row) => {
        const [name, code, category, price, stock, tag, comments, minStock, purchasePrice, brand, image] = row.split(",").map((item) => item?.trim());
        return {
          name,
          code,
          category,
          price: Number(price),
          stock: Number(stock),
          tag: tag || "En stock",
          comments: comments || "",
          minStock: Number(minStock || 0),
          purchasePrice: Number(purchasePrice || 0),
          brand: brand || "",
          image: image || "",
        };
      }).filter((item) => item.name && item.code && item.category);
      persist({ ...productsByBusiness, [selectedBusiness.id]: [...imported, ...products] });
      showToast(`${imported.length} productos cargados`);
      event.target.value = "";
    };
    reader.readAsText(file);
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
          onBack={() => setSelectedBusiness(null)}
          onQuery={setQuery}
          onFilter={setFilter}
          onAdd={() => openProductForm()}
          onEdit={openProductForm}
          onDelete={deleteProduct}
          onImport={importCsv}
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

      {drawerOpen && (
        <ProductDrawer
          theme={theme}
          product={editingProduct}
          onClose={() => {
            setDrawerOpen(false);
            setEditingProduct(null);
          }}
          onSubmit={saveProduct}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-white px-4 py-3 font-extrabold text-slate-950 shadow-soft">
          {toast}
        </div>
      )}
    </div>
  );
}

function ClientSelector({ onSelect }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10 text-slate-950">
      <section className="w-full max-w-3xl text-center">
        <h1 className="text-4xl font-extrabold tracking-normal">Sistema de Inventario</h1>
        <p className="mt-3 text-slate-500">Selecciona tu negocio para continuar</p>
        <div className="mt-11 grid gap-5 text-left sm:grid-cols-2">
          {businesses.map((business) => {
            const Icon = iconMap[business.icon];
            return (
              <button
                key={business.id}
                type="button"
                onClick={() => onSelect(business)}
                className="overflow-hidden rounded-lg bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <span className={`flex min-h-36 items-center gap-4 bg-gradient-to-br ${business.cardGradient} p-6 text-white`}>
                  <span className="grid size-12 place-items-center rounded-lg bg-white/20">
                    <Icon size={24} />
                  </span>
                  <span>
                    <span className="block text-xs font-extrabold text-white/80">{business.type}</span>
                    <span className="block text-lg font-extrabold">{business.name}</span>
                  </span>
                </span>
                <span className="flex min-h-10 items-center justify-between gap-4 px-5 text-xs text-slate-500">
                  <span className="truncate">{business.description}</span>
                  <span>Entrar -&gt;</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function PinModal({ business, pin, error, onClose, onKey }) {
  const Icon = iconMap[business.icon];
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/65 p-5 backdrop-blur-md">
      <section className="w-full max-w-xs overflow-hidden rounded-3xl bg-white text-slate-950 shadow-soft">
        <div className={`relative min-h-40 bg-gradient-to-br ${business.theme.header} p-6 text-white`}>
          <button type="button" onClick={onClose} className="absolute right-5 top-5 grid size-8 place-items-center rounded-full bg-white/20">
            <X size={18} />
          </button>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-white/20">
              <Icon size={23} />
            </span>
            <span>
              <span className="block text-xs font-extrabold text-white/80">{business.type}</span>
              <span className="block text-lg font-extrabold">{business.name}</span>
            </span>
          </div>
          <p className="mb-4 text-sm font-semibold">Ingresa tu codigo de acceso</p>
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <span key={index} className={`size-3 rounded-full ${index < pin.length ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        </div>
        <p className="min-h-8 pt-3 text-center text-xs font-extrabold text-red-600">{error}</p>
        <div className="grid grid-cols-3 gap-x-5 gap-y-3 px-5 pb-7">
          {keys.map((key, index) => key ? (
            <button key={key} type="button" onClick={() => onKey(key)} className="grid h-14 place-items-center rounded-2xl text-xl font-semibold hover:bg-slate-100">
              {key === "backspace" ? <Delete size={20} /> : key}
            </button>
          ) : <span key={index} />)}
        </div>
      </section>
    </div>
  );
}

function InventoryDashboard({ business, theme, stats, query, filter, products, onBack, onQuery, onFilter, onAdd, onEdit, onDelete, onImport }) {
  const Icon = iconMap[business.icon];
  const filterOptions = [
    ["all", "Todos"],
    ["stock", "En stock"],
    ["low", "Stock bajo"],
    ["empty", "Agotados"],
  ];

  return (
    <>
      <header className={`bg-gradient-to-br ${theme.header} px-4 py-5 text-white`}>
        <div className="mx-auto max-w-7xl">
          <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 font-medium">
            <ArrowLeft size={18} /> Volver a clientes
          </button>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-white/20">
                <Icon size={28} />
              </span>
              <span>
                <span className="block text-xs font-extrabold text-white/80">{business.type}</span>
                <span className="block text-3xl font-extrabold">{business.name}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-4 font-bold">
                <Upload size={18} /> Cargar archivo
                <input type="file" accept=".csv" className="hidden" onChange={onImport} />
              </label>
              <button type="button" onClick={onAdd} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/20 px-4 font-bold">
                <Plus size={18} /> Agregar Producto
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard theme={theme} icon={Package} value={stats.total} label="Productos" />
          <StatCard theme={theme} icon={DollarSign} value={money.format(stats.value)} label="Valor total" />
          <StatCard theme={theme} icon={TriangleAlert} value={stats.low} label="Stock bajo" warning />
          <StatCard theme={theme} icon={TrendingUp} value={stats.empty} label="Agotados" danger />
        </section>

        <section className="my-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className={`flex h-11 w-full max-w-xl items-center gap-3 rounded-lg border px-3 ${theme.input}`}>
            <Search size={18} />
            <input value={query} onChange={(event) => onQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Buscar producto, categoria, codigo o comentario..." />
          </label>
          <div className="flex gap-2 overflow-x-auto">
            {filterOptions.map(([value, label]) => (
              <button key={value} type="button" onClick={() => onFilter(value)} className={`h-11 rounded-lg border px-4 text-sm font-extrabold ${filter === value ? theme.accent : `${theme.panelSoft} ${theme.text}`}`}>
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className={`overflow-hidden rounded-lg border ${theme.panel}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] table-fixed border-collapse">
              <thead className={theme.tableHead}>
                <tr className="text-left text-xs font-extrabold uppercase tracking-wide">
                  <th className="w-[24%] px-4 py-4">Producto</th>
                  <th className="w-[12%] px-4 py-4">Categoria</th>
                  <th className="w-[12%] px-4 py-4">Precio</th>
                  <th className="w-[13%] px-4 py-4">Existencias</th>
                  <th className="w-[12%] px-4 py-4">Estado</th>
                  <th className="w-[17%] px-4 py-4">Comentarios</th>
                  <th className="w-[10%] px-4 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <ProductRow key={product.code} product={product} theme={theme} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </tbody>
            </table>
          </div>
          {products.length === 0 && <p className={`py-10 text-center font-semibold ${theme.muted}`}>No hay productos que coincidan con la busqueda.</p>}
        </section>
      </main>
    </>
  );
}

function StatCard({ theme, icon: Icon, value, label, warning, danger }) {
  const iconClass = danger ? "bg-red-500/15 text-red-500" : warning ? "bg-amber-500/15 text-amber-500" : theme.softAccent;
  return (
    <article className={`flex min-h-24 items-center gap-4 rounded-lg border p-5 ${theme.panel}`}>
      <span className={`grid size-10 place-items-center rounded-lg ${iconClass}`}>
        <Icon size={20} />
      </span>
      <span>
        <strong className="block text-2xl font-extrabold">{value}</strong>
        <span className={`block text-xs ${theme.muted}`}>{label}</span>
      </span>
    </article>
  );
}

function ProductRow({ product, theme, onEdit, onDelete }) {
  return (
    <tr className={`border-t ${theme.row}`}>
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {product.image ? (
            <img src={product.image} alt="" className="size-10 rounded-lg object-cover" />
          ) : (
            <span className={`grid size-10 place-items-center rounded-lg ${theme.softAccent}`}><Package size={18} /></span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-extrabold">{product.name}</span>
            <span className={`block truncate text-xs ${theme.muted}`}>Codigo: {product.code}</span>
          </span>
        </div>
      </td>
      <td className="px-4 py-3"><Pill className={theme.softAccent}>{product.category}</Pill></td>
      <td className="px-4 py-3 font-extrabold">{money.format(product.price)}</td>
      <td className="px-4 py-3 font-extrabold">{product.stock} <StockPill product={product} /></td>
      <td className="px-4 py-3"><Pill className={tagClass(product.tag)}>{product.tag}</Pill></td>
      <td className={`truncate px-4 py-3 text-sm font-semibold ${theme.muted}`} title={product.comments || ""}>{product.comments || "Sin comentarios"}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button type="button" onClick={() => onEdit(product)} className={`grid size-9 place-items-center rounded-lg ${theme.panelSoft}`}>
            <Pencil size={17} />
          </button>
          <button type="button" onClick={() => onDelete(product.code)} className={`grid size-9 place-items-center rounded-lg ${theme.panelSoft}`}>
            <Trash2 size={17} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ProductDrawer({ product, onClose, onSubmit }) {
  const title = product ? "Editar Producto" : "Agregar Producto";

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-[1px]">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-[512px] overflow-y-auto overflow-x-hidden rounded-lg bg-white p-6 text-neutral-950 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-full text-neutral-600 hover:bg-neutral-100" aria-label="Cerrar formulario">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4">
          <ModalField label="Nombre *" name="name" defaultValue={product?.name} required autoFocus className="sm:col-span-2" />

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <ModalField label="Categoria" name="category" defaultValue={product?.category} required />
            <ModalField label="Codigo de producto" name="code" defaultValue={product?.code} required />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <ModalField label="Precio *" name="price" type="number" min="0" defaultValue={product?.price} required />
            <ModalField label="Stock *" name="stock" type="number" min="0" defaultValue={product?.stock} required />
            <ModalField label="Stock Min." name="minStock" type="number" min="0" defaultValue={product?.minStock ?? 5} />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <ModalField label="Precio de compra" name="purchasePrice" type="number" min="0" defaultValue={product?.purchasePrice || ""} />
            <ModalField label="Marca" name="brand" defaultValue={product?.brand || ""} />
          </div>

          <ModalField label="URL de Imagen" name="image" defaultValue={product?.image || ""} placeholder="https://..." />

          <label className="grid gap-2">
            <span className="text-sm font-bold text-neutral-600">Descripcion</span>
            <textarea name="comments" defaultValue={product?.comments || ""} className="min-h-[62px] w-full min-w-0 resize-y rounded-lg border border-pink-300 px-3 py-3 text-sm text-neutral-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200" />
          </label>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-neutral-300 bg-white px-5 text-sm font-extrabold text-neutral-600 hover:bg-neutral-50">Cancelar</button>
          <button type="submit" className="h-10 rounded-lg bg-pink-500 px-7 text-sm font-extrabold text-white hover:bg-pink-600">{product ? "Guardar Cambios" : "Guardar Producto"}</button>
        </div>
      </form>
    </div>
  );
}

function ModalField({ label, className = "", ...props }) {
  return (
    <label className={`grid min-w-0 gap-2 ${className}`}>
      <span className="text-sm font-bold text-neutral-600">{label}</span>
      <input {...props} className="h-[43px] w-full min-w-0 rounded-lg border border-pink-300 px-3 text-sm text-neutral-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-200" />
    </label>
  );
}
function Pill({ children, className }) {
  return <span className={`inline-flex min-h-6 items-center rounded-full px-3 text-xs font-extrabold ${className}`}>{children}</span>;
}

function StockPill({ product }) {
  if (product.stock === 0) return <Pill className="bg-red-500/15 text-red-500">Agotado</Pill>;
  if (product.stock <= lowStockLimit(product)) return <Pill className="bg-amber-500/15 text-amber-500">Stock bajo</Pill>;
  return <Pill className="bg-emerald-500/15 text-emerald-500">En stock</Pill>;
}

function lowStockLimit(product) {
  return Number(product.minStock || 3);
}

function tagClass(tag) {
  if (tag === "Agotado") return "bg-red-500/15 text-red-500";
  if (tag === "Reparacion") return "bg-orange-500/15 text-orange-500";
  if (tag === "Campana") return "bg-violet-500/15 text-violet-500";
  return "bg-blue-500/15 text-blue-500";
}

function matchesSearch(product, query) {
  if (!query.trim()) return true;
  const needle = query.toLowerCase();
  return [product.name, product.code, product.category, product.tag, product.comments].some((value) => String(value || "").toLowerCase().includes(needle));
}

function matchesFilter(product, filter) {
  if (filter === "stock") return product.stock > 3;
  if (filter === "low") return product.stock > 0 && product.stock <= lowStockLimit(product);
  if (filter === "empty") return product.stock === 0;
  return true;
}


