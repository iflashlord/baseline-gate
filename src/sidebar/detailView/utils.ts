import type { GeminiSuggestion } from "../../gemini/geminiService";

/**
 * Utility functions for the detail view
 */
export class DetailViewUtils {
  
  /**
   * Escape HTML characters to prevent XSS
   */
  public static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Render simple markdown to HTML
   */
  public static renderSimpleMarkdown(text: string): string {
    // Handle code blocks with copy functionality
    let formattedText = text.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
      const escapedCode = this.escapeHtml(codeContent.trim());
      return `
        <div class="code-block">
          <div class="code-header">
            <button class="copy-code-btn" onclick="copyCodeToClipboard(this)" data-code="${this.escapeHtml(codeContent.trim())}">
              📋 Copy
            </button>
          </div>
          <pre><code>${escapedCode}</code></pre>
        </div>
      `;
    });

    // Handle inline code
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Handle bold text
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle line breaks
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    return formattedText;
  }

  /**
   * Render existing chat messages for display
   */
  public static renderExistingChatMessages(suggestions: GeminiSuggestion[]): string {
    if (suggestions.length === 0) {
      return '';
    }

    const initialSuggestion = suggestions[0];
    const followUpSuggestions = suggestions.slice(1);

    let allMessages = `
      <div class="chat-message user-message">
        <div class="message-avatar">
          <div class="avatar-icon">👤</div>
        </div>
        <div class="message-content">
          <div class="message-text">${this.escapeHtml(initialSuggestion.issue)}</div>
          <div class="message-time">${initialSuggestion.timestamp.toLocaleString()}</div>
        </div>
      </div>
      
      <div class="chat-message ai-message">
        <div class="message-avatar">
          <div class="avatar-icon">✨</div>
        </div>
        <div class="message-content">
          <div class="message-text">${this.renderSimpleMarkdown(initialSuggestion.suggestion)}</div>
          <div class="message-time">${initialSuggestion.timestamp.toLocaleString()}</div>
        </div>
      </div>
    `;

    followUpSuggestions.forEach((suggestion) => {
      // Add user question (follow-up)
      allMessages += `
        <div class="chat-message user-message">
          <div class="message-avatar">
            <div class="avatar-icon">👤</div>
          </div>
          <div class="message-content">
            <div class="message-text">${this.escapeHtml(suggestion.issue)}</div>
            <div class="message-time">${suggestion.timestamp.toLocaleString()}</div>
          </div>
        </div>
      `;

      // Add AI response
      allMessages += `
        <div class="chat-message ai-message">
          <div class="message-avatar">
            <div class="avatar-icon">✨</div>
          </div>
          <div class="message-content">
            <div class="message-text">${this.renderSimpleMarkdown(suggestion.suggestion)}</div>
            <div class="message-time">${suggestion.timestamp.toLocaleString()}</div>
          </div>
        </div>
      `;
    });

    return allMessages;
  }

  /**
   * Generate a cryptographically secure nonce for CSP
   */
  public static generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Get relative path for display
   */
  public static getRelativePath(uri: string, workspaceFolder?: string): string {
    if (workspaceFolder) {
      return uri.replace(workspaceFolder, '').replace(/^[\/\\]/, '');
    }
    return uri.split('/').pop() || uri;
  }

  /**
   * Format timestamp for display
   */
  public static formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleString();
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