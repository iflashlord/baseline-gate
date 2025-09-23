import dataset from "web-features/data.json";

const BROWSER_KEYS = [
  "chrome",
  "chrome_android",
  "edge",
  "firefox",
  "firefox_android",
  "safari",
  "safari_ios"
] as const;

export type BrowserKey = (typeof BROWSER_KEYS)[number];

type BrowserRelease = { version?: string | null; date?: string | null };

type BrowserEntry = {
  name?: string;
  releases?: BrowserRelease[] | null;
};

type FeatureEntry = {
  kind: "feature";
  name?: string;
  description?: string;
  description_html?: string | null;
  spec?: unknown;
  group?: unknown;
  snapshot?: unknown;
  caniuse?: unknown;
  compat_features?: unknown;
  discouraged?: {
    according_to?: unknown;
    alternatives?: unknown;
  } | null;
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

type DatasetRoot = {
  browsers?: Record<string, BrowserEntry | undefined>;
  features?: Record<string, CatalogEntry | undefined>;
  groups?: Record<string, { name?: string; parent?: string | null } | undefined>;
  snapshots?: Record<string, { name?: string; spec?: string } | undefined>;
};

const datasetRoot = dataset as unknown as DatasetRoot;

const catalog = datasetRoot.features ?? {};
const browsersCatalog = datasetRoot.browsers ?? {};
const groupsCatalog = datasetRoot.groups ?? {};
const snapshotsCatalog = datasetRoot.snapshots ?? {};

export type SupportStatement = {
  raw?: string;
  version?: number;
  releaseDate?: string;
};

export type SupportMatrix = Partial<Record<BrowserKey, SupportStatement>>;

export type BaselineLevel = "low" | "high" | null;

export type FeatureGroup = {
  id: string;
  name: string;
  parentId?: string;
  parentName?: string;
};

export type FeatureSnapshot = {
  id: string;
  name: string;
  spec?: string;
};

export type DiscouragedInfo = {
  accordingTo: string[];
  alternatives?: string[];
};

export type BaselineFeature = {
  id: string;
  name: string;
  description?: string;
  descriptionHtml?: string;
  baseline: BaselineLevel;
  baselineLowDate?: string;
  baselineHighDate?: string;
  support: SupportMatrix;
  docsUrl?: string;
  specUrls: string[];
  caniuseIds: string[];
  compatFeatures: string[];
  groups: FeatureGroup[];
  snapshots: FeatureSnapshot[];
  discouraged?: DiscouragedInfo;
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

  const support: SupportMatrix = {};
  for (const key of BROWSER_KEYS) {
    const statement = toSupportStatement(key, (supportRoot as Record<string, unknown>)[key]);
    if (statement) {
      support[key] = statement;
    }
  }

  const baselineRaw = status.baseline;
  const baseline: BaselineLevel = baselineRaw === "low" || baselineRaw === "high" ? baselineRaw : null;

  const specUrls = toStringArray(feature.spec);
  const groups = toFeatureGroups(feature.group);
  const snapshots = toFeatureSnapshots(feature.snapshot);
  const caniuseIds = toStringArray(feature.caniuse);
  const compatFeatures = toStringArray(feature.compat_features);
  const discouraged = toDiscouragedInfo(feature.discouraged);

  return {
    id: resolvedId,
    name: feature.name ?? resolvedId,
    description: feature.description,
    descriptionHtml: typeof feature.description_html === "string" ? feature.description_html : undefined,
    baseline,
    baselineLowDate: status.baseline_low_date ?? undefined,
    baselineHighDate: status.baseline_high_date ?? undefined,
    support,
    docsUrl: pickDocsUrl(feature),
    specUrls,
    caniuseIds,
    compatFeatures,
    groups,
    snapshots,
    discouraged
  };
}

function toSupportStatement(browser: BrowserKey, value: unknown): SupportStatement | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  let raw: string | undefined;
  if (typeof value === "string") {
    raw = value;
  } else if (typeof value === "number") {
    raw = value.toString();
  }

  if (!raw || !raw.length) {
    return undefined;
  }

  const version = toNumber(value);
  const releaseDate = findReleaseDate(browser, raw, version);
  return {
    raw,
    version: version ?? undefined,
    releaseDate: releaseDate ?? undefined
  };
}

function findReleaseDate(browser: BrowserKey, raw: string, version: number | undefined): string | undefined {
  const entry = browsersCatalog[browser];
  if (!entry?.releases) {
    return undefined;
  }

  const candidates = new Set<string>();
  candidates.add(raw);
  if (version !== undefined) {
    candidates.add(version.toString());
    if (Number.isInteger(version)) {
      candidates.add(version.toFixed(0));
    }
    if (!Number.isInteger(version)) {
      candidates.add(version.toFixed(1));
      candidates.add(version.toFixed(2));
    }
  }

  for (const release of entry.releases) {
    const releaseVersion = release?.version ?? undefined;
    if (!releaseVersion) {
      continue;
    }
    if (candidates.has(releaseVersion)) {
      return release?.date ?? undefined;
    }
  }

  if (version !== undefined) {
    for (const release of entry.releases) {
      const releaseVersion = release?.version;
      if (!releaseVersion) {
        continue;
      }
      const parsed = Number.parseFloat(releaseVersion);
      if (Number.isFinite(parsed) && parsed === version) {
        return release?.date ?? undefined;
      }
    }
  }

  return undefined;
}

function toDiscouragedInfo(value: FeatureEntry["discouraged"]): DiscouragedInfo | undefined {
  if (!value) {
    return undefined;
  }

  const accordingTo = toStringArray(value.according_to);
  if (!accordingTo.length) {
    return undefined;
  }

  const alternatives = toStringArray(value.alternatives);
  return {
    accordingTo,
    alternatives: alternatives.length ? alternatives : undefined
  };
}

function toFeatureGroups(value: unknown): FeatureGroup[] {
  const ids = toStringArray(value);
  if (!ids.length) {
    return [];
  }

  return ids.map((id) => {
    const entry = groupsCatalog[id];
    const parentId = typeof entry?.parent === "string" && entry.parent.length ? entry.parent : undefined;
    const parentName = parentId ? groupsCatalog[parentId]?.name ?? parentId : undefined;
    return {
      id,
      name: entry?.name ?? id,
      parentId,
      parentName
    };
  });
}

function toFeatureSnapshots(value: unknown): FeatureSnapshot[] {
  const ids = toStringArray(value);
  if (!ids.length) {
    return [];
  }

  return ids.map((id) => {
    const entry = snapshotsCatalog[id];
    return {
      id,
      name: entry?.name ?? id,
      spec: entry?.spec ?? undefined
    };
  });
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
