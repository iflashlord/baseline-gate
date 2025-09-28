import * as vscode from 'vscode';
import type { GeminiSuggestionState } from './types';
import { getNonce } from './utils';
import {
  buildSuggestionsMarkup,
  buildEmptyStateMarkup,
  buildUsageStatsMarkup,
  buildHeaderMarkup,
  buildContentMarkup
} from './fullPage/content';
import { getGeminiFullPageStyles } from './fullPage/styles';
import { getGeminiFullPageScript } from './fullPage/script';

interface BuildGeminiFullPageHtmlOptions {
  webview: vscode.Webview;
  state: GeminiSuggestionState;
  isGeminiConfigured: boolean;
}

export function buildGeminiFullPageHtml({ webview, state, isGeminiConfigured }: BuildGeminiFullPageHtmlOptions): string {
  const nonce = getNonce();
  const searchDisplayValue = state.originalSearchQuery;
  const searchTerm = searchDisplayValue.trim();
  const totalCount = state.suggestions.length;
  const filteredCount = state.filteredSuggestions.length;
  const hasSuggestions = filteredCount > 0;

  const suggestionsMarkup = buildSuggestionsMarkup(state.filteredSuggestions, searchTerm);
  const emptyStateMarkup = hasSuggestions
    ? ''
    : buildEmptyStateMarkup({
        totalCount,
        isGeminiConfigured,
        searchDisplayValue
      });

  const usageStatsMarkup = buildUsageStatsMarkup(state.suggestions, isGeminiConfigured);
  const headerMarkup = buildHeaderMarkup({
    filteredCount,
    totalCount,
    searchDisplayValue,
    isGeminiConfigured,
    usageStatsMarkup
  });

  const contentMarkup = buildContentMarkup({
    hasSuggestions,
    suggestionsMarkup,
    emptyStateMarkup
  });

  const initialState = JSON.stringify({ searchQuery: state.originalSearchQuery })
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini Suggestions - Full View</title>
    ${getGeminiFullPageStyles()}
</head>
<body>
    <div class="full-view-container">
        ${headerMarkup}
        ${contentMarkup}
    </div>
    ${getGeminiFullPageScript(nonce, initialState)}
</body>
</html>`;
}
