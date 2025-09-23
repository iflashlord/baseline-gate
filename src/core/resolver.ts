// Map code tokens to Baseline feature ids
const JS_SYMBOL_MAP: Record<string, string> = {
  "navigator.clipboard": "async-clipboard",
  "URL.canParse": "url-canparse",
  "Promise.any": "promise-any"
};

const CSS_TOKEN_MAP: Record<string, string> = {
  ":has": "has",
  "@container": "container-queries",
  "text-wrap": "text-wrap"
};

export function resolveJsSymbolToFeatureId(symbol: string): string | null {
  return JS_SYMBOL_MAP[symbol] ?? null;
}

export function resolveCssToFeatureId(token: string): string | null {
  return CSS_TOKEN_MAP[token] ?? null;
}

export function getKnownJsSymbols(): Array<{ token: string; featureId: string }> {
  return Object.entries(JS_SYMBOL_MAP).map(([token, featureId]) => ({ token, featureId }));
}

export function getKnownCssTokens(): Array<{ token: string; featureId: string }> {
  return Object.entries(CSS_TOKEN_MAP).map(([token, featureId]) => ({ token, featureId }));
}
