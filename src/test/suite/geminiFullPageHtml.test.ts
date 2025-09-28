import * as assert from 'assert';
import type { Webview } from 'vscode';
import { buildGeminiFullPageHtml } from '../../gemini/geminiFullPageHtml';
import type { GeminiSuggestionState } from '../../gemini/types';
import type { GeminiSuggestion } from '../../gemini/geminiService';
import { geminiService } from '../../gemini/geminiService';

suite('Gemini Full Page HTML', () => {
  const webview = { cspSource: 'vscode-resource:test' } as unknown as Webview;
  const originalGetUsageStats = geminiService.getUsageStats;

  teardown(() => {
    geminiService.getUsageStats = originalGetUsageStats;
  });

  function createSuggestion(overrides: Partial<GeminiSuggestion> = {}): GeminiSuggestion {
    return {
      id: 'suggestion-1',
      issue: 'Example issue description',
      suggestion: 'Proposed fix details',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      status: 'success',
      feature: 'example-feature',
      ...overrides
    } as GeminiSuggestion;
  }

  test('renders suggestions grid when suggestions are available', () => {
    geminiService.getUsageStats = () => ({ requests: 42, errors: 2, successRate: 95.5 });

    const suggestions: GeminiSuggestion[] = [
      createSuggestion({ id: 'suggestion-1', feature: 'feature-one' }),
      createSuggestion({ id: 'suggestion-2', feature: 'feature-two', status: 'pending' })
    ];

    const state: GeminiSuggestionState = {
      suggestions,
      filteredSuggestions: suggestions,
      searchQuery: '',
      originalSearchQuery: ''
    };

    const html = buildGeminiFullPageHtml({
      webview,
      state,
      isGeminiConfigured: true
    });

    assert.ok(html.includes('suggestions-grid'), 'expected suggestions grid container to be rendered');
    assert.ok(html.includes('suggestion-1'), 'expected first suggestion id in markup');
    assert.ok(html.includes('suggestion-2'), 'expected second suggestion id in markup');
    assert.ok(html.includes('usage-stats-large'), 'expected usage stats section to be rendered');
    assert.ok(html.includes('42'), 'expected request count from usage stats to be rendered');
  });

  test('renders configuration empty state when Gemini is not configured', () => {
    geminiService.getUsageStats = () => ({ requests: 0, errors: 0, successRate: 0 });

    const state: GeminiSuggestionState = {
      suggestions: [],
      filteredSuggestions: [],
      searchQuery: '',
      originalSearchQuery: ''
    };

    const html = buildGeminiFullPageHtml({
      webview,
      state,
      isGeminiConfigured: false
    });

    assert.ok(html.includes('Gemini not configured'), 'expected not-configured empty state message');
    assert.ok(html.includes('Open Settings'), 'expected settings action button within empty state');
    assert.ok(!html.includes('<div class="usage-stats-large">'), 'expected usage stats section to be omitted');
  });

  test('renders search empty state with sanitized search term when results are filtered out', () => {
    geminiService.getUsageStats = () => ({ requests: 12, errors: 1, successRate: 91.67 });

    const suggestions: GeminiSuggestion[] = [
      createSuggestion({ id: 'suggestion-available' })
    ];

    const maliciousQuery = '<script>alert(1)</script>';
    const state: GeminiSuggestionState = {
      suggestions,
      filteredSuggestions: [],
      searchQuery: maliciousQuery,
      originalSearchQuery: maliciousQuery
    };

    const html = buildGeminiFullPageHtml({
      webview,
      state,
      isGeminiConfigured: true
    });

    assert.ok(html.includes('No suggestions match your search'), 'expected search empty state message');
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'expected search term to be HTML-escaped');
    assert.ok(html.includes('data-action="clear-search"'), 'expected clear search action to be present');
    assert.ok(!html.includes('<script>alert(1)</script>'), 'expected raw search term to be escaped in HTML output');
    assert.ok(html.includes('\\u003Cscript\\u003Ealert(1)\\u003C/script\\u003E'), 'expected initial state payload to escape script tags');
  });
});
