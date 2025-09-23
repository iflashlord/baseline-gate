import * as vscode from "vscode";

import { scanWorkspaceForBaseline, type BaselineFinding } from "./workspaceScanner";
import { TARGET_MIN, type Target } from "../core/targets";
import { scoreFeature, type Verdict } from "../core/scoring";
import type { BrowserKey, DiscouragedInfo, SupportStatement } from "../core/baselineData";

const DEFAULT_SEVERITIES: Verdict[] = ["blocked", "warning", "safe"];
const DEFAULT_SORT_ORDER: SortOrder = "severity";

const DESKTOP_BROWSERS: Array<{ key: BrowserKey; label: string }> = [
  { key: "chrome", label: "Chrome" },
  { key: "edge", label: "Edge" },
  { key: "firefox", label: "Firefox" },
  { key: "safari", label: "Safari" }
];

const MOBILE_BROWSERS: Array<{ key: BrowserKey; label: string }> = [
  { key: "chrome_android", label: "Chrome Android" },
  { key: "firefox_android", label: "Firefox Android" },
  { key: "safari_ios", label: "Safari iOS" }
];

export type SortOrder = "severity" | "file";

export interface BaselineAnalysisAssets {
  statusIcons: Record<Verdict, vscode.Uri>;
}

type WebviewState = {
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

type Summary = {
  blocked: number;
  warning: number;
  safe: number;
  total: number;
};

type FileGroupPayload = {
  uri: string;
  relativePath: string;
  extension: string;
  iconLabel: string;
  iconVariant: string;
  counts: Summary;
  selected: boolean;
  issues: IssuePayload[];
};

type IssuePayload = {
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

type DetailPayload =
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

type MessageFromWebview =
  | { type: "scan" }
  | { type: "setSearch"; value: string }
  | { type: "setSeverity"; value: Verdict[] }
  | { type: "setSort"; value: SortOrder }
  | { type: "clearFilters" }
  | { type: "openFile"; uri: string; start: { line: number; character: number }; end: { line: number; character: number } }
  | { type: "openDocs"; url?: string }
  | { type: "selectIssue"; id: string }
  | { type: "selectFile"; uri: string }
  | { type: "closeDetail" };

export class BaselineAnalysisViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private findings: BaselineFinding[] = [];
  private searchQuery = "";
  private severityFilter = new Set<Verdict>(DEFAULT_SEVERITIES);
  private sortOrder: SortOrder = DEFAULT_SORT_ORDER;
  private scanning = false;
  private progressText: string | undefined;
  private lastScanAt: Date | undefined;
  private selectedIssueId: string | null = null;
  private selectedFileUri: string | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private target: Target,
    private readonly assets: BaselineAnalysisAssets
  ) {}

  register(): vscode.Disposable {
    return vscode.window.registerWebviewViewProvider("baselineGate.analysisView", this);
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    const webview = view.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")]
    };
    webview.html = this.renderHtml(webview);
    webview.onDidReceiveMessage((message) => this.handleMessage(message));
    this.postState();
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

  setSeverityFilter(verdicts: Verdict[]): void {
    const next = new Set<Verdict>(verdicts.length ? verdicts : DEFAULT_SEVERITIES);
    if (sameSet(this.severityFilter, next)) {
      return;
    }
    this.severityFilter = next;
    this.postState();
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

  getSummary(options: { filtered?: boolean } = {}): Summary {
    const dataset = options.filtered ? this.applyFilters(this.findings) : this.findings;
    return summarize(dataset);
  }

  private syncSelection(filtered: BaselineFinding[]): void {
    if (this.selectedIssueId) {
      const exists = filtered.some((finding) => computeFindingId(finding) === this.selectedIssueId);
      if (!exists) {
        this.selectedIssueId = null;
      }
    }

    if (this.selectedFileUri) {
      const exists = filtered.some((finding) => finding.uri.toString() === this.selectedFileUri);
      if (!exists) {
        this.selectedFileUri = null;
      }
    }
  }

  private setIssueSelection(issueId: string): void {
    if (this.selectedIssueId === issueId) {
      return;
    }
    const finding = this.findings.find((candidate) => computeFindingId(candidate) === issueId);
    if (!finding) {
      this.selectedIssueId = null;
      this.selectedFileUri = null;
    } else {
      this.selectedIssueId = issueId;
      this.selectedFileUri = finding.uri.toString();
    }
    this.postState();
  }

  private setFileSelection(uriString: string): void {
    if (this.selectedFileUri === uriString && this.selectedIssueId === null) {
      return;
    }
    const exists = this.findings.some((finding) => finding.uri.toString() === uriString);
    this.selectedFileUri = exists ? uriString : null;
    this.selectedIssueId = null;
    this.postState();
  }

  private buildDetailPayload(
    filtered: BaselineFinding[],
    severityIconUris: Record<Verdict, string>
  ): DetailPayload | null {
    if (this.selectedIssueId) {
      const finding = filtered.find((candidate) => computeFindingId(candidate) === this.selectedIssueId);
      if (finding) {
        const relativePath = vscode.workspace.asRelativePath(finding.uri, false);
        const position = `${finding.range.start.line + 1}:${finding.range.start.character + 1}`;
        return {
          mode: "issue",
          title: finding.feature.name,
          subtitle: `${formatVerdict(finding.verdict)} · ${escapeHtml(relativePath)}:${position}`,
          filePath: relativePath,
          html: this.createIssueDetailHtml(finding, severityIconUris)
        };
      }
    }

    if (this.selectedFileUri) {
      const issues = filtered.filter((finding) => finding.uri.toString() === this.selectedFileUri);
      if (issues.length) {
        const relativePath = vscode.workspace.asRelativePath(issues[0].uri, false);
        return {
          mode: "file",
          title: relativePath,
          filePath: relativePath,
          html: this.createFileDetailHtml(issues, severityIconUris)
        };
      }
    }

    return null;
  }

  private createFileDetailHtml(
    findings: BaselineFinding[],
    severityIconUris: Record<Verdict, string>
  ): string {
    const sections = findings
      .sort((a, b) => a.range.start.line - b.range.start.line)
      .map((finding, index) => {
        const anchor = `issue-${index + 1}`;
        const header =
          `<div class="detail-subtitle">Finding ${index + 1} — ${escapeHtml(formatVerdict(finding.verdict))} (line ${
            finding.range.start.line + 1
          })</div>`;
        const html = this.createIssueDetailHtml(finding, severityIconUris);
        return `<section id="${anchor}" class="detail-entry">${header}${html}</section>`;
      });

    return sections.join("\n");
  }

  private createIssueDetailHtml(
    finding: BaselineFinding,
    severityIconUris: Record<Verdict, string>
  ): string {
    const feature = finding.feature;
    const relativePath = vscode.workspace.asRelativePath(finding.uri, false);
    const verdictLabel = formatVerdict(finding.verdict);
    const baselineSummary = formatBaselineSummary(feature);
    const supportTable = renderSupportTables(feature, this.target);
    const groups = feature.groups.map((group) => escapeHtml(group.name)).join(", ");
    const snapshots = feature.snapshots.map((snapshot) => escapeHtml(snapshot.name)).join(", ");
    const discouraged = feature.discouraged
      ? `<div class="detail-section detail-discouraged"><h4>Usage guidance</h4><p><strong>Discouraged:</strong> ${escapeHtml(
          formatDiscouraged(feature.discouraged)
        )}</p></div>`
      : "";

    const description = feature.description
      ? `<div class="detail-section"><h4>Description</h4><p>${escapeHtml(feature.description)}</p></div>`
      : "";

    const contextLines: string[] = [];
    if (groups) {
      contextLines.push(`<div><strong>Groups:</strong> ${groups}</div>`);
    }
    if (snapshots) {
      contextLines.push(`<div><strong>Snapshots:</strong> ${snapshots}</div>`);
    }

    const contextBlock = contextLines.length
      ? `<div class="detail-section"><h4>Context</h4><div class="detail-context">${contextLines.join("")}</div></div>`
      : "";

    const snippet = `<pre class="detail-code">${escapeHtml(finding.lineText)}</pre>`;

    const verdictBadge = `<span class="detail-badge ${finding.verdict}">${escapeHtml(verdictLabel)}</span>`;
    const severityIcon = `<img class="detail-icon" src="${severityIconUris[finding.verdict]}" alt="${escapeHtml(
      finding.verdict
    )}" />`;

    const location = `${escapeHtml(relativePath)} · line ${finding.range.start.line + 1}, column ${
      finding.range.start.character + 1
    }`;

    const docButton = feature.docsUrl
      ? `<div class="detail-section detail-actions"><button class="detail-doc-link" data-doc-url="${escapeAttribute(
          feature.docsUrl
        )}">Open documentation</button></div>`
      : "";

    return `
      <div class="detail-block">
        <header class="detail-header-block">
          ${severityIcon}
          <div>
            <div class="detail-title">${escapeHtml(feature.name)}</div>
            <div class="detail-meta">${verdictBadge} ${escapeHtml(location)}</div>
          </div>
        </header>
        <div class="detail-section">
          <h4>Summary</h4>
          <ul>
            <li>${escapeHtml(verdictLabel)} for ${escapeHtml(capitalize(this.target))} targets</li>
            <li>${escapeHtml(baselineSummary)}</li>
          </ul>
        </div>
        ${description}
        ${discouraged}
        ${supportTable}
        ${contextBlock}
        <div class="detail-section">
          <h4>Code snippet</h4>
          ${snippet}
        </div>
        ${docButton}
      </div>
    `;
  }
  private recalculateVerdicts() {
    for (const finding of this.findings) {
      finding.verdict = scoreFeature(finding.feature.support, this.target);
    }
  }

  private handleMessage(message: MessageFromWebview) {
    switch (message.type) {
      case "scan":
        void this.runScan();
        break;
      case "setSearch":
        this.setSearchQuery(message.value);
        break;
      case "setSeverity":
        this.setSeverityFilter(message.value);
        break;
      case "setSort":
        this.setSortOrder(message.value);
        break;
      case "clearFilters":
        this.clearFilters();
        break;
      case "selectIssue":
        this.setIssueSelection(message.id);
        break;
      case "selectFile":
        this.setFileSelection(message.uri);
        break;
      case "closeDetail":
        this.selectedIssueId = null;
        this.selectedFileUri = null;
        this.postState();
        break;
      case "openFile":
        void this.openFile(message.uri, message.start, message.end);
        break;
      case "openDocs":
        if (!message.url) {
          void vscode.window.showInformationMessage("No documentation link found for this baseline finding.");
          return;
        }
        void vscode.env.openExternal(vscode.Uri.parse(message.url));
        break;
      default:
        break;
    }
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
    const query = this.searchQuery;
    return dataset.filter((finding) => {
      if (!this.severityFilter.has(finding.verdict)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return matchesSearch(finding, query);
    });
  }

  private buildState(): WebviewState {
    const all = this.findings;
    const filtered = this.applyFilters(all);
    this.syncSelection(filtered);
    const severityIconUris = this.resolveStatusIconUris();

    const grouped = groupByFile(filtered, this.sortOrder);
    const filePayloads = grouped.map((group) =>
      toFilePayload(group, this.sortOrder, this.selectedIssueId, this.selectedFileUri)
    );

    const detail = this.buildDetailPayload(filtered, severityIconUris);

    return {
      target: this.target,
      searchQuery: this.searchQuery,
      severityFilter: Array.from(this.severityFilter.values()),
      sortOrder: this.sortOrder,
      scanning: this.scanning,
      progressText: this.progressText,
      lastScanAt: this.lastScanAt?.toISOString(),
      summary: summarize(all),
      filteredSummary: summarize(filtered),
      filtersActive: hasActiveFilters(this.searchQuery, this.severityFilter, this.sortOrder),
      selectedIssueId: this.selectedIssueId,
      selectedFileUri: this.selectedFileUri,
      files: filePayloads,
      severityIconUris,
      detail
    };
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

  private postState() {
    if (!this.view) {
      return;
    }
    const state = this.buildState();
    void this.view.webview.postMessage({ type: "state", payload: state });
  }

  private renderHtml(webview: vscode.Webview): string {
    const nonce = generateNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        color-scheme: var(--vscode-color-scheme);
      }
      html, body {
        height: 100%;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        box-sizing: border-box;
      }
      .view {
        display: flex;
        flex-direction: column;
        height: 100%;
        box-sizing: border-box;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      }
      .controls button {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        border: 1px solid var(--vscode-button-border, transparent);
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        padding: 0.25rem 0.7rem;
        border-radius: 4px;
        cursor: pointer;
      }
      .controls button.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      .controls button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .filters {
        display: grid;
        grid-template-columns: minmax(120px, 1fr);
        gap: 0.5rem;
        padding: 0 0.75rem 0.75rem;
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      }
      @media (min-width: 420px) {
        .filters {
          grid-template-columns: minmax(160px, 2fr) minmax(120px, 1fr);
          align-items: center;
        }
      }
      @media (min-width: 680px) {
        .filters {
          grid-template-columns: minmax(160px, 2fr) minmax(200px, 1.5fr) auto;
        }
      }
      .search-box input {
        width: 100%;
        padding: 0.35rem 0.5rem;
        border-radius: 4px;
        border: 1px solid var(--vscode-input-border, transparent);
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
      }
      .search-box input::placeholder {
        color: var(--vscode-input-placeholderForeground);
      }
      .severity-filter {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
      }
      .severity-filter label {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border: 1px solid var(--vscode-inputOption-border, transparent);
        background: var(--vscode-inputOption-activeBackground);
        color: var(--vscode-inputOption-activeForeground);
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
        cursor: pointer;
      }
      .severity-filter label.inactive {
        background: transparent;
        color: var(--vscode-input-foreground);
        border-color: var(--vscode-input-border, transparent);
        opacity: 0.7;
      }
      .severity-filter input {
        display: none;
      }
      .sort-select {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .sort-select select {
        padding: 0.3rem 0.5rem;
        border-radius: 4px;
        border: 1px solid var(--vscode-dropdown-border, transparent);
        background: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
      }
      .summary {
        font-size: 0.85rem;
        opacity: 0.8;
        padding: 0.5rem 0.75rem;
      }
      .content {
        flex: 1;
        min-height: 0;
        display: flex;
        gap: 0.5rem;
        padding: 0 0.75rem 0.75rem;
        box-sizing: border-box;
      }
      .results {
        flex: 1 1 55%;
        overflow: auto;
        padding: 0.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        box-sizing: border-box;
      }
      .empty-state, .progress-state {
        margin: 1.5rem 1rem;
        font-size: 0.95rem;
        opacity: 0.75;
      }
      .file-group {
        border: 1px solid var(--vscode-tree-indentGuidesStroke, transparent);
        border-radius: 6px;
        background: var(--vscode-sideBarSectionHeader-background, transparent);
        overflow: hidden;
      }
      .file-header {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.5rem;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: var(--vscode-tree-tableColumnsBorder, transparent);
        cursor: pointer;
      }
      .file-group.selected .file-header {
        background: var(--vscode-editor-selectionBackground, rgba(128, 128, 128, 0.15));
      }
      details[open] .file-header {
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      }
      .file-icon {
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.85rem;
        color: #fff;
      }
      .file-icon.js { background: #f1c40f; color: #222; }
      .file-icon.ts { background: #3178c6; }
      .file-icon.tsx { background: #2f74c0; }
      .file-icon.jsx { background: #61dafb; color: #0b1f33; }
      .file-icon.css { background: #264de4; }
      .file-icon.scss { background: #c6538c; }
      .file-icon.default { background: #7f8c8d; }
      .file-path {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 600;
      }
      .file-counts {
        font-size: 0.8rem;
        display: inline-flex;
        gap: 0.4rem;
        color: var(--vscode-descriptionForeground);
      }
      .file-counts span {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
      }
      .file-counts img {
        width: 0.9rem;
        height: 0.9rem;
      }
      .issues {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.4rem 0.6rem 0.6rem;
      }
      .issue {
        border: 1px solid var(--vscode-tree-indentGuidesStroke, transparent);
        border-radius: 6px;
        padding: 0.4rem 0.5rem;
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.45rem;
        background: var(--vscode-editor-inactiveSelection);
        cursor: pointer;
      }
      .issue.safe { background: var(--vscode-editor-inactiveSelection, rgba(16,124,65,0.1)); }
      .issue.warning { background: rgba(249, 209, 129, 0.15); }
      .issue.blocked { background: rgba(209, 52, 56, 0.18); }
      .issue.selected {
        outline: 1px solid var(--vscode-focusBorder, rgba(90, 133, 204, 0.6));
        box-shadow: 0 0 0 1px var(--vscode-focusBorder, rgba(90, 133, 204, 0.4));
      }
      .issue-icon {
        width: 1.5rem;
        height: 1.5rem;
      }
      .issue-main {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      .issue-title {
        font-weight: 600;
      }
      .issue-snippet {
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 0.9rem;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--vscode-foreground);
        opacity: 0.85;
        background: var(--vscode-editor-background, transparent);
        border-radius: 4px;
        padding: 0.25rem 0.35rem;
      }
      .issue-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: space-between;
        gap: 0.4rem;
      }
      .issue-actions button {
        border: 1px solid transparent;
        border-radius: 4px;
        background: transparent;
        color: var(--vscode-button-secondaryForeground);
        cursor: pointer;
        padding: 0.25rem 0.4rem;
      }
      .issue-actions button:hover {
        color: var(--vscode-button-foreground);
      }
      .detail {
        flex: 1 1 45%;
        border-left: 1px solid var(--vscode-sideBarSectionHeader-border);
        padding: 0.25rem 0 0.25rem 0.5rem;
        box-sizing: border-box;
        overflow: auto;
        display: flex;
      }
      .detail.hidden {
        display: none;
      }
      .detail-pane {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
      }
      .detail-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .detail-close {
        border: 1px solid var(--vscode-button-border, transparent);
        border-radius: 4px;
        padding: 0.2rem 0.6rem;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        cursor: pointer;
        flex-shrink: 0;
      }
      .detail-close:hover {
        background: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-secondaryBackground));
      }
      .detail-heading {
        font-weight: 600;
        font-size: 1rem;
      }
      .detail-subheading {
        font-size: 0.85rem;
        color: var(--vscode-descriptionForeground);
      }
      .detail-subheading.hidden {
        display: none;
      }
      .detail-path {
        font-size: 0.8rem;
        color: var(--vscode-descriptionForeground);
      }
      .detail-body {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .detail-block {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        border: 1px solid var(--vscode-tree-indentGuidesStroke, transparent);
        border-radius: 6px;
        padding: 0.75rem;
        background: var(--vscode-sideBarSectionHeader-background, rgba(128, 128, 128, 0.06));
      }
      .detail-header-block {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.6rem;
        align-items: center;
      }
      .detail-icon {
        width: 1.75rem;
        height: 1.75rem;
      }
      .detail-title {
        font-weight: 600;
      }
      .detail-meta {
        font-size: 0.8rem;
        color: var(--vscode-descriptionForeground);
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex-wrap: wrap;
      }
      .detail-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .detail-badge.blocked { background: rgba(209, 52, 56, 0.2); color: #d13438; }
      .detail-badge.warning { background: rgba(249, 209, 129, 0.25); color: #8d6b0b; }
      .detail-badge.safe { background: rgba(16, 124, 65, 0.2); color: #107c41; }
      .detail-section h4 {
        margin: 0 0 0.3rem;
        font-size: 0.9rem;
      }
      .detail-section ul {
        margin: 0;
        padding-left: 1.2rem;
      }
      .detail-section ul li {
        margin-bottom: 0.15rem;
      }
      .detail-code {
        background: var(--vscode-editor-background);
        border-radius: 4px;
        padding: 0.5rem;
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 0.9rem;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .detail-context div {
        margin-bottom: 0.25rem;
      }
      .detail-table {
        margin-top: 0.35rem;
      }
      .detail-table table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .detail-table th,
      .detail-table td {
        border: 1px solid var(--vscode-sideBarSectionHeader-border);
        padding: 0.3rem 0.4rem;
        text-align: left;
      }
      .detail-table th {
        background: var(--vscode-sideBarSectionHeader-background, rgba(128, 128, 128, 0.1));
      }
      .detail-discouraged p {
        margin: 0;
      }
      .detail-actions {
        display: flex;
        gap: 0.5rem;
      }
      .detail-doc-link {
        border: 1px solid var(--vscode-button-border, transparent);
        border-radius: 4px;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        padding: 0.3rem 0.7rem;
        cursor: pointer;
      }
      .detail-doc-link:hover {
        background: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-secondaryBackground));
      }
      .detail-entry {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .detail-subtitle {
        font-size: 0.85rem;
        color: var(--vscode-descriptionForeground);
      }
      @media (max-width: 880px) {
        .content {
          flex-direction: column;
        }
        .detail {
          border-left: none;
          border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
          padding: 0.5rem 0 0;
        }
      }
      .hidden {
        display: none !important;
      }
    </style>
  </head>
  <body>
    <div class="view">
      <div class="controls">
        <button class="primary" data-action="scan">Scan workspace</button>
        <button data-action="clear-filters">Clear filters</button>
      </div>
      <div class="filters">
        <div class="search-box">
          <input type="search" placeholder="Search findings" data-search />
        </div>
        <div class="severity-filter" data-severity>
          <label data-verdict="blocked"><input type="checkbox" value="blocked" />Blocked</label>
          <label data-verdict="warning"><input type="checkbox" value="warning" />Needs review</label>
          <label data-verdict="safe"><input type="checkbox" value="safe" />Safe</label>
        </div>
        <div class="sort-select">
          <label>
            Sort by
            <select data-sort>
              <option value="severity">Severity (blocked first)</option>
              <option value="file">File path</option>
            </select>
          </label>
        </div>
      </div>
      <div class="summary" data-summary></div>
      <div class="content">
        <div class="results" data-results></div>
        <aside class="detail hidden" data-detail>
          <div class="detail-pane">
            <div class="detail-top">
              <div>
                <div class="detail-heading" data-detail-title></div>
                <div class="detail-subheading hidden" data-detail-subtitle></div>
              </div>
              <button class="detail-close" data-detail-close>Close</button>
            </div>
            <div class="detail-path" data-detail-path></div>
            <div class="detail-body" data-detail-body></div>
          </div>
        </aside>
      </div>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();

      let currentState = null;
      let searchDebounce = null;

      const controls = document.querySelector('[data-action="scan"]');
      const clearBtn = document.querySelector('[data-action="clear-filters"]');
      const searchInput = document.querySelector('[data-search]');
      const severityContainer = document.querySelector('[data-severity]');
      const sortSelect = document.querySelector('[data-sort]');
      const resultsNode = document.querySelector('[data-results]');
      const summaryNode = document.querySelector('[data-summary]');
      const detailNode = document.querySelector('[data-detail]');
      const detailTitleNode = document.querySelector('[data-detail-title]');
      const detailSubtitleNode = document.querySelector('[data-detail-subtitle]');
      const detailPathNode = document.querySelector('[data-detail-path]');
      const detailBodyNode = document.querySelector('[data-detail-body]');
      const detailCloseBtn = document.querySelector('[data-detail-close]');

      controls.addEventListener('click', () => {
        vscode.postMessage({ type: 'scan' });
      });

      clearBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'clearFilters' });
      });

      searchInput.addEventListener('input', (event) => {
        const value = event.target.value || '';
        if (searchDebounce) {
          clearTimeout(searchDebounce);
        }
        searchDebounce = setTimeout(() => {
          vscode.postMessage({ type: 'setSearch', value });
        }, 150);
      });

      severityContainer.addEventListener('click', (event) => {
        const label = event.target.closest('label[data-verdict]');
        if (!label) {
          return;
        }
        event.preventDefault();
        const checkbox = label.querySelector('input');
        checkbox.checked = !checkbox.checked;
        label.classList.toggle('inactive', !checkbox.checked);
        const verdicts = Array.from(severityContainer.querySelectorAll('input:checked')).map((input) => input.value);
        vscode.postMessage({ type: 'setSeverity', value: verdicts });
      });

      sortSelect.addEventListener('change', (event) => {
        vscode.postMessage({ type: 'setSort', value: event.target.value });
      });

      detailCloseBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'closeDetail' });
      });

      detailBodyNode.addEventListener('click', (event) => {
        const button = event.target.closest('[data-doc-url]');
        if (button) {
          const url = button.getAttribute('data-doc-url');
          vscode.postMessage({ type: 'openDocs', url });
        }
      });

      window.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        if (type === 'state') {
          currentState = payload;
          applyState();
        }
      });

      function applyState() {
        if (!currentState) {
          return;
        }

        const { scanning, searchQuery, severityFilter, sortOrder, progressText, filteredSummary, summary, files, severityIconUris, filtersActive, lastScanAt, detail } = currentState;

        controls.disabled = Boolean(scanning);
        clearBtn.disabled = !filtersActive;

        if (document.activeElement !== searchInput) {
          searchInput.value = searchQuery;
        }

        updateSeverityControls(severityFilter);
        sortSelect.value = sortOrder;
        updateSummary(summary, filteredSummary, scanning, progressText, lastScanAt);
        renderResults(files, severityIconUris, scanning, progressText, filteredSummary.total);
        renderDetail(detail);
      }

      function updateSeverityControls(activeVerdicts) {
        const active = new Set(activeVerdicts);
        severityContainer.querySelectorAll('label').forEach((label) => {
          const verdict = label.dataset.verdict;
          const checked = active.has(verdict);
          const checkbox = label.querySelector('input');
          checkbox.checked = checked;
          label.classList.toggle('inactive', !checked);
        });
      }

      function updateSummary(summary, filteredSummary, scanning, progressText, lastScanAt) {
        const parts = [];
        if (scanning) {
          parts.push(progressText || 'Scanning workspace…');
        } else if (filteredSummary.total) {
          parts.push(
            filteredSummary.total +
              ' findings (blocked ' +
              filteredSummary.blocked +
              ', warnings ' +
              filteredSummary.warning +
              ', safe ' +
              filteredSummary.safe +
              ')'
          );
        } else {
          parts.push('No findings for current filters.');
        }
        if (summary.total && lastScanAt) {
          const when = new Date(lastScanAt).toLocaleString();
          parts.push('Last scan: ' + when);
        }
        summaryNode.textContent = parts.join(' · ');
      }

      function renderResults(files, severityIconUris, scanning, progressText, filteredTotal) {
        resultsNode.innerHTML = '';

        if (scanning) {
          const info = document.createElement('div');
          info.className = 'progress-state';
          info.textContent = progressText || 'Scanning workspace…';
          resultsNode.appendChild(info);
          return;
        }

        if (!filteredTotal) {
          const empty = document.createElement('div');
          empty.className = 'empty-state';
          empty.textContent = 'No baseline findings match the current filters. Run a scan or adjust filters to see results.';
          resultsNode.appendChild(empty);
          return;
        }

        for (const file of files) {
          const details = document.createElement('details');
          details.className = 'file-group';
          details.open = true;
          if (file.selected) {
            details.classList.add('selected');
          }

          const summary = document.createElement('summary');
          summary.className = 'file-header';
          summary.addEventListener('click', () => {
            vscode.postMessage({ type: 'selectFile', uri: file.uri });
          });

          const icon = document.createElement('span');
          icon.className = 'file-icon ' + file.iconVariant;
          icon.textContent = file.iconLabel;
          summary.appendChild(icon);

          const path = document.createElement('span');
          path.className = 'file-path';
          path.textContent = file.relativePath;
          summary.appendChild(path);

          const counts = document.createElement('span');
          counts.className = 'file-counts';
          counts.appendChild(createCountBadge('blocked', file.counts.blocked, severityIconUris.blocked));
          counts.appendChild(createCountBadge('warning', file.counts.warning, severityIconUris.warning));
          counts.appendChild(createCountBadge('safe', file.counts.safe, severityIconUris.safe));
          summary.appendChild(counts);

          details.appendChild(summary);

          const issuesList = document.createElement('div');
          issuesList.className = 'issues';

          for (const issue of file.issues) {
            const issueRow = document.createElement('div');
            issueRow.className = 'issue ' + issue.verdict;
            if (issue.selected) {
              issueRow.classList.add('selected');
            }

            const iconImg = document.createElement('img');
            iconImg.className = 'issue-icon';
            iconImg.src = severityIconUris[issue.verdict];
            iconImg.alt = issue.verdict;
            issueRow.appendChild(iconImg);

            const main = document.createElement('div');
            main.className = 'issue-main';

            const title = document.createElement('div');
            title.className = 'issue-title';
            title.textContent = issue.featureName + ' — ' + issue.verdictLabel;
            main.appendChild(title);

            const meta = document.createElement('div');
            meta.className = 'issue-meta';
            meta.textContent =
              issue.token +
              ' · line ' +
              issue.line +
              ', column ' +
              issue.column;
            main.appendChild(meta);

            const snippet = document.createElement('pre');
            snippet.className = 'issue-snippet';
            snippet.textContent = issue.snippet;
            main.appendChild(snippet);

            issueRow.appendChild(main);

            const actions = document.createElement('div');
            actions.className = 'issue-actions';

            const openBtn = document.createElement('button');
            openBtn.textContent = 'Open file';
            openBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              vscode.postMessage({
                type: 'openFile',
                uri: file.uri,
                start: issue.range.start,
                end: issue.range.end
              });
            });
            actions.appendChild(openBtn);

            if (issue.docsUrl) {
              const docsBtn = document.createElement('button');
              docsBtn.textContent = 'Docs';
              docsBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                vscode.postMessage({ type: 'openDocs', url: issue.docsUrl });
              });
              actions.appendChild(docsBtn);
            }

            issueRow.appendChild(actions);
            issueRow.addEventListener('click', (event) => {
              if (event.target.closest('button')) {
                return;
              }
              vscode.postMessage({ type: 'selectIssue', id: issue.id });
            });
            issuesList.appendChild(issueRow);
          }

          details.appendChild(issuesList);
          resultsNode.appendChild(details);
        }
      }

      function createCountBadge(label, value, iconUri) {
        const span = document.createElement('span');
        const icon = document.createElement('img');
        icon.src = iconUri;
        icon.alt = label;
        span.appendChild(icon);
        const text = document.createElement('span');
        text.textContent = value;
        span.appendChild(text);
        return span;
      }

      function renderDetail(detail) {
        if (!detail) {
          detailNode.classList.add('hidden');
          detailTitleNode.textContent = '';
          detailSubtitleNode.textContent = '';
          detailSubtitleNode.classList.add('hidden');
          detailPathNode.textContent = '';
          detailBodyNode.innerHTML = '';
          return;
        }

        detailNode.classList.remove('hidden');
        detailTitleNode.textContent = detail.title;
        if (detail.mode === 'issue' && detail.subtitle) {
          detailSubtitleNode.textContent = detail.subtitle;
          detailSubtitleNode.classList.remove('hidden');
        } else {
          detailSubtitleNode.textContent = '';
          detailSubtitleNode.classList.add('hidden');
        }
        detailPathNode.textContent = detail.filePath;
        detailBodyNode.innerHTML = detail.html;
      }
    </script>
  </body>
</html>`;
  }
}

function groupByFile(findings: BaselineFinding[], sortOrder: SortOrder) {
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

function toFilePayload(
  group: { uri: vscode.Uri; findings: BaselineFinding[] },
  order: SortOrder,
  selectedIssueId: string | null,
  selectedFileUri: string | null
): FileGroupPayload {
  const summary = summarize(group.findings);
  const sorted = sortFindings(group.findings, order);
  const relativePath = vscode.workspace.asRelativePath(group.uri, false);
  const extension = extractExtension(relativePath);
  const iconVariant = extensionToVariant(extension);
  const iconLabel = extension ? extension.toUpperCase() : "FILE";
  const groupId = group.uri.toString();
  const selected = selectedFileUri === groupId;

  return {
    uri: group.uri.toString(),
    relativePath,
    extension,
    iconLabel,
    iconVariant,
    counts: summary,
    selected,
    issues: sorted.map((finding) => toIssuePayload(finding, selectedIssueId === computeFindingId(finding)))
  };
}

function toIssuePayload(finding: BaselineFinding, selected: boolean): IssuePayload {
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

function sortFindings(findings: BaselineFinding[], order: SortOrder): BaselineFinding[] {
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

function computeFindingId(finding: BaselineFinding): string {
  return `${finding.uri.toString()}::${finding.feature.id}::${finding.range.start.line}::${finding.range.start.character}`;
}

function matchesSearch(finding: BaselineFinding, query: string): boolean {
  const tokens = query.split(/\s+/u).filter(Boolean);
  if (!tokens.length) {
    return true;
  }
  const relative = vscode.workspace.asRelativePath(finding.uri, false);
  const haystack = `${finding.feature.name} ${finding.feature.id} ${finding.token} ${finding.lineText} ${relative}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function sameSet<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

function summarize(findings: BaselineFinding[]): Summary {
  let blocked = 0;
  let warning = 0;
  let safe = 0;
  for (const finding of findings) {
    if (finding.verdict === "blocked") {
      blocked += 1;
    } else if (finding.verdict === "warning") {
      warning += 1;
    } else {
      safe += 1;
    }
  }
  return {
    blocked,
    warning,
    safe,
    total: findings.length
  };
}

function hasActiveFilters(query: string, severities: Set<Verdict>, sortOrder: SortOrder): boolean {
  return Boolean(query) || severities.size !== DEFAULT_SEVERITIES.length || sortOrder !== DEFAULT_SORT_ORDER;
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

function formatVerdict(verdict: Verdict): string {
  switch (verdict) {
    case "blocked":
      return "Blocked";
    case "warning":
      return "Needs review";
    default:
      return "Safe";
  }
}

function extractExtension(path: string): string {
  const match = path.match(/\.([^.\\/]+)$/);
  return match ? match[1] : "";
}

function extensionToVariant(extension: string): string {
  const ext = extension.toLowerCase();
  if (ext === "js" || ext === "mjs" || ext === "cjs") {
    return "js";
  }
  if (ext === "ts") {
    return "ts";
  }
  if (ext === "tsx") {
    return "tsx";
  }
  if (ext === "jsx") {
    return "jsx";
  }
  if (ext === "css") {
    return "css";
  }
  if (ext === "scss" || ext === "sass") {
    return "scss";
  }
  return "default";
}

function renderSupportTables(feature: BaselineFinding["feature"], target: Target): string {
  const targetMin = TARGET_MIN[target];
  const sections: string[] = [];
  const desktop = renderSupportTableHtml("Desktop support", DESKTOP_BROWSERS, feature.support, targetMin);
  if (desktop) {
    sections.push(desktop);
  }
  const mobile = renderSupportTableHtml("Mobile support", MOBILE_BROWSERS, feature.support, targetMin);
  if (mobile) {
    sections.push(mobile);
  }
  if (!sections.length) {
    return "";
  }
  return `<div class="detail-section"><h4>Browser support</h4>${sections.join("")}</div>`;
}

function renderSupportTableHtml(
  heading: string,
  browsers: Array<{ key: BrowserKey; label: string }>,
  support: BaselineFinding["feature"]["support"],
  targetMin: Partial<Record<BrowserKey, number | undefined>>
): string | null {
  const rows = browsers
    .map((browser) => {
      const statement = support[browser.key];
      const required = targetMin[browser.key];
      const hasData = Boolean(statement) || required !== undefined;
      if (!hasData) {
        return null;
      }
      const supportValue = escapeHtml(formatSupportValue(statement));
      const targetValue = required !== undefined ? escapeHtml(`v${required}`) : "—";
      const status = escapeHtml(formatSupportStatus(statement, required));
      return `<tr><th>${escapeHtml(browser.label)}</th><td>${supportValue}</td><td>${targetValue}</td><td>${status}</td></tr>`;
    })
    .filter(Boolean) as string[];

  if (!rows.length) {
    return null;
  }

  return `
    <div class="detail-table">
      <h5>${escapeHtml(heading)}</h5>
      <table>
        <thead><tr><th>Browser</th><th>Support</th><th>Target</th><th>Status</th></tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
  `;
}

function formatSupportValue(statement: SupportStatement | undefined): string {
  if (!statement) {
    return "—";
  }
  if (typeof statement.version === "number") {
    return `v${statement.version}`;
  }
  if (statement.raw) {
    return statement.raw;
  }
  return "Unknown";
}

function formatSupportStatus(statement: SupportStatement | undefined, required: number | undefined): string {
  if (required === undefined) {
    return "—";
  }
  if (!statement || typeof statement.version !== "number") {
    return "Check data";
  }
  if (statement.version >= required) {
    return "Meets target";
  }
  return "Below target";
}

function formatBaselineSummary(feature: BaselineFinding["feature"]): string {
  if (feature.baseline === "high") {
    return `Baseline: High${formatBaselineDates(feature)}`;
  }
  if (feature.baseline === "low") {
    return `Baseline: Low${formatBaselineDates(feature)}`;
  }
  return "Baseline: Limited availability";
}

function formatBaselineDates(feature: BaselineFinding["feature"]): string {
  const dates = [feature.baselineLowDate, feature.baselineHighDate].filter(Boolean);
  return dates.length ? ` (${dates.join(" → ")})` : "";
}

function formatDiscouraged(info: DiscouragedInfo): string {
  const sources = info.accordingTo.join(", ");
  const alternatives = info.alternatives?.length
    ? `; alternatives: ${info.alternatives.map((alt) => `\`${alt}\``).join(", ")}`
    : "";
  return `According to ${sources}${alternatives}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]|'/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return match;
    }
  });
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 24; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
