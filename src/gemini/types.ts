import type { GeminiSuggestion } from './geminiService';

export interface GeminiSuggestionState {
  suggestions: GeminiSuggestion[];
  filteredSuggestions: GeminiSuggestion[];
  searchQuery: string;
  originalSearchQuery: string;
}

export interface GeminiInitialStatePayload {
  searchQuery: string;
}

export type GeminiWebviewMessage =
  | { type: 'removeSuggestion'; id: string }
  | { type: 'clearAllSuggestions' }
  | { type: 'goToFinding'; findingId: string }
  | { type: 'openFileAtLocation'; filePath: string; line?: number; character?: number }
  | { type: 'searchSuggestions'; query: string }
  | { type: 'copySuggestion'; id: string };

export interface GeminiMessageHandlers {
  removeSuggestion: (id: string) => Promise<void> | void;
  clearAllSuggestions: () => Promise<void> | void;
  goToFinding: (findingId: string) => Promise<void> | void;
  openFileAtLocation: (filePath: string, line?: number, character?: number) => Promise<void> | void;
  searchSuggestions: (query: string) => void;
  copySuggestion: (id: string) => Promise<void> | void;
}
