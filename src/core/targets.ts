import type { BrowserKey } from "./baselineData";

export type Target = "modern" | "enterprise";

type TargetThresholds = Partial<Record<BrowserKey, number>>;

export const TARGET_MIN: Record<Target, TargetThresholds> = {
  modern: { chrome: 120, edge: 120, firefox: 120, safari: 17 },
  enterprise: { chrome: 114, edge: 114, firefox: 115, safari: 16.4 }
};
