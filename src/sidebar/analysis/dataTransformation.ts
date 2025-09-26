import * as vscode from "vscode";

import type { BaselineFinding } from "../workspaceScanner";

import type { FileGroupPayload, IssuePayload, SortOrder } from "./types";
import { summarize, formatVerdict, extractExtension, extensionToVariant, verdictWeight } from "./utils";

export function groupFindingsByFile(findings: BaselineFinding[], sortOrder: SortOrder) {
  const map = new Map<string, { uri: vscode.Uri; findings: BaselineFinding[] }>();
  for (const finding of findings) {
    const key = finding.uri.toString();
    const entry = map.get(key);
    if (entry) {
      entry.findings.push(finding);
    } else {
      map.set(key, { uri: finding.uri, findings: [finding] });
    }
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => compareFileGroups(a, b, sortOrder));
  return groups;
}

function compareFileGroups(
  a: { uri: vscode.Uri; findings: BaselineFinding[] },
  b: { uri: vscode.Uri; findings: BaselineFinding[] },
  order: SortOrder
): number {
  if (order === "severity") {
    const weightA = Math.max(0, ...a.findings.map((finding) => verdictWeight(finding.verdict)));
    const weightB = Math.max(0, ...b.findings.map((finding) => verdictWeight(finding.verdict)));
    if (weightA !== weightB) {
      return weightB - weightA;
    }
  }
  return a.uri.fsPath.localeCompare(b.uri.fsPath);
}

export function buildFilePayload(
  group: { uri: vscode.Uri; findings: BaselineFinding[] },
  order: SortOrder,
  selectedIssueId: string | null,
  selectedFileUri: string | null,
  collapsedFileUris: Set<string>
): FileGroupPayload {
  const summary = summarize(group.findings);
  const sorted = sortFindings(group.findings, order);
  const relativePath = vscode.workspace.asRelativePath(group.uri, false);
  const extension = extractExtension(relativePath);
  const iconVariant = extensionToVariant(extension);
  const iconLabel = extension ? extension.toUpperCase() : "FILE";
  const groupId = group.uri.toString();
  const selected = selectedFileUri === groupId;
  const expanded = !collapsedFileUris.has(groupId);

  return {
    uri: group.uri.toString(),
    relativePath,
    extension,
    iconLabel,
    iconVariant,
    counts: summary,
    selected,
    expanded,
    issues: sorted.map((finding) => buildIssuePayload(finding, selectedIssueId === computeFindingId(finding)))
  };
}

export function buildIssuePayload(finding: BaselineFinding, selected: boolean): IssuePayload {
  return {
    id: computeFindingId(finding),
    verdict: finding.verdict,
    verdictLabel: formatVerdict(finding.verdict),
    featureName: finding.feature.name,
    featureId: finding.feature.id,
    token: finding.token,
    line: finding.range.start.line + 1,
    column: finding.range.start.character + 1,
    docsUrl: finding.feature.docsUrl,
    snippet: finding.lineText,
    range: {
      start: { line: finding.range.start.line, character: finding.range.start.character },
      end: { line: finding.range.end.line, character: finding.range.end.character }
    },
    selected
  };
}

export function sortFindings(findings: BaselineFinding[], order: SortOrder): BaselineFinding[] {
  return findings
    .slice()
    .sort((a, b) => {
      if (order === "severity") {
        const diff = verdictWeight(b.verdict) - verdictWeight(a.verdict);
        if (diff !== 0) {
          return diff;
        }
      }
      if (a.range.start.line !== b.range.start.line) {
        return a.range.start.line - b.range.start.line;
      }
      if (a.range.start.character !== b.range.start.character) {
        return a.range.start.character - b.range.start.character;
      }
      return a.feature.name.localeCompare(b.feature.name);
    });
}

export function computeFindingId(finding: BaselineFinding): string {
  return `${finding.uri.toString()}::${finding.feature.id}::${finding.range.start.line}::${finding.range.start.character}`;
}
