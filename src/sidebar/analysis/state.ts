import type { Verdict } from "../../core/scoring";
import type { BaselineFinding } from "../workspaceScanner";

import { computeFindingId } from "./dataTransformation";
import type {
  BaselineBudgetSnapshot,
  DetailPayload,
  DetailSelection,
  FileGroupPayload,
  FindingsStatistics,
  ScanHistoryEntry,
  WebviewState,
  WebviewStateBuildContext
} from "./types";
import { hasActiveFilters, matchesSearch, summarize } from "./utils";

export type SelectionState = Pick<
  WebviewStateBuildContext,
  "selectedIssueId" | "selectedFileUri" | "detailSelection" | "collapsedFileUris"
>;

export function filterFindings(
  findings: BaselineFinding[],
  severityFilter: Set<Verdict>,
  query: string
): BaselineFinding[] {
  const normalizedQuery = query.trim().toLowerCase();
  return findings.filter((finding) => {
    if (!severityFilter.has(finding.verdict)) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return matchesSearch(finding, normalizedQuery);
  });
}

export function syncSelection(state: SelectionState, filtered: BaselineFinding[]): SelectionState {
  const next: SelectionState = {
    selectedIssueId: state.selectedIssueId,
    selectedFileUri: state.selectedFileUri,
    detailSelection: state.detailSelection,
    collapsedFileUris: state.collapsedFileUris
  };

  const visibleFileUris = new Set(filtered.map((finding) => finding.uri.toString()));

  if (next.selectedIssueId) {
    const exists = filtered.some((finding) => computeFindingId(finding) === next.selectedIssueId);
    if (!exists) {
      next.selectedIssueId = null;
      if (next.detailSelection?.mode === "issue") {
        next.detailSelection = null;
      }
    }
  }

  if (next.selectedFileUri) {
    const exists = visibleFileUris.has(next.selectedFileUri);
    if (!exists) {
      next.selectedFileUri = null;
      if (next.detailSelection?.mode === "file") {
        next.detailSelection = null;
      }
    }
  }

  for (const uri of Array.from(next.collapsedFileUris)) {
    if (!visibleFileUris.has(uri)) {
      next.collapsedFileUris.delete(uri);
    }
  }

  const detailSelection = next.detailSelection;
  if (detailSelection) {
    if (detailSelection.mode === "issue") {
      const exists = filtered.some((finding) => computeFindingId(finding) === detailSelection.id);
      if (!exists) {
        next.detailSelection = null;
      }
    } else {
      const exists = filtered.some((finding) => finding.uri.toString() === detailSelection.uri);
      if (!exists) {
        next.detailSelection = null;
      }
    }
  }

  return next;
}

export function buildWebviewState(args: {
  context: WebviewStateBuildContext;
  filtered: BaselineFinding[];
  severityIconUris: Record<Verdict, string>;
  files: FileGroupPayload[];
  detail: DetailPayload | null;
  history?: ScanHistoryEntry[];
  budget?: BaselineBudgetSnapshot | null;
  stats?: FindingsStatistics;
}): WebviewState {
  const { context, filtered, severityIconUris, files, detail, history, budget, stats } = args;
  return {
    target: context.target,
    searchQuery: context.searchQuery,
    severityFilter: Array.from(context.severityFilter.values()),
    sortOrder: context.sortOrder,
    scanning: context.scanning,
    progressText: context.progressText,
    lastScanAt: context.lastScanAt?.toISOString(),
    summary: summarize(context.findings),
    filteredSummary: summarize(filtered),
    filtersActive: hasActiveFilters(context.searchQuery, context.severityFilter, context.sortOrder),
    selectedIssueId: context.selectedIssueId,
    selectedFileUri: context.selectedFileUri,
    files,
    severityIconUris,
    detail,
    history: history && history.length ? history : undefined,
    budget: budget ?? undefined,
    stats: stats ?? undefined
  };
}
