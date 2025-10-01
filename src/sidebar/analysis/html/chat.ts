import * as vscode from "vscode";

import type { Target } from "../../../core/targets";
import type { BaselineFinding } from "../../workspaceScanner";
import type { GeminiSuggestion } from "../../../gemini/geminiService";
import { escapeAttribute, escapeHtml } from "../utils";
import { renderSimpleMarkdown } from "../../../utils/markdownRenderer";

export function renderExistingSuggestions(suggestions: GeminiSuggestion[]): string {
  if (suggestions.length === 0) {
    return "";
  }

  const suggestionsHtml = suggestions
    .map(
      (suggestion) => `
      <div class="existing-suggestion">
        <div class="existing-suggestion-header">
          <span class="gemini-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
          <span class="suggestion-timestamp">${suggestion.timestamp.toLocaleString()}</span>
        </div>
        <div class="existing-suggestion-content">${renderSimpleMarkdown(suggestion.suggestion)}</div>
      </div>
    `
    )
    .join("");

  return `
      <div class="detail-section existing-suggestions-section">
        <h4>Previous Gemini Suggestions (${suggestions.length})</h4>
        ${suggestionsHtml}
      </div>
    `;
}

export function renderGeminiChatInterface(
  finding: BaselineFinding,
  target: Target,
  suggestions: GeminiSuggestion[]
): string {
  if (suggestions.length === 0) {
    return '';
  }

  const contextInfo = `
    <div class="chat-context-section">
      <button class="chat-context-toggle" data-expanded="false">
        <div class="context-header">
          <span class="context-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span> 
          <span class="context-title">Context</span>
          <span class="context-toggle-icon">▶</span>
        </div>
      </button>
      <div class="chat-context-details" style="display: none;">
        <div class="context-grid">
          <div class="context-item">
            <span class="context-label">Target:</span>
            <span class="context-value">${escapeHtml(target)} baseline</span>
          </div>
          <div class="context-item">
            <span class="context-label">Feature:</span>
            <span class="context-value">${escapeHtml(finding.feature.name)}</span>
          </div>
          <div class="context-item">
            <span class="context-label">File:</span>
            <span class="context-value">${escapeHtml(vscode.workspace.asRelativePath(finding.uri, false))}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const conversationHistory = `
    <div class="chat-conversation">
      <div class="chat-messages-container" id="chat-messages-container">
        <div class="chat-messages" id="chat-messages">
          ${renderAllMessages(suggestions)}
        </div>
        <div class="typing-indicator" id="typing-indicator" style="display: none;">
          <div class="chat-message ai-message">
            <div class="message-avatar">
              <div class="avatar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
            </div>
            <div class="message-content">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const chatInputArea = `
    <div class="chat-input-container">
      <div class="chat-input-wrapper">
        <textarea 
          class="chat-input" 
          placeholder="Message Gemini..."
          rows="1"
          data-finding-id="${escapeAttribute(finding.id)}"
          data-feature-id="${escapeAttribute(finding.feature.id)}"
          data-feature-name="${escapeAttribute(finding.feature.name)}"
          data-file-path="${escapeAttribute(vscode.workspace.asRelativePath(finding.uri, false))}"
          data-target="${escapeAttribute(target)}"
        ></textarea>
        <button class="chat-send-button" disabled>
          <svg class="send-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
          </svg>
        </button>
      </div>
      <div class="chat-input-footer">
        <small>Press Enter to send • Shift+Enter for new line</small>
      </div>
    </div>
  `;

  return `
    <div class="detail-section gemini-chat-section">
      <div class="chat-header">
        <div class="chat-title">
          <div class="title-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
          <h4>Gemini</h4>
        </div>
      </div>
      ${contextInfo}
      <div class="chat-content-area">
        ${conversationHistory}
      </div>
      ${chatInputArea}
    </div>
  `;
}

function renderAllMessages(suggestions: GeminiSuggestion[]): string {
  const sortedSuggestions = [...suggestions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  let allMessages = '';

  sortedSuggestions.forEach((suggestion) => {
    const isFollowUp = suggestion.issue.includes('Follow-up question about') || suggestion.issue.includes('Context: This is a follow-up');
    
    if (isFollowUp) {
      const questionMatch = suggestion.issue.match(/Follow-up question about.*?: (.+?)(?:\n\nContext:|$)/s);
      const actualQuestion = questionMatch ? questionMatch[1].trim() : suggestion.issue;
      
      allMessages += `
        <div class="chat-message user-message">
          <div class="message-avatar">
            <div class="avatar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M4 21v-2a4 4 0 0 1 3-3.87"/><circle cx="12" cy="7" r="4"/></svg></div>
          </div>
          <div class="message-content">
            <div class="message-text">${escapeHtml(actualQuestion)}</div>
            <div class="message-time">${suggestion.timestamp.toLocaleString()}</div>
          </div>
        </div>
        
        <div class="chat-message ai-message">
          <div class="message-avatar">
            <div class="avatar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
          </div>
          <div class="message-content">
            <div class="message-text">${renderSimpleMarkdown(suggestion.suggestion)}</div>
            <div class="message-time">${suggestion.timestamp.toLocaleString()}</div>
          </div>
        </div>
      `;
    } else {
      allMessages += `
        <div class="chat-message user-message">
          <div class="message-avatar">
            <div class="avatar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M4 21v-2a4 4 0 0 1 3-3.87"/><circle cx="12" cy="7" r="4"/></svg></div>
          </div>
          <div class="message-content">
            <div class="message-text">${escapeHtml(suggestion.issue)}</div>
            <div class="message-time">${suggestion.timestamp.toLocaleString()}</div>
          </div>
        </div>
        
        <div class="chat-message ai-message">
          <div class="message-avatar">
            <div class="avatar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
          </div>
          <div class="message-content">
            <div class="message-text">${renderSimpleMarkdown(suggestion.suggestion)}</div>
            <div class="message-time">${suggestion.timestamp.toLocaleString()}</div>
          </div>
        </div>
      `;
    }
  });

  return allMessages;
}
