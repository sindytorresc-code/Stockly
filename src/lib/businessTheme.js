export function resolveBusinessTheme(defaultTheme = {}, configuredTheme = {}) {
  const stored = configuredTheme && typeof configuredTheme === "object" && !Array.isArray(configuredTheme)
    ? configuredTheme
    : {};
  return { ...defaultTheme, ...stored };
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
