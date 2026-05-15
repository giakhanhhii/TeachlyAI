import { LS_RECOMMEND_PANEL_VISIBLE } from "../constants.js";

const listeners = new Set();

function readStoredVisibility() {
  try {
    return localStorage.getItem(LS_RECOMMEND_PANEL_VISIBLE) === "1";
  } catch {
    return false;
  }
}

let recommendPanelVisible = readStoredVisibility();

function notifyVisibilityListeners() {
  listeners.forEach((listener) => {
    try {
      listener(recommendPanelVisible);
    } catch (err) {
      console.error("Recommend panel visibility listener failed:", err);
    }
  });
}

export function isRecommendPanelVisible() {
  return recommendPanelVisible;
}

export function setRecommendPanelVisible(next) {
  const normalized = Boolean(next);
  if (recommendPanelVisible === normalized) return normalized;
  recommendPanelVisible = normalized;
  try {
    localStorage.setItem(LS_RECOMMEND_PANEL_VISIBLE, normalized ? "1" : "0");
  } catch {
    // Ignore storage write failures and keep the in-memory preference.
  }
  notifyVisibilityListeners();
  return recommendPanelVisible;
}

export function subscribeRecommendPanelVisibility(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
