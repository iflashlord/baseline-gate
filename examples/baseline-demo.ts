// BaselineGate TS sampler
// Try hovering over the highlighted APIs in this file to check Baseline status.

declare const navigator: any;

type ClipboardSummary = {
  hasItems: boolean;
  preview: string | null;
};

export async function summarizeClipboard(): Promise<ClipboardSummary> {
  const readings = await navigator.clipboard.read();
  const preview = readings.length ? await navigator.clipboard.readText() : null;
  return { hasItems: readings.length > 0, preview };
}

export function validateTargets(targets: string[]): Array<{ target: string; ok: boolean }> {
  return targets.map((target) => ({ target, ok: URL.canParse(target) }));
}

export async function firstSuccess<T>(workflows: Promise<T>[]): Promise<T> {
  return Promise.any(workflows);
}
