import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import type { BaselineAnalysisViewProvider } from './analysisView';
import type { BaselineAnalysisAssets } from './analysis/types';

/**
 * Provides detailed analysis webview panels for Baseline Insights
 */
export class BaselineDetailedAnalysisProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;

  /**
   * Create or show the detailed analysis view
   */
  public static createOrShow(
    context: vscode.ExtensionContext,
    analysisProvider: BaselineAnalysisViewProvider,
    assets: BaselineAnalysisAssets
  ): void {
    const column = vscode.ViewColumn.One;

    // If we already have a panel, show it
    if (BaselineDetailedAnalysisProvider.currentPanel) {
      BaselineDetailedAnalysisProvider.currentPanel.reveal(column);
      return;
    }

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
      'baselineDetailedAnalysis',
      'Baseline Insights - Detailed Analysis',
      column,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
        retainContextWhenHidden: true
      }
    );

    BaselineDetailedAnalysisProvider.currentPanel = panel;

    // Set the HTML content
    panel.webview.html = this.getWebviewContent(panel.webview, context, analysisProvider);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'ready':
            BaselineDetailedAnalysisProvider.updateContent(panel.webview, analysisProvider);
            break;
          case 'refresh':
            BaselineDetailedAnalysisProvider.updateContent(panel.webview, analysisProvider);
            break;
          case 'export':
            BaselineDetailedAnalysisProvider.handleExport(message);
            break;
        }
      },
      undefined,
      context.subscriptions
    );

    // Reset when the current panel is closed
    panel.onDidDispose(() => {
      BaselineDetailedAnalysisProvider.currentPanel = undefined;
    }, null, context.subscriptions);
  }

  /**
   * Update the webview content with latest analysis data
   */
  private static updateContent(webview: vscode.Webview, analysisProvider: BaselineAnalysisViewProvider): void {
    const summary = analysisProvider.getSummary();
    const findings = analysisProvider.getOptimizedFindings();
    const budget = this.getBudgetSnapshot(analysisProvider, summary);
    
    // Remove duplicates based on feature name, file, and line number
    const uniqueFindings = this.removeDuplicateFindings(findings);
    
    webview.postMessage({
      type: 'updateData',
      data: {
        summary,
        findings: uniqueFindings.slice(0, 100), // Limit for performance
        findingsCount: uniqueFindings.length,
        severityFilter: Array.from(analysisProvider.getSeverityFilter()),
        target: analysisProvider.getTarget(),
        lastScanAt: analysisProvider.getLastScanAt(),
        budget: budget
      }
    });
  }

  /**
   * Get budget snapshot from analysis provider
   */
  private static getBudgetSnapshot(analysisProvider: any, summary: any): any {
    // Access the budget configuration
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
    
    const budgetConfig = {
      blockedLimit: sanitize(config.get('blockedBudget')),
      warningLimit: sanitize(config.get('warningBudget')),
      safeGoal: sanitize(config.get('safeGoal'))
    };
    
    const { blockedLimit, warningLimit, safeGoal } = budgetConfig;
    if (blockedLimit === undefined && warningLimit === undefined && safeGoal === undefined) {
      return null;
    }
    
    return {
      target: analysisProvider.getTarget(),
      blockedLimit,
      warningLimit,
      safeLimit: safeGoal,
      blocked: summary.blocked,
      warning: summary.warning,
      safe: summary.safe
    };
  }

  /**
   * Remove duplicate findings based on feature name, file URI, and line number
   */
  private static removeDuplicateFindings(findings: any[]): any[] {
    const seen = new Set<string>();
    return findings.filter(finding => {
      const key = `${finding.feature?.name || 'Unknown'}-${finding.uri}-${finding.range?.start?.line || 0}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Handle export requests from the webview
   */
  private static async handleExport(message: any): Promise<void> {
    try {
      const { format, data, filename } = message;
      
      if (format === 'csv' || format === 'json') {
        // Get Downloads directory path, fallback to home directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');
        const defaultFilename = filename || `baseline-analysis.${format}`;
        const defaultPath = path.join(downloadsPath, defaultFilename);
        
        // Save file dialog with Downloads directory as default
        const saveUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(defaultPath),
          filters: format === 'csv' 
            ? { 'CSV files': ['csv'] }
            : { 'JSON files': ['json'] }
        });
        
        if (saveUri) {
          await vscode.workspace.fs.writeFile(saveUri, Buffer.from(data, 'utf8'));
          vscode.window.showInformationMessage(`Analysis exported to ${saveUri.fsPath}`);
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
  }



  /**
   * Get relative path from URI
   */
  private static getRelativePath(uri: any): string {
    if (!uri) {
      return 'Unknown';
    }
    
    let uriString = uri;
    if (typeof uri === 'object') {
      uriString = uri.fsPath || uri.path || uri.toString();
    }
    
    if (typeof uriString !== 'string') {
      return 'Unknown';
    }
    
    const parts = uriString.split('/');
    return parts.length > 3 ? '.../' + parts.slice(-3).join('/') : uriString;
  }

  /**
   * Get the HTML content for the webview
   */
  private static getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext, analysisProvider: BaselineAnalysisViewProvider): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Baseline Insights - Detailed Analysis</title>
    <style>
        :root {
            color-scheme: var(--vscode-color-scheme);
            --baseline-color-error: var(--vscode-editorError-foreground, #d13438);
            --baseline-color-warning: var(--vscode-editorWarning-foreground, #f1c40f);
            --baseline-color-safe: var(--vscode-testing-iconPassed, #2e8b57);
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        
        .header-buttons {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .dropdown {
            position: relative;
            display: inline-block;
        }
        
        .dropdown-content {
            display: none;
            position: absolute;
            right: 0;
            background-color: var(--vscode-dropdown-background);
            min-width: 160px;
            box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 4px;
            z-index: 1;
        }
        
        .dropdown-content button {
            background: none;
            color: var(--vscode-dropdown-foreground);
            padding: 8px 16px;
            text-decoration: none;
            display: block;
            width: 100%;
            text-align: left;
            border: none;
            cursor: pointer;
            font-size: 13px;
        }
        
        .dropdown-content button:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .dropdown:hover .dropdown-content {
            display: block;
        }
        
        .icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 24px;
            margin-bottom: 32px;
        }
        
        .card {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            transition: box-shadow 0.2s ease-in-out;
        }
        
        .card:hover {
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }
        
        .card h2 {
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .summary-card {
            grid-column: 1 / -1;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 16px;
        }
        
        .summary-item {
            padding: 16px;
            border-radius: 8px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            text-align: center;
            transition: transform 0.2s ease-in-out;
        }
        
        .summary-item:hover {
            transform: translateY(-2px);
        }
        
        .summary-item.blocked {
            border-color: var(--baseline-color-error);
            background: color-mix(in srgb, var(--baseline-color-error) 8%, var(--vscode-input-background));
        }
        
        .summary-item.warning {
            border-color: var(--baseline-color-warning);
            background: color-mix(in srgb, var(--baseline-color-warning) 8%, var(--vscode-input-background));
        }
        
        .summary-item.safe {
            border-color: var(--baseline-color-safe);
            background: color-mix(in srgb, var(--baseline-color-safe) 8%, var(--vscode-input-background));
        }
        
        .summary-item-label {
            font-size: 12px;
            font-weight: 500;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .summary-item-value {
            font-weight: 700;
            font-size: 24px;
            color: var(--vscode-foreground);
        }
        
        .summary-item.blocked .summary-item-value {
            color: var(--baseline-color-error);
        }
        
        .summary-item.warning .summary-item-value {
            color: var(--baseline-color-warning);
        }
        
        .summary-item.safe .summary-item-value {
            color: var(--baseline-color-safe);
        }
        
        .target-name {
            font-size: 16px !important;
            color: var(--vscode-textLink-foreground) !important;
        }
        
        .scan-time {
            font-size: 12px !important;
            color: var(--vscode-descriptionForeground) !important;
        }
        
        .chart-container {
            height: 240px;
            margin: 20px 0;
            display: flex;
            align-items: end;
            justify-content: space-around;
            border: 1px solid var(--vscode-panel-border);
            background: var(--vscode-input-background);
            border-radius: 8px;
            padding: 20px;
            position: relative;
        }
        
        .chart-container::before {
            content: '';
            position: absolute;
            bottom: 16px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: var(--vscode-panel-border);
            opacity: 0.5;
        }
        
        .bar {
            min-width: 40px;
            max-width: 80px;
            border-radius: 6px 6px 0 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            transition: transform 0.2s ease-in-out;
            cursor: pointer;
        }
        
        .bar:hover {
            transform: translateY(-4px);
        }
        
        .bar-blocked {
            background: linear-gradient(180deg, var(--baseline-color-error) 0%, color-mix(in srgb, var(--baseline-color-error) 80%, black) 100%);
            box-shadow: 0 2px 8px color-mix(in srgb, var(--baseline-color-error) 30%, transparent);
        }
        
        .bar-warning {
            background: linear-gradient(180deg, var(--baseline-color-warning) 0%, color-mix(in srgb, var(--baseline-color-warning) 80%, black) 100%);
            box-shadow: 0 2px 8px color-mix(in srgb, var(--baseline-color-warning) 30%, transparent);
        }
        
        .bar-safe {
            background: linear-gradient(180deg, var(--baseline-color-safe) 0%, color-mix(in srgb, var(--baseline-color-safe) 80%, black) 100%);
            box-shadow: 0 2px 8px color-mix(in srgb, var(--baseline-color-safe) 30%, transparent);
        }
        
        .bar-feature {
            border-radius: 6px 6px 0 0;
            transition: all 0.3s ease-in-out;
        }
        
        .bar-label {
            font-size: 12px;
            font-weight: 500;
            margin-top: 8px;
            text-align: center;
            max-width: 100px;
            word-wrap: break-word;
            color: var(--vscode-descriptionForeground);
        }
        
        .bar-value {
            position: absolute;
            top: -28px;
            font-size: 14px;
            font-weight: 700;
            color: var(--vscode-foreground);
            background: var(--vscode-panel-background);
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .findings-section {
            margin-top: 30px;
        }
        
        .findings-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .findings-table th,
        .findings-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .findings-table th {
            background: var(--vscode-panel-background);
            font-weight: 600;
        }
        
        .finding-severity {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .finding-severity.blocked {
            background: color-mix(in srgb, var(--baseline-color-error) 20%, transparent);
            color: var(--baseline-color-error);
        }
        
        .finding-severity.warning {
            background: color-mix(in srgb, var(--baseline-color-warning) 20%, transparent);
            color: var(--baseline-color-warning);
        }
        
        .finding-severity.safe {
            background: color-mix(in srgb, var(--baseline-color-safe) 20%, transparent);
            color: var(--baseline-color-safe);
        }
        
        .feature-name {
            font-weight: 500;
            color: var(--vscode-textLink-foreground);
        }
        
        .file-path {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .file-entries {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .file-entry {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 6px;
            background: var(--vscode-input-background);
            border-radius: 4px;
            border: 1px solid var(--vscode-input-border);
        }
        
        .line-numbers {
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        
        /* Budget Styles */
        .budget-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 16px 0;
        }
        
        .budget-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--vscode-editor-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
            transition: all 0.2s ease;
        }
        
        .budget-row:hover {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .budget-left {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
        }
        
        .budget-label {
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .budget-meter {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
        }
        
        .budget-bar {
            flex: 1;
            height: 8px;
            background: var(--vscode-input-background);
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid var(--vscode-panel-border);
        }
        
        .budget-progress {
            height: 100%;
            transition: width 0.3s ease, background-color 0.3s ease;
            border-radius: 3px;
        }
        
        .budget-progress.blocked {
            background: linear-gradient(90deg, var(--baseline-color-blocked) 0%, color-mix(in srgb, var(--baseline-color-blocked) 80%, white) 100%);
        }
        
        .budget-progress.warning {
            background: linear-gradient(90deg, var(--baseline-color-warning) 0%, color-mix(in srgb, var(--baseline-color-warning) 80%, white) 100%);
        }
        
        .budget-progress.safe {
            background: linear-gradient(90deg, var(--baseline-color-safe) 0%, color-mix(in srgb, var(--baseline-color-safe) 80%, white) 100%);
        }
        
        .budget-text {
            font-size: 12px;
            font-weight: 500;
            color: var(--vscode-descriptionForeground);
            min-width: 60px;
            text-align: right;
        }
        
        .budget-status {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            font-weight: 500;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .budget-status.over-budget {
            background: color-mix(in srgb, var(--baseline-color-blocked) 20%, transparent);
            color: var(--baseline-color-blocked);
            border: 1px solid color-mix(in srgb, var(--baseline-color-blocked) 30%, transparent);
        }
        
        .budget-status.under-goal {
            background: color-mix(in srgb, var(--baseline-color-warning) 20%, transparent);
            color: var(--baseline-color-warning);
            border: 1px solid color-mix(in srgb, var(--baseline-color-warning) 30%, transparent);
        }
        
        .budget-status.on-track {
            background: color-mix(in srgb, var(--baseline-color-safe) 20%, transparent);
            color: var(--baseline-color-safe);
            border: 1px solid color-mix(in srgb, var(--baseline-color-safe) 30%, transparent);
        }
        
        .budget-icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>
            <svg class="icon" viewBox="0 0 16 16">
                <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692l-4.372-4.858A.5.5 0 0 1 5.5 3.5h-.013l-.175.016-.604.91a.5.5 0 0 1-.708 0L1 1.5z"/>
                <path d="M5 12.5a.5.5 0 0 1-.5-.5V8.207l-1.646 1.647a.5.5 0 0 1-.708-.708L5.293 6l3.147 3.146a.5.5 0 0 1-.708.708L6.5 8.707V12a.5.5 0 0 1-.5.5z"/>
            </svg>
            Baseline Insights - Detailed Analysis
        </h1>
        <div class="header-buttons">
            <button class="btn" data-action="refresh">
                <svg class="icon" viewBox="0 0 16 16">
                    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
                Refresh
            </button>
            <div class="dropdown">
                <button class="btn btn-secondary">
                    <svg class="icon" viewBox="0 0 16 16">
                        <path d="M8.5 6.5a.5.5 0 0 0-1 0v1.293L6.354 6.646a.5.5 0 1 0-.708.708l1.647 1.647a.5.5 0 0 0 .708 0l1.647-1.647a.5.5 0 1 0-.708-.708L8.5 7.793V6.5z"/>
                        <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                    </svg>
                    Export
                </button>
                <div class="dropdown-content">
                    <button data-action="export-csv">
                        <svg class="icon" viewBox="0 0 16 16">
                            <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                            <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                        </svg>
                        Export as CSV
                    </button>
                    <button data-action="export-json">
                        <svg class="icon" viewBox="0 0 16 16">
                            <path d="M8.5 1a.5.5 0 0 0-1 0v1.293L6.354 1.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 2.293V1z"/>
                            <path d="M3 9.5a.5.5 0 0 1 .5-.5H4a.5.5 0 0 1 0 1h-.5A.5.5 0 0 1 3 9.5zm-2-3v3a2 2 0 0 0 2 2h1.172a3 3 0 1 1 0 2H3a4 4 0 0 1-4-4v-3a4 4 0 0 1 4-4h9.5a.5.5 0 0 1 0 1H3a3 3 0 0 0-3 3zm10.5-1a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/>
                        </svg>
                        Export as JSON
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <div id="content">
        <div class="loading">
            <p>Loading analysis data...</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentData = null;

        // Request initial data with a small delay to ensure message handler is ready
        setTimeout(() => {
            vscode.postMessage({ type: 'ready' });
        }, 100);

        // Event delegation for button clicks
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.getAttribute('data-action');
            switch (action) {
                case 'refresh':
                    refreshData();
                    break;
                case 'export-csv':
                    exportToCSV();
                    break;
                case 'export-json':
                    exportToJSON();
                    break;
            }
        });

        function refreshData() {
            vscode.postMessage({ type: 'refresh' });
        }



        function exportToCSV() {
            if (!currentData) return;
            
            const { findings, summary, target, lastScanAt } = currentData;
            let csvContent = 'Type,Severity,Feature,File,Lines\\n';
            
            // Add metadata
            csvContent += 'Metadata,Target,' + (target?.name || 'enterprise') + ',,\\n';
            if (lastScanAt) {
                csvContent += 'Metadata,Generated,' + new Date(lastScanAt).toLocaleString() + ',,\\n';
            }
            csvContent += '\\n';
            
            // Add summary data
            csvContent += 'Summary,Blocked,' + summary.blocked + ',,\\n';
            csvContent += 'Summary,Warning,' + summary.warning + ',,\\n';
            csvContent += 'Summary,Safe,' + summary.safe + ',,\\n';
            csvContent += '\\n';
            
            // Group findings like in the UI and add to CSV
            const groupedFindings = {};
            findings.forEach(finding => {
                const key = \`\${finding.feature?.name || 'Unknown'}-\${finding.verdict}\`;
                if (!groupedFindings[key]) {
                    groupedFindings[key] = {
                        feature: finding.feature?.name || 'Unknown',
                        verdict: finding.verdict,
                        files: new Map()
                    };
                }
                
                const filePath = getRelativePath(finding.uri);
                const lineNumber = finding.range?.start?.line !== undefined ? finding.range.start.line + 1 : null;
                
                if (!groupedFindings[key].files.has(filePath)) {
                    groupedFindings[key].files.set(filePath, []);
                }
                
                if (lineNumber !== null) {
                    groupedFindings[key].files.get(filePath).push(lineNumber);
                }
            });
            
            // Add grouped findings data
            Object.values(groupedFindings).forEach(group => {
                Array.from(group.files.entries()).forEach(([filePath, lines]) => {
                    const feature = group.feature.replace(/,/g, ';');
                    const linesStr = lines.length > 0 ? lines.join('; ') : '';
                    csvContent += 'Finding,' + group.verdict + ',' + feature + ',' + filePath + ',' + linesStr + '\\n';
                });
            });
            
            vscode.postMessage({ 
                type: 'export', 
                format: 'csv',
                data: csvContent,
                filename: 'baseline-analysis-' + new Date().toISOString().split('T')[0] + '.csv'
            });
        }

        function exportToJSON() {
            if (!currentData) return;
            
            const { findings, summary, target, lastScanAt } = currentData;
            
            // Group findings like in the UI for consistent export
            const groupedFindings = {};
            findings.forEach(finding => {
                const key = \`\${finding.feature?.name || 'Unknown'}-\${finding.verdict}\`;
                if (!groupedFindings[key]) {
                    groupedFindings[key] = {
                        feature: finding.feature?.name || 'Unknown',
                        verdict: finding.verdict,
                        files: new Map()
                    };
                }
                
                const filePath = getRelativePath(finding.uri);
                const lineNumber = finding.range?.start?.line !== undefined ? finding.range.start.line + 1 : null;
                
                if (!groupedFindings[key].files.has(filePath)) {
                    groupedFindings[key].files.set(filePath, []);
                }
                
                if (lineNumber !== null) {
                    groupedFindings[key].files.get(filePath).push(lineNumber);
                }
            });
            
            // Convert grouped findings to exportable format
            const processedFindings = Object.values(groupedFindings).map(group => ({
                feature: group.feature,
                severity: group.verdict,
                files: Array.from(group.files.entries()).map(([filePath, lines]) => ({
                    path: filePath,
                    lines: lines.length > 0 ? lines : null
                }))
            }));
            
            const exportData = {
                metadata: {
                    exportedAt: new Date().toISOString(),
                    target: target?.name || 'enterprise',
                    lastScanAt: lastScanAt,
                    totalFindings: findings.length,
                    groupedFindings: processedFindings.length
                },
                summary: {
                    blocked: summary.blocked,
                    warning: summary.warning,
                    safe: summary.safe,
                    total: summary.blocked + summary.warning + summary.safe
                },
                findings: processedFindings,
                rawFindings: findings.map(finding => ({
                    feature: finding.feature?.name || 'Unknown',
                    severity: finding.verdict,
                    file: getRelativePath(finding.uri),
                    line: finding.range?.start?.line !== undefined ? finding.range.start.line + 1 : null
                }))
            };
            
            vscode.postMessage({ 
                type: 'export', 
                format: 'json',
                data: JSON.stringify(exportData, null, 2),
                filename: 'baseline-analysis-' + new Date().toISOString().split('T')[0] + '.json'
            });
        }



        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'updateData') {
                currentData = message.data;
                renderContent();
            }
        });

        function renderContent() {
            if (!currentData) {
                return;
            }

            const { summary, findings, findingsCount, target, lastScanAt, budget } = currentData;
            
            const contentDiv = document.getElementById('content');
            
            if (findingsCount === 0) {
                contentDiv.innerHTML = \`
                    <div class="empty-state">
                        <h2>No findings to analyze</h2>
                        <p>Run a baseline scan to see detailed insights.</p>
                    </div>
                \`;
                return;
            }

            contentDiv.innerHTML = \`
                <div class="dashboard">
                    <div class="card summary-card">
                        <h2>
                            <svg class="icon" viewBox="0 0 16 16">
                                <path d="M0 1.5A1.5 1.5 0 0 1 1.5 0H5a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 5 6H1.5A1.5 1.5 0 0 1 0 4.5v-3zM1.5 1a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H5a.5.5 0 0 0 .5-.5v-3A.5.5 0 0 0 5 1H1.5zm8.5.5A1.5 1.5 0 0 1 11.5 0H15a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 15 6h-3.5A1.5 1.5 0 0 1 10 4.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H15a.5.5 0 0 0 .5-.5v-3A.5.5 0 0 0 15 1h-3.5zM0 11.5A1.5 1.5 0 0 1 1.5 10H5a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 5 16H1.5A1.5 1.5 0 0 1 0 14.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H5a.5.5 0 0 0 .5-.5v-3A.5.5 0 0 0 5 11H1.5zm8.5.5A1.5 1.5 0 0 1 11.5 10H15a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 15 16h-3.5A1.5 1.5 0 0 1 10 14.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H15a.5.5 0 0 0 .5-.5v-3A.5.5 0 0 0 15 11h-3.5z"/>
                            </svg>
                            Analysis Summary
                        </h2>
                        <div class="summary-grid">
                            <div class="summary-item">
                                <div class="summary-item-label">Total Findings</div>
                                <div class="summary-item-value">\${findingsCount}</div>
                            </div>
                            <div class="summary-item">
                                <div class="summary-item-label">Target</div>
                                <div class="summary-item-value target-name">\${target?.name || 'enterprise'}</div>
                            </div>
                            <div class="summary-item blocked">
                                <div class="summary-item-label">Blocked</div>
                                <div class="summary-item-value">\${summary.blocked}</div>
                            </div>
                            <div class="summary-item warning">
                                <div class="summary-item-label">Warning</div>
                                <div class="summary-item-value">\${summary.warning}</div>
                            </div>
                            <div class="summary-item safe">
                                <div class="summary-item-label">Safe</div>
                                <div class="summary-item-value">\${summary.safe}</div>
                            </div>
                            \${lastScanAt ? \`
                            <div class="summary-item">
                                <div class="summary-item-label">Last Scan</div>
                                <div class="summary-item-value scan-time">\${new Date(lastScanAt).toLocaleString()}</div>
                            </div>
                            \` : ''}
                        </div>
                    </div>
                    
                    <div class="card">
                        <h2>
                            <svg class="icon" viewBox="0 0 16 16">
                                <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zM1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z"/>
                            </svg>
                            Severity Distribution
                        </h2>
                        <div class="chart-container">
                            \${renderSeverityChart(summary)}
                        </div>
                    </div>
                    
                    <div class="card">
                        <h2>
                            <svg class="icon" viewBox="0 0 16 16">
                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                            </svg>
                            Feature Breakdown
                        </h2>
                        <div class="chart-container">
                            \${renderFeatureChart(findings)}
                        </div>
                    </div>
                    
                    <div class="card">
                        <h2>
                            <svg class="icon" viewBox="0 0 16 16">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                            </svg>
                            Baseline Budgets
                        </h2>
                        <div class="budget-container">
                            \${renderBudgetCard(budget)}
                        </div>
                    </div>
                </div>
                
                <div class="findings-section">
                    <div class="card">
                        <h2>
                            <svg class="icon" viewBox="0 0 16 16">
                                <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                                <path d="M4.5 6.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1H5z"/>
                            </svg>
                            Findings by Feature (Grouped & Deduplicated)
                        </h2>
                        \${renderFindingsTable(findings.slice(0, 50))}
                    </div>
                </div>
            \`;
        }

        function renderSeverityChart(summary) {
            const maxValue = Math.max(summary.blocked, summary.warning, summary.safe, 1);
            
            return \`
                <div class="bar">
                    <div class="bar-blocked" style="height: \${(summary.blocked / maxValue) * 150}px;"></div>
                    <div class="bar-value">\${summary.blocked}</div>
                    <div class="bar-label">Blocked</div>
                </div>
                <div class="bar">
                    <div class="bar-warning" style="height: \${(summary.warning / maxValue) * 150}px;"></div>
                    <div class="bar-value">\${summary.warning}</div>
                    <div class="bar-label">Warning</div>
                </div>
                <div class="bar">
                    <div class="bar-safe" style="height: \${(summary.safe / maxValue) * 150}px;"></div>
                    <div class="bar-value">\${summary.safe}</div>
                    <div class="bar-label">Safe</div>
                </div>
            \`;
        }

        function renderFeatureChart(findings) {
            // Group findings by feature with severity breakdown
            const featureGroups = {};
            findings.forEach(finding => {
                const featureName = finding.feature?.name || 'Unknown';
                if (!featureGroups[featureName]) {
                    featureGroups[featureName] = { blocked: 0, warning: 0, safe: 0, total: 0 };
                }
                featureGroups[featureName][finding.verdict] = (featureGroups[featureName][finding.verdict] || 0) + 1;
                featureGroups[featureName].total++;
            });
            
            // Get top 8 features (fewer for better visibility)
            const topFeatures = Object.entries(featureGroups)
                .sort(([,a], [,b]) => b.total - a.total)
                .slice(0, 8);
            
            if (topFeatures.length === 0) {
                return '<p class="empty-state">No features to display</p>';
            }
            
            const maxCount = Math.max(...topFeatures.map(([,data]) => data.total), 1);
            const colors = [
                'var(--baseline-color-error)',
                'var(--baseline-color-warning)', 
                'var(--baseline-color-safe)',
                '#8884d8',
                '#82ca9d',
                '#ffc658',
                '#ff7c7c',
                '#8dd1e1'
            ];
            
            return topFeatures.map(([featureName, data], index) => {
                const color = colors[index % colors.length];
                const displayName = featureName.length > 12 ? featureName.substring(0, 10) + '...' : featureName;
                
                return \`
                    <div class="bar" title="\${featureName}: \${data.total} findings (Blocked: \${data.blocked}, Warning: \${data.warning}, Safe: \${data.safe})">
                        <div class="bar-feature" style="height: \${(data.total / maxCount) * 150}px; background: linear-gradient(180deg, \${color} 0%, color-mix(in srgb, \${color} 80%, black) 100%); box-shadow: 0 2px 8px color-mix(in srgb, \${color} 30%, transparent);"></div>
                        <div class="bar-value">\${data.total}</div>
                        <div class="bar-label">\${displayName}</div>
                    </div>
                \`;
            }).join('');
        }

        function renderBudgetCard(budget) {
            if (!budget) {
                return '<p class="chart-empty">No budgets configured.<br><span class="settings-hint">Set budgets in the Baseline Gate settings to start tracking progress.</span></p>';
            }

            const metrics = [
                {
                    key: 'blocked',
                    label: 'Blocked',
                    actual: budget.blocked,
                    limit: budget.blockedLimit ?? 0,
                    variant: 'blocked',
                    type: 'max'
                },
                {
                    key: 'warning',
                    label: 'Needs Review',
                    actual: budget.warning,
                    limit: budget.warningLimit,
                    variant: 'warning',
                    type: 'max'
                },
                {
                    key: 'safe',
                    label: 'Wins',
                    actual: budget.safe,
                    limit: budget.safeLimit,
                    variant: 'safe',
                    type: 'min'
                }
            ];

            return metrics.map(metric => {
                let statusText = '';
                let overBudget = false;
                let underGoal = false;

                if (metric.type === 'max') {
                    if (metric.limit === undefined) {
                        statusText = metric.actual + ' findings (no limit)';
                    } else {
                        statusText = metric.actual + ' of ' + metric.limit + ' allowed';
                        if (metric.actual > metric.limit) {
                            overBudget = true;
                        }
                    }
                } else {
                    if (metric.limit === undefined || metric.limit === 0) {
                        statusText = metric.actual + ' safe findings';
                    } else {
                        statusText = metric.actual + ' of ' + metric.limit + ' goal';
                        if (metric.actual < metric.limit) {
                            underGoal = true;
                        }
                    }
                }

                let ratio = 0;
                if (metric.type === 'max') {
                    if (metric.limit !== undefined && metric.limit > 0) {
                        ratio = Math.min(100, (metric.actual / metric.limit) * 100);
                    } else if (metric.actual > 0) {
                        ratio = 100;
                    }
                } else if (metric.limit && metric.limit > 0) {
                    ratio = Math.min(100, (metric.actual / metric.limit) * 100);
                } else if (metric.actual > 0) {
                    ratio = 100;
                }

                const statusClass = overBudget ? 'over-limit' : underGoal ? 'under-goal' : 'on-track';
                const statusLabel = overBudget ? 'Over Budget' : underGoal ? 'Below Goal' : 'On Track';

                return \`
                    <div class="budget-row \${statusClass}" title="\${statusText}">
                        <div class="budget-label">\${metric.label}</div>
                        <div class="budget-status">\${statusLabel}</div>
                        <div class="budget-meter">
                            <div class="budget-meter-track">
                                <span class="budget-meter-fill \${metric.variant}" style="width: \${ratio}%"></span>
                            </div>
                            <div class="budget-meter-text">\${statusText}</div>
                        </div>
                    </div>
                \`;
            }).join('');
        }

        function renderFindingsTable(findings) {
            if (findings.length === 0) {
                return '<p class="empty-state">No findings to display</p>';
            }
            
            // Group findings by feature to show counts per file
            const groupedFindings = {};
            findings.forEach(finding => {
                const key = \`\${finding.feature?.name || 'Unknown'}-\${finding.verdict}\`;
                if (!groupedFindings[key]) {
                    groupedFindings[key] = {
                        feature: finding.feature?.name || 'Unknown',
                        verdict: finding.verdict,
                        files: new Map()
                    };
                }
                
                const filePath = getRelativePath(finding.uri);
                const lineNumber = finding.range?.start?.line !== undefined ? finding.range.start.line + 1 : null;
                
                if (!groupedFindings[key].files.has(filePath)) {
                    groupedFindings[key].files.set(filePath, []);
                }
                
                // Only add line numbers that are not null/N/A
                if (lineNumber !== null) {
                    groupedFindings[key].files.get(filePath).push(lineNumber);
                }
            });
            
            return \`
                <table class="findings-table">
                    <thead>
                        <tr>
                            <th>Severity</th>
                            <th>Feature</th>
                            <th>Files & Lines</th>
                        </tr>
                    </thead>
                    <tbody>
                        \${Object.values(groupedFindings).map(group => \`
                            <tr>
                                <td>
                                    <span class="finding-severity \${group.verdict}">\${group.verdict}</span>
                                </td>
                                <td>
                                    <span class="feature-name">\${group.feature}</span>
                                </td>
                                <td>
                                    <div class="file-entries">
                                        \${Array.from(group.files.entries()).map(([filePath, lines]) => \`
                                            <div class="file-entry">
                                                <span class="file-path">\${filePath}</span>
                                                \${lines.length > 0 ? \`<span class="line-numbers">(lines: \${lines.join(', ')})</span>\` : ''}
                                            </div>
                                        \`).join('')}
                                    </div>
                                </td>
                            </tr>
                        \`).join('')}
                    </tbody>
                </table>
            \`;
        }

        function getRelativePath(uri) {
            if (!uri) return 'Unknown';
            
            // Convert to string if it's an object
            let uriString = uri;
            if (typeof uri === 'object') {
                // If it's a VS Code URI object, use the fsPath or path property
                uriString = uri.fsPath || uri.path || uri.toString();
            }
            
            if (typeof uriString !== 'string') {
                return 'Unknown';
            }
            
            // Simple relative path extraction
            const parts = uriString.split('/');
            return parts.length > 3 ? '.../' + parts.slice(-3).join('/') : uriString;
        }
    </script>
</body>
</html>`;
  }

  /**
   * Dispose the current panel
   */
  public static dispose(): void {
    if (BaselineDetailedAnalysisProvider.currentPanel) {
      BaselineDetailedAnalysisProvider.currentPanel.dispose();
      BaselineDetailedAnalysisProvider.currentPanel = undefined;
    }
  }
}