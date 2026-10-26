import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { businessThemeStyle, STANDARD_BRAND_COLORS, isValidHexColor, validateBrandLogo } from "../lib/businessTheme.js";
import { iconMap } from "../lib/icons.js";

const ICON_OPTIONS = Object.keys(iconMap);

export default function BrandingEditor({ value, onChange, error, onError, showCompanyName = false }) {
  const brandColor = value.brandColor || "";
  const previewColor = brandColor || STANDARD_BRAND_COLORS[0].value;
  const [hexDraft, setHexDraft] = useState(brandColor);

  function changeColor(color) {
    setHexDraft(color);
    onError("");
    onChange({ ...value, brandColor: color });
  }

  function updateHex(input) {
    setHexDraft(input);
    if (isValidHexColor(input)) changeColor(input.trim().toLowerCase());
    else {
      onChange({ ...value, brandColor: "" });
      onError("Escribe un color HEX válido, por ejemplo #db2777.");
    }
  }

  function chooseLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = validateBrandLogo(file);
    if (validationError) {
      onError(validationError);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => onError("No se pudo leer el archivo del logo.");
    reader.onload = () => {
      onError("");
      onChange({ ...value, logoDataUrl: String(reader.result || "") });
    };
    reader.readAsDataURL(file);
  }

  const PreviewIcon = iconMap[value.icon] || iconMap.package;
  const previewTokens = businessThemeStyle({ brandColor: previewColor });

  return (
    <div className="space-y-4">
      {showCompanyName && (
        <label className="block text-sm font-bold">
          Nombre de la empresa
          <input
            value={value.name || ""}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            maxLength={80}
            required
            aria-label="Nombre de la empresa"
            className="mt-1 h-11 w-full rounded-lg border px-3 font-normal"
          />
        </label>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Color de marca</legend>
        <div className="flex flex-wrap gap-2">
          {STANDARD_BRAND_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              aria-label={`Color ${color.name}`}
              aria-pressed={brandColor.toLowerCase() === color.value}
              title={color.name}
              onClick={() => changeColor(color.value)}
              className={`size-8 rounded-full border-2 ${brandColor.toLowerCase() === color.value ? "border-slate-950 ring-2 ring-slate-300" : "border-white shadow"}`}
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>
        <label className="mt-3 flex items-center gap-3 text-sm font-semibold">
          Más colores…
          <input
            aria-label="Elegir más colores"
            type="color"
            value={isValidHexColor(brandColor) ? brandColor : "#4f46e5"}
            onChange={(event) => changeColor(event.target.value)}
            className="size-9 cursor-pointer rounded border p-0.5"
          />
          <input
            aria-label="Color HEX"
            value={hexDraft}
            onChange={(event) => updateHex(event.target.value)}
            onBlur={() => { if (isValidHexColor(hexDraft)) setHexDraft(hexDraft.trim().toLowerCase()); }}
            placeholder="#db2777"
            maxLength={7}
            className="h-9 w-28 rounded border px-2 font-mono text-sm"
          />
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Icono</legend>
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map((iconName) => {
            const Icon = iconMap[iconName];
            return (
              <button
                key={iconName}
                type="button"
                aria-label={`Icono ${iconName}`}
                aria-pressed={(value.icon || "package") === iconName}
                onClick={() => onChange({ ...value, icon: iconName })}
                className={`grid size-10 place-items-center rounded-lg border ${(value.icon || "package") === iconName ? "border-slate-900 bg-slate-100" : "border-slate-200"}`}
              ><Icon size={19} /></button>
            );
          })}
        </div>
      </fieldset>

      <label className="block text-sm font-bold">
        Logo (opcional)
        <span className="mt-1 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 font-medium text-slate-600">
          <ImagePlus size={18} /> Subir PNG, JPG o WebP (máx. 250 KB)
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseLogo} className="sr-only" />
        </span>
      </label>
      {value.logoDataUrl && (
        <div className="flex items-center gap-3">
          <img src={value.logoDataUrl} alt="Vista previa del logo" className="size-12 rounded-lg border object-contain" />
          <button type="button" onClick={() => onChange({ ...value, logoDataUrl: "" })} className="text-sm font-semibold text-red-700">Quitar logo</button>
        </div>
      )}

      <div className="rounded-xl border p-4" style={{ borderColor: `${previewColor}55` }}>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Vista previa</p>
        <div className="flex items-center gap-3 rounded-lg p-3" style={{ color: previewTokens["--brand-contrast"], background: `linear-gradient(135deg, ${previewColor}, color-mix(in srgb, ${previewColor} 72%, #111827))` }}>
          {value.logoDataUrl ? <img src={value.logoDataUrl} alt="" className="size-10 rounded-md bg-white object-contain p-1" /> : <span className="grid size-10 place-items-center rounded-md bg-white/20"><PreviewIcon size={22} /></span>}
          <span className="font-bold">Nombre de la empresa</span>
        </div>
        <button type="button" className="mt-3 rounded-md px-3 py-2 text-sm font-bold" style={{ backgroundColor: previewColor, color: previewTokens["--brand-contrast"] }}>Botón de ejemplo</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
