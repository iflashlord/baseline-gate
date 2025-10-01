import * as vscode from 'vscode';
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
    const summaryFiltered = analysisProvider.getSummary({ filtered: true });
    const findings = analysisProvider.getOptimizedFindings();
    
    webview.postMessage({
      type: 'updateData',
      data: {
        summary,
        summaryFiltered,
        findings: findings.slice(0, 100), // Limit for performance
        findingsCount: findings.length,
        severityFilter: Array.from(analysisProvider.getSeverityFilter()),
        target: analysisProvider.getTarget(),
        lastScanAt: analysisProvider.getLastScanAt()
      }
    });
  }

  /**
   * Handle export requests from the webview
   */
  private static async handleExport(message: any): Promise<void> {
    try {
      const { format, data, filename, html } = message;
      
      if (format === 'csv' || format === 'json') {
        // Save file dialog
        const saveUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(filename || `baseline-analysis.${format}`),
          filters: format === 'csv' 
            ? { 'CSV files': ['csv'] }
            : { 'JSON files': ['json'] }
        });
        
        if (saveUri) {
          await vscode.workspace.fs.writeFile(saveUri, Buffer.from(data, 'utf8'));
          vscode.window.showInformationMessage(`Analysis exported to ${saveUri.fsPath}`);
        }
      } else if (format === 'pdf') {
        vscode.window.showInformationMessage(
          'PDF export requires a PDF library. Use the Print option to print to PDF using your browser.'
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
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
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .card h2 {
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 600;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding: 8px 0;
        }
        
        .metric:last-child {
            margin-bottom: 0;
        }
        
        .metric-label {
            font-weight: 500;
        }
        
        .metric-value {
            font-weight: 600;
            font-size: 16px;
        }
        
        .metric-value.error {
            color: var(--baseline-color-error);
        }
        
        .metric-value.warning {
            color: var(--baseline-color-warning);
        }
        
        .metric-value.safe {
            color: var(--baseline-color-safe);
        }
        
        .chart-container {
            height: 200px;
            margin: 15px 0;
            display: flex;
            align-items: end;
            justify-content: space-around;
            border: 1px solid var(--vscode-panel-border);
            background: var(--vscode-input-background);
            border-radius: 4px;
            padding: 10px;
        }
        
        .bar {
            min-width: 20px;
            border-radius: 3px 3px 0 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
        }
        
        .bar-blocked {
            background: var(--baseline-color-error);
        }
        
        .bar-warning {
            background: var(--baseline-color-warning);
        }
        
        .bar-safe {
            background: var(--baseline-color-safe);
        }
        
        .bar-label {
            font-size: 11px;
            margin-top: 5px;
            text-align: center;
            max-width: 80px;
            word-wrap: break-word;
        }
        
        .bar-value {
            position: absolute;
            top: -20px;
            font-size: 12px;
            font-weight: 600;
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
            <button class="btn" onclick="refreshData()">
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
                    <button onclick="exportToPDF()">
                        <svg class="icon" viewBox="0 0 16 16">
                            <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z"/>
                            <path d="M4.603 12.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.701 19.701 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.187-.012.395-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.065.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.716 5.716 0 0 1-.911-.95 11.642 11.642 0 0 0-1.997.406 11.311 11.311 0 0 1-1.021 1.51c-.29.35-.608.655-.926.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.27.27 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.647 12.647 0 0 1 1.01-.193 11.666 11.666 0 0 1-.51-.858 20.741 20.741 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 5.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.089.346z"/>
                        </svg>
                        Export as PDF
                    </button>
                    <button onclick="exportToCSV()">
                        <svg class="icon" viewBox="0 0 16 16">
                            <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                            <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                        </svg>
                        Export as CSV
                    </button>
                    <button onclick="exportToJSON()">
                        <svg class="icon" viewBox="0 0 16 16">
                            <path d="M8.5 1a.5.5 0 0 0-1 0v1.293L6.354 1.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 2.293V1z"/>
                            <path d="M3 9.5a.5.5 0 0 1 .5-.5H4a.5.5 0 0 1 0 1h-.5A.5.5 0 0 1 3 9.5zm-2-3v3a2 2 0 0 0 2 2h1.172a3 3 0 1 1 0 2H3a4 4 0 0 1-4-4v-3a4 4 0 0 1 4-4h9.5a.5.5 0 0 1 0 1H3a3 3 0 0 0-3 3zm10.5-1a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/>
                        </svg>
                        Export as JSON
                    </button>
                    <button onclick="printReport()">
                        <svg class="icon" viewBox="0 0 16 16">
                            <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
                            <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/>
                        </svg>
                        Print Report
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

        function refreshData() {
            vscode.postMessage({ type: 'refresh' });
        }

        function exportToPDF() {
            if (!currentData) return;
            
            // Create a new window with print-friendly styling
            const printWindow = document.createElement('div');
            printWindow.innerHTML = generatePrintableHTML();
            
            // Send message to extension to handle PDF generation
            vscode.postMessage({ 
                type: 'export', 
                format: 'pdf',
                data: currentData,
                html: generatePrintableHTML()
            });
        }

        function exportToCSV() {
            if (!currentData) return;
            
            const { findings, summary } = currentData;
            let csvContent = 'Type,Severity,Feature,File,Line\\n';
            
            // Add summary data
            csvContent += 'Summary,Blocked,' + summary.blocked + ',Total,\\n';
            csvContent += 'Summary,Warning,' + summary.warning + ',Total,\\n';
            csvContent += 'Summary,Safe,' + summary.safe + ',Total,\\n';
            csvContent += '\\n';
            
            // Add findings data
            findings.forEach(finding => {
                const relativePath = getRelativePath(finding.uri);
                const line = finding.range?.start?.line + 1 || '?';
                const feature = (finding.feature?.name || 'Unknown').replace(/,/g, ';');
                csvContent += 'Finding,' + finding.verdict + ',' + feature + ',' + relativePath + ',' + line + '\\n';
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
            
            const exportData = {
                ...currentData,
                exportedAt: new Date().toISOString(),
                findings: currentData.findings.map(finding => ({
                    ...finding,
                    uri: getRelativePath(finding.uri)
                }))
            };
            
            vscode.postMessage({ 
                type: 'export', 
                format: 'json',
                data: JSON.stringify(exportData, null, 2),
                filename: 'baseline-analysis-' + new Date().toISOString().split('T')[0] + '.json'
            });
        }

        function printReport() {
            if (!currentData) return;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(generatePrintableHTML());
            printWindow.document.close();
            printWindow.print();
        }

        function generatePrintableHTML() {
            if (!currentData) return '';
            
            const { summary, findings, target, lastScanAt } = currentData;
            
            return \`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Baseline Analysis Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                        .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                        .metric-value { font-size: 24px; font-weight: bold; }
                        .error { color: #d13438; }
                        .warning { color: #f1c40f; }
                        .safe { color: #2e8b57; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Baseline Analysis Report</h1>
                        <p>Target: \${target?.name || 'Unknown'}</p>
                        \${lastScanAt ? '<p>Generated: ' + new Date(lastScanAt).toLocaleString() + '</p>' : ''}
                    </div>
                    
                    <div class="summary">
                        <div class="metric-card">
                            <h3>Blocked Issues</h3>
                            <div class="metric-value error">\${summary.blocked}</div>
                        </div>
                        <div class="metric-card">
                            <h3>Warnings</h3>
                            <div class="metric-value warning">\${summary.warning}</div>
                        </div>
                        <div class="metric-card">
                            <h3>Safe Items</h3>
                            <div class="metric-value safe">\${summary.safe}</div>
                        </div>
                    </div>
                    
                    <h2>Detailed Findings</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Severity</th>
                                <th>Feature</th>
                                <th>File</th>
                                <th>Line</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${findings.slice(0, 50).map(finding => \`
                                <tr>
                                    <td class="\${finding.verdict}">\${finding.verdict}</td>
                                    <td>\${finding.feature?.name || 'Unknown'}</td>
                                    <td>\${getRelativePath(finding.uri)}</td>
                                    <td>\${finding.range?.start?.line + 1 || '?'}</td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            \`;
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

            const { summary, summaryFiltered, findings, findingsCount, target, lastScanAt } = currentData;
            
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
                    <div class="card">
                        <h2>
                            <svg class="icon" viewBox="0 0 16 16">
                                <path d="M0 1.5A1.5 1.5 0 0 1 1.5 0H5a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 5 6H1.5A1.5 1.5 0 0 1 0 4.5v-3zM1.5 1a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H5a.5.5 0 0 0 .5-.5v-3A.5.5 0 0 0 5 1H1.5zm8.5.5A1.5 1.5 0 0 1 11.5 0H15a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 15 6h-3.5A1.5 1.5 0 0 1 10 4.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H15a.5.5 0 0 0 .5-.5v-3A.5.5 0 0 0 15 1h-3.5zM0 11.5A1.5 1.5 0 0 1 1.5 10H5a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 5 16H1.5A1.5 1.5 0 0 1 0 14.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H5a.5.5 0 0 0 .5-.5v-3A.5.5 0 0 0 5 11H1.5zm8.5.5A1.5 1.5 0 0 1 11.5 10H15a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 15 16h-3.5A1.5 1.5 0 0 1 10 14.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H15a.5.5 0 0 0 .5-.5v-3A.5.5 0 0 0 15 11h-3.5z"/>
                            </svg>
                            Overall Summary
                        </h2>
                        <div class="metric">
                            <span class="metric-label">Total Findings:</span>
                            <span class="metric-value">\${findingsCount}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Blocked:</span>
                            <span class="metric-value error">\${summary.blocked}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Warning:</span>
                            <span class="metric-value warning">\${summary.warning}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Safe:</span>
                            <span class="metric-value safe">\${summary.safe}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Target:</span>
                            <span class="metric-value">\${target?.name || 'Unknown'}</span>
                        </div>
                        \${lastScanAt ? \`
                        <div class="metric">
                            <span class="metric-label">Last Scan:</span>
                            <span class="metric-value">\${new Date(lastScanAt).toLocaleString()}</span>
                        </div>
                        \` : ''}
                    </div>
                    
                    <div class="card">
                        <h2>
                            <svg class="icon" viewBox="0 0 16 16">
                                <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                            </svg>
                            Filtered View
                        </h2>
                        <div class="metric">
                            <span class="metric-label">Visible Findings:</span>
                            <span class="metric-value">\${summaryFiltered.blocked + summaryFiltered.warning + summaryFiltered.safe}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Blocked:</span>
                            <span class="metric-value error">\${summaryFiltered.blocked}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Warning:</span>
                            <span class="metric-value warning">\${summaryFiltered.warning}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Safe:</span>
                            <span class="metric-value safe">\${summaryFiltered.safe}</span>
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
                </div>
                
                <div class="findings-section">
                    <div class="card">
                        <h2>
                            <svg class="icon" viewBox="0 0 16 16">
                                <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                                <path d="M4.5 6.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1H5z"/>
                            </svg>
                            Recent Findings (Top 50)
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
            // Group findings by feature
            const featureGroups = {};
            findings.forEach(finding => {
                const featureName = finding.feature?.name || 'Unknown';
                featureGroups[featureName] = (featureGroups[featureName] || 0) + 1;
            });
            
            // Get top 10 features
            const topFeatures = Object.entries(featureGroups)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            
            if (topFeatures.length === 0) {
                return '<p class="empty-state">No features to display</p>';
            }
            
            const maxCount = Math.max(...topFeatures.map(([,count]) => count), 1);
            
            return topFeatures.map(([featureName, count]) => \`
                <div class="bar">
                    <div class="bar-warning" style="height: \${(count / maxCount) * 150}px;"></div>
                    <div class="bar-value">\${count}</div>
                    <div class="bar-label">\${featureName.length > 15 ? featureName.substring(0, 12) + '...' : featureName}</div>
                </div>
            \`).join('');
        }

        function renderFindingsTable(findings) {
            if (findings.length === 0) {
                return '<p class="empty-state">No findings to display</p>';
            }
            
            return \`
                <table class="findings-table">
                    <thead>
                        <tr>
                            <th>Severity</th>
                            <th>Feature</th>
                            <th>File</th>
                            <th>Line</th>
                        </tr>
                    </thead>
                    <tbody>
                        \${findings.map(finding => \`
                            <tr>
                                <td>
                                    <span class="finding-severity \${finding.verdict}">\${finding.verdict}</span>
                                </td>
                                <td>
                                    <span class="feature-name">\${finding.feature?.name || 'Unknown'}</span>
                                </td>
                                <td>
                                    <span class="file-path">\${getRelativePath(finding.uri)}</span>
                                </td>
                                <td>\${finding.range?.start?.line + 1 || '?'}</td>
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