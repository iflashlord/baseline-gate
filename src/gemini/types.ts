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
  | { type: 'copySuggestion'; id: string }
  | { type: 'copyCodeSnippet'; code: string }
  | { type: 'rateSuggestion'; id: string; rating: 1 | 2 | 3 | 4 | 5 }
  | { type: 'retrySuggestion'; id: string }
  | { type: 'sendFollowUp'; message: string; parentId?: string }
  | { type: 'exportConversation'; format: 'markdown' | 'json' }
  | { type: 'toggleConversationView'; conversationId: string };

export interface GeminiMessageHandlers {
  removeSuggestion: (id: string) => Promise<void> | void;
  clearAllSuggestions: () => Promise<void> | void;
  goToFinding: (findingId: string) => Promise<void> | void;
  openFileAtLocation: (filePath: string, line?: number, character?: number) => Promise<void> | void;
  searchSuggestions: (query: string) => void;
  copySuggestion: (id: string) => Promise<void> | void;
  copyCodeSnippet: (code: string) => Promise<void> | void;
  rateSuggestion: (id: string, rating: 1 | 2 | 3 | 4 | 5) => Promise<void> | void;
  retrySuggestion: (id: string) => Promise<void> | void;
  sendFollowUp: (message: string, parentId?: string) => Promise<void> | void;
  exportConversation: (format: 'markdown' | 'json') => Promise<void> | void;
  toggleConversationView: (conversationId: string) => void;
}
