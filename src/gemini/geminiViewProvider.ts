import * as vscode from 'vscode';
import { geminiService, type GeminiSuggestion } from './geminiService';

export class GeminiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'baselineGate.geminiView';
  
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private suggestions: GeminiSuggestion[] = [];
  private filteredSuggestions: GeminiSuggestion[] = [];
  private searchQuery: string = '';
  private originalSearchQuery: string = '';

  constructor(private readonly context: vscode.ExtensionContext) {
    this._context = context;
    // Load saved suggestions from workspace state
    const storedSuggestions = context.workspaceState.get<GeminiSuggestion[]>('geminiSuggestions', []);
    this.suggestions = storedSuggestions.map((suggestion) => ({
      ...suggestion,
      timestamp: normalizeToDate(suggestion.timestamp),
    }));
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
        case 'copySuggestion':
          console.log('Copying suggestion to clipboard:', data.id);
          void this.copySuggestionToClipboard(data.id);
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
      this.originalSearchQuery = '';
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

  private async copySuggestionToClipboard(id: string): Promise<void> {
    const suggestion = this.suggestions.find((item) => item.id === id);

    if (!suggestion) {
      void vscode.window.showWarningMessage('Unable to copy Gemini suggestion: item was not found.');
      return;
    }

    try {
      await vscode.env.clipboard.writeText(suggestion.suggestion);
      vscode.window.setStatusBarMessage('Gemini suggestion copied to clipboard.', 3000);
    } catch (error) {
      void vscode.window.showErrorMessage(`Failed to copy Gemini suggestion: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private filterSuggestions(query: string): void {
    this.originalSearchQuery = query;
    const normalizedQuery = query.trim().toLowerCase();
    this.searchQuery = normalizedQuery;

    if (!normalizedQuery) {
      this.filteredSuggestions = [...this.suggestions];
    } else {
      const terms = normalizedQuery.split(/\s+/).filter(Boolean);
      this.filteredSuggestions = this.suggestions.filter((suggestion) => {
        const haystacks = [
          suggestion.feature ?? '',
          suggestion.file ?? '',
          suggestion.issue,
          suggestion.suggestion,
        ].map((value) => value.toLowerCase());

        return terms.every((term) => haystacks.some((value) => value.includes(term)));
      });
    }
    this.refresh();
  }


  private renderSuggestionCard(suggestion: GeminiSuggestion, searchTerm: string): string {
    const suggestionId = escapeHtml(suggestion.id);
    const { display, iso } = formatTimestamp(suggestion.timestamp);
    const safeDisplay = escapeHtml(display);
    const timestampHtml = iso
      ? `<time class="timestamp" datetime="${escapeHtml(iso)}" title="${safeDisplay}">${safeDisplay}</time>`
      : `<span class="timestamp" title="${safeDisplay}">${safeDisplay}</span>`;

    const featureChip = suggestion.feature
      ? `<span class="chip chip-feature">${highlightText(suggestion.feature, searchTerm)}</span>`
      : '';
    const filePath = suggestion.file ?? '';
    const fileName = filePath ? getFileName(filePath) : '';
    const fileChip = filePath
      ? `<button type="button" class="chip chip-link" data-action="open-file" data-file-path="${escapeHtml(filePath)}" title="Open ${escapeHtml(filePath)}">📄 ${highlightText(fileName, searchTerm)}</button>`
      : '';
    const metadataChips = [featureChip, fileChip].filter(Boolean).join('');
    const metadataMarkup = metadataChips || '<span class="chip">Gemini</span>';

    const findingButton = suggestion.findingId
      ? `<button type="button" class="link-button" data-action="go-to-finding" data-finding-id="${escapeHtml(suggestion.findingId)}">📍 Go to finding</button>`
      : '';

    return `
        <article class="suggestion-item" data-suggestion-id="${suggestionId}">
            <header class="suggestion-header">
                <div class="metadata">
                    ${metadataMarkup}
                </div>
                <div class="header-buttons">
                    ${timestampHtml}
                    <button type="button" class="icon-btn" data-action="copy" data-suggestion-id="${suggestionId}" title="Copy suggestion to clipboard">📋</button>
                    <button type="button" class="icon-btn remove-btn" data-action="remove" data-suggestion-id="${suggestionId}" title="Remove suggestion">✕</button>
                </div>
            </header>
            <div class="suggestion-content">
                <div class="issue-section">
                    <h4>Issue</h4>
                    <div class="issue-text">${highlightText(suggestion.issue, searchTerm)}</div>
                    ${findingButton}
                </div>
                <div class="suggestion-section">
                    <h4>Gemini Suggestion</h4>
                    <div class="suggestion-text">${renderMarkdown(suggestion.suggestion, searchTerm)}</div>
                </div>
            </div>
        </article>
    `;
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();
    const searchDisplayValue = this.originalSearchQuery;
    const searchTerm = searchDisplayValue.trim();
    const totalCount = this.suggestions.length;
    const filteredCount = this.filteredSuggestions.length;
    const hasSearch = searchTerm.length > 0;
    const hasSuggestions = filteredCount > 0;
    const suggestionsMarkup = this.filteredSuggestions
      .map((suggestion) => this.renderSuggestionCard(suggestion, searchTerm))
      .join('');
    const emptyStateMarkup = hasSuggestions
      ? ''
      : totalCount === 0
        ? `<div class="empty-state">${geminiService.isConfigured()
          ? 'No suggestions yet. Use "Ask Gemini to Fix" on hover tooltips or in the analysis view.'
          : 'Configure your Gemini API key to start getting suggestions.'}</div>`
        : `<div class="empty-state">No suggestions match <span class="empty-state__query">"${escapeHtml(searchDisplayValue)}"</span>. <button type="button" class="link-button" data-action="clear-search">Clear search</button></div>`;
    const initialState = JSON.stringify({ searchQuery: this.originalSearchQuery });

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
            padding: 12px;
        }

        .container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .header-title {
            display: flex;
            align-items: baseline;
            gap: 8px;
        }

        .header-title h3 {
            margin: 0;
            font-size: 15px;
        }

        .count-chip {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 2px 8px;
            border-radius: 999px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            font-size: 11px;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .clear-all-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .clear-all-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .search-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            background: var(--vscode-input-background);
            padding: 6px 10px;
        }

        .search-bar:focus-within {
            border-color: var(--vscode-focusBorder);
        }

        .search-icon {
            font-size: 13px;
            opacity: 0.7;
        }

        .search-input {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--vscode-input-foreground);
            font-size: 13px;
        }

        .search-input:focus {
            outline: none;
        }

        .search-clear {
            border: none;
            background: none;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            font-size: 12px;
            padding: 2px 4px;
            border-radius: 4px;
        }

        .search-clear:hover {
            background: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-textLink-activeForeground);
        }

        .search-hint {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .search-hint span {
            color: var(--vscode-textLink-foreground);
        }

        .suggestions-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .suggestion-item {
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            background: var(--vscode-editor-background);
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .suggestion-header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
            padding: 10px 12px;
            background: var(--vscode-editorWidget-background);
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .metadata {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            border-radius: 999px;
            background: var(--vscode-editorInlayHint-background);
            color: var(--vscode-editorInlayHint-foreground);
            font-size: 11px;
            border: 1px solid transparent;
        }

        .chip-feature {
            background: var(var(--vscode-editorInlayHint-background), --vscode-symbolIcon-classForeground);
            color: var(--vscode-editor-foreground);
        }

        .chip-link {
            background: none;
            border: 1px solid var(--vscode-widget-border);
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
        }

        .chip-link:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }

        .header-buttons {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .icon-btn {
            border: none;
            background: none;
            cursor: pointer;
            color: var(--vscode-descriptionForeground);
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 12px;
        }

        .icon-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-foreground);
        }

        .icon-btn.remove-btn {
            color: var(--vscode-errorForeground);
        }

        .suggestion-content {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
        }

        .suggestion-content h4 {
            margin: 0 0 6px 0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: var(--vscode-descriptionForeground);
        }

        .issue-text {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 10px;
            border-radius: 4px;
            border-left: 3px solid var(--vscode-editorWarning-foreground);
            font-size: 12px;
            line-height: 1.5;
        }

        .suggestion-text {
            font-size: 12px;
            line-height: 1.5;
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            border-left: 3px solid var(--vscode-symbolIcon-snippetForeground);
            overflow-x: auto;
        }

        .suggestion-text pre {
            margin: 8px 0;
            padding: 10px;
            background: var(--vscode-textPreformat-background);
            border-radius: 4px;
        }

        .suggestion-text code {
            background: var(--vscode-textPreformat-background);
            padding: 2px 4px;
            border-radius: 3px;
        }

        .link-button {
            border: none;
            background: none;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            font-size: 11px;
            padding: 0;
            text-decoration: underline;
            margin-top: 6px;
        }

        .link-button:hover {
            color: var(--vscode-textLink-activeForeground);
        }

        .timestamp {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 32px 16px;
            color: var(--vscode-descriptionForeground);
            border: 1px dashed var(--vscode-widget-border);
            border-radius: 8px;
            text-align: center;
            font-size: 12px;
        }

        .empty-state__query {
            color: var(--vscode-textLink-foreground);
        }

        .setup-info {
            background: var(--vscode-editorInfo-background);
            border: 1px solid var(--vscode-editorInfo-border);
            border-radius: 6px;
            padding: 12px;
            font-size: 12px;
            line-height: 1.5;
        }

        .setup-info h4 {
            margin: 0 0 6px 0;
            color: var(--vscode-editorInfo-foreground);
            font-size: 13px;
        }

        mark {
            background: var(--vscode-editorFindMatchHighlightBackground, rgba(255, 224, 0, 0.35));
            color: inherit;
            border-radius: 2px;
            padding: 0 2px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="header-title">
                <h3>Gemini AI Suggestions</h3>
                <span class="count-chip">${filteredCount}/${totalCount}</span>
            </div>
            <div class="header-actions">
                ${totalCount > 0 ? '<button type="button" class="clear-all-btn" data-action="clear-all">Clear All</button>' : ''}
            </div>
        </header>
        ${totalCount > 0 ? `
        <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input type="text" class="search-input" placeholder="Search by issue, feature, file, or suggestion" value="${escapeHtml(searchDisplayValue)}" aria-label="Search Gemini suggestions">
            ${hasSearch ? '<button type="button" class="search-clear" data-action="clear-search" title="Clear search">Clear</button>' : ''}
        </div>
        ` : ''}
        ${hasSearch ? `
        <div class="search-hint">
            Showing ${filteredCount} result${filteredCount === 1 ? '' : 's'} for <span>"${escapeHtml(searchDisplayValue)}"</span>
        </div>
        ` : ''}
        ${!geminiService.isConfigured() ? `
        <div class="setup-info">
            <h4>Setup Required</h4>
            <p>Configure your Gemini API key in settings to start getting AI-powered suggestions for your baseline issues.</p>
        </div>
        ` : ''}
        ${hasSuggestions ? `
        <div class="suggestions-list">${suggestionsMarkup}</div>
        ` : emptyStateMarkup}
    </div>
    <script nonce="${nonce}">
        const vscodeApi = acquireVsCodeApi();
        const initialState = ${initialState};
        const persistedState = vscodeApi.getState() || {};
        const state = {
            searchQuery: initialState.searchQuery,
            searchFocused: typeof persistedState.searchFocused === 'boolean' ? persistedState.searchFocused : false
        };
        let currentQuery = state.searchQuery;

        function commitState() {
            vscodeApi.setState({ ...state });
        }

        commitState();

        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            if (typeof state.searchQuery === 'string' && searchInput.value !== state.searchQuery) {
                searchInput.value = state.searchQuery;
            }

            if (state.searchFocused) {
                setTimeout(() => {
                    searchInput.focus();
                    if (typeof searchInput.setSelectionRange === 'function') {
                        const caret = searchInput.value.length;
                        searchInput.setSelectionRange(caret, caret);
                    }
                }, 0);
            }

            searchInput.addEventListener('focus', () => {
                if (!state.searchFocused) {
                    state.searchFocused = true;
                    commitState();
                }
            });

            searchInput.addEventListener('blur', () => {
                if (state.searchFocused) {
                    state.searchFocused = false;
                    commitState();
                }
            });
        }

        function updateSearch(query) {
            if (query === currentQuery) {
                return;
            }

            currentQuery = query;
            state.searchQuery = query;
            state.searchFocused = searchInput ? document.activeElement === searchInput : false;
            commitState();

            vscodeApi.postMessage({
                type: 'searchSuggestions',
                query
            });
        }

        function clearSearchField() {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            updateSearch('');
        }

        document.addEventListener('input', function(event) {
            if (searchInput && event.target === searchInput) {
                updateSearch(searchInput.value);
            }
        });

        document.addEventListener('click', function(event) {
            if (!(event.target instanceof Element)) {
                return;
            }

            const actionable = event.target.closest('[data-action]');
            if (!actionable) {
                return;
            }

            event.preventDefault();

            const action = actionable.getAttribute('data-action');
            switch (action) {
                case 'remove': {
                    const suggestionId = actionable.getAttribute('data-suggestion-id');
                    if (suggestionId) {
                        vscodeApi.postMessage({ type: 'removeSuggestion', id: suggestionId });
                    }
                    break;
                }
                case 'clear-all': {
                    vscodeApi.postMessage({ type: 'clearAllSuggestions' });
                    break;
                }
                case 'open-file': {
                    const filePath = actionable.getAttribute('data-file-path');
                    if (filePath) {
                        vscodeApi.postMessage({ type: 'openFileAtLocation', filePath });
                    }
                    break;
                }
                case 'go-to-finding': {
                    const findingId = actionable.getAttribute('data-finding-id');
                    if (findingId) {
                        vscodeApi.postMessage({ type: 'goToFinding', findingId });
                    }
                    break;
                }
                case 'copy': {
                    const suggestionId = actionable.getAttribute('data-suggestion-id');
                    if (suggestionId) {
                        vscodeApi.postMessage({ type: 'copySuggestion', id: suggestionId });
                    }
                    break;
                }
                case 'clear-search': {
                    clearSearchField();
                    break;
                }
                default:
                    break;
            }
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && searchInput && document.activeElement === searchInput && searchInput.value) {
                clearSearchField();
            }
        });
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

function renderMarkdown(text: string, query?: string): string {
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
  
  return highlightHtml(html, query);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[-\^$*+?.()|[\]{}]/g, '\$&');
}

function buildSearchPatterns(query?: string): RegExp[] {
  if (!query) {
    return [];
  }

  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return [];
  }

  const uniqueTerms = Array.from(new Set(terms.map(term => term.toLowerCase())));
  return uniqueTerms.map(term => new RegExp(escapeRegExp(term), 'gi'));
}

function highlightText(text: string, query: string): string {
  const safeText = escapeHtml(text);
  const patterns = buildSearchPatterns(query);

  if (patterns.length === 0) {
    return safeText;
  }

  return patterns.reduce((result, pattern) => result.replace(pattern, '<mark>$&</mark>'), safeText);
}

function highlightHtml(html: string, query?: string): string {
  const patterns = buildSearchPatterns(query);

  if (patterns.length === 0) {
    return html;
  }

  return html.replace(/>([^<]+)</g, (match, text) => {
    let updated = text;
    for (const pattern of patterns) {
      updated = updated.replace(pattern, '<mark>$&</mark>');
    }
    return '>' + updated + '<';
  });
}

function normalizeToDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

function formatTimestamp(value: Date | string): { display: string; iso: string } {
  const date = normalizeToDate(value);

  if (Number.isNaN(date.getTime())) {
    return { display: 'Unknown date', iso: '' };
  }

  return {
    display: date.toLocaleString(),
    iso: date.toISOString(),
  };
}

function getFileName(filePath: string): string {
  if (!filePath) {
    return '';
  }

  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  return segments.pop() || filePath;
}
