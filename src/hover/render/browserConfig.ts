import type { BrowserKey } from "../../core/baselineData";
import { readBrowserDisplaySettings } from "../../extension";

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