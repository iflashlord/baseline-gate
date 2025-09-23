import ts from "typescript";

export function detectSymbolAtPosition(sourceText: string, offset: number): string | null {
  // Ultra simple: find the token around the cursor and build a dotted name.
  // For MVP, do a regex fallback instead of full AST resolution.
  const left = sourceText.slice(0, offset);
  const right = sourceText.slice(offset);
  const leftMatch = left.match(/[A-Za-z0-9_.]+$/);
  const rightMatch = right.match(/^[A-Za-z0-9_.]+/);
  const token = `${leftMatch?.[0] ?? ""}${rightMatch?.[0] ?? ""}`;
  if (!token) {
    return null;
  }

  // Normalize a few known patterns
  if (matchesToken(token, "navigator.clipboard")) {
    return "navigator.clipboard";
  }
  if (matchesToken(token, "URL.canParse")) {
    return "URL.canParse";
  }
  if (matchesToken(token, "Promise.any")) {
    return "Promise.any";
  }

  return null;
}

function matchesToken(candidate: string, needle: string): boolean {
  const index = candidate.indexOf(needle);
  if (index === -1) {
    return false;
  }
  const boundary = index + needle.length;
  const trailing = candidate.charAt(boundary);
  return trailing === "" || trailing === ".";
}
