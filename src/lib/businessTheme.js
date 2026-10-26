export const STANDARD_BRAND_COLORS = [
  { name: "Índigo", value: "#4f46e5" },
  { name: "Azul", value: "#2563eb" },
  { name: "Rosa", value: "#db2777" },
  { name: "Violeta", value: "#7c3aed" },
  { name: "Verde", value: "#15803d" },
  { name: "Esmeralda", value: "#059669" },
  { name: "Ámbar", value: "#d97706" },
  { name: "Terracota", value: "#c2410c" },
  { name: "Grafito", value: "#475569" },
];

const LEGACY_ACCENT_COLORS = {
  blue: "#2563eb",
  pink: "#db2777",
  violet: "#7c3aed",
  purple: "#7c3aed",
  green: "#15803d",
  emerald: "#059669",
  gold: "#d97706",
  amber: "#d97706",
  orange: "#c2410c",
  slate: "#475569",
  stone: "#475569",
};

export function isValidHexColor(value) {
  return /^#[\da-f]{6}$/i.test(String(value || "").trim());
}

export function normalizeHexColor(value) {
  const normalized = String(value || "").trim();
  return isValidHexColor(normalized) ? normalized.toLowerCase() : "";
}

export function validateBrandLogo(file) {
  if (!file) return "";
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) return "El logo debe ser PNG, JPG o WebP.";
  if (file.size > 250 * 1024) return "El logo debe pesar 250 KB o menos.";
  return "";
}

function getBrandTokens(hex) {
  const value = hex.slice(1);
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  const linearize = (channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
  return {
    "--brand-accent": hex,
    "--brand-accent-dark": `color-mix(in srgb, ${hex} 78%, #111827)`,
    "--brand-soft": `color-mix(in srgb, ${hex} 11%, white)`,
    "--brand-dark-soft": `color-mix(in srgb, ${hex} 18%, #0f172a)`,
    "--brand-border": `color-mix(in srgb, ${hex} 25%, #e2e8f0)`,
    "--brand-accent-ink": `color-mix(in srgb, ${hex} 70%, #111827)`,
    "--brand-contrast": luminance > 0.179 ? "#111827" : "#ffffff",
    "--brand-light-ink": `color-mix(in srgb, ${hex} 45%, white)`,
  };
}

export function businessThemeStyle(theme = {}) {
  const brandColor = normalizeHexColor(theme.brandColor);
  return brandColor ? getBrandTokens(brandColor) : undefined;
}

export function resolveBusinessTheme(defaultTheme = {}, configuredTheme = {}) {
  const stored = configuredTheme && typeof configuredTheme === "object" && !Array.isArray(configuredTheme)
    ? configuredTheme
    : {};
  const theme = { ...defaultTheme, ...stored };
  const legacyAccent = String(stored.accent || "").trim().toLowerCase();
  const accentBrandColor = LEGACY_ACCENT_COLORS[legacyAccent];
  if (!normalizeHexColor(theme.brandColor) && accentBrandColor) theme.brandColor = accentBrandColor;
  if (normalizeHexColor(theme.brandColor)) {
    const isDark = String(theme.mode || defaultTheme.mode || "light").toLowerCase() === "dark";
    theme.brandColor = normalizeHexColor(theme.brandColor);
    theme.header = "from-[var(--brand-accent)] to-[var(--brand-accent-dark)]";
    theme.accent = "bg-[var(--brand-accent)] hover:opacity-90 text-[var(--brand-contrast)]";
    theme.softAccent = isDark
      ? "bg-[var(--brand-dark-soft)] text-[var(--brand-light-ink)]"
      : "bg-[var(--brand-soft)] text-[var(--brand-accent-ink)]";
    theme.appBg = isDark ? defaultTheme.appBg : "bg-[var(--brand-soft)]";
    const panelSurface = isDark ? undefined : "bg-[var(--brand-soft)]";
    theme.panel = `${panelSurface ? defaultTheme.panel?.replace(/bg-[^ ]+/, panelSurface) : (defaultTheme.panel || "bg-slate-900").replace(/border-[^ ]+/, "").trim()} border-[color:var(--brand-border)]`;
    theme.panelSoft = `${panelSurface ? defaultTheme.panelSoft?.replace(/bg-[^ ]+/, panelSurface) : (defaultTheme.panelSoft || "bg-slate-800").replace(/border-[^ ]+/, "").trim()} border-[color:var(--brand-border)]`;
    theme.input = `${defaultTheme.input?.replace(/border-[^ ]+/, "") || "bg-white text-slate-950"} border-[color:var(--brand-border)] focus:border-[color:var(--brand-accent)]`;
    theme.formBorder = "border-[color:var(--brand-border)] focus:border-[color:var(--brand-accent)] focus:ring-[color:var(--brand-soft)]";
    theme.formAccent = "bg-[var(--brand-accent)] hover:opacity-90 text-[var(--brand-contrast)]";
    theme.tableHead = isDark
      ? `${defaultTheme.tableHead?.replace(/border-[^ ]+/, "") || "bg-slate-800 text-slate-300"}`
      : `${defaultTheme.tableHead?.replace(/bg-[^ ]+/, "") || ""} bg-[var(--brand-soft)]`;
    theme.row = "border-[color:var(--brand-border)]";
  }
  return theme;
}

export function themeForBusinessType(type, businesses, fallbackTheme) {
  const normalizedType = String(type || "").trim().toLocaleLowerCase();
  const matchingBusiness = businesses.find(
    (business) => String(business.type || "").trim().toLocaleLowerCase() === normalizedType,
  );
  return matchingBusiness?.theme || fallbackTheme;
}

export const genericBusinessTheme = {
  mode: "light",
  header: "from-stone-700 to-stone-500",
  appBg: "bg-stone-100",
  panel: "bg-white border-stone-200",
  panelSoft: "bg-stone-50 border-stone-200",
  text: "text-stone-950",
  muted: "text-stone-500",
  input: "bg-white border-stone-200 text-stone-950 placeholder:text-stone-400",
  tableHead: "bg-stone-50 text-stone-500",
  row: "border-stone-100",
  accent: "bg-stone-700 hover:bg-stone-600 text-white",
  softAccent: "bg-stone-100 text-stone-700",
  formBorder: "border-stone-300 focus:border-stone-500 focus:ring-stone-200",
  formAccent: "bg-stone-700 hover:bg-stone-600",
};
