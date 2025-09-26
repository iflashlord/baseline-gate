import * as vscode from "vscode";

import { scanWorkspaceForBaseline, type BaselineFinding } from "./workspaceScanner";
import type { Target } from "../core/targets";
import { scoreFeature, type Verdict } from "../core/scoring";
import {
  BaselineAnalysisAssets,
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
  private detailSelection: DetailSelection = null;
  private collapsedFileUris = new Set<string>();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private target: Target,
    private readonly assets: BaselineAnalysisAssets,
    private readonly geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
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
    webview.html = renderAnalysisWebviewHtml(webview);
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

  refreshView(): void {
    this.postState();
  }

  highlightFinding(findingId: string): void {
    const finding = this.findings.find(f => f.id === findingId);
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
      detail
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

  private postState() {
    if (!this.view) {
      return;
    }
    const state = this.buildState();
    void this.view.webview.postMessage({ type: "state", payload: state });
  }

}
