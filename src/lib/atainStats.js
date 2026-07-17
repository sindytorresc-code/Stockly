export const ATAIN_ASSET_CHART = [
  { key: "desktop", label: "Desktop", color: "#3b82f6" },
  { key: "pantalla", label: "Pantalla", color: "#06b6d4" },
  { key: "headset", label: "Headset", color: "#a855f7" },
  { key: "mouse", label: "Mouse", color: "#22c55e" },
  { key: "teclado", label: "Teclado", color: "#f97316" },
];

export function computeAtainAssetBreakdown(products) {
  const counts = Object.fromEntries(ATAIN_ASSET_CHART.map(({ key }) => [key, 0]));

  for (const product of products) {
    const key = String(product.category || "").trim().toLowerCase();
    if (key in counts) counts[key] += 1;
  }

  return ATAIN_ASSET_CHART.map(({ key, label, color }) => ({
    key,
    label,
    color,
    count: counts[key],
  }));
}
