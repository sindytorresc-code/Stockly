import { defaultProducts } from "../data/businesses.js";

const PRODUCTS_KEY = "inventory-products-react";
const PINS_KEY = "inventory-pins-react";

export function loadPins() {
  try {
    return JSON.parse(localStorage.getItem(PINS_KEY)) || {};
  } catch {
    return {};
  }
}

export function savePins(pins) {
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify(pins));
  } catch (error) {
    console.error("No se pudo guardar el PIN localmente", error);
  }
}

export function loadProducts() {
  try {
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || defaultProducts;
  } catch {
    return defaultProducts;
  }
}

export function saveProducts(products) {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch (error) {
    console.error("No se pudo guardar el inventario localmente", error);
    throw error;
  }
}

export function getBusinessPin(business, pinsByBusiness) {
  return pinsByBusiness[business.id] || business.pin;
}
