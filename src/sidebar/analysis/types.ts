import * as vscode from "vscode";

import type { Target } from "../../core/targets";
import type { Verdict } from "../../core/scoring";
import type { BaselineFinding } from "../workspaceScanner";

export type SortOrder = "severity" | "file";

export interface BaselineAnalysisAssets {
  statusIcons: Record<Verdict, vscode.Uri>;
  baselineIcons: {
    widely: vscode.Uri;
    newly: vscode.Uri;
    limited: vscode.Uri;
  };
}

export type Summary = {
  blocked: number;
  warning: number;
  safe: number;
  total: number;
};

export type IssuePayload = {
  id: string;
  verdict: Verdict;
  verdictLabel: string;
  featureName: string;
  featureId: string;
  token: string;
  line: number;
  column: number;
  docsUrl?: string;
  snippet: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  selected: boolean;
};

export type FileGroupPayload = {
  uri: string;
  relativePath: string;
  extension: string;
  iconLabel: string;
  iconVariant: string;
  counts: Summary;
  selected: boolean;
  expanded: boolean;
  issues: IssuePayload[];
};

export type DetailPayload =
  | {
      mode: "issue";
      title: string;
      subtitle: string;
      filePath: string;
      html: string;
    }
  | {
      mode: "file";
      title: string;
      filePath: string;
      html: string;
    };

export type DetailSelection =
  | {
      mode: "issue";
      id: string;
    }
  | {
      mode: "file";
      uri: string;
    }
  | null;

export type WebviewState = {
  target: Target;
  searchQuery: string;
  severityFilter: Verdict[];
  sortOrder: SortOrder;
  scanning: boolean;
  progressText?: string;
  lastScanAt?: string;
  summary: Summary;
  filteredSummary: Summary;
  filtersActive: boolean;
  selectedIssueId?: string | null;
  selectedFileUri?: string | null;
  files: FileGroupPayload[];
  severityIconUris: Record<Verdict, string>;
  detail?: DetailPayload | null;
};

export type MessageFromWebview =
  | { type: "scan" }
  | { type: "setSearch"; value: string }
  | { type: "setSeverity"; value: Verdict[] }
  | { type: "setSort"; value: SortOrder }
  | { type: "clearFilters" }
  | { type: "openFile"; uri: string; start: { line: number; character: number }; end: { line: number; character: number } }
  | { type: "openDocs"; url?: string }
  | { type: "askGemini"; issue: string; feature: string; filePath: string; findingId: string }
  | { type: "selectIssue"; id: string }
  | { type: "selectFile"; uri: string }
  | { type: "openIssueDetail"; id: string }
  | { type: "openFileDetail"; uri: string }
  | { type: "setFileExpansion"; uri: string; expanded: boolean }
  | { type: "closeDetail" };

export type WebviewStateBuildContext = {
  findings: BaselineFinding[];
  target: Target;
  searchQuery: string;
  severityFilter: Set<Verdict>;
  sortOrder: SortOrder;
  scanning: boolean;
  progressText?: string;
  lastScanAt?: Date;
  selectedIssueId: string | null;
  selectedFileUri: string | null;
  detailSelection: DetailSelection;
  collapsedFileUris: Set<string>;
};
