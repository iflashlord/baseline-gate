import * as vscode from 'vscode';
import type { GeminiSuggestion } from './geminiService';
import type { GeminiSuggestionState } from './types';
import { normalizeToDate } from './utils';

export const GEMINI_SUGGESTIONS_KEY = 'geminiSuggestions';

export function initializeSuggestionState(context: vscode.ExtensionContext): GeminiSuggestionState {
  const stored = context.workspaceState.get<GeminiSuggestion[]>(GEMINI_SUGGESTIONS_KEY, []);
  const suggestions = normalizeSuggestionTimestamps(stored ?? []);

  return {
    suggestions,
    filteredSuggestions: suggestions.slice(),
    searchQuery: '',
    originalSearchQuery: '',
  };
}

export async function persistSuggestions(context: vscode.ExtensionContext, suggestions: GeminiSuggestion[]): Promise<void> {
  await context.workspaceState.update(GEMINI_SUGGESTIONS_KEY, suggestions);
}

export function applySearchFilter(state: GeminiSuggestionState, query: string): GeminiSuggestionState {
  const normalizedQuery = query.trim().toLowerCase();
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  const filteredSuggestions = normalizedQuery
    ? state.suggestions.filter((suggestion) => {
        const haystacks = [
          suggestion.feature ?? '',
          suggestion.file ?? '',
          suggestion.issue,
          suggestion.suggestion,
        ].map((value) => value.toLowerCase());
        return terms.every((term) => haystacks.some((value) => value.includes(term)));
      })
    : state.suggestions.slice();

  return {
    ...state,
    filteredSuggestions,
    searchQuery: normalizedQuery,
    originalSearchQuery: query,
  };
}

export function addSuggestionToState(state: GeminiSuggestionState, suggestion: GeminiSuggestion): GeminiSuggestionState {
  const suggestions = [suggestion, ...state.suggestions];
  const nextState: GeminiSuggestionState = {
    ...state,
    suggestions,
  };
  return applySearchFilter(nextState, state.originalSearchQuery);
}

export function removeSuggestionFromState(state: GeminiSuggestionState, id: string): GeminiSuggestionState {
  const suggestions = state.suggestions.filter((suggestion) => suggestion.id !== id);
  const nextState: GeminiSuggestionState = {
    ...state,
    suggestions,
  };
  return applySearchFilter(nextState, state.originalSearchQuery);
}

export function clearSuggestionsState(state: GeminiSuggestionState): GeminiSuggestionState {
  return {
    ...state,
    suggestions: [],
    filteredSuggestions: [],
    searchQuery: '',
    originalSearchQuery: '',
  };
}

export function normalizeSuggestionTimestamps(suggestions: GeminiSuggestion[]): GeminiSuggestion[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    timestamp: normalizeToDate(suggestion.timestamp),
  }));
}
