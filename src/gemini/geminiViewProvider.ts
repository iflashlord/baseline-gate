import * as vscode from 'vscode';
import { geminiService, type GeminiSuggestion } from './geminiService';

export class GeminiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'baselineGate.geminiView';
  
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private suggestions: GeminiSuggestion[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    this._context = context;
    // Load saved suggestions from workspace state
    this.suggestions = context.workspaceState.get<GeminiSuggestion[]>('geminiSuggestions', []);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._context.extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(data => {
      switch (data.type) {
        case 'removeSuggestion':
          this.removeSuggestion(data.id);
          break;
        case 'clearAllSuggestions':
          this.clearAllSuggestions();
          break;
      }
    });
  }

  public async addSuggestion(issue: string, feature?: string, file?: string): Promise<void> {
    if (!geminiService.isConfigured()) {
      const action = await vscode.window.showErrorMessage(
        'Gemini API key is not configured.',
        'Configure API Key',
        'Learn More'
      );

      if (action === 'Configure API Key') {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'baselineGate.geminiApiKey');
      } else if (action === 'Learn More') {
        await vscode.window.showInformationMessage(geminiService.getConfigurationGuide(), { modal: true });
      }
      return;
    }

    // Show progress indicator
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Getting suggestion from Gemini...",
      cancellable: false
    }, async (progress) => {
      try {
        progress.report({ increment: 50 });
        const suggestion = await geminiService.getSuggestion(issue, feature, file);
        
        const newSuggestion: GeminiSuggestion = {
          id: Date.now().toString(),
          timestamp: new Date(),
          issue,
          suggestion,
          feature,
          file
        };

        this.suggestions.unshift(newSuggestion); // Add to beginning
        await this.saveSuggestions();
        this.refresh();
        
        progress.report({ increment: 100 });
        
        // Show success message and reveal the view
        await vscode.window.showInformationMessage('Gemini suggestion added successfully!');
        await vscode.commands.executeCommand('baselineGate.geminiView.focus');
        
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get Gemini suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  private async removeSuggestion(id: string): Promise<void> {
    this.suggestions = this.suggestions.filter(s => s.id !== id);
    await this.saveSuggestions();
    this.refresh();
  }

  private async clearAllSuggestions(): Promise<void> {
    this.suggestions = [];
    await this.saveSuggestions();
    this.refresh();
  }

  private async saveSuggestions(): Promise<void> {
    await this._context.workspaceState.update('geminiSuggestions', this.suggestions);
  }

  public refresh(): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini AI Suggestions</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .header h3 {
            margin: 0;
            color: var(--vscode-foreground);
        }

        .clear-all-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .clear-all-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .suggestion-item {
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            margin-bottom: 15px;
            background: var(--vscode-editor-background);
        }

        .suggestion-header {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-widget-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 5px 5px 0 0;
        }

        .suggestion-meta {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .remove-btn {
            background: none;
            border: none;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            padding: 2px;
            border-radius: 3px;
        }

        .remove-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-foreground);
        }

        .suggestion-content {
            padding: 12px;
        }

        .issue-section {
            margin-bottom: 12px;
        }

        .issue-title {
            font-weight: bold;
            color: var(--vscode-symbolIcon-colorForeground);
            font-size: 12px;
            margin-bottom: 4px;
        }

        .issue-text {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            border-left: 3px solid var(--vscode-editorWarning-foreground);
        }

        .suggestion-section {
            margin-bottom: 8px;
        }

        .suggestion-title {
            font-weight: bold;
            color: var(--vscode-symbolIcon-snippetForeground);
            font-size: 12px;
            margin-bottom: 4px;
        }

        .suggestion-text {
            font-size: 12px;
            line-height: 1.4;
            white-space: pre-wrap;
            background: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 4px;
            border-left: 3px solid var(--vscode-symbolIcon-snippetForeground);
        }

        .no-suggestions {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 40px 20px;
            font-style: italic;
        }

        .setup-info {
            background: var(--vscode-editorInfo-background);
            border: 1px solid var(--vscode-editorInfo-border);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 15px;
        }

        .setup-info h4 {
            margin: 0 0 8px 0;
            color: var(--vscode-editorInfo-foreground);
        }

        .setup-info p {
            margin: 0;
            font-size: 12px;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="header">
        <h3>Gemini AI Suggestions</h3>
        ${this.suggestions.length > 0 ? '<button class="clear-all-btn" onclick="clearAll()">Clear All</button>' : ''}
    </div>

    ${!geminiService.isConfigured() ? `
        <div class="setup-info">
            <h4>Setup Required</h4>
            <p>Configure your Gemini API key in settings to start getting AI-powered suggestions for your baseline issues.</p>
        </div>
    ` : ''}

    ${this.suggestions.length === 0 ? `
        <div class="no-suggestions">
            ${geminiService.isConfigured() 
              ? 'No suggestions yet. Use "Ask Gemini to Fix" on hover tooltips or in the analysis view.' 
              : 'Configure your Gemini API key to start getting suggestions.'}
        </div>
    ` : ''}

    ${this.suggestions.map(suggestion => `
        <div class="suggestion-item">
            <div class="suggestion-header">
                <div class="suggestion-meta">
                    ${suggestion.feature ? `${suggestion.feature} • ` : ''}
                    ${suggestion.file ? `${suggestion.file.split('/').pop()} • ` : ''}
                    ${suggestion.timestamp.toLocaleString()}
                </div>
                <button class="remove-btn" onclick="removeSuggestion('${suggestion.id}')" title="Remove suggestion">✕</button>
            </div>
            <div class="suggestion-content">
                <div class="issue-section">
                    <div class="issue-title">Issue:</div>
                    <div class="issue-text">${escapeHtml(suggestion.issue)}</div>
                </div>
                <div class="suggestion-section">
                    <div class="suggestion-title">Gemini Suggestion:</div>
                    <div class="suggestion-text">${escapeHtml(suggestion.suggestion)}</div>
                </div>
            </div>
        </div>
    `).join('')}

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        function removeSuggestion(id) {
            vscode.postMessage({
                type: 'removeSuggestion',
                id: id
            });
        }

        function clearAll() {
            if (confirm('Are you sure you want to clear all suggestions?')) {
                vscode.postMessage({
                    type: 'clearAllSuggestions'
                });
            }
        }
    </script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}