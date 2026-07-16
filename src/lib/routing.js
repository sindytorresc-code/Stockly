import { businessRoutes, businesses, routeBase } from "../data/businesses.js";

function normalizeRouteSegment(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function businessFromPath(pathname = window.location.pathname) {
  const cleanPath = pathname.replace(/\/$/, "");
  const routeSegment = decodeURIComponent(
    cleanPath.replace(new RegExp(`^${routeBase}`, "i"), "").split("/").filter(Boolean)[0] || "",
  );
  if (!routeSegment) return null;

  const normalizedRoute = normalizeRouteSegment(routeSegment);
  return (
    businesses.find((business) => {
      return (
        normalizeRouteSegment(businessRoutes[business.id]) === normalizedRoute ||
        normalizeRouteSegment(business.id) === normalizedRoute ||
        normalizeRouteSegment(business.name) === normalizedRoute
      );
    }) || null
  );
}

export function businessPath(business) {
  return `${routeBase}/${businessRoutes[business.id] || business.id}`;
}

export function navigateToPath(path, replace = false) {
  if (window.location.pathname === path) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", path);
}

export function clientsPath() {
  return `${routeBase}/`;
}
