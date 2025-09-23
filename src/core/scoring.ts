import type { SupportMatrix } from "./baselineData";
import { TARGET_MIN, type Target } from "./targets";

export type Verdict = "safe" | "warning" | "blocked";

const isNullish = (value: unknown): value is null | undefined => value === null || value === undefined;

export function scoreFeature(support: SupportMatrix, target: Target): Verdict {
  const min = TARGET_MIN[target];
  const missingData =
    (min.chrome !== undefined && isNullish(support.chrome)) ||
    (min.edge !== undefined && isNullish(support.edge)) ||
    (min.firefox !== undefined && isNullish(support.firefox)) ||
    (min.safari !== undefined && isNullish(support.safari));

  if (missingData) {
    return "warning";
  }

  const miss =
    (min.chrome !== undefined && !isNullish(support.chrome) && support.chrome < min.chrome) ||
    (min.edge !== undefined && !isNullish(support.edge) && support.edge < min.edge) ||
    (min.firefox !== undefined && !isNullish(support.firefox) && support.firefox < min.firefox) ||
    (min.safari !== undefined && !isNullish(support.safari) && support.safari < min.safari);

  if (miss) {
    return "blocked";
  }
  return "safe";
}
