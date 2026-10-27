import {
  ArrowLeft,
  Boxes,
  ChartNoAxesColumn,
  Clock3,
  LogOut,
  Package,
  Settings2,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import { iconMap } from "../lib/icons.js";

function SidebarContents({
  business,
  theme,
  activeSection,
  onNavigate,
  onBack,
  onManageAccess,
  onManageBranding,
  onChangePassword,
  onSignOut,
  onClose,
  isAtain,
}) {
  const BusinessIcon = iconMap[business.icon] || iconMap.package;
  const linkClass = (active) => `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${active ? theme.accent : `${theme.text} hover:opacity-75`}`;

  const navigate = (section) => {
    onNavigate(section);
    onClose?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <div className="flex items-center justify-between gap-2 border-b pb-4" style={{ borderColor: "var(--brand-border, #e2e8f0)" }}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft,#f1f5f9)] text-[var(--brand-accent,#334155)]">
            <Boxes size={21} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className={`block text-[10px] font-bold uppercase tracking-[0.16em] ${theme.muted}`}>Inventario empresarial</span>
            <span className="block text-lg font-extrabold tracking-tight">Stockly</span>
          </span>
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Cerrar menú" className={`grid size-9 place-items-center rounded-lg ${theme.panelSoft} lg:hidden`}><X size={18} /></button>}
      </div>

      <nav aria-label="Navegación del inventario" className="mt-5 grid gap-1">
        <p className={`mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] ${theme.muted}`}>Espacio de trabajo</p>
        <button type="button" onClick={() => navigate("overview")} aria-current={activeSection === "overview" ? "page" : undefined} className={linkClass(activeSection === "overview")}>
          <ChartNoAxesColumn size={18} aria-hidden="true" /> Inventario
        </button>
        <button type="button" onClick={() => navigate("products")} aria-current={activeSection === "products" ? "page" : undefined} className={linkClass(activeSection === "products")}>
          <Package size={18} aria-hidden="true" /> {isAtain ? "Activos" : "Productos"}
        </button>
        <button type="button" onClick={() => navigate("categories")} aria-current={activeSection === "categories" ? "page" : undefined} className={linkClass(activeSection === "categories")}>
          <Tag size={18} aria-hidden="true" /> {isAtain ? "Tipos de activos" : "Categorías"}
        </button>
        <button type="button" onClick={() => navigate("history")} aria-current={activeSection === "history" ? "page" : undefined} className={linkClass(activeSection === "history")}>
          <Clock3 size={18} aria-hidden="true" /> Movimientos
        </button>
      </nav>

      {(onManageAccess || onManageBranding || onChangePassword) && (
        <nav aria-label="Administración de la empresa" className="mt-6 grid gap-1">
          <p className={`mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] ${theme.muted}`}>Administración</p>
          {onManageAccess && <button type="button" onClick={() => { onManageAccess(); onClose?.(); }} className={linkClass(false)}><ShieldCheck size={18} aria-hidden="true" /> Usuarios y roles</button>}
          {onManageBranding && <button type="button" onClick={() => { onManageBranding(); onClose?.(); }} className={linkClass(false)}><Settings2 size={18} aria-hidden="true" /> Personalizar marca</button>}
          {onChangePassword && <button type="button" onClick={() => { onChangePassword(); onClose?.(); }} className={linkClass(false)}><Settings2 size={18} aria-hidden="true" /> Cambiar clave</button>}
        </nav>
      )}

      <div className="mt-auto pt-5">
        <div className={`rounded-2xl border p-3 ${theme.panelSoft}`}>
          <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.14em] ${theme.muted}`}>Empresa activa</p>
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl ${theme.softAccent}`}>
              {business.brandConfig?.logoDataUrl ? <img src={business.brandConfig.logoDataUrl} alt={`${business.name} logo`} className="size-full bg-white object-contain p-1" /> : <BusinessIcon size={19} aria-hidden="true" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{business.name}</span>
              <span className={`block truncate text-xs ${theme.muted}`}>{business.type}</span>
            </span>
          </div>
          <button type="button" onClick={() => { onBack(); onClose?.(); }} className={`mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold ${theme.text}`} style={{ borderColor: "var(--brand-border, #e2e8f0)" }}>
            <ArrowLeft size={15} aria-hidden="true" /> Cambiar empresa
          </button>
        </div>
        {onSignOut && <button type="button" onClick={onSignOut} className={`mt-2 flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold ${theme.muted} transition hover:opacity-75`}><LogOut size={17} aria-hidden="true" /> Cerrar sesión</button>}
      </div>
    </div>
  );
}

export function InventorySidebar({ mobile = false, open = false, onClose, ...props }) {
  if (mobile) {
    return (
      <>
        {open && <button type="button" aria-label="Cerrar menú" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" />}
        <aside aria-hidden={!open} inert={!open} className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] overflow-y-auto border-r shadow-2xl transition-transform duration-200 lg:hidden ${open ? "translate-x-0" : "-translate-x-full pointer-events-none"} ${props.theme.panel} ${props.theme.text}`}>
          <SidebarContents {...props} onClose={onClose} isAtain={props.business.id === "atain"} />
        </aside>
      </>
    );
  }

  return (
    <aside className={`sticky top-0 hidden h-screen min-h-[40rem] w-[250px] overflow-y-auto border-r lg:block ${props.theme.panel} ${props.theme.text}`}>
      <SidebarContents {...props} isAtain={props.business.id === "atain"} />
    </aside>
  );
}
