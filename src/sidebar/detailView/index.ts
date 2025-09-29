import * as vscode from "vscode";
import type { BaselineFinding } from "../workspaceScanner";
import type { Target } from "../../core/targets";
import type { BaselineAnalysisAssets } from "../analysis/types";
import { buildIssueDetailHtml, buildFileDetailHtml } from "../analysis/html";

// Import our refactored modules
import type { 
  DetailViewConfig, 
  FileDetailViewConfig,
  DetailViewMessage,
  WebviewRenderContext,
  FileWebviewRenderContext
} from "./types";
import { DetailViewStateManager } from "./stateManager";
import { DetailViewMessageHandler } from "./messageHandler";
import { DetailViewHtmlGenerator } from "./htmlGenerator";
import { DetailViewDataTransformer } from "./dataTransformer";
import { DetailViewUtils } from "./utils";

/**
 * Provides webview panels for displaying detailed information about baseline findings
 * 
 * This class has been refactored into smaller, focused modules:
 * - StateManager: Manages panel and finding state
 * - MessageHandler: Processes webview messages
 * - HtmlGenerator: Creates webview HTML content
 * - DataTransformer: Transforms data for rendering
 * - Utils: Helper functions for formatting and utilities
 */
export class BaselineDetailViewProvider {
  
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly assets: BaselineAnalysisAssets,
    private readonly geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider
  ) {}

  /**
   * Create or show a detail view for a single finding
   */
  public static createOrShow(
    context: vscode.ExtensionContext,
    finding: BaselineFinding,
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    const config: DetailViewConfig = {
      context,
      finding,
      target,
      assets,
      geminiProvider
    };

    this.createOrShowInternal(config);
  }

  /**
   * Create or show a detail view for multiple findings in a file
   */
  public static createOrShowFileDetails(
    context: vscode.ExtensionContext,
    findings: BaselineFinding[],
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    if (!findings.length) {
      return;
    }

    const config: FileDetailViewConfig = {
      context,
      findings,
      target,
      assets,
      geminiProvider
    };

    this.createOrShowFileDetailsInternal(config);
  }

  /**
   * Create or show a detail view for a finding with all its occurrences
   */
  public static createOrShowWithOccurrences(
    context: vscode.ExtensionContext,
    primaryFinding: BaselineFinding,
    allOccurrences: BaselineFinding[],
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    const config: DetailViewConfig = {
      context,
      finding: primaryFinding,
      target,
      assets,
      geminiProvider
    };

    this.createOrShowWithOccurrencesInternal(config, allOccurrences);
  }



  /**
   * Internal implementation for creating/showing single finding view
   */
  private static createOrShowInternal(config: DetailViewConfig): void {
    const { context, finding, target, assets, geminiProvider } = config;
    const column = DetailViewDataTransformer.getViewColumn();

    // If we already have a panel, show it and update content
    if (DetailViewStateManager.hasActivePanel()) {
      const currentPanel = DetailViewStateManager.getCurrentPanel()!;
      currentPanel.reveal(column);
      this.updateContent(finding, target, assets, geminiProvider);
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'baselineDetail',
      DetailViewDataTransformer.generatePanelTitle(finding),
      column,
      DetailViewDataTransformer.createWebviewOptions(context)
    );

    DetailViewStateManager.updateState(panel, finding);

    // Set initial content
    this.updateContent(finding, target, assets, geminiProvider);

    // Set up message handling
    this.setupMessageHandling(panel, context);

    // Set up lifecycle event handlers
    this.setupLifecycleHandlers(panel, context);
  }

  /**
   * Internal implementation for creating/showing single finding view with occurrences
   */
  private static createOrShowWithOccurrencesInternal(config: DetailViewConfig, allOccurrences: BaselineFinding[]): void {
    const { context, finding, target, assets, geminiProvider } = config;
    const column = DetailViewDataTransformer.getViewColumn();

    // If we already have a panel, show it and update content
    if (DetailViewStateManager.hasActivePanel()) {
      const currentPanel = DetailViewStateManager.getCurrentPanel()!;
      currentPanel.reveal(column);
      this.updateContentWithOccurrences(finding, allOccurrences, target, assets, geminiProvider);
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'baselineDetail',
      DetailViewDataTransformer.generatePanelTitle(finding),
      column,
      DetailViewDataTransformer.createWebviewOptions(context)
    );

    DetailViewStateManager.updateState(panel, finding);

    // Set initial content with occurrences
    this.updateContentWithOccurrences(finding, allOccurrences, target, assets, geminiProvider);

    // Set up message handling (enhanced for occurrences)
    this.setupMessageHandlingWithOccurrences(panel, context);

    // Set up lifecycle event handlers
    this.setupLifecycleHandlers(panel, context);
  }

  /**
   * Internal implementation for creating/showing file details view
   */
  private static createOrShowFileDetailsInternal(config: FileDetailViewConfig): void {
    const { context, findings, target, assets, geminiProvider } = config;
    const column = DetailViewDataTransformer.getViewColumn();

    // If we already have a panel, show it and update content
    if (DetailViewStateManager.hasActivePanel()) {
      const currentPanel = DetailViewStateManager.getCurrentPanel()!;
      currentPanel.reveal(column);
      this.updateFileContent(findings, target, assets, geminiProvider);
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'baselineFileDetail',
      DetailViewDataTransformer.generateFilePanelTitle(findings),
      column,
      DetailViewDataTransformer.createWebviewOptions(context)
    );

    DetailViewStateManager.updateState(panel, findings[0]); // Store first finding for compatibility

    // Set initial content
    this.updateFileContent(findings, target, assets, geminiProvider);

    // Set up message handling
    this.setupMessageHandling(panel, context);

    // Set up lifecycle event handlers
    this.setupLifecycleHandlers(panel, context);
  }



  /**
   * Update content for single finding view
   */
  private static updateContent(
    finding: BaselineFinding,
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    const currentPanel = DetailViewStateManager.getCurrentPanel();
    if (!currentPanel) {
      return;
    }

    DetailViewStateManager.setCurrentFinding(finding);
    
    // Update panel title
    currentPanel.title = DetailViewDataTransformer.generatePanelTitle(finding);

    // Get Gemini context if available
    const geminiContext = DetailViewDataTransformer.createGeminiContext(finding, geminiProvider);

    // Build severity icon URIs
    const severityIconUris = DetailViewDataTransformer.createSeverityIconUris(currentPanel.webview, assets);

    // Generate the detail HTML
    const detailHtml = buildIssueDetailHtml({
      finding,
      severityIconUris,
      target,
      assets,
      webview: currentPanel.webview,
      gemini: geminiContext
    });

    // Create render context
    const renderContext: WebviewRenderContext = {
      webview: currentPanel.webview,
      finding,
      target,
      assets,
      geminiContext
    };

    // Generate and set HTML content
    const html = DetailViewHtmlGenerator.generateWebviewContent(renderContext, detailHtml);
    currentPanel.webview.html = html;
  }

  /**
   * Update content for file details view
   */
  private static updateFileContent(
    findings: BaselineFinding[],
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    const currentPanel = DetailViewStateManager.getCurrentPanel();
    if (!currentPanel || !findings.length) {
      return;
    }
    
    // Update panel title
    currentPanel.title = DetailViewDataTransformer.generateFilePanelTitle(findings);

    // Build severity icon URIs
    const severityIconUris = DetailViewDataTransformer.createSeverityIconUris(currentPanel.webview, assets);

    // Generate the file detail HTML
    const detailHtml = buildFileDetailHtml(findings, severityIconUris, {
      target,
      assets,
      webview: currentPanel.webview,
      getGeminiContext: (finding) => {
        return DetailViewDataTransformer.createFileGeminiContext(finding, geminiProvider);
      }
    });

    // Create render context for the first finding (used for general page structure)
    const renderContext: WebviewRenderContext = {
      webview: currentPanel.webview,
      finding: findings[0],
      target,
      assets,
      geminiContext: undefined // File view handles context differently
    };

    // Generate and set HTML content
    const html = DetailViewHtmlGenerator.generateWebviewContent(renderContext, detailHtml);
    currentPanel.webview.html = html;
  }



  /**
   * Update content for single finding view with occurrences
   */
  private static updateContentWithOccurrences(
    primaryFinding: BaselineFinding,
    allOccurrences: BaselineFinding[],
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    const currentPanel = DetailViewStateManager.getCurrentPanel();
    if (!currentPanel) {
      return;
    }

    DetailViewStateManager.setCurrentFinding(primaryFinding);
    
    // Update panel title
    currentPanel.title = DetailViewDataTransformer.generatePanelTitle(primaryFinding);

    // Get Gemini context if available
    const geminiContext = DetailViewDataTransformer.createGeminiContext(primaryFinding, geminiProvider);

    // Build severity icon URIs
    const severityIconUris = DetailViewDataTransformer.createSeverityIconUris(currentPanel.webview, assets);

    // Generate the enhanced detail HTML with occurrences
    const detailHtml = this.buildIssueDetailHtmlWithOccurrences({
      primaryFinding,
      allOccurrences,
      severityIconUris,
      target,
      assets,
      webview: currentPanel.webview,
      gemini: geminiContext
    });

    // Create render context
    const renderContext: WebviewRenderContext = {
      webview: currentPanel.webview,
      finding: primaryFinding,
      target,
      assets,
      geminiContext
    };

    // Generate and set HTML content
    const html = DetailViewHtmlGenerator.generateWebviewContent(renderContext, detailHtml);
    currentPanel.webview.html = html;
  }



  /**
   * Build enhanced issue detail HTML with occurrences section
   */
  private static buildIssueDetailHtmlWithOccurrences(options: {
    primaryFinding: BaselineFinding;
    allOccurrences: BaselineFinding[];
    severityIconUris: import('./types').SeverityIconUris;
    target: Target;
    assets: BaselineAnalysisAssets;
    webview: vscode.Webview;
    gemini?: import('../analysis/html').GeminiSupportContext;
  }): string {
    const { primaryFinding, allOccurrences, severityIconUris, target, assets, webview, gemini } = options;

    // Get the base HTML from the existing function
    const baseHtml = buildIssueDetailHtml({
      finding: primaryFinding,
      severityIconUris,
      target,
      assets,
      webview,
      gemini
    });

    // If there's only one occurrence, return the base HTML
    if (allOccurrences.length <= 1) {
      return baseHtml;
    }

    // Build occurrences section
    const occurrencesSection = this.buildOccurrencesSection(allOccurrences, severityIconUris, primaryFinding);

    // Insert the occurrences section before the closing </div> of the detail-block
    const insertionPoint = baseHtml.lastIndexOf('      </div>');
    if (insertionPoint !== -1) {
      return baseHtml.slice(0, insertionPoint) + occurrencesSection + baseHtml.slice(insertionPoint);
    }

    // Fallback: append occurrences section
    return baseHtml + occurrencesSection;
  }

  /**
   * Build the occurrences section HTML
   */
  private static buildOccurrencesSection(
    allOccurrences: BaselineFinding[],
    severityIconUris: import('./types').SeverityIconUris,
    primaryFinding: BaselineFinding
  ): string {
    const occurrencesList = allOccurrences
      .map((finding, index) => {
        const relativePath = vscode.workspace.asRelativePath(finding.uri, false);
        const lineNumber = finding.range.start.line + 1;
        const character = finding.range.start.character + 1;
        const verdictIcon = severityIconUris[finding.verdict];
        const isPrimary = finding.uri.toString() === primaryFinding.uri.toString() && 
                         finding.range.start.line === primaryFinding.range.start.line;

        return `
          <div class="occurrence-item ${isPrimary ? 'current-occurrence' : ''}">
            <div class="occurrence-header">
              <div class="occurrence-file-info">
                <span class="occurrence-file-path" 
                      data-uri="${DetailViewUtils.escapeHtml(finding.uri.toString())}"
                      data-line="${finding.range.start.line}"
                      data-character="${finding.range.start.character}"
                      style="cursor: pointer; color: var(--vscode-textLink-foreground);"
                      title="Click to open file">
                  ${DetailViewUtils.escapeHtml(relativePath)}
                </span>
                <span class="occurrence-line-info">Line ${lineNumber}:${character}</span>
                ${isPrimary ? '<span class="current-indicator">Current</span>' : ''}
              </div>
              <div class="occurrence-verdict">
                <img src="${verdictIcon}" alt="${finding.verdict}" width="16" height="16">
                <span class="verdict-text">${finding.verdict}</span>
              </div>
            </div>
            <div class="occurrence-code">${DetailViewUtils.escapeHtml(finding.lineText)}</div>
          </div>
        `;
      })
      .join('');

    return `
        <div class="detail-section">
          <h4>
            <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            Occurrences (${allOccurrences.length})
          </h4>
          <div class="occurrences-list">
            ${occurrencesList}
          </div>
        </div>
    `;
  }

  /**
   * Set up message handling for the webview
   */
  private static setupMessageHandling(panel: vscode.WebviewPanel, context: vscode.ExtensionContext): void {
    panel.webview.onDidReceiveMessage(
      async (message: DetailViewMessage) => {
        await DetailViewMessageHandler.handleMessage(message, panel, context);
      },
      undefined,
      context.subscriptions
    );
  }

  /**
   * Set up message handling with occurrences support
   */
  private static setupMessageHandlingWithOccurrences(panel: vscode.WebviewPanel, context: vscode.ExtensionContext): void {
    panel.webview.onDidReceiveMessage(
      async (message: DetailViewMessage) => {
        // Handle the new openFileAtLine message type
        if (message.type === 'openFileAtLine') {
          const uri = vscode.Uri.parse(message.uri);
          const position = new vscode.Position(message.line, message.character || 0);
          const document = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(document);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
          return;
        }
        
        // Handle other message types
        await DetailViewMessageHandler.handleMessage(message, panel, context);
      },
      undefined,
      context.subscriptions
    );
  }



  /**
   * Set up lifecycle event handlers
   */
  private static setupLifecycleHandlers(panel: vscode.WebviewPanel, context: vscode.ExtensionContext): void {
    // When the panel is disposed, reset the current panel
    panel.onDidDispose(() => {
      DetailViewStateManager.clearState();
    }, null, context.subscriptions);

    // Update panel title when content changes
    panel.onDidChangeViewState(() => {
      if (panel.visible && DetailViewStateManager.getCurrentFinding()) {
        // Panel became visible, could refresh content here if needed
      }
    });
  }



  /**
   * Update the current panel if one exists
   */
  public static updateCurrentPanel(
    finding: BaselineFinding,
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    if (DetailViewStateManager.hasActivePanel()) {
      this.updateContent(finding, target, assets, geminiProvider);
    }
  }

  /**
   * Get the current panel instance
   */
  public static getCurrentPanel(): vscode.WebviewPanel | undefined {
    return DetailViewStateManager.getCurrentPanel();
  }

  /**
   * Send loading state to the current webview
   */
  public static async sendLoadingState(webview: vscode.Webview): Promise<void> {
    await DetailViewMessageHandler.sendLoadingState(webview);
  }

  /**
   * Send error state to the current webview
   */
  public static async sendErrorState(webview: vscode.Webview, error: string): Promise<void> {
    await DetailViewMessageHandler.sendErrorState(webview, error);
  }

  /**
   * Send success state to the current webview
   */
  public static async sendSuccessState(webview: vscode.Webview, response: string): Promise<void> {
    await DetailViewMessageHandler.sendSuccessState(webview, response);
  }

  /**
   * Dispose all resources
   */
  public static dispose(): void {
    DetailViewStateManager.dispose();
  }
}