import MarkdownIt from 'markdown-it';
import { escapeHtml } from './formatUtils';

/**
 * Configure markdown-it instance with custom renderer rules
 */
const md = new MarkdownIt({
  html: false, // Disable HTML tags for security
  xhtmlOut: true,
  breaks: true,
  linkify: true,
  typographer: false
});

// Custom renderer for code blocks to include copy button
md.renderer.rules.code_block = (tokens, idx) => {
  const token = tokens[idx];
  const code = escapeHtml(token.content);
  
  return [
    '<div class="code-block" data-code-block>',
    '<pre><code>',
    code,
    '</code></pre>',
    '<button type="button" class="code-copy-btn" data-action="copy-code" aria-label="Copy code snippet" title="Copy code snippet">',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>',
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
    '</svg>',
    '</button>',
    '</div>'
  ].join('');
};

// Custom renderer for fenced code blocks (```)
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const code = escapeHtml(token.content);
  const language = token.info ? ` class="language-${escapeHtml(token.info)}"` : '';
  
  return [
    '<div class="code-block" data-code-block>',
    `<pre><code${language}>`,
    code,
    '</code></pre>',
    '<button type="button" class="code-copy-btn" data-action="copy-code" aria-label="Copy code snippet" title="Copy code snippet">',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>',
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
    '</svg>',
    '</button>',
    '</div>'
  ].join('');
};

// Custom renderer for inline code
md.renderer.rules.code_inline = (tokens, idx) => {
  const token = tokens[idx];
  return `<code>${escapeHtml(token.content)}</code>`;
};

// Custom renderer for links (security)
md.renderer.rules.link_open = (tokens, idx) => {
  const token = tokens[idx];
  const hrefAttr = token.attrGet('href');
  
  if (!hrefAttr) {
    return '<span>'; // Fallback if no href
  }
  
  // Only allow http/https links for security
  if (hrefAttr.startsWith('http://') || hrefAttr.startsWith('https://')) {
    const escapedHref = escapeHtml(hrefAttr);
    return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer">`;
  }
  
  return '<span>'; // Convert unsafe links to spans
};

md.renderer.rules.link_close = (tokens, idx) => {
  // Find the matching link_open token by traversing backwards
  let level = 1;
  for (let i = idx - 1; i >= 0; i--) {
    if (tokens[i].type === 'link_close') {
      level++;
    } else if (tokens[i].type === 'link_open') {
      level--;
      if (level === 0) {
        const hrefAttr = tokens[i].attrGet('href');
        if (hrefAttr && (hrefAttr.startsWith('http://') || hrefAttr.startsWith('https://'))) {
          return '</a>';
        }
        return '</span>';
      }
    }
  }
  
  return '</span>';
};

/**
 * Converts Markdown to HTML with syntax highlighting for search terms
 * @param text The markdown text to convert
 * @param searchTerm Optional search term to highlight in the output
 * @returns HTML string
 */
export function renderMarkdown(text: string, searchTerm?: string): string {
  try {
    let html = md.render(text);
    
    // Apply search highlighting if provided
    if (searchTerm && searchTerm.trim()) {
      html = highlightSearchTerm(html, searchTerm);
    }
    
    return html;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    // Fallback to escaped text
    return `<p>${escapeHtml(text)}</p>`;
  }
}

/**
 * Renders simple markdown (subset) for cases where full markdown is not needed
 * @param text The markdown text to convert  
 * @param searchTerm Optional search term to highlight in the output
 * @returns HTML string
 */
export function renderSimpleMarkdown(text: string, searchTerm?: string): string {
  try {
    // For simple markdown, we'll use the same markdown-it instance
    let html = md.render(text);
    
    // Apply search highlighting if provided
    if (searchTerm && searchTerm.trim()) {
      html = highlightSearchTerm(html, searchTerm);
    }
    
    return html;
  } catch (error) {
    console.error('Error rendering simple markdown:', error);
    // Fallback to escaped text with basic formatting
    let html = escapeHtml(text);
    
    // Apply basic formatting as fallback
    html = html
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    
    if (searchTerm && searchTerm.trim()) {
      html = highlightSearchTerm(html, searchTerm);
    }
    
    return html;
  }
}

/**
 * Highlights search terms in HTML content
 * @param html The HTML content to search in
 * @param searchTerm The term to highlight
 * @returns HTML with highlighted search terms
 */
function highlightSearchTerm(html: string, searchTerm: string): string {
  if (!searchTerm || !searchTerm.trim()) {
    return html;
  }
  
  // Create a case-insensitive regex to find the search term
  // Avoid highlighting inside HTML tags
  const regex = new RegExp(`(?<!<[^>]*)(${escapeRegex(searchTerm)})(?![^<]*>)`, 'gi');
  
  return html.replace(regex, '<span class="search-highlight">$1</span>');
}

/**
 * Escapes special regex characters
 * @param text Text to escape
 * @returns Escaped text
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Formats markdown for use in webview contexts (strips dangerous HTML)
 * @param text The markdown text to format
 * @param searchTerm Optional search term to highlight
 * @returns Safe HTML string
 */
export function formatMarkdownForWebview(text: string, searchTerm?: string): string {
  return renderMarkdown(text, searchTerm);
}

/**
 * Export function for Gemini responses (maintains backward compatibility)
 * @param text The markdown text from Gemini
 * @param searchTerm Optional search term to highlight  
 * @returns HTML string
 */
export function formatGeminiResponse(text: string, searchTerm?: string): string {
  return renderMarkdown(text, searchTerm);
}