import type { GeminiMessageHandlers, GeminiWebviewMessage } from './types';

export function handleGeminiMessage(message: GeminiWebviewMessage, handlers: GeminiMessageHandlers): void {
  switch (message.type) {
    case 'removeSuggestion':
      void handlers.removeSuggestion(message.id);
      break;
    case 'clearAllSuggestions':
      void handlers.clearAllSuggestions();
      break;
    case 'goToFinding':
      void handlers.goToFinding(message.findingId);
      break;
    case 'openFileAtLocation':
      void handlers.openFileAtLocation(message.filePath, message.line, message.character);
      break;
    case 'searchSuggestions':
      handlers.searchSuggestions(message.query);
      break;
    case 'copySuggestion':
      void handlers.copySuggestion(message.id);
      break;
    case 'copyCodeSnippet':
      void handlers.copyCodeSnippet(message.code);
      break;
    case 'rateSuggestion':
      void handlers.rateSuggestion(message.id, message.rating);
      break;
    case 'retrySuggestion':
      void handlers.retrySuggestion(message.id);
      break;
    case 'sendFollowUp':
      void handlers.sendFollowUp(message.message, message.parentId);
      break;
    case 'exportConversation':
      void handlers.exportConversation(message.format);
      break;
    case 'toggleConversationView':
      handlers.toggleConversationView(message.conversationId);
      break;
    default:
      break;
  }
}
