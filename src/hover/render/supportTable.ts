import type { BaselineFeature, BrowserKey, SupportStatement } from "../../core/baselineData";
import type { Target } from "../../core/targets";
import { TARGET_MIN } from "../../core/targets";
import { readBrowserDisplaySettings } from "../../extension";
import { DESKTOP_BROWSERS, MOBILE_BROWSERS } from "./browserConfig";
import { formatReleaseDate } from "./formatUtils";

export function buildSupportSection(feature: BaselineFeature, target: Target): string | undefined {
  const targetMin = TARGET_MIN[target];
  const settings = readBrowserDisplaySettings();
  const sections: string[] = [];

  if (settings.showDesktop) {
    const desktop = renderSupportTable("Desktop support", DESKTOP_BROWSERS, feature.support, targetMin);
    if (desktop) {
      sections.push(desktop);
    }
  }

  if (settings.showMobile) {
    const mobile = renderSupportTable("Mobile support", MOBILE_BROWSERS, feature.support, targetMin);
    if (mobile) {
      sections.push(mobile);
    }
  }

  if (!sections.length) {
    return undefined;
  }

  return sections.join("\n");
}

export function renderSupportTable(
  heading: string,
  browsers: Array<{ key: BrowserKey; label: string }>,
  support: BaselineFeature["support"],
  targets: Record<string, number | undefined>
): string | undefined {
  const hasAnyData = browsers.some(
    (browser) => support[browser.key] || targets[browser.key] !== undefined
  );
  if (!hasAnyData) {
    return undefined;
  }

  let table = `**${heading}**\n\n`;
  table += `| Browser | Support | Target | Status |\n| :-- | :--: | :--: | :-- |\n`;

  for (const browser of browsers) {
    const statement = support[browser.key];
    const required = targets[browser.key];
    table += `| ${browser.label} | ${formatSupport(statement)} | ${formatTarget(required)} | ${formatStatus(
      statement,
      required
    )} |\n`;
  }

  table += `\n`;
  return table;
}

function formatSupport(statement: SupportStatement | undefined): string {
  if (!statement?.raw) {
    return "—";
  }

  const release = statement.releaseDate ? ` (${formatReleaseDate(statement.releaseDate)})` : "";
  return `\`${statement.raw}\`${release}`;
}

function formatTarget(value: number | undefined): string {
  if (value === undefined || value === null) {
    return "—";
  }
  return `≥\`${value}\``;
}

function formatStatus(statement: SupportStatement | undefined, required: number | undefined): string {
  if (required === undefined || required === null) {
    return "—";
  }
  if (!statement || typeof statement.version !== "number") {
    return "⚠️ Missing data";
  }
  if (statement.version >= required) {
    return "✅ Meets target";
  }
  return "⛔ Gap";
}