import type { GeminiSuggestion } from './geminiService';
import { escapeHtml, formatTimestamp, getFileName, highlightHtml, highlightText } from './utils';
import { renderMarkdown as renderMarkdownUtil } from '../utils/markdownRenderer';

export function renderSuggestionCard(suggestion: GeminiSuggestion, searchTerm: string): string {
  const suggestionId = escapeHtml(suggestion.id);
  const { display, iso } = formatTimestamp(suggestion.timestamp);
  const safeDisplay = escapeHtml(display);
  const timestampHtml = iso
    ? `<time class="timestamp" datetime="${escapeHtml(iso)}" title="${safeDisplay}">${safeDisplay}</time>`
    : `<span class="timestamp" title="${safeDisplay}">${safeDisplay}</span>`;

  const featureChip = suggestion.feature
    ? `<span class="chip chip-feature">${highlightText(suggestion.feature, searchTerm)}</span>`
    : '';
  const filePath = suggestion.file ?? '';
  const fileName = filePath ? getFileName(filePath) : '';
  const fileChip = filePath
    ? `<button type="button" class="chip chip-link" data-action="open-file" data-file-path="${escapeHtml(filePath)}" title="Open ${escapeHtml(filePath)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
        </svg>
        ${highlightText(fileName, searchTerm)}
      </button>`
    : '';
  const metadataChips = [featureChip, fileChip].filter(Boolean).join('');
  const metadataMarkup = metadataChips || `<span class="chip">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9.663 17h4.673M12 3l1.735 3.013 3.408.494-2.463 2.401.582 3.392L12 10.695 8.738 12.3l.582-3.392-2.463-2.401 3.408-.494L12 3z"></path>
    </svg>
    Gemini
  </span>`;

  const findingButton = suggestion.findingId
    ? `<button type="button" class="link-button" data-action="go-to-finding" data-finding-id="${escapeHtml(suggestion.findingId)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        Go to finding
      </button>`
    : '';

  // Status indicator
  const statusClass = suggestion.status === 'error' ? 'status-error' : suggestion.status === 'pending' ? 'status-pending' : 'status-success';
  const statusIcon = suggestion.status === 'error'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
    : suggestion.status === 'pending'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline></svg>`;

  // Tags
  const tagsMarkup = suggestion.tags && suggestion.tags.length > 0
    ? `<div class="tags">${suggestion.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';

  // Rating stars
  const ratingMarkup = `
    <div class="rating">
      <span class="rating-label">Rate:</span>
      ${[1, 2, 3, 4, 5].map(star => 
        `<button type="button" class="star ${suggestion.rating && suggestion.rating >= star ? 'star-filled' : ''}" 
                data-action="rate" data-suggestion-id="${suggestionId}" data-rating="${star}" 
                title="Rate ${star} star${star > 1 ? 's' : ''}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${suggestion.rating && suggestion.rating >= star ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
                </svg>
              </button>`
      ).join('')}
    </div>`;

  // Performance metrics
  const metricsMarkup = suggestion.responseTime || suggestion.tokensUsed
    ? `<div class="metrics">
        ${suggestion.responseTime ? `<span class="metric" title="Response time">${suggestion.responseTime}ms</span>` : ''}
        ${suggestion.tokensUsed ? `<span class="metric" title="Tokens used">${suggestion.tokensUsed} tokens</span>` : ''}
       </div>`
    : '';

  return `
        <article class="suggestion-item ${statusClass}" data-suggestion-id="${suggestionId}">
            <header class="suggestion-header">
                <div class="metadata">
                    <span class="status-indicator" title="Status: ${suggestion.status}">${statusIcon}</span>
                    ${metadataMarkup}
                </div>
                <div class="header-buttons">
                    ${timestampHtml}
                    <button type="button" class="icon-btn" data-action="retry" data-suggestion-id="${suggestionId}" title="Retry suggestion">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                        </svg>
                    </button>
                    <button type="button" class="icon-btn" data-action="copy" data-suggestion-id="${suggestionId}" title="Copy suggestion to clipboard">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button type="button" class="icon-btn remove-btn" data-action="remove" data-suggestion-id="${suggestionId}" title="Remove suggestion">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </header>
            <div class="suggestion-content">
                <div class="issue-section">
                    <h4 class="section-heading">
                        <svg class="section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Issue
                    </h4>
                    <div class="issue-text">${highlightText(suggestion.issue, searchTerm)}</div>
                    ${findingButton}
                </div>
                <div class="suggestion-section">
                    <h4 class="section-heading">
                        <svg class="section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9.663 17h4.673"></path>
                            <path d="M12 3l1.735 3.013 3.408.494-2.463 2.401.582 3.392L12 10.695 8.738 12.3l.582-3.392-2.463-2.401 3.408-.494L12 3z"></path>
                        </svg>
                        Gemini Suggestion
                    </h4>
                    <div class="suggestion-text">${renderMarkdown(suggestion.suggestion, searchTerm)}</div>
                </div>
                ${tagsMarkup}
                <footer class="suggestion-footer">
                    ${ratingMarkup}
                    <div class="suggestion-actions">
                        <button type="button" class="action-btn" data-action="follow-up" data-suggestion-id="${suggestionId}" title="Ask follow-up question">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            Follow-up
                        </button>
                        ${metricsMarkup}
                    </div>
                </footer>
            </div>
        </article>
    `;
}

export function renderMarkdown(text: string, query?: string): string {
  return renderMarkdownUtil(text, query);
}
