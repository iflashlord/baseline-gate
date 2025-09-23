import * as vscode from "vscode";

import { getFeatureById } from "../core/baselineData";
import { getKnownCssTokens, getKnownJsSymbols } from "../core/resolver";
import { scoreFeature, type Verdict } from "../core/scoring";
import type { BaselineFeature } from "../core/baselineData";
import type { Target } from "../core/targets";

export interface BaselineFinding {
  id: string; // Unique identifier for the finding
  uri: vscode.Uri;
  range: vscode.Range;
  feature: BaselineFeature;
  verdict: Verdict;
  token: string;
  lineText: string;
}

type ScannerToken = {
  token: string;
  featureId: string;
  validate?: (text: string, startIndex: number) => boolean;
};

const EXCLUDE_GLOBS = ["**/node_modules/**", "**/dist/**", "**/out/**", "**/.git/**", "**/.vscode/**"];
const EXCLUDE_PATTERN = `{${EXCLUDE_GLOBS.join(",")}}`;

const JS_GLOB = "**/*.{js,jsx,ts,tsx,mjs,cjs}";
const CSS_GLOB = "**/*.{css,scss,sass}";

const JS_TOKENS: ScannerToken[] = getKnownJsSymbols().map(({ token, featureId }) => ({
  token,
  featureId,
  validate: (text, index) => hasIdentifierBoundaries(text, index, token.length)
}));

const CSS_TOKENS: ScannerToken[] = getKnownCssTokens().map(({ token, featureId }) => {
  if (token === ":has") {
    return {
      token,
      featureId,
      validate: (text, index) => text.charAt(index + token.length) === "("
    } satisfies ScannerToken;
  }
  return {
    token,
    featureId,
    validate: (text, index) => hasCssBoundary(text, index, token.length)
  } satisfies ScannerToken;
});

export async function scanWorkspaceForBaseline(
  target: Target,
  options: { token?: vscode.CancellationToken; progress?: (message: string) => void } = {}
): Promise<BaselineFinding[]> {
  const { token, progress } = options;

  if (!vscode.workspace.workspaceFolders?.length) {
    return [];
  }

  const findings: BaselineFinding[] = [];
  const seenFingerprints = new Set<string>();

  const jsFiles = await vscode.workspace.findFiles(JS_GLOB, EXCLUDE_PATTERN);
  const cssFiles = await vscode.workspace.findFiles(CSS_GLOB, EXCLUDE_PATTERN);

  const totalFiles = jsFiles.length + cssFiles.length;
  let processed = 0;

  for (const uri of jsFiles) {
    if (token?.isCancellationRequested) {
      break;
    }
    const document = await safeOpenTextDocument(uri);
    if (!document) {
      continue;
    }
    const fileFindings = scanTextDocument(document, JS_TOKENS, target, seenFingerprints);
    findings.push(...fileFindings);
    processed += 1;
    progress?.(formatProgress(uri, processed, totalFiles));
  }

  for (const uri of cssFiles) {
    if (token?.isCancellationRequested) {
      break;
    }
    const document = await safeOpenTextDocument(uri);
    if (!document) {
      continue;
    }
    const fileFindings = scanTextDocument(document, CSS_TOKENS, target, seenFingerprints);
    findings.push(...fileFindings);
    processed += 1;
    progress?.(formatProgress(uri, processed, totalFiles));
  }

  findings.sort(compareFindings);
  return findings;
}

async function safeOpenTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument | undefined> {
  try {
    return await vscode.workspace.openTextDocument(uri);
  } catch {
    return undefined;
  }
}

function scanTextDocument(
  document: vscode.TextDocument,
  tokens: ScannerToken[],
  target: Target,
  seenFingerprints: Set<string>
): BaselineFinding[] {
  const text = document.getText();
  const findings: BaselineFinding[] = [];

  for (const token of tokens) {
    const matches = locateTokenOccurrences(text, token);
    if (!matches.length) {
      continue;
    }

    const feature = getFeatureById(token.featureId);
    if (!feature) {
      continue;
    }

    const verdict = scoreFeature(feature.support, target);

    for (const index of matches) {
      const start = document.positionAt(index);
      const end = document.positionAt(index + token.token.length);
      const range = new vscode.Range(start, end);
      const lineText = document.lineAt(range.start.line).text.trim();

      const fingerprint = `${document.uri.toString()}::${token.featureId}::${range.start.line}::${range.start.character}`;
      if (seenFingerprints.has(fingerprint)) {
        continue;
      }
      seenFingerprints.add(fingerprint);

      findings.push({
        id: `${document.uri.toString()}-${range.start.line}-${range.start.character}-${token.token}`,
        uri: document.uri,
        range,
        feature,
        verdict,
        token: token.token,
        lineText
      });
    }
  }

  return findings;
}

function locateTokenOccurrences(text: string, token: ScannerToken): number[] {
  const indices: number[] = [];
  const needle = token.token;
  let index = text.indexOf(needle);
  while (index !== -1) {
    if (!token.validate || token.validate(text, index)) {
      indices.push(index);
    }
    index = text.indexOf(needle, index + needle.length);
  }
  return indices;
}

function hasIdentifierBoundaries(text: string, start: number, length: number): boolean {
  const before = start === 0 ? "" : text.charAt(start - 1);
  const after = text.charAt(start + length);
  const beforeValid = before === "" || !/[A-Za-z0-9_$]/.test(before);
  const afterValid = after === "" || !/[A-Za-z0-9_$]/.test(after);
  return beforeValid && afterValid;
}

function hasCssBoundary(text: string, start: number, length: number): boolean {
  const before = start === 0 ? "" : text.charAt(start - 1);
  const after = text.charAt(start + length);
  const beforeValid = before === "" || /[\s\n\r\t({;,]/.test(before);
  const afterValid = after === "" || /[\s\n\r\t){};:,]/.test(after);
  return beforeValid && afterValid;
}

function formatProgress(uri: vscode.Uri, processed: number, total: number): string {
  const label = vscode.workspace.asRelativePath(uri, false);
  return `Scanning ${processed}/${total}: ${label}`;
}

function compareFindings(a: BaselineFinding, b: BaselineFinding): number {
  if (a.uri.fsPath !== b.uri.fsPath) {
    return a.uri.fsPath.localeCompare(b.uri.fsPath);
  }
  const verdictDelta = verdictWeight(b.verdict) - verdictWeight(a.verdict);
  if (verdictDelta !== 0) {
    return verdictDelta;
  }
  if (a.range.start.line !== b.range.start.line) {
    return a.range.start.line - b.range.start.line;
  }
  if (a.range.start.character !== b.range.start.character) {
    return a.range.start.character - b.range.start.character;
  }
  return a.feature.name.localeCompare(b.feature.name);
}

function verdictWeight(verdict: Verdict): number {
  switch (verdict) {
    case "blocked":
      return 3;
    case "warning":
      return 2;
    case "safe":
      return 1;
    default:
      return 0;
  }
}
