export type Target = "modern" | "enterprise";

export const TARGET_MIN: Record<Target, { chrome?: number; edge?: number; firefox?: number; safari?: number }> = {
  modern: { chrome: 120, edge: 120, firefox: 120, safari: 17 },
  enterprise: { chrome: 114, edge: 114, firefox: 115, safari: 16.4 }
};
