/**
 * Browser configuration and filtering utilities
 */

import type { BrowserKey } from "../core/baselineData";
import { readBrowserDisplaySettings } from "../extension";

export const DESKTOP_BROWSERS: Array<{ key: BrowserKey; label: string }> = [
  { key: "chrome", label: "Chrome" },
  { key: "edge", label: "Edge" },
  { key: "firefox", label: "Firefox" },
  { key: "safari", label: "Safari" }
];

export const MOBILE_BROWSERS: Array<{ key: BrowserKey; label: string }> = [
  { key: "chrome_android", label: "Chrome Android" },
  { key: "firefox_android", label: "Firefox Android" },
  { key: "safari_ios", label: "Safari iOS" }
];

/**
 * Gets filtered browsers based on user settings
 */
export function getFilteredBrowsers(): Array<{ key: BrowserKey; label: string }> {
  const settings = readBrowserDisplaySettings();
  const browsers: Array<{ key: BrowserKey; label: string }> = [];
  
  if (settings.showDesktop) {
    browsers.push(...DESKTOP_BROWSERS);
  }
  
  if (settings.showMobile) {
    browsers.push(...MOBILE_BROWSERS);
  }
  
  return browsers;
}

/**
 * Maps file extensions to variant names
 */
export function extensionToVariant(extension: string): string {
  const ext = extension.toLowerCase();
  if (ext === "js" || ext === "mjs" || ext === "cjs") {
    return "js";
  }
  if (ext === "ts") {
    return "ts";
  }
  if (ext === "tsx") {
    return "tsx";
  }
  if (ext === "jsx") {
    return "jsx";
  }
  if (ext === "css") {
    return "css";
  }
  if (ext === "scss" || ext === "sass") {
    return "scss";
  }
  return "default";
}