import type { GeminiSuggestion } from '../geminiService';
import { geminiService } from '../geminiService';
import { renderSuggestionCard } from '../dataTransform';
import { escapeHtml } from '../utils';

export function buildSuggestionsMarkup(suggestions: GeminiSuggestion[], searchTerm: string): string {
  return suggestions
    .map((suggestion, index) => {
      const card = renderSuggestionCard(suggestion, searchTerm);
      const separator = index < suggestions.length - 1 ? '<div class="section-separator"></div>' : '';
      return card + separator;
    })
    .join('');
}

interface EmptyStateParams {
  totalCount: number;
  isGeminiConfigured: boolean;
  searchDisplayValue: string;
}

export function buildEmptyStateMarkup({ totalCount, isGeminiConfigured, searchDisplayValue }: EmptyStateParams): string {
  if (totalCount === 0) {
    if (isGeminiConfigured) {
      return '<div class="empty-state-large"><div class="empty-icon">🤖</div><h2>No suggestions yet</h2><p>Use "Fix with Gemini" on hover tooltips or in the analysis view to start getting AI-powered suggestions for your baseline compatibility issues.</p></div>';
    }

    return '<div class="empty-state-large"><div class="empty-icon">⚠️</div><h2>Gemini not configured</h2><p>Configure your Gemini API key in the settings to start getting AI-powered suggestions.</p><button type="button" class="primary-button" data-action="open-settings">Open Settings</button></div>';
  }

  const escapedQuery = escapeHtml(searchDisplayValue);
  return `<div class="empty-state-large"><div class="empty-icon">🔍</div><h2>No suggestions match your search</h2><p>No suggestions match <strong>"${escapedQuery}"</strong></p><button type="button" class="primary-button" data-action="clear-search">Clear search</button></div>`;
}

export function buildUsageStatsMarkup(suggestions: GeminiSuggestion[], isGeminiConfigured: boolean): string {
  const totalCount = suggestions.length;

  if (!isGeminiConfigured || totalCount === 0) {
    return '';
  }

  const stats = geminiService.getUsageStats();
  const ratedSuggestions = suggestions.filter(suggestion => suggestion.rating);
  const avgRating = ratedSuggestions.reduce((sum, suggestion) => sum + (suggestion.rating || 0), 0) / Math.max(1, ratedSuggestions.length);

  const ratingMarkup = avgRating > 0
    ? `
        <div class="stat-item">
          <span class="stat-number">${avgRating.toFixed(1)}</span>
          <span class="stat-label">Avg Rating</span>
        </div>
        `
    : '';

  return `
        <div class="usage-stats-large">
        <div class="stat-item">
          <span class="stat-number">${stats.requests}</span>
          <span class="stat-label">Requests</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${stats.successRate}%</span>
          <span class="stat-label">Success Rate</span>
        </div>
        ${ratingMarkup}
       </div>`;
}

interface HeaderParams {
  filteredCount: number;
  totalCount: number;
  searchDisplayValue: string;
  isGeminiConfigured: boolean;
  usageStatsMarkup: string;
}

export function buildHeaderMarkup({
  filteredCount,
  totalCount,
  searchDisplayValue,
  isGeminiConfigured,
  usageStatsMarkup
}: HeaderParams): string {
  const countBadge = filteredCount > 0
    ? `<span class="count-badge">${filteredCount}${totalCount !== filteredCount ? ` of ${totalCount}` : ''}</span>`
    : '';

  const actionButtons = [
    isGeminiConfigured && totalCount > 0
      ? `<button type="button" class="icon-button" title="Export conversation" data-action="export-conversation">📤</button>
                    <button type="button" class="secondary-button" data-action="clear-all">Clear All</button>`
      : '',
    !isGeminiConfigured
      ? `<button type="button" class="primary-button" data-action="open-settings">Configure Gemini</button>`
      : ''
  ].filter(Boolean).join('\n                    ');

  const searchSection = totalCount > 0
    ? `<div class="header-search">
                <div class="search-box">
                    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input 
                        type="text" 
                        class="search-input" 
                        placeholder="Search by feature, file, issue, tag, status, finding ID..." 
                        title="Enhanced search: searches across all suggestion properties including tags, metadata, and file paths"
                        value="${escapeHtml(searchDisplayValue)}"
                        id="searchInput"
                    >
                    <button class="search-button" data-action="perform-search" title="Search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                    </button>
                </div>
                ${searchDisplayValue ? `
                <div class="search-results-info">
                    <small>Showing ${filteredCount} of ${totalCount} suggestions</small>
                </div>
                ` : ''}
            </div>`
    : '';

  return `<div class="full-view-header">
            <div class="header-main">
                <div class="header-left">
                    <div class="header-title">
                        <div class="gemini-icon">✨</div>
                        <h1>Gemini Suggestions</h1>
                        ${countBadge}
                    </div>
                </div>
                <div class="header-actions">
                    ${actionButtons}
                </div>
            </div>
            
            ${searchSection}
            
            ${usageStatsMarkup}
        </div>`;
}

interface ContentParams {
  hasSuggestions: boolean;
  suggestionsMarkup: string;
  emptyStateMarkup: string;
}

export function buildContentMarkup({
  hasSuggestions,
  suggestionsMarkup,
  emptyStateMarkup
}: ContentParams): string {
  return `<div class="full-view-content">
            ${hasSuggestions ? `
            <div class="suggestions-grid">
                ${suggestionsMarkup}
            </div>
            ` : emptyStateMarkup}
        </div>`;
}
