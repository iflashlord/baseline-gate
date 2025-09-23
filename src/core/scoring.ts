import type { SupportMatrix } from "./baselineData";
import { TARGET_MIN, type Target } from "./targets";

export type Verdict = "safe" | "warning" | "blocked";

const hasVersion = (statement: SupportMatrix[keyof SupportMatrix] | undefined): statement is { version: number } =>
  Boolean(statement && typeof statement.version === "number");

export function scoreFeature(support: SupportMatrix, target: Target): Verdict {
  const min = TARGET_MIN[target];
  const missingData =
    (min.chrome !== undefined && !hasVersion(support.chrome)) ||
    (min.edge !== undefined && !hasVersion(support.edge)) ||
    (min.firefox !== undefined && !hasVersion(support.firefox)) ||
    (min.safari !== undefined && !hasVersion(support.safari));

  if (missingData) {
    return "warning";
  }

  const miss =
    (min.chrome !== undefined && hasVersion(support.chrome) && support.chrome.version < min.chrome) ||
    (min.edge !== undefined && hasVersion(support.edge) && support.edge.version < min.edge) ||
    (min.firefox !== undefined && hasVersion(support.firefox) && support.firefox.version < min.firefox) ||
    (min.safari !== undefined && hasVersion(support.safari) && support.safari.version < min.safari);

  if (miss) {
    return "blocked";
  }
  return "safe";
}
