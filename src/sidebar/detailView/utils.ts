import type { GeminiSuggestion } from "../../gemini/geminiService";
import { escapeHtml, generateNonce, formatTimestamp, getRelativePath } from "../../utils";
import { renderSimpleMarkdown as renderSimpleMarkdownUtil } from "../../utils/markdownRenderer";

/**
 * Utility functions for the detail view
 */
export class DetailViewUtils {
  
  /**
   * Escape HTML characters to prevent XSS
   */
  public static escapeHtml(text: string): string {
    return escapeHtml(text);
  }

  /**
   * Render simple markdown to HTML
   */
  public static renderSimpleMarkdown(text: string): string {
    return renderSimpleMarkdownUtil(text);
  }

  /**
   * Render existing chat messages for display with SVG icons
   */
  public static renderExistingChatMessages(suggestions: GeminiSuggestion[]): string {
    if (suggestions.length === 0) {
      return `
        <div class="chat-history-empty">
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p>No previous conversations</p>
            <small>Start by asking a question about this issue</small>
          </div>
        </div>
      `;
    }

    const userAvatarSvg = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    `;

    const aiAvatarSvg = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.663 17h4.673M12 3l1.735 3.013 3.408.494-2.463 2.401.582 3.392L12 10.695 8.738 12.3l.582-3.392-2.463-2.401 3.408-.494L12 3z"></path>
      </svg>
    `;

    let allMessages = `
      <div class="chat-history-header">
        <h4>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Previous Conversations
        </h4>
        <small>${suggestions.length} message${suggestions.length > 1 ? 's' : ''}</small>
      </div>
    `;

    suggestions.forEach((suggestion, index) => {
      // Check if this is a user-only message (status 'user' with no AI response yet)
      if ((suggestion as any).status === 'user' && !suggestion.suggestion) {
        // Only show user message for user-only entries
        allMessages += `
          <div class="chat-message user-message">
            <div class="message-avatar">
              <div class="avatar-icon user-avatar">
                ${userAvatarSvg}
              </div>
            </div>
            <div class="message-content">
              <div class="message-text">${this.escapeHtml(suggestion.issue)}</div>
              <div class="message-time">${this.formatTimestamp(suggestion.timestamp)}</div>
            </div>
          </div>
        `;
      } else {
        // Regular suggestion with both user question and AI response
        // Add user question
        allMessages += `
          <div class="chat-message user-message">
            <div class="message-avatar">
              <div class="avatar-icon user-avatar">
                ${userAvatarSvg}
              </div>
            </div>
            <div class="message-content">
              <div class="message-text">${this.escapeHtml(suggestion.issue)}</div>
              <div class="message-time">${this.formatTimestamp(suggestion.timestamp)}</div>
            </div>
          </div>
        `;

        // Add AI response
        allMessages += `
          <div class="chat-message ai-message">
            <div class="message-avatar">
              <div class="avatar-icon ai-avatar">
                ${aiAvatarSvg}
              </div>
            </div>
            <div class="message-content">
              <div class="message-text">${this.renderSimpleMarkdown(suggestion.suggestion)}</div>
              <div class="message-time">${this.formatTimestamp(suggestion.timestamp)}</div>
            </div>
          </div>
        `;
      }
    });

    return allMessages;
  }

  /**
   * Generate a cryptographically secure nonce for CSP
   */
  public static generateNonce(): string {
    return generateNonce();
  }

  /**
   * Get relative path for display
   */
  public static getRelativePath(uri: string, workspaceFolder?: string): string {
    return getRelativePath(uri, workspaceFolder);
  }

  /**
   * Format timestamp for display
   */
  public static formatTimestamp(timestamp: Date): string {
    return formatTimestamp(timestamp);
  }

  /**
   * Sanitize string for use as HTML attribute
   */
  public static sanitizeAttribute(value: string): string {
    return value.replace(/['"<>&]/g, '');
  }

  /**
   * Check if a URL is valid
   */
  public static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Truncate text to specified length
   */
  public static truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - suffix.length) + suffix;
  }
}