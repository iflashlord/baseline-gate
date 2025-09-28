import * as vscode from 'vscode';
import type { GeminiSuggestion } from './geminiService';
import type { GeminiSuggestionState } from './types';
import { normalizeToDate } from './utils';
import { writeStorageJson } from '../utils/storage';

export const GEMINI_SUGGESTIONS_KEY = 'geminiSuggestions';
export const GEMINI_SUGGESTIONS_FILE = 'gemini-suggestions.json';

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
  await writeStorageJson(GEMINI_SUGGESTIONS_FILE, suggestions);
}

export function parseStoredSuggestions(raw: unknown): GeminiSuggestion[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const valid = raw.filter((entry): entry is GeminiSuggestion => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const candidate = entry as Partial<GeminiSuggestion>;
    const hasId = typeof candidate.id === 'string' && candidate.id.length > 0;
    const hasIssue = typeof candidate.issue === 'string' && candidate.issue.length > 0;
    const hasSuggestion = typeof candidate.suggestion === 'string' && candidate.suggestion.length > 0;
    const hasTimestamp = candidate.timestamp !== undefined && candidate.timestamp !== null;
    return hasId && hasIssue && hasSuggestion && hasTimestamp;
  }) as GeminiSuggestion[];

  return normalizeSuggestionTimestamps(valid);
}

export function applySearchFilter(state: GeminiSuggestionState, query: string): GeminiSuggestionState {
  // Handle null/undefined query gracefully
  if (!query || typeof query !== 'string') {
    return {
      ...state,
      filteredSuggestions: state.suggestions,
      searchQuery: '',
      originalSearchQuery: ''
    };
  }
  
  const normalizedQuery = query.trim().toLowerCase();
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  const filteredSuggestions = normalizedQuery
    ? state.suggestions.filter((suggestion) => {
        // Create comprehensive searchable content
        const haystacks = [
          // Basic content
          suggestion.issue,
          suggestion.suggestion,
          suggestion.feature ?? '',
          suggestion.file ?? '',
          suggestion.findingId ?? '',
          suggestion.conversationId ?? '',
          suggestion.parentId ?? '',
          
          // Status and metadata  
          suggestion.status,
          suggestion.rating?.toString() ?? '',
          
          // Tags array
          ...(suggestion.tags ?? []),
          
          // Extract filename from full path for better matching
          suggestion.file ? suggestion.file.split('/').pop() ?? '' : '',
          
          // Extract feature name parts (handle camelCase, kebab-case, etc.)
          suggestion.feature ? suggestion.feature.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ') : '',
          
        ].map((value) => value.toLowerCase()).filter(Boolean);
        
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
  const suggestions = [...state.suggestions, suggestion];
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
