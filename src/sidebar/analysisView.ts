import * as vscode from "vscode";

import { scanWorkspaceForBaseline, type BaselineFinding } from "./workspaceScanner";
import type { Target } from "../core/targets";
import { scoreFeature, type Verdict } from "../core/scoring";
import { getFeatureById } from "../core/baselineData";
import {
  BaselineAnalysisAssets,
  BaselineBudgetSnapshot,
  ScanHistoryEntry,
  DetailPayload,
  DetailSelection,
  FileGroupPayload,
  IssuePayload,
  MessageFromWebview,
  SortOrder,
  Summary,
  WebviewState
} from "./analysis/types";
import {
  DEFAULT_SEVERITIES,
  DEFAULT_SORT_ORDER,
  computeFindingsStatistics,
  escapeHtml,
  formatVerdict,
  sameSet,
  summarize
} from "./analysis/utils";
import {
  buildFilePayload,
  computeFindingId,
  groupFindingsByFile
} from "./analysis/dataTransformation";
import {
  buildFileDetailHtml,
  buildIssueDetailHtml,
  renderAnalysisWebviewHtml,
  type GeminiSupportContext
} from "./analysis/html";
import { buildWebviewState, filterFindings, syncSelection } from "./analysis/state";
import { processMessage } from "./analysis/messages";
import { BaselineDetailViewProvider } from "./detailView";
import { readStorageJson, writeStorageJson, clearStorageDirectory, storageDirectoryExists } from "../utils/storage";

const HISTORY_STORAGE_KEY = "baselineGate.history";
const HISTORY_STORAGE_FILE = "scan-history.json";
const LATEST_SCAN_STORAGE_KEY = "baselineGate.latestScan";
const LATEST_SCAN_FILE = "latest-scan.json";
const LATEST_SCAN_VERSION = 2; // Updated to use new StoredIssuePayload format
const HISTORY_LIMIT = 50;

type BudgetConfig = {
  blockedLimit?: number;
  warningLimit?: number;
  safeGoal?: number;
};

// Storage types that align with IssuePayload to reduce transformation
type StoredIssuePayload = {
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
  uri: string; // Added to store file URI
};

type StoredScanPayload = {
  version: number;
  target: Target;
  scannedAt: string;
  issues: StoredIssuePayload[];
};

// Legacy types for backward compatibility
type PersistedPosition = {
  line: number;
  character: number;
};

type PersistedRange = {
  start: PersistedPosition;
  end: PersistedPosition;
};

type PersistedFinding = {
  uri: string;
  featureId: string;
  verdict: Verdict;
  token: string;
  lineText: string;
  range: PersistedRange;
};

type PersistedScanPayload = {
  version: number;
  target: Target;
  scannedAt: string;
  findings: PersistedFinding[];
};

export class BaselineAnalysisViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private viewReady = false;
  private pendingState: WebviewState | null = null;
  private findings: BaselineFinding[] = [];
  private searchQuery = "";
  private severityFilter = new Set<Verdict>(DEFAULT_SEVERITIES);
  private sortOrder: SortOrder = DEFAULT_SORT_ORDER;
  private scanning = false;
  private progressText: string | undefined;
  private lastScanAt: Date | undefined;
  private selectedIssueId: string | null = null;
  private selectedFileUri: string | null = null;
  private detailSelection: DetailSelection = null;
  private collapsedFileUris = new Set<string>();
  private history: ScanHistoryEntry[] = [];
  private pendingShowInsights = false;
  private budgetConfig: BudgetConfig = this.readBudgetConfig();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private target: Target,
    private readonly assets: BaselineAnalysisAssets,
    private readonly geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ) {
    // Only restore from disk - no longer use memento (VS Code's internal storage)
    void this.restoreHistoryFromDisk();
    void this.restoreLatestScanFromDisk();
  }

  refreshBudgetConfig(): void {
    this.budgetConfig = this.readBudgetConfig();
    this.postState();
  }

  register(): vscode.Disposable {
    return vscode.window.registerWebviewViewProvider("baselineGate.analysisView", this);
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    this.viewReady = false;
    const webview = view.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")]
    };
    webview.html = renderAnalysisWebviewHtml(webview);
    webview.onDidReceiveMessage((message) => this.handleMessage(message));
    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = undefined;
      }
      this.viewReady = false;
    });
    void this.restoreLatestScanFromDisk();
    this.postState();
    if (this.pendingShowInsights) {
      const targetView = this.view;
      setTimeout(() => {
        if (targetView) {
          void targetView.webview.postMessage({ type: 'showInsights' });
        }
      }, 50);
      this.pendingShowInsights = false;
    }
  }

  async runScan(): Promise<void> {
    if (!vscode.workspace.workspaceFolders?.length) {
      void vscode.window.showWarningMessage("Open a folder or workspace to scan for baseline issues.");
      return;
    }

    if (this.scanning) {
      return;
    }

    this.selectedIssueId = null;
    this.selectedFileUri = null;
    this.detailSelection = null;
    this.collapsedFileUris.clear();
    this.scanning = true;
    this.progressText = "Preparing scan…";
    this.postState();

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Baseline Gate: scanning workspace",
          cancellable: true
        },
        async (progress, token) => {
          const findings = await scanWorkspaceForBaseline(this.target, {
            token,
            progress: (message) => {
              this.progressText = message;
              progress.report({ message });
              this.postState();
            }
          });

          if (token.isCancellationRequested) {
            return;
          }

          this.findings = findings;
          this.lastScanAt = new Date();
        }
      );

      await this.recordScanHistory();
      await this.persistLatestScan();
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Baseline scan failed: ${err}`);
    } finally {
      this.scanning = false;
      this.progressText = undefined;
      this.postState();
    }
  }

  setSearchQuery(value: string): void {
    const normalized = value.trim().toLowerCase();
    if (normalized === this.searchQuery) {
      return;
    }
    this.searchQuery = normalized;
    this.postState();
  }

  getSearchQuery(): string {
    return this.searchQuery;
  }

  getAllFindings(): BaselineFinding[] {
    return this.findings;
  }

  getScanHistory(): ScanHistoryEntry[] {
    return [...this.history];
  }

  setSeverityFilter(verdicts: Verdict[]): void {
    const next = new Set<Verdict>(verdicts.length ? verdicts : DEFAULT_SEVERITIES);
    if (sameSet(this.severityFilter, next)) {
      return;
    }
    this.severityFilter = next;
    this.postState();
  }

  async clearAllData(): Promise<void> {
    // Clear all in-memory data
    this.findings = [];
    this.history = [];
    this.lastScanAt = undefined;
    this.scanning = false;
    this.progressText = undefined;
    this.searchQuery = "";
    this.severityFilter = new Set(DEFAULT_SEVERITIES);
    this.sortOrder = DEFAULT_SORT_ORDER;

    // Clear file storage
    await clearStorageDirectory();

    // Clear Gemini data
    if (this.geminiProvider) {
      await this.geminiProvider.clearAllSuggestionsPublic();
    }

    // Update UI
    this.postState();
  }

  async isStorageDirectoryMissing(): Promise<boolean> {
    return !(await storageDirectoryExists());
  }

  private loadHistoryFromMemento(): ScanHistoryEntry[] {
    // Legacy method - no longer used since we only load from disk
    return [];
  }

  private sanitizeHistoryEntries(raw: unknown): ScanHistoryEntry[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .filter((entry): entry is ScanHistoryEntry => {
        if (!entry || typeof entry !== "object") {
          return false;
        }
        const candidate = entry as Partial<ScanHistoryEntry>;
        const hasTimestamp = typeof candidate.timestamp === "string" && candidate.timestamp.length > 0;
        const hasTarget = candidate.target === "modern" || candidate.target === "enterprise";
        const summary = candidate.summary;
        const hasSummary = Boolean(
          summary &&
            typeof summary.blocked === "number" &&
            typeof summary.warning === "number" &&
            typeof summary.safe === "number" &&
            typeof summary.total === "number"
        );
        return hasTimestamp && hasTarget && hasSummary;
      })
      .map((entry) => ({
        timestamp: entry.timestamp,
        target: entry.target,
        summary: {
          blocked: entry.summary.blocked,
          warning: entry.summary.warning,
          safe: entry.summary.safe,
          total: entry.summary.total
        }
      }))
      .slice(-HISTORY_LIMIT);
  }

  private async restoreHistoryFromDisk(): Promise<void> {
    const stored = await readStorageJson<unknown>(HISTORY_STORAGE_FILE);
    const history = this.sanitizeHistoryEntries(stored);
    if (!history.length) {
      return;
    }
    this.history = history;
    // No longer sync to workspaceState - only use file storage
    this.postState();
  }

  private restoreLatestScanFromMemento(): void {
    // Legacy method - no longer used since we only load from disk
  }

  private async restoreLatestScanFromDisk(): Promise<void> {
    const stored = await readStorageJson<unknown>(LATEST_SCAN_FILE);
    
    // Try to parse as new format first
    const newScan = this.parseStoredScan(stored);
    if (newScan && newScan.target === this.target) {
      const findings = this.deserializeStoredIssues(newScan.issues);
      if (findings.length > 0 || newScan.issues.length === 0) {
        this.findings = findings;
        const parsedTimestamp = new Date(newScan.scannedAt);
        this.lastScanAt = Number.isNaN(parsedTimestamp.getTime()) ? undefined : parsedTimestamp;
        this.postState();
        return;
      }
    }

    // Fallback to legacy format
    const legacyScan = this.parsePersistedScan(stored);
    if (!legacyScan || legacyScan.target !== this.target) {
      return;
    }

    const findings = this.deserializePersistedFindings(legacyScan.findings);
    if (!findings.length && legacyScan.findings.length > 0) {
      return;
    }

    this.findings = findings;
    const parsedTimestamp = new Date(legacyScan.scannedAt);
    this.lastScanAt = Number.isNaN(parsedTimestamp.getTime()) ? undefined : parsedTimestamp;
    this.postState();
  }

  private parseStoredScan(raw: unknown): StoredScanPayload | null {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const candidate = raw as Partial<StoredScanPayload>;
    const versionValid = candidate.version === LATEST_SCAN_VERSION;
    const targetValid = candidate.target === "modern" || candidate.target === "enterprise";
    const timestampValid = typeof candidate.scannedAt === "string" && candidate.scannedAt.length > 0;
    const issuesValid = Array.isArray(candidate.issues);

    if (!versionValid || !targetValid || !timestampValid || !issuesValid) {
      return null;
    }

    const target = candidate.target as Target;
    const scannedAt = candidate.scannedAt as string;
    const issues = candidate.issues as StoredIssuePayload[];

    return {
      version: LATEST_SCAN_VERSION,
      target,
      scannedAt,
      issues
    };
  }

  private parsePersistedScan(raw: unknown): PersistedScanPayload | null {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const candidate = raw as Partial<PersistedScanPayload>;
    const versionValid = candidate.version === 1; // Legacy version
    const targetValid = candidate.target === "modern" || candidate.target === "enterprise";
    const timestampValid = typeof candidate.scannedAt === "string" && candidate.scannedAt.length > 0;
    const findingsValid = Array.isArray(candidate.findings);

    if (!versionValid || !targetValid || !timestampValid || !findingsValid) {
      return null;
    }

    const target = candidate.target as Target;
    const scannedAt = candidate.scannedAt as string;
    const findings = candidate.findings as PersistedFinding[];

    return {
      version: 1,
      target,
      scannedAt,
      findings
    };
  }

  private deserializeStoredIssues(entries: StoredIssuePayload[]): BaselineFinding[] {
    const findings: BaselineFinding[] = [];

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const { 
        uri, 
        featureId, 
        verdict, 
        token, 
        snippet,
        range 
      } = entry;

      // Validate required fields
      const hasBasicFields =
        typeof uri === "string" &&
        typeof featureId === "string" &&
        (verdict === "blocked" || verdict === "warning" || verdict === "safe") &&
        typeof token === "string" &&
        typeof snippet === "string" &&
        range &&
        typeof range === "object" &&
        typeof range.start?.line === "number" &&
        typeof range.start?.character === "number" &&
        typeof range.end?.line === "number" &&
        typeof range.end?.character === "number";

      if (!hasBasicFields) {
        continue;
      }

      const feature = getFeatureById(featureId);
      if (!feature) {
        continue;
      }

      let parsedUri: vscode.Uri;
      try {
        parsedUri = vscode.Uri.parse(uri);
      } catch {
        continue;
      }

      const startPosition = new vscode.Position(range.start.line, range.start.character);
      const endPosition = new vscode.Position(range.end.line, range.end.character);
      const vscodeRange = new vscode.Range(startPosition, endPosition);

      const finding: BaselineFinding = {
        id: entry.id, // Use the stored id directly
        uri: parsedUri,
        range: vscodeRange,
        feature,
        verdict,
        token,
        lineText: snippet
      };

      findings.push(finding);
    }

    // Sort findings consistently
    findings.sort((a, b) => {
      const aPath = a.uri.fsPath;
      const bPath = b.uri.fsPath;
      if (aPath !== bPath) {
        return aPath.localeCompare(bPath);
      }
      if (a.range.start.line !== b.range.start.line) {
        return a.range.start.line - b.range.start.line;
      }
      if (a.range.start.character !== b.range.start.character) {
        return a.range.start.character - b.range.start.character;
      }
      return a.feature.name.localeCompare(b.feature.name);
    });

    return findings;
  }

  private deserializePersistedFindings(entries: PersistedFinding[]): BaselineFinding[] {
    const findings: BaselineFinding[] = [];

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const { uri, featureId, verdict, token, lineText, range } = entry;
      const hasBasicFields =
        typeof uri === "string" &&
        typeof featureId === "string" &&
        (verdict === "blocked" || verdict === "warning" || verdict === "safe") &&
        typeof token === "string" &&
        range &&
        typeof range === "object" &&
        typeof range.start?.line === "number" &&
        typeof range.start?.character === "number" &&
        typeof range.end?.line === "number" &&
        typeof range.end?.character === "number";

      if (!hasBasicFields) {
        continue;
      }

      const feature = getFeatureById(featureId);
      if (!feature) {
        continue;
      }

      let parsedUri: vscode.Uri;
      try {
        parsedUri = vscode.Uri.parse(uri);
      } catch {
        continue;
      }

      const startPosition = new vscode.Position(range.start.line, range.start.character);
      const endPosition = new vscode.Position(range.end.line, range.end.character);
      const vscodeRange = new vscode.Range(startPosition, endPosition);

      const finding: BaselineFinding = {
        id: "",
        uri: parsedUri,
        range: vscodeRange,
        feature,
        verdict,
        token,
        lineText: typeof lineText === "string" ? lineText : ""
      };
      finding.id = computeFindingId(finding);
      findings.push(finding);
    }

    findings.sort((a, b) => {
      const aPath = a.uri.fsPath;
      const bPath = b.uri.fsPath;
      if (aPath !== bPath) {
        return aPath.localeCompare(bPath);
      }
      if (a.range.start.line !== b.range.start.line) {
        return a.range.start.line - b.range.start.line;
      }
      if (a.range.start.character !== b.range.start.character) {
        return a.range.start.character - b.range.start.character;
      }
      return a.feature.name.localeCompare(b.feature.name);
    });

    return findings;
  }

  private serializeFindingToStoredIssue(finding: BaselineFinding): StoredIssuePayload {
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
        start: { 
          line: finding.range.start.line, 
          character: finding.range.start.character 
        },
        end: { 
          line: finding.range.end.line, 
          character: finding.range.end.character 
        }
      },
      uri: finding.uri.toString()
    };
  }

  private serializeFinding(finding: BaselineFinding): PersistedFinding {
    return {
      uri: finding.uri.toString(),
      featureId: finding.feature.id,
      verdict: finding.verdict,
      token: finding.token,
      lineText: finding.lineText,
      range: {
        start: {
          line: finding.range.start.line,
          character: finding.range.start.character
        },
        end: {
          line: finding.range.end.line,
          character: finding.range.end.character
        }
      }
    };
  }

  private async persistLatestScan(): Promise<void> {
    if (!this.lastScanAt) {
      return;
    }

    const payload: StoredScanPayload = {
      version: LATEST_SCAN_VERSION,
      target: this.target,
      scannedAt: this.lastScanAt.toISOString(),
      issues: this.findings.map((finding) => this.serializeFindingToStoredIssue(finding))
    };

    // Only persist to file storage - no longer use workspaceState
    await writeStorageJson(LATEST_SCAN_FILE, payload);
  }

  private async recordScanHistory(): Promise<void> {
    if (!this.lastScanAt) {
      return;
    }

    const summary = summarize(this.findings);
    const entry: ScanHistoryEntry = {
      timestamp: this.lastScanAt.toISOString(),
      target: this.target,
      summary
    };

    const nextHistory = [...this.history, entry].slice(-HISTORY_LIMIT);
    this.history = nextHistory;
    // Only persist to file storage - no longer use workspaceState
    await writeStorageJson(HISTORY_STORAGE_FILE, nextHistory);
  }

  private readBudgetConfig(): BudgetConfig {
    const config = vscode.workspace.getConfiguration('baselineGate');
    const sanitize = (value: unknown): number | undefined => {
      if (typeof value !== 'number') {
        return undefined;
      }
      if (!Number.isFinite(value) || value < 0) {
        return undefined;
      }
      return value;
    };
    return {
      blockedLimit: sanitize(config.get<number>('blockedBudget')),
      warningLimit: sanitize(config.get<number>('warningBudget')),
      safeGoal: sanitize(config.get<number>('safeGoal'))
    };
  }

  private buildBudgetSnapshot(summary: Summary): BaselineBudgetSnapshot | null {
    const { blockedLimit, warningLimit, safeGoal } = this.budgetConfig;
    if (blockedLimit === undefined && warningLimit === undefined && safeGoal === undefined) {
      return null;
    }
    return {
      target: this.target,
      blockedLimit,
      warningLimit,
      safeLimit: safeGoal,
      blocked: summary.blocked,
      warning: summary.warning,
      safe: summary.safe
    };
  }

  getSeverityFilter(): Verdict[] {
    return Array.from(this.severityFilter.values());
  }

  setSortOrder(order: SortOrder): void {
    if (order === this.sortOrder) {
      return;
    }
    this.sortOrder = order;
    this.postState();
  }

  toggleSortOrder(): SortOrder {
    this.sortOrder = this.sortOrder === "severity" ? "file" : "severity";
    this.postState();
    return this.sortOrder;
  }

  clearFilters(): void {
    this.searchQuery = "";
    this.severityFilter = new Set(DEFAULT_SEVERITIES);
    this.sortOrder = DEFAULT_SORT_ORDER;
    this.postState();
  }

  setTarget(target: Target): void {
    if (this.target === target) {
      return;
    }
    this.target = target;
    this.recalculateVerdicts();
    this.postState();
  }

  refreshView(): void {
    this.postState();
  }

  showInsightsPanel(): void {
    if (this.view) {
      void this.view.webview.postMessage({ type: 'showInsights' });
      this.pendingShowInsights = false;
      return;
    }
    this.pendingShowInsights = true;
  }

  highlightFinding(findingId: string): void {
    const finding = this.findings.find(f => computeFindingId(f) === findingId);
    if (finding) {
      this.setIssueSelection(findingId);
      this.openIssueDetail(findingId);
    }
  }

  getSummary(options: { filtered?: boolean } = {}): Summary {
    const dataset = options.filtered ? this.applyFilters(this.findings) : this.findings;
    return summarize(dataset);
  }

  private syncSelection(filtered: BaselineFinding[]): void {
    const next = syncSelection(
      {
        selectedIssueId: this.selectedIssueId,
        selectedFileUri: this.selectedFileUri,
        detailSelection: this.detailSelection,
        collapsedFileUris: this.collapsedFileUris
      },
      filtered
    );
    this.selectedIssueId = next.selectedIssueId;
    this.selectedFileUri = next.selectedFileUri;
    this.detailSelection = next.detailSelection;
  }

  private setIssueSelection(issueId: string): void {
    const finding = this.findings.find((candidate) => computeFindingId(candidate) === issueId);
    if (!finding) {
      const hadSelection = this.selectedIssueId !== null || this.selectedFileUri !== null;
      const hadDetail = this.detailSelection !== null;
      this.selectedIssueId = null;
      this.selectedFileUri = null;
      if (hadDetail) {
        this.detailSelection = null;
      }
      if (hadSelection || hadDetail) {
        this.postState();
      }
      return;
    }

    const issueUri = finding.uri.toString();
    const selectionChanged = this.selectedIssueId !== issueId || this.selectedFileUri !== issueUri;
    const hadDetail = this.detailSelection !== null;

    this.selectedIssueId = issueId;
    this.selectedFileUri = issueUri;
    if (hadDetail) {
      this.detailSelection = null;
    }

    if (selectionChanged || hadDetail) {
      this.postState();
    }
  }

  private setFileSelection(uriString: string): void {
    const exists = this.findings.some((finding) => finding.uri.toString() === uriString);
    const nextSelectedFileUri = exists ? uriString : null;
    const selectionChanged = this.selectedFileUri !== nextSelectedFileUri || this.selectedIssueId !== null;
    const hadDetail = this.detailSelection !== null;

    this.selectedFileUri = nextSelectedFileUri;
    this.selectedIssueId = null;
    if (hadDetail) {
      this.detailSelection = null;
    }

    if (selectionChanged || hadDetail) {
      this.postState();
    }
  }

  private setFileExpansion(uriString: string, expanded: boolean): void {
    const exists = this.findings.some((finding) => finding.uri.toString() === uriString);
    if (!exists) {
      if (!expanded && this.collapsedFileUris.delete(uriString)) {
        this.postState();
      }
      return;
    }

    const wasCollapsed = this.collapsedFileUris.has(uriString);
    if (expanded) {
      if (!wasCollapsed) {
        return;
      }
      this.collapsedFileUris.delete(uriString);
    } else {
      if (wasCollapsed) {
        return;
      }
      this.collapsedFileUris.add(uriString);
    }
    this.postState();
  }

  private openIssueDetail(issueId: string): void {
    const finding = this.findings.find((candidate) => computeFindingId(candidate) === issueId);
    if (!finding) {
      return;
    }

    // Open the detail view in a new panel
    BaselineDetailViewProvider.createOrShow(
      this.context,
      finding,
      this.target,
      this.assets,
      this.geminiProvider
    );

    // Update sidebar selection for visual feedback
    this.selectedIssueId = issueId;
    this.selectedFileUri = finding.uri.toString();
    this.collapsedFileUris.delete(this.selectedFileUri);
    this.postState();
  }

  private openFileDetail(uriString: string): void {
    const fileFindings = this.findings.filter((finding) => finding.uri.toString() === uriString);
    if (!fileFindings.length) {
      return;
    }

    // Open the file details in the large detail view panel
    BaselineDetailViewProvider.createOrShowFileDetails(
      this.context,
      fileFindings,
      this.target,
      this.assets,
      this.geminiProvider
    );

    // Update sidebar selection for visual feedback
    this.selectedFileUri = uriString;
    this.selectedIssueId = null;
    this.collapsedFileUris.delete(uriString);
    this.postState();
  }

  private buildDetailPayload(
    filtered: BaselineFinding[],
    severityIconUris: Record<Verdict, string>
  ): DetailPayload | null {
    const webview = this.view?.webview;
    if (!webview) {
      return null;
    }
    const selection = this.detailSelection;
    if (!selection) {
      return null;
    }

    if (selection.mode === "issue") {
      const finding = filtered.find((candidate) => computeFindingId(candidate) === selection.id);
      if (!finding) {
        this.detailSelection = null;
        return null;
      }
      const relativePath = vscode.workspace.asRelativePath(finding.uri, false);
      const position = `${finding.range.start.line + 1}:${finding.range.start.character + 1}`;
      return {
        mode: "issue",
        title: finding.feature.name,
        subtitle: `${formatVerdict(finding.verdict)} · ${escapeHtml(relativePath)}:${position}`,
        filePath: relativePath,
        html: buildIssueDetailHtml({
          finding,
          severityIconUris,
          target: this.target,
          assets: this.assets,
          webview,
          gemini: this.getGeminiContext(finding)
        })
      };
    }

    const issues = filtered.filter((finding) => finding.uri.toString() === selection.uri);
    if (!issues.length) {
      this.detailSelection = null;
      return null;
    }
    const relativePath = vscode.workspace.asRelativePath(issues[0].uri, false);
    return {
      mode: "file",
      title: relativePath,
      filePath: relativePath,
      html: buildFileDetailHtml(issues, severityIconUris, {
        target: this.target,
        assets: this.assets,
        webview,
        getGeminiContext: (finding) => this.getGeminiContext(finding)
      })
    };
  }



  private recalculateVerdicts() {
    for (const finding of this.findings) {
      finding.verdict = scoreFeature(finding.feature.support, this.target);
    }
  }

  private handleMessage(message: MessageFromWebview) {
    processMessage(
      {
        ready: () => {
          this.handleWebviewReady();
        },
        runScan: () => {
          void this.runScan();
        },
        setSearch: (value) => {
          this.setSearchQuery(value);
        },
        setSeverity: (value) => {
          this.setSeverityFilter(value);
        },
        setSort: (value) => {
          this.setSortOrder(value);
        },
        clearFilters: () => {
          this.clearFilters();
        },
        selectIssue: (id) => {
          this.setIssueSelection(id);
        },
        openIssueDetail: (id) => {
          this.openIssueDetail(id);
        },
        selectFile: (uri) => {
          this.setFileSelection(uri);
        },
        setFileExpansion: (uri, expanded) => {
          this.setFileExpansion(uri, expanded);
        },
        openFileDetail: (uri) => {
          this.openFileDetail(uri);
        },
        closeDetail: () => {
          this.detailSelection = null;
          this.selectedIssueId = null;
          this.selectedFileUri = null;
          this.postState();
        },
        openFile: ({ uri, start, end }) => {
          void this.openFile(uri, start, end);
        },
        openDocs: (url) => {
          if (!url) {
            void vscode.window.showInformationMessage("No documentation link found for this baseline finding.");
            return;
          }
          void vscode.env.openExternal(vscode.Uri.parse(url));
        },
        askGemini: ({ issue, feature, findingId, context }) => {
          void vscode.commands.executeCommand("baseline-gate.askGemini", {
            issue,
            feature,
            findingId,
            context
          });
        },
        askGeminiFollowUp: ({ question, findingId, feature, filePath, target }) => {
          void vscode.commands.executeCommand("baseline-gate.askGeminiFollowUp", {
            question,
            findingId,
            feature,
            filePath,
            target
          });
        },
        copyCodeSnippet: (code) => {
          void this.copyCodeSnippet(code);
        }
      },
      message
    );
  }

  private async openFile(
    uriString: string,
    start: { line: number; character: number },
    end: { line: number; character: number }
  ) {
    try {
      const uri = vscode.Uri.parse(uriString);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document, { preview: false });
      const selection = new vscode.Range(
        new vscode.Position(start.line, start.character),
        new vscode.Position(end.line, end.character)
      );
      editor.selection = new vscode.Selection(selection.start, selection.end);
      editor.revealRange(selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Unable to open file: ${err}`);
    }
  }

  private applyFilters(dataset: BaselineFinding[]): BaselineFinding[] {
    return filterFindings(dataset, this.severityFilter, this.searchQuery);
  }

  private buildState(): WebviewState {
    const all = this.findings;
    const filtered = this.applyFilters(all);
    this.syncSelection(filtered);
    const severityIconUris = this.resolveStatusIconUris();

    const grouped = groupFindingsByFile(filtered, this.sortOrder);
    const stats = computeFindingsStatistics(all);
    const summaryAll = summarize(all);
    const budgetSnapshot = this.buildBudgetSnapshot(summaryAll);
    const filePayloads = grouped.map((group) =>
      buildFilePayload(
        group,
        this.sortOrder,
        this.selectedIssueId,
        this.selectedFileUri,
        this.collapsedFileUris
      )
    );

    const detail = this.buildDetailPayload(filtered, severityIconUris);
    return buildWebviewState({
      context: {
        findings: all,
        target: this.target,
        searchQuery: this.searchQuery,
        severityFilter: this.severityFilter,
        sortOrder: this.sortOrder,
        scanning: this.scanning,
        progressText: this.progressText,
        lastScanAt: this.lastScanAt,
        selectedIssueId: this.selectedIssueId,
        selectedFileUri: this.selectedFileUri,
        detailSelection: this.detailSelection,
        collapsedFileUris: this.collapsedFileUris
      },
      filtered,
      severityIconUris,
      files: filePayloads,
      detail,
      history: this.getScanHistory(),
      stats,
      budget: budgetSnapshot
    });
  }

  private getGeminiContext(finding: BaselineFinding): GeminiSupportContext | undefined {
    if (!this.geminiProvider) {
      return undefined;
    }
    return {
      hasExistingSuggestion: this.geminiProvider.hasSuggestionForFinding(finding.id),
      suggestions: this.geminiProvider.getSuggestionsForFinding(finding.id)
    };
  }

  // Method to get findings in a format that's already optimized for IssuePayload creation
  getOptimizedFindings(): BaselineFinding[] {
    // In the future, we could cache the StoredIssuePayload format in memory
    // and only transform when findings actually change, but for now return findings as-is
    return this.findings;
  }

  private resolveStatusIconUris(): Record<Verdict, string> {
    const webview = this.view?.webview;
    if (!webview) {
      return {
        blocked: "",
        warning: "",
        safe: ""
      };
    }
    return {
      blocked: webview.asWebviewUri(this.assets.statusIcons.blocked).toString(),
      warning: webview.asWebviewUri(this.assets.statusIcons.warning).toString(),
      safe: webview.asWebviewUri(this.assets.statusIcons.safe).toString()
    };
  }

  private async copyCodeSnippet(code: string): Promise<void> {
    if (!code) {
      void vscode.window.showWarningMessage("Unable to copy Gemini code snippet: no content available.");
      return;
    }

    try {
      await vscode.env.clipboard.writeText(code);
      vscode.window.setStatusBarMessage("Gemini code snippet copied to clipboard.", 3000);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to copy Gemini code snippet: ${err}`);
    }
  }

  private handleWebviewReady(): void {
    if (!this.view) {
      this.viewReady = false;
      return;
    }
    this.viewReady = true;
    const state = this.pendingState ?? this.buildState();
    this.pendingState = state;
    void this.view.webview.postMessage({ type: "state", payload: state });
  }

  private postState() {
    if (!this.view) {
      this.pendingState = null;
      return;
    }
    const state = this.buildState();
    this.pendingState = state;
    if (!this.viewReady) {
      return;
    }
    void this.view.webview.postMessage({ type: "state", payload: state });
  }

}
