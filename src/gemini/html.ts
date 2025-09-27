import * as vscode from 'vscode';
import type { GeminiSuggestionState } from './types';
import { renderSuggestionCard } from './dataTransform';
import { escapeHtml, getNonce } from './utils';

interface BuildGeminiHtmlOptions {
  webview: vscode.Webview;
  state: GeminiSuggestionState;
  isGeminiConfigured: boolean;
}

export function buildGeminiWebviewHtml({ webview, state, isGeminiConfigured }: BuildGeminiHtmlOptions): string {
  const nonce = getNonce();
  const searchDisplayValue = state.originalSearchQuery;
  const searchTerm = searchDisplayValue.trim();
  const totalCount = state.suggestions.length;
  const filteredCount = state.filteredSuggestions.length;
  const hasSuggestions = filteredCount > 0;
  const suggestionsMarkup = state.filteredSuggestions
    .map((suggestion) => renderSuggestionCard(suggestion, searchTerm))
    .join('');
  const emptyStateMarkup = hasSuggestions
    ? ''
    : totalCount === 0
      ? `<div class="empty-state">${isGeminiConfigured
        ? 'No suggestions yet. Use "Fix with Gemini" on hover tooltips or in the analysis view.'
        : 'Configure your Gemini API key to start getting suggestions.'}</div>`
      : `<div class="empty-state">No suggestions match <span class="empty-state__query">"${escapeHtml(searchDisplayValue)}"</span>. <button type="button" class="link-button" data-action="clear-search">Clear search</button></div>`;
  
  // Generate usage stats
  const { geminiService } = require('./geminiService');
  const stats = geminiService.getUsageStats();
  const avgRating = state.suggestions.filter(s => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) / 
                    Math.max(1, state.suggestions.filter(s => s.rating).length);
  const usageStatsMarkup = isGeminiConfigured && totalCount > 0 
    ? `<div class="usage-stats">
        📊 ${stats.requests} requests • ${stats.successRate}% success rate
        ${avgRating > 0 ? ` • ⭐ ${avgRating.toFixed(1)} avg rating` : ''}
       </div>`
    : '';
  
  const initialState = JSON.stringify({ searchQuery: state.originalSearchQuery });

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

        .clear-all-btn, .export-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .clear-all-btn:hover, .export-btn:hover {
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
        }

        .suggestion-text code {
            font-family: var(--vscode-editor-font-family);
            background: var(--vscode-editorWidget-background);
            color: var(--vscode-foreground);
            padding: 1px 4px;
            border-radius: 4px;
        }

        .suggestion-text code mark {
            background: var(--vscode-editor-selectionBackground);
            color: inherit;
        }

        .suggestion-text pre {
            font-size: 12px;
        }

        .suggestion-text pre code {
            background: transparent;
            padding: 0;
        }

        .code-block {
            position: relative;
            margin: 8px 0;
            border-radius: 6px;
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border);
        }

        .code-block pre {
            margin: 0;
            padding: 12px;
            max-width: 100%;
            overflow-x: auto;
            box-sizing: border-box;
        }

        .code-block code {
            display: block;
            font-family: var(--vscode-editor-font-family);
            color: var(--vscode-foreground);
            white-space: pre;
        }

        .code-copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            padding: 2px 6px;
        }

        .code-copy-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .link-button {
            background: none;
            border: none;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            padding: 0;
            font-size: 12px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .link-button:hover {
            color: var(--vscode-textLink-activeForeground);
        }

        .empty-state {
            text-align: center;
            padding: 24px;
            color: var(--vscode-descriptionForeground);
            border: 1px dashed var(--vscode-widget-border);
            border-radius: 8px;
        }

        .empty-state__query {
            font-style: italic;
        }

        /* Production-ready enhancements */
        .status-indicator {
            font-size: 10px;
            margin-right: 6px;
        }

        .status-success {
            border-left: 3px solid var(--vscode-gitDecoration-addedResourceForeground);
        }

        .status-error {
            border-left: 3px solid var(--vscode-errorForeground);
        }

        .status-pending {
            border-left: 3px solid var(--vscode-editorWarning-foreground);
            opacity: 0.7;
        }

        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin: 8px 0;
        }

        .tag {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 500;
        }

        .suggestion-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 8px;
            border-top: 1px solid var(--vscode-widget-border);
            margin-top: 8px;
        }

        .rating {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .rating-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .star {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            padding: 2px;
            border-radius: 2px;
        }

        .star:hover, .star-filled {
            color: var(--vscode-gitDecoration-modifiedResourceForeground);
        }

        .suggestion-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .action-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }

        .action-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .metrics {
            display: flex;
            gap: 8px;
        }

        .metric {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            background: var(--vscode-badge-background);
            padding: 2px 6px;
            border-radius: 8px;
        }

        .follow-up-input {
            margin-top: 8px;
            padding: 8px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            color: var(--vscode-input-foreground);
            width: 100%;
            font-size: 12px;
        }

        .follow-up-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .follow-up-actions {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }

        .usage-stats {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            padding: 8px;
            background: var(--vscode-editorWidget-background);
            border-radius: 4px;
            margin-bottom: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="header-title">
                <h3>Gemini AI Chat</h3>
                <span class="count-chip">${filteredCount}/${totalCount}</span>
            </div>
            <div class="header-actions">
                <button type="button" class="export-btn" data-action="export-markdown" title="Export as Markdown">📄 Export</button>
                <button type="button" class="clear-all-btn" data-action="clear-all">Clear all</button>
            </div>
        </header>

        <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input class="search-input" type="text" placeholder="Search suggestions" value="${escapeHtml(searchDisplayValue)}" data-test-id="search-input" />
            <button type="button" class="search-clear" data-action="clear-search">Clear</button>
        </div>

        <div class="search-hint">
            Filter by <span>feature</span>, <span>file path</span>, or <span>issue detail</span>
        </div>

        ${usageStatsMarkup}

        <div class="suggestions-list" data-test-id="suggestions-list">
            ${suggestionsMarkup || emptyStateMarkup}
        </div>
    </div>

    <script nonce="${nonce}">
        const vscodeApi = acquireVsCodeApi();
        const state = ${initialState};
        let currentQuery = state.searchQuery ?? '';
        let searchInput = document.querySelector('.search-input');

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'scrollToLatest') {
                scrollToLatestSuggestion();
            }
        });

        function scrollToLatestSuggestion() {
            // Scroll to the bottom to show the latest suggestion
            const suggestionsList = document.querySelector('.suggestions-list');
            if (suggestionsList) {
                // If there are suggestions, scroll to the last one
                if (suggestionsList.children.length > 0) {
                    const lastSuggestion = suggestionsList.lastElementChild;
                    if (lastSuggestion && lastSuggestion.classList.contains('suggestion-item')) {
                        lastSuggestion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        return;
                    }
                }
                // Fallback: scroll to bottom of suggestions list
                suggestionsList.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }

        if (searchInput) {
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

        function commitState() {
            vscodeApi.setState(state);
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
                case 'copy-code': {
                    const codeBlock = actionable.closest('[data-code-block]');
                    const codeElement = codeBlock ? codeBlock.querySelector('code') : null;
                    const code = codeElement ? codeElement.textContent ?? '' : '';
                    vscodeApi.postMessage({ type: 'copyCodeSnippet', code });
                    break;
                }
                case 'clear-search': {
                    clearSearchField();
                    break;
                }
                case 'rate': {
                    const suggestionId = actionable.getAttribute('data-suggestion-id');
                    const rating = actionable.getAttribute('data-rating');
                    if (suggestionId && rating) {
                        vscodeApi.postMessage({ 
                            type: 'rateSuggestion', 
                            id: suggestionId, 
                            rating: parseInt(rating) 
                        });
                    }
                    break;
                }
                case 'retry': {
                    const suggestionId = actionable.getAttribute('data-suggestion-id');
                    if (suggestionId) {
                        vscodeApi.postMessage({ type: 'retrySuggestion', id: suggestionId });
                    }
                    break;
                }
                case 'follow-up': {
                    const suggestionId = actionable.getAttribute('data-suggestion-id');
                    showFollowUpInput(suggestionId);
                    break;
                }
                case 'export-markdown': {
                    vscodeApi.postMessage({ type: 'exportConversation', format: 'markdown' });
                    break;
                }
                case 'export-json': {
                    vscodeApi.postMessage({ type: 'exportConversation', format: 'json' });
                    break;
                }
                case 'send-follow-up': {
                    const suggestionId = actionable.getAttribute('data-suggestion-id');
                    const input = document.getElementById('follow-up-' + suggestionId);
                    if (input && input.value.trim()) {
                        vscodeApi.postMessage({ 
                            type: 'sendFollowUp', 
                            message: input.value.trim(),
                            parentId: suggestionId
                        });
                        hideFollowUpInput(suggestionId);
                    }
                    break;
                }
                case 'cancel-follow-up': {
                    const suggestionId = actionable.getAttribute('data-suggestion-id');
                    hideFollowUpInput(suggestionId);
                    break;
                }
                default:
                    break;
            }
        });

        function showFollowUpInput(suggestionId) {
            const suggestion = document.querySelector('[data-suggestion-id="' + suggestionId + '"]');
            if (!suggestion) return;

            // Remove existing follow-up if any
            hideFollowUpInput(suggestionId);

            const followUpHtml = 
                '<div class="follow-up-container" id="follow-up-container-' + suggestionId + '">' +
                    '<input type="text" class="follow-up-input" id="follow-up-' + suggestionId + '" ' +
                           'placeholder="Ask a follow-up question..." />' +
                    '<div class="follow-up-actions">' +
                        '<button type="button" class="action-btn" data-action="send-follow-up" data-suggestion-id="' + suggestionId + '">Send</button>' +
                        '<button type="button" class="action-btn" data-action="cancel-follow-up" data-suggestion-id="' + suggestionId + '">Cancel</button>' +
                    '</div>' +
                '</div>';
            
            suggestion.insertAdjacentHTML('beforeend', followUpHtml);
            const input = document.getElementById('follow-up-' + suggestionId);
            if (input) {
                input.focus();
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        const sendBtn = document.querySelector('[data-action="send-follow-up"][data-suggestion-id="' + suggestionId + '"]');
                        if (sendBtn) sendBtn.click();
                    }
                });
            }
        }

        function hideFollowUpInput(suggestionId) {
            const container = document.getElementById('follow-up-container-' + suggestionId);
            if (container) {
                container.remove();
            }
        }

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && searchInput && document.activeElement === searchInput && searchInput.value) {
                clearSearchField();
            }
        });
    </script>
</body>
</html>`;
}
