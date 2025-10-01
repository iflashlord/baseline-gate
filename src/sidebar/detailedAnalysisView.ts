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
        
        .refresh-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        
        .refresh-btn:hover {
            background: var(--vscode-button-hoverBackground);
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
        <h1>📊 Baseline Insights - Detailed Analysis</h1>
        <button class="refresh-btn" onclick="refreshData()">🔄 Refresh</button>
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
                        <h2>📈 Overall Summary</h2>
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
                        <h2>🎯 Filtered View</h2>
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
                        <h2>📊 Severity Distribution</h2>
                        <div class="chart-container">
                            \${renderSeverityChart(summary)}
                        </div>
                    </div>
                    
                    <div class="card">
                        <h2>🔍 Feature Breakdown</h2>
                        <div class="chart-container">
                            \${renderFeatureChart(findings)}
                        </div>
                    </div>
                </div>
                
                <div class="findings-section">
                    <div class="card">
                        <h2>📋 Recent Findings (Top 50)</h2>
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