import * as assert from 'assert';
import type { GeminiSuggestion } from '../../gemini/geminiService';
import {
  buildUsageStatsMarkup,
  buildEmptyStateMarkup,
  buildHeaderMarkup,
  buildContentMarkup
} from '../../gemini/fullPage/content';
import { geminiService } from '../../gemini/geminiService';

suite('Gemini Full Page Content Helpers', () => {
  const originalGetUsageStats = geminiService.getUsageStats;

  teardown(() => {
    geminiService.getUsageStats = originalGetUsageStats;
  });

  function createSuggestion(overrides: Partial<GeminiSuggestion> = {}): GeminiSuggestion {
    return {
      id: 'suggestion-id',
      issue: 'Example issue',
      suggestion: 'Detailed guidance',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      status: 'success',
      ...overrides
    } as GeminiSuggestion;
  }

  suite('buildUsageStatsMarkup', () => {
    test('omits usage stats when Gemini is not configured', () => {
      geminiService.getUsageStats = () => ({ requests: 5, errors: 0, successRate: 100 });

      const markup = buildUsageStatsMarkup([createSuggestion()], false);
      assert.strictEqual(markup, '', 'expected usage stats to be omitted when Gemini is disabled');
    });

    test('omits usage stats when there are no suggestions', () => {
      geminiService.getUsageStats = () => ({ requests: 10, errors: 2, successRate: 80 });

      const markup = buildUsageStatsMarkup([], true);
      assert.strictEqual(markup, '', 'expected usage stats to be omitted when no suggestions exist');
    });

    test('renders stats including average rating when available', () => {
      geminiService.getUsageStats = () => ({ requests: 12, errors: 3, successRate: 75 });

      const suggestions: GeminiSuggestion[] = [
        createSuggestion({ rating: 5 }),
        createSuggestion({ rating: 4 })
      ];

      const markup = buildUsageStatsMarkup(suggestions, true);

      assert.ok(markup.includes('usage-stats-large'), 'expected usage stats container');
      assert.ok(markup.includes('12'), 'expected request count');
      assert.ok(markup.includes('75%'), 'expected success rate percentage');
      assert.ok(markup.includes('4.5'), 'expected average rating rounded to one decimal place');
    });

    test('excludes rating section when no ratings exist', () => {
      geminiService.getUsageStats = () => ({ requests: 2, errors: 1, successRate: 50 });

      const suggestions: GeminiSuggestion[] = [
        createSuggestion({ rating: undefined }),
        createSuggestion({ rating: undefined })
      ];

      const markup = buildUsageStatsMarkup(suggestions, true);

      assert.ok(markup.includes('usage-stats-large'), 'expected usage stats container');
      assert.ok(!markup.includes('Avg Rating'), 'expected rating section to be skipped without ratings');
    });
  });

  suite('buildEmptyStateMarkup', () => {
    test('returns onboarding message when configured but empty', () => {
      const markup = buildEmptyStateMarkup({
        totalCount: 0,
        isGeminiConfigured: true,
        searchDisplayValue: ''
      });

      assert.ok(markup.includes('No suggestions yet'), 'expected onboarding empty state');
      assert.ok(!markup.includes('Open Settings'), 'expected settings CTA to be absent');
    });

    test('returns configuration call-to-action when Gemini is not configured', () => {
      const markup = buildEmptyStateMarkup({
        totalCount: 0,
        isGeminiConfigured: false,
        searchDisplayValue: ''
      });

      assert.ok(markup.includes('Gemini not configured'), 'expected configuration empty state');
      assert.ok(markup.includes('Open Settings'), 'expected settings CTA to be present');
    });

    test('escapes search term when no results match', () => {
      const markup = buildEmptyStateMarkup({
        totalCount: 3,
        isGeminiConfigured: true,
        searchDisplayValue: '<script>alert(1)</script>'
      });

      assert.ok(markup.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'expected search term to be escaped');
      assert.ok(!markup.includes('<script>alert(1)</script>'), 'expected raw search term to be absent');
    });
  });

  suite('buildHeaderMarkup', () => {
    test('includes count badge and search summary for active filters', () => {
      const markup = buildHeaderMarkup({
        filteredCount: 2,
        totalCount: 5,
        searchDisplayValue: 'baseline <update>',
        isGeminiConfigured: true,
        usageStatsMarkup: '<div id="stats"></div>'
      });

      assert.ok(markup.includes('count-badge'), 'expected count badge to be rendered');
      assert.ok(markup.includes('Showing 2 of 5 suggestions'), 'expected search summary to reflect counts');
      assert.ok(markup.includes('&lt;update&gt;'), 'expected search term to be escaped');
      assert.ok(markup.includes('<div id="stats"></div>'), 'expected usage stats markup to be injected');
    });

    test('renders Configure Gemini button when not configured', () => {
      const markup = buildHeaderMarkup({
        filteredCount: 0,
        totalCount: 4,
        searchDisplayValue: '',
        isGeminiConfigured: false,
        usageStatsMarkup: ''
      });

      assert.ok(markup.includes('Configure Gemini'), 'expected configuration button in header');
      assert.ok(!markup.includes('data-action="clear-all"'), 'expected clear all action to be absent when not configured');
    });
  });

  suite('buildContentMarkup', () => {
    test('renders suggestions grid when suggestions are present', () => {
      const markup = buildContentMarkup({
        hasSuggestions: true,
        suggestionsMarkup: '<article>Suggestion</article>',
        emptyStateMarkup: '<div>No results</div>'
      });

      assert.ok(markup.includes('suggestions-grid'), 'expected suggestions grid to render');
      assert.ok(markup.includes('<article>Suggestion</article>'), 'expected suggestion markup to be included');
      assert.ok(!markup.includes('No results'), 'expected empty state to be omitted');
    });

    test('renders empty state when no suggestions exist', () => {
      const markup = buildContentMarkup({
        hasSuggestions: false,
        suggestionsMarkup: '<article>Suggestion</article>',
        emptyStateMarkup: '<div>No results</div>'
      });

      assert.ok(!markup.includes('suggestions-grid'), 'expected suggestions grid to be omitted');
      assert.ok(markup.includes('<div>No results</div>'), 'expected empty state markup to be rendered');
    });
  });
});
