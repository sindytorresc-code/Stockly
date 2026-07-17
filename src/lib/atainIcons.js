import { Headphones, Keyboard, Monitor, Mouse, Package } from "lucide-react";

const atainAssetIconMap = {
  desktop: Monitor,
  pantalla: Monitor,
  headset: Headphones,
  mouse: Mouse,
  teclado: Keyboard,
};

export function getAtainAssetIcon(category) {
  const key = String(category || "").trim().toLowerCase();
  return atainAssetIconMap[key] || Package;
}
