// Map code tokens to Baseline feature ids
export function resolveJsSymbolToFeatureId(symbol: string): string | null {
  const map: Record<string, string> = {
    "navigator.clipboard": "async-clipboard",
    "URL.canParse": "url-canparse",
    "Promise.any": "promise-any"
  };
  return map[symbol] ?? null;
}

export function resolveCssToFeatureId(token: string): string | null {
  const map: Record<string, string> = {
    ":has": "has",
    "@container": "container-queries",
    "text-wrap": "text-wrap"
  };
  return map[token] ?? null;
}
