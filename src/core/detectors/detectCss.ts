export function detectCssTokenAtPosition(text: string, offset: number): string | null {
  // Check a few patterns near the cursor
  const start = Math.max(0, offset - 20);
  const end = Math.min(text.length, offset + 20);
  const windowText = text.slice(start, end);

  const candidates: Array<{ token: string; position: number | null }> = [
    { token: ":has", position: findIndex(windowText, /:has\(/) },
    { token: "@container", position: findIndex(windowText, /@container/) },
    { token: "text-wrap", position: findIndex(windowText, /\btext-wrap\s*:/) }
  ];

  let closest: { token: string; distance: number } | null = null;
  for (const candidate of candidates) {
    if (candidate.position === null) {
      continue;
    }
    const absolute = start + candidate.position;
    const distance = Math.abs(absolute - offset);
    if (!closest || distance < closest.distance) {
      closest = { token: candidate.token, distance };
    }
  }

  return closest?.token ?? null;
}

function findIndex(source: string, pattern: RegExp): number | null {
  const match = source.match(pattern);
  return match?.index ?? null;
}
