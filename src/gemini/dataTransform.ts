import type { GeminiSuggestion } from './geminiService';
import { escapeHtml, formatTimestamp, getFileName, highlightHtml, highlightText } from './utils';

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
    ? `<button type="button" class="chip chip-link" data-action="open-file" data-file-path="${escapeHtml(filePath)}" title="Open ${escapeHtml(filePath)}">📄 ${highlightText(fileName, searchTerm)}</button>`
    : '';
  const metadataChips = [featureChip, fileChip].filter(Boolean).join('');
  const metadataMarkup = metadataChips || '<span class="chip">Gemini</span>';

  const findingButton = suggestion.findingId
    ? `<button type="button" class="link-button" data-action="go-to-finding" data-finding-id="${escapeHtml(suggestion.findingId)}">📍 Go to finding</button>`
    : '';

  return `
        <article class="suggestion-item" data-suggestion-id="${suggestionId}">
            <header class="suggestion-header">
                <div class="metadata">
                    ${metadataMarkup}
                </div>
                <div class="header-buttons">
                    ${timestampHtml}
                    <button type="button" class="icon-btn" data-action="copy" data-suggestion-id="${suggestionId}" title="Copy suggestion to clipboard">📋</button>
                    <button type="button" class="icon-btn remove-btn" data-action="remove" data-suggestion-id="${suggestionId}" title="Remove suggestion">✕</button>
                </div>
            </header>
            <div class="suggestion-content">
                <div class="issue-section">
                    <h4>Issue</h4>
                    <div class="issue-text">${highlightText(suggestion.issue, searchTerm)}</div>
                    ${findingButton}
                </div>
                <div class="suggestion-section">
                    <h4>Gemini Suggestion</h4>
                    <div class="suggestion-text">${renderMarkdown(suggestion.suggestion, searchTerm)}</div>
                </div>
            </div>
        </article>
    `;
}

export function renderMarkdown(text: string, query?: string): string {
  // Simple markdown to HTML converter for basic formatting
  let html = escapeHtml(text);

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_match, codeContent: string) => {
    return [
      '<div class="code-block" data-code-block>',
      '<pre><code>',
      codeContent,
      '</code></pre>',
      '<button type="button" class="code-copy-btn" data-action="copy-code" aria-label="Copy code snippet" title="Copy code snippet">📋</button>',
      '</div>'
    ].join('');
  });
  html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');

  // Lists
  html = html.replace(/^[\s]*[-*+] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Numbered lists
  html = html.replace(/^[\s]*\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, (match) => {
    if (match.includes('<ul>')) {
      return match;
    }
    return '<ol>' + match + '</ol>';
  });

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraphs
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol') && !html.startsWith('<pre')) {
    html = '<p>' + html + '</p>';
  }

  return highlightHtml(html, query);
}
