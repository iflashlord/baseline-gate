import dataset from "web-features/data.json";

type FeatureEntry = {
  kind: "feature";
  name?: string;
  description?: string;
  spec?: unknown;
  compat_features?: unknown;
  status?: {
    baseline?: "low" | "high" | false;
    baseline_low_date?: string | null;
    baseline_high_date?: string | null;
    support?: Record<string, unknown> | null;
  } | null;
};

type MovedEntry = {
  kind: "moved";
  redirect_target?: string | null;
};

type SplitEntry = {
  kind: "split";
  redirect_targets?: (string | null)[] | null;
};

type CatalogEntry = FeatureEntry | MovedEntry | SplitEntry | undefined;

const catalog = ((dataset as unknown as { features?: Record<string, CatalogEntry> }).features) ?? {};

export type SupportMatrix = {
  chrome?: number;
  edge?: number;
  firefox?: number;
  safari?: number;
};

export type BaselineLevel = "low" | "high" | null;

export type BaselineFeature = {
  id: string;
  name: string;
  description?: string;
  baseline: BaselineLevel;
  baselineLowDate?: string;
  baselineHighDate?: string;
  support: SupportMatrix;
  docsUrl?: string;
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const match = value.match(/[0-9]+(\.[0-9]+)?/);
    if (!match) {
      return undefined;
    }
    const parsed = Number.parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function isFeature(entry: CatalogEntry): entry is FeatureEntry {
  return Boolean(entry && entry.kind === "feature");
}

function isMoved(entry: CatalogEntry): entry is MovedEntry {
  return Boolean(entry && entry.kind === "moved");
}

function isSplit(entry: CatalogEntry): entry is SplitEntry {
  return Boolean(entry && entry.kind === "split");
}

function resolveFeature(id: string, seen = new Set<string>()): { feature: FeatureEntry; resolvedId: string } | null {
  if (seen.has(id)) {
    return null;
  }
  seen.add(id);

  const entry: CatalogEntry = catalog[id];
  if (!entry) {
    return null;
  }

  if (isFeature(entry)) {
    return { feature: entry, resolvedId: id };
  }

  if (isMoved(entry) && entry.redirect_target) {
    return resolveFeature(entry.redirect_target, seen);
  }

  if (isSplit(entry) && entry.redirect_targets?.length) {
    const target = entry.redirect_targets.find((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);
    if (target) {
      return resolveFeature(target, seen);
    }
  }

  return null;
}

export function getFeatureById(id: string): BaselineFeature | null {
  const resolved = resolveFeature(id);
  if (!resolved) {
    return null;
  }

  const { feature, resolvedId } = resolved;
  const status = feature.status ?? {};
  const supportRoot = status.support ?? {};

  const support: SupportMatrix = {
    chrome: toNumber((supportRoot as Record<string, unknown>).chrome),
    edge: toNumber((supportRoot as Record<string, unknown>).edge),
    firefox: toNumber((supportRoot as Record<string, unknown>).firefox),
    safari: toNumber((supportRoot as Record<string, unknown>).safari)
  };

  const baselineRaw = status.baseline;
  const baseline: BaselineLevel = baselineRaw === "low" || baselineRaw === "high" ? baselineRaw : null;

  return {
    id: resolvedId,
    name: feature.name ?? resolvedId,
    description: feature.description,
    baseline,
    baselineLowDate: status.baseline_low_date ?? undefined,
    baselineHighDate: status.baseline_high_date ?? undefined,
    support,
    docsUrl: pickDocsUrl(feature)
  };
}

function pickDocsUrl(entry: FeatureEntry): string | undefined {
  const specCandidates = toStringArray(entry.spec).filter(isValidUrl);
  if (specCandidates.length) {
    return specCandidates[0];
  }

  const compatCandidates = toStringArray(entry.compat_features);
  for (const id of compatCandidates) {
    const mdn = compatIdToMdn(id);
    if (mdn) {
      return mdn;
    }
  }

  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return [];
}

function isValidUrl(candidate: string): boolean {
  try {
    new URL(candidate);
    return true;
  } catch {
    return false;
  }
}

function compatIdToMdn(id: string): string | undefined {
  if (!id) {
    return undefined;
  }

  const [domain, ...rest] = id.split(".");
  if (!domain || rest.length === 0) {
    return undefined;
  }

  const mdnBase = "https://developer.mozilla.org/docs/";

  const join = (segments: string[]) => segments.filter(Boolean).join("/");

  switch (domain) {
    case "api":
      return `${mdnBase}Web/API/${join(rest)}`;
    case "css": {
      const [category, ...tail] = rest;
      if (!category) {
        return undefined;
      }
      const cssBase = `${mdnBase}Web/CSS/`;

      if (category === "at-rules" && tail.length) {
        const [rule, ...ruleRest] = tail;
        const ruleName = rule.startsWith("@") ? rule : `@${rule}`;
        return cssBase + join([ruleName, ...ruleRest]);
      }

      if (category === "descriptors" && tail.length) {
        const [rule, ...descriptorRest] = tail;
        const ruleName = rule.startsWith("@") ? rule : `@${rule}`;
        return cssBase + join([ruleName, ...descriptorRest]);
      }

      if (category === "properties" || category === "functions" || category === "selectors" || category === "types") {
        return cssBase + join(tail);
      }

      return cssBase + join([category, ...tail]);
    }
    case "html":
      return `${mdnBase}Web/HTML/${join(rest)}`;
    case "http":
      return `${mdnBase}Web/HTTP/${join(rest)}`;
    case "svg":
      return `${mdnBase}Web/SVG/${join(rest)}`;
    case "mathml":
      return `${mdnBase}Web/MathML/${join(rest)}`;
    case "javascript":
      return `${mdnBase}Web/JavaScript/${join(rest)}`;
    case "webassembly":
      return `${mdnBase}WebAssembly/${join(rest)}`;
    default:
      return undefined;
  }
}
