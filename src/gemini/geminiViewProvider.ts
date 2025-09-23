import * as vscode from 'vscode';
import { geminiService, type GeminiSuggestion } from './geminiService';

export class GeminiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'baselineGate.geminiView';
  
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private suggestions: GeminiSuggestion[] = [];
  private filteredSuggestions: GeminiSuggestion[] = [];
  private searchQuery: string = '';

  constructor(private readonly context: vscode.ExtensionContext) {
    this._context = context;
    // Load saved suggestions from workspace state
    this.suggestions = context.workspaceState.get<GeminiSuggestion[]>('geminiSuggestions', []);
    this.filteredSuggestions = [...this.suggestions];
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
      console.log('Gemini webview received message:', data);
      switch (data.type) {
        case 'removeSuggestion':
          console.log('Removing suggestion:', data.id);
          this.removeSuggestion(data.id);
          break;
        case 'clearAllSuggestions':
          console.log('Clearing all suggestions');
          this.clearAllSuggestions();
          break;
        case 'goToFinding':
          vscode.commands.executeCommand('baseline-gate.goToFinding', data.findingId);
          break;
        case 'openFileAtLocation':
          this.openFileAtLocation(data.filePath, data.line, data.character);
          break;
        case 'searchSuggestions':
          console.log('Searching suggestions with query:', data.query);
          this.filterSuggestions(data.query);
          break;
      }
    });
  }

  public async addSuggestion(issue: string, feature?: string, file?: string, findingId?: string): Promise<void> {
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
          file,
          findingId
        };

        this.suggestions.unshift(newSuggestion); // Add to beginning
        await this.saveSuggestions();
        this.filterSuggestions(this.searchQuery); // Refresh filtered suggestions
        
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
    this.filterSuggestions(this.searchQuery); // This calls refresh() internally
  }

  private async clearAllSuggestions(): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
      'Are you sure you want to clear all Gemini suggestions? This action cannot be undone.',
      { modal: true },
      'Clear All',
      'Cancel'
    );
    
    if (confirmed === 'Clear All') {
      this.suggestions = [];
      this.searchQuery = '';
      await this.saveSuggestions();
      this.filterSuggestions(''); // Reset search and refresh
    }
  }

  private async saveSuggestions(): Promise<void> {
    await this._context.workspaceState.update('geminiSuggestions', this.suggestions);
  }

  public refresh(): void {
    if (this._view) {
      console.log('Refreshing Gemini webview. Suggestions:', this.suggestions.length, 'Filtered:', this.filteredSuggestions.length, 'Search query:', this.searchQuery);
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  public hasSuggestionForFinding(findingId: string): boolean {
    return this.suggestions.some(s => s.findingId === findingId);
  }

  public getSuggestionsForFinding(findingId: string): GeminiSuggestion[] {
    return this.suggestions.filter(s => s.findingId === findingId);
  }

  private async openFileAtLocation(filePath: string, line?: number, character?: number): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document, { preview: false });
      
      if (line !== undefined && character !== undefined) {
        const position = new vscode.Position(line, character);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private filterSuggestions(query: string): void {
    this.searchQuery = query.toLowerCase();
    if (!query.trim()) {
      this.filteredSuggestions = [...this.suggestions];
    } else {
      this.filteredSuggestions = this.suggestions.filter(suggestion => 
        suggestion.feature?.toLowerCase().includes(this.searchQuery) ||
        suggestion.file?.toLowerCase().includes(this.searchQuery) ||
        suggestion.issue.toLowerCase().includes(this.searchQuery) ||
        suggestion.suggestion.toLowerCase().includes(this.searchQuery)
      );
    }
    this.refresh();
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
            background: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 4px;
            border-left: 3px solid var(--vscode-symbolIcon-snippetForeground);
        }

        .suggestion-text h1, .suggestion-text h2, .suggestion-text h3 {
            margin: 12px 0 8px 0;
            color: var(--vscode-foreground);
        }

        .suggestion-text h1 { font-size: 16px; }
        .suggestion-text h2 { font-size: 14px; }
        .suggestion-text h3 { font-size: 13px; }

        .suggestion-text p {
            margin: 8px 0;
        }

        .suggestion-text ul, .suggestion-text ol {
            margin: 8px 0;
            padding-left: 20px;
        }

        .suggestion-text li {
            margin: 4px 0;
        }

        .suggestion-text code {
            background: var(--vscode-textPreformat-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }

        .suggestion-text pre {
            background: var(--vscode-textPreformat-background);
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 8px 0;
        }

        .suggestion-text pre code {
            background: none;
            padding: 0;
        }

        .suggestion-text blockquote {
            border-left: 4px solid var(--vscode-textQuote-border);
            padding-left: 12px;
            margin: 8px 0;
            color: var(--vscode-textQuote-foreground);
        }

        .link-to-finding {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            font-size: 11px;
            margin-top: 4px;
            display: inline-block;
        }

        .link-to-finding:hover {
            text-decoration: underline;
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

        .search-section {
            margin-bottom: 15px;
        }

        .search-input {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 13px;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .search-input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }

        .feature-name {
            color: var(--vscode-symbolIcon-keywordForeground);
            font-weight: 500;
            margin-right: 8px;
        }

        .file-link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            margin: 0 8px;
            font-size: 11px;
        }

        .file-link:hover {
            text-decoration: underline;
        }

        .timestamp {
            color: var(--vscode-descriptionForeground);
            font-size: 10px;
        }

        .clear-search-btn {
            background: none;
            border: none;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            text-decoration: underline;
            padding: 0;
            font-size: inherit;
        }

        .clear-search-btn:hover {
            color: var(--vscode-textLink-activeForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h3>Gemini AI Suggestions (${this.filteredSuggestions.length}/${this.suggestions.length})</h3>
        ${this.suggestions.length > 0 ? '<button class="clear-all-btn" onclick="clearAll()">Clear All</button>' : ''}
    </div>

    ${this.suggestions.length > 0 ? `
        <div class="search-section">
            <input type="text" class="search-input" placeholder="Search suggestions..." value="${this.searchQuery}" oninput="searchSuggestions(event.target.value)">
        </div>
    ` : ''}

    ${!geminiService.isConfigured() ? `
        <div class="setup-info">
            <h4>Setup Required</h4>
            <p>Configure your Gemini API key in settings to start getting AI-powered suggestions for your baseline issues.</p>
        </div>
    ` : ''}

    ${this.filteredSuggestions.length === 0 && this.suggestions.length === 0 ? `
        <div class="no-suggestions">
            ${geminiService.isConfigured() 
              ? 'No suggestions yet. Use "Ask Gemini to Fix" on hover tooltips or in the analysis view.' 
              : 'Configure your Gemini API key to start getting suggestions.'}
        </div>
    ` : this.filteredSuggestions.length === 0 && this.searchQuery ? `
        <div class="no-suggestions">
            No suggestions match "${this.searchQuery}". <button onclick="clearSearch()" class="clear-search-btn">Clear search</button>
        </div>
    ` : ''}

    ${this.filteredSuggestions.map(suggestion => `
        <div class="suggestion-item">
            <div class="suggestion-header">
                <div class="suggestion-meta">
                    ${suggestion.feature ? `<span class="feature-name">${suggestion.feature}</span>` : ''}
                    ${suggestion.file ? `<a href="#" class="file-link" data-file-path="${escapeHtml(suggestion.file)}" title="Open ${escapeHtml(suggestion.file)}">📄 ${escapeHtml(suggestion.file.split('/').pop() || '')}</a>` : ''}
                    <span class="timestamp">${suggestion.timestamp.toLocaleString()}</span>
                </div>
                <button class="remove-btn" data-suggestion-id="${escapeHtml(suggestion.id)}" title="Remove suggestion">✕</button>
            </div>
            <div class="suggestion-content">
                <div class="issue-section">
                    <div class="issue-title">Issue:</div>
                    <div class="issue-text">${escapeHtml(suggestion.issue)}</div>
                    ${suggestion.findingId ? `<a href="#" class="link-to-finding" data-finding-id="${escapeHtml(suggestion.findingId)}" title="Go to original finding">📍 Go to finding</a>` : ''}
                </div>
                <div class="suggestion-section">
                    <div class="suggestion-title">Gemini Suggestion:</div>
                    <div class="suggestion-text">${renderMarkdown(suggestion.suggestion)}</div>
                </div>
            </div>
        </div>
    `).join('')}

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        // Event listeners for better handling of dynamic content
        document.addEventListener('click', function(event) {
            const target = event.target;
            
            // Handle remove suggestion button clicks
            if (target.classList.contains('remove-btn')) {
                const suggestionId = target.getAttribute('data-suggestion-id');
                if (suggestionId) {
                    console.log('Webview: Remove suggestion clicked for id:', suggestionId);
                    vscode.postMessage({
                        type: 'removeSuggestion',
                        id: suggestionId
                    });
                }
                event.preventDefault();
            }
            
            // Handle file link clicks
            if (target.classList.contains('file-link')) {
                const filePath = target.getAttribute('data-file-path');
                if (filePath) {
                    console.log('Webview: Open file clicked for path:', filePath);
                    vscode.postMessage({
                        type: 'openFileAtLocation',
                        filePath: filePath
                    });
                }
                event.preventDefault();
            }
            
            // Handle finding link clicks
            if (target.classList.contains('link-to-finding')) {
                const findingId = target.getAttribute('data-finding-id');
                if (findingId) {
                    console.log('Webview: Go to finding clicked for id:', findingId);
                    vscode.postMessage({
                        type: 'goToFinding',
                        findingId: findingId
                    });
                }
                event.preventDefault();
            }
            
            // Handle clear search button clicks
            if (target.classList.contains('clear-search-btn')) {
                clearSearch();
                event.preventDefault();
            }
        });

        function clearAll() {
            console.log('Webview: Clear all clicked');
            vscode.postMessage({
                type: 'clearAllSuggestions'
            });
        }

        function searchSuggestions(query) {
            console.log('Webview: Search suggestions with query:', query);
            vscode.postMessage({
                type: 'searchSuggestions',
                query: query
            });
        }

        function clearSearch() {
            console.log('Webview: Clear search clicked');
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.value = '';
                searchSuggestions('');
            } else {
                console.error('Search input not found');
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

function renderMarkdown(text: string): string {
  // Simple markdown to HTML converter for basic formatting
  let html = escapeHtml(text);
  
  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```([^`]*?)```/gs, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
  
  // Lists
  html = html.replace(/^[\s]*[-*+] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Numbered lists
  html = html.replace(/^[\s]*\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, function(match) {
    if (match.includes('<ul>')) {
      return match;
    }
    return '<ol>' + match + '</ol>';
  });
  
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraphs
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol') && !html.startsWith('<pre')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}