import type { BaselineFeature } from "../../core/baselineData";
import type { Target } from "../../core/targets";
import type { Verdict } from "../../core/scoring";
import { TARGET_MIN } from "../../core/targets";
import { DESKTOP_BROWSERS } from "./browserConfig";
import { getFilteredBrowsers } from "./browserConfig";
import type { HoverRenderOptions } from "./types";
import {
  capitalize,
  escapeMarkdown,
  baselineIcon,
  formatBaselineDates,
  formatExternalLink,
  makeMarkdownLink,
  formatLinkHostname,
  dedupe
} from "./formatUtils";

export function buildSummaryLines(
  feature: BaselineFeature,
  verdict: Verdict,
  target: Target,
  options: HoverRenderOptions
): string[] {
  const lines: string[] = [];
  lines.push(`${verdictBadge(verdict)} for **${capitalize(target)}** targets`);
  lines.push(formatBaselineSummary(feature, options));
  return lines;
}

export function verdictBadge(verdict: Verdict): string {
  switch (verdict) {
    case "safe":
      return "$(check) Safe";
    case "warning":
      return "$(warning) Needs review";
    case "blocked":
      return "$(circle-slash) Blocked";
    default:
      return verdict;
  }
}

export function formatBaselineSummary(feature: BaselineFeature, options: HoverRenderOptions): string {
  const icon = baselineIcon(feature, options);
  const prefix = icon ? `${icon}&nbsp;` : "";
  if (feature.baseline === "high") {
    return `${prefix}Baseline: **High**${formatBaselineDates(feature)}`;
  }
  if (feature.baseline === "low") {
    return `${prefix}Baseline: **Low**${formatBaselineDates(feature)}`;
  }
  return `${prefix}Baseline: Limited availability`;
}

export function formatDiscouraged(feature: BaselineFeature): string | undefined {
  const info = feature.discouraged;
  if (!info) {
    return undefined;
  }

  const sources = info.accordingTo.map((url) => formatExternalLink(url)).filter(Boolean);
  if (!sources.length) {
    return undefined;
  }

  const sourceLabel = sources.join(" · ");
  const altLabel = info.alternatives?.length
    ? ` · Alternatives: ${info.alternatives.map((alt) => `\`${alt}\``).join(", ")}`
    : "";
  return `$(alert) **Discouraged** — Review guidance from ${sourceLabel}${altLabel}`;
}

export function buildContextItems(feature: BaselineFeature): string[] {
  const items: string[] = [];

  if (feature.groups.length) {
    const groupLabels = feature.groups.map((group) => {
      if (group.parentName && group.parentName !== group.name) {
        return `${group.name} (parent: ${group.parentName})`;
      }
      return group.name;
    });
    items.push(`Groups: ${groupLabels.join(", ")}`);
  }

  if (feature.snapshots.length) {
    const snapshotLabels = feature.snapshots.map((snapshot) => snapshot.name);
    items.push(`Snapshot references: ${snapshotLabels.join(", ")}`);
  }

  if (feature.compatFeatures.length) {
    items.push(`MDN compatibility sources: ${feature.compatFeatures.length}`);
  }

  return items;
}

export function buildFallbackTips(feature: BaselineFeature, verdict: Verdict, target: Target): string[] {
  const tips: string[] = [];
  const required = TARGET_MIN[target];

  const missing: string[] = [];
  const gaps: string[] = [];

  for (const browser of DESKTOP_BROWSERS) {
    const min = required[browser.key];
    if (min === undefined || min === null) {
      continue;
    }
    const support = feature.support[browser.key];
    if (!support || typeof support.version !== "number") {
      missing.push(browser.label);
    } else if (support.version < min) {
      gaps.push(`${browser.label} (needs ${min})`);
    }
  }

  if (gaps.length) {
    tips.push(`Progressively enhance for ${gaps.join(", ")} or provide an alternative experience.`);
  }

  if (missing.length) {
    tips.push(`Support data is incomplete for ${missing.join(", ")}; test manually before shipping.`);
  }

  if (feature.baseline === null) {
    tips.push("Not part of Baseline yet; use feature detection or a polyfill for older browsers.");
  }

  if (verdict !== "safe") {
    tips.push("Guard usage with runtime feature detection before relying on it.");
  }

  if (!tips.length) {
    tips.push(`Feature meets the ${capitalize(target)} baseline.`);
  }

  return dedupe(tips);
}

export function buildResourceLinks(feature: BaselineFeature): string[] {
  const links: string[] = [];

  if (feature.docsUrl) {
    const args = encodeURIComponent(JSON.stringify({ id: feature.id }));
    links.push(`[Open Baseline details ↗](command:baseline-gate.openDocs?${args})`);
  }

  if (feature.specUrls.length) {
    for (const url of feature.specUrls.slice(0, 2)) {
      const label = `Spec (${formatLinkHostname(url)})`;
      links.push(makeMarkdownLink(label, url));
    }
  }

  if (feature.caniuseIds.length) {
    for (const id of feature.caniuseIds.slice(0, 2)) {
      const url = `https://caniuse.com/${id}`;
      links.push(makeMarkdownLink(`Can I use: ${id}`, url));
    }
  }

  if (feature.discouraged?.accordingTo?.length) {
    for (const source of feature.discouraged.accordingTo.slice(0, 2)) {
      const formatted = formatExternalLink(source);
      if (formatted) {
        links.push(formatted);
      }
    }
  }

  links.push(`[Baseline guide ↗](https://web.dev/articles/baseline-tools-web-features)`);

  return dedupe(links);
}

export function buildHoverContentForGemini(feature: BaselineFeature, verdict: Verdict, target: Target): string {
  const parts: string[] = [];
  
  parts.push(`Feature: ${feature.name}`);
  parts.push(`Status: ${verdict} for ${target} targets`);
  parts.push(`Baseline: ${feature.baseline}`);
  
  if (feature.description) {
    parts.push(`Description: ${feature.description}`);
  }

  // Add support information
  const browsers = getFilteredBrowsers();
  const supportInfo: string[] = [];
  
  for (const browser of browsers) {
    const support = feature.support[browser.key];
    if (support) {
      const version = support.version;
      const raw = support.raw;
      if (raw) {
        supportInfo.push(`${browser.label}: ${raw}`);
      } else if (version) {
        supportInfo.push(`${browser.label}: Since version ${version}`);
      } else {
        supportInfo.push(`${browser.label}: Supported`);
      }
    }
  }
  
  if (supportInfo.length > 0) {
    parts.push(`Browser Support: ${supportInfo.join(', ')}`);
  }

  return parts.join('\n');
}