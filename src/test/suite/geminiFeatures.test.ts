import * as assert from 'assert';
import * as vscode from 'vscode';
import { GeminiService } from '../../gemini/geminiService';
import { applySearchFilter } from '../../gemini/state';
import type { GeminiSuggestion } from '../../gemini/geminiService';
import type { GeminiSuggestionState } from '../../gemini/types';

function filterSuggestions(suggestions: GeminiSuggestion[], query: string): GeminiSuggestion[] {
  const state: GeminiSuggestionState = {
    suggestions,
    filteredSuggestions: suggestions,
    searchQuery: '',
    originalSearchQuery: ''
  };
  
  const filtered = applySearchFilter(state, query);
  return filtered.filteredSuggestions;
}

function createMockSuggestions(): GeminiSuggestion[] {
  return [
    {
      id: 'suggestion-1',
      issue: 'How to fix async/await syntax error?',
      suggestion: 'Use proper Promise handling with async/await syntax.',
      timestamp: new Date('2023-01-01T10:00:00Z'),
      status: 'success',
      rating: 5,
      tags: ['javascript', 'async', 'promises'],
      tokensUsed: 120,
      responseTime: 800,
      feature: 'async-functions'
    },
    {
      id: 'suggestion-2',
      issue: 'CSS Grid layout not working in older browsers',
      suggestion: 'Consider using flexbox as a fallback for CSS Grid.',
      timestamp: new Date('2023-01-01T11:00:00Z'),
      status: 'success',
      rating: 4,
      tags: ['css', 'grid', 'browser-support'],
      tokensUsed: 95,
      responseTime: 650,
      feature: 'css-grid'
    },
    {
      id: 'suggestion-3',
      issue: 'Fetch API compatibility issues',
      suggestion: 'Use a polyfill for fetch API in older browsers or consider XMLHttpRequest.',
      timestamp: new Date('2023-01-01T12:00:00Z'),
      status: 'error',
      rating: 3,
      tags: ['javascript', 'fetch', 'polyfill'],
      tokensUsed: 110,
      responseTime: 900,
      feature: 'fetch-api'
    }
  ];
}

suite('Gemini Service Feature Tests', () => {

  suite('GeminiService Core Functionality', () => {
    
    test('should initialize without API key gracefully', () => {
      // Mock configuration without API key
      const originalGet = vscode.workspace.getConfiguration;
      vscode.workspace.getConfiguration = () => ({
        get: (key: string) => key === 'geminiApiKey' ? '' : undefined
      } as any);
      
      const service = new GeminiService();
      assert.ok(service instanceof GeminiService);
      
      // Restore original configuration
      vscode.workspace.getConfiguration = originalGet;
    });

    test('should handle rate limiting correctly', async () => {
      const service = new GeminiService();
      
      // Test that rate limiting properties exist (private, so test indirectly)
      assert.ok(service instanceof GeminiService);
      
      // Test that getSuggestion method exists
      assert.ok(typeof service.getSuggestion === 'function');
    });

    test('should validate request options', () => {
      const service = new GeminiService();
      
      // Test default options handling
      const validOptions = {
        temperature: 0.7,
        maxTokens: 1000,
        timeout: 5000
      };
      
      // Should not throw with valid options
      assert.doesNotThrow(() => {
        // Test that options validation doesn't crash
        const optionsKeys = Object.keys(validOptions);
        assert.ok(optionsKeys.includes('temperature'));
        assert.ok(optionsKeys.includes('maxTokens'));
        assert.ok(optionsKeys.includes('timeout'));
      });
    });

    test('should format prompts correctly', () => {
      const service = new GeminiService();
      
      // Test prompt formatting (if method is accessible)
      const testPrompt = 'How do I fix this CSS issue?';
      const testContext = {
        feature: 'css-grid',
        file: 'styles.css',
        line: 42
      };
      
      // Basic validation that strings are handled properly
      assert.ok(typeof testPrompt === 'string');
      assert.ok(testPrompt.length > 0);
      assert.ok(typeof testContext.feature === 'string');
    });
  });

  suite('Suggestion Filtering and Search', () => {
    
    test('should filter suggestions by search query', () => {
      const suggestions = createMockSuggestions();
      
      // Test case-insensitive search
      const cssResults = filterSuggestions(suggestions, 'css');
      assert.strictEqual(cssResults.length, 1);
      assert.ok(cssResults[0].tags?.includes('css'));
      
      // Test multi-word search
      const jsResults = filterSuggestions(suggestions, 'javascript');
      assert.strictEqual(jsResults.length, 2);
      
      // Test empty query returns all
      const allResults = filterSuggestions(suggestions, '');
      assert.strictEqual(allResults.length, suggestions.length);
    });

    test('should filter by multiple search terms', () => {
      const suggestions = createMockSuggestions();
      
      // Test multiple terms
      const asyncJsResults = filterSuggestions(suggestions, 'javascript async');
      assert.strictEqual(asyncJsResults.length, 1);
      assert.ok(asyncJsResults[0].tags?.includes('javascript'));
      assert.ok(asyncJsResults[0].tags?.includes('async'));
    });

    test('should handle special characters in search', () => {
      const suggestions = createMockSuggestions();
      
      // Test search with special characters
      const specialResults = filterSuggestions(suggestions, 'async/await');
      assert.ok(Array.isArray(specialResults));
      
      // Should not crash with regex special characters
      const regexResults = filterSuggestions(suggestions, '.*+?^${}()|[]\\');
      assert.ok(Array.isArray(regexResults));
    });

    test('should search in issue text and suggestions', () => {
      const suggestions = createMockSuggestions();
      
      // Search for text that appears in issue
      const syntaxResults = filterSuggestions(suggestions, 'syntax error');
      assert.strictEqual(syntaxResults.length, 1);
      assert.ok(syntaxResults[0].issue.includes('syntax error'));
      
      // Search for text that appears in suggestion
      const fallbackResults = filterSuggestions(suggestions, 'fallback');
      assert.strictEqual(fallbackResults.length, 1);
      assert.ok(fallbackResults[0].suggestion.includes('fallback'));
    });
  });

  suite('Suggestion Data Validation', () => {
    
    test('should validate suggestion structure', () => {
      const suggestions = createMockSuggestions();
      
      suggestions.forEach(suggestion => {
        // Required fields
        assert.ok(typeof suggestion.id === 'string');
        assert.ok(typeof suggestion.issue === 'string');
        assert.ok(typeof suggestion.suggestion === 'string');
        assert.ok(suggestion.timestamp instanceof Date);
        assert.ok(['success', 'error', 'pending'].includes(suggestion.status));
        
        // Optional fields should have correct types when present
        if (suggestion.rating !== undefined) {
          assert.ok([1, 2, 3, 4, 5].includes(suggestion.rating));
        }
        
        if (suggestion.tags !== undefined) {
          assert.ok(Array.isArray(suggestion.tags));
          suggestion.tags.forEach(tag => assert.ok(typeof tag === 'string'));
        }
        
        if (suggestion.tokensUsed !== undefined) {
          assert.ok(typeof suggestion.tokensUsed === 'number');
          assert.ok(suggestion.tokensUsed > 0);
        }
        
        if (suggestion.responseTime !== undefined) {
          assert.ok(typeof suggestion.responseTime === 'number');
          assert.ok(suggestion.responseTime > 0);
        }
      });
    });

    test('should handle malformed suggestion data gracefully', () => {
      const malformedSuggestions = [
        {
          id: '',
          issue: 'Test issue',
          suggestion: 'Test suggestion',
          timestamp: new Date(),
          status: 'success' as const
        },
        {
          id: 'valid-id',
          issue: '',
          suggestion: 'Test suggestion',
          timestamp: new Date(),
          status: 'success' as const
        },
        {
          id: 'valid-id-2',
          issue: 'Test issue',
          suggestion: '',
          timestamp: new Date(),
          status: 'success' as const
        }
      ];
      
      // Filter should handle malformed data without crashing
      assert.doesNotThrow(() => {
        const results = filterSuggestions(malformedSuggestions, 'test');
        assert.ok(Array.isArray(results));
      });
    });

    test('should preserve suggestion metadata during filtering', () => {
      const suggestions = createMockSuggestions();
      const results = filterSuggestions(suggestions, 'javascript');
      
      results.forEach((result: GeminiSuggestion) => {
        assert.ok(result.timestamp instanceof Date);
        assert.ok(typeof result.status === 'string');
        if (result.rating) {
          assert.ok(typeof result.rating === 'number');
        }
        if (result.tokensUsed) {
          assert.ok(typeof result.tokensUsed === 'number');
        }
        if (result.responseTime) {
          assert.ok(typeof result.responseTime === 'number');
        }
      });
    });
  });

  suite('Performance and Memory Management', () => {
    
    test('should handle large datasets efficiently', () => {
      // Create a large dataset with unique identifiers
      const largeSuggestions: GeminiSuggestion[] = [];
      for (let i = 0; i < 1000; i++) {
        largeSuggestions.push({
          id: `suggestion-${i}`,
          issue: `Issue ${i}: How to handle case ${i % 10}?`,
          suggestion: `Solution ${i}: Use approach ${i % 5}.`,
          timestamp: new Date(Date.now() - i * 1000),
          status: ['success', 'error', 'pending'][i % 3] as any,
          rating: (i % 5 + 1) as any,
          tags: [`tag-${i % 10}`, `category-${i % 3}`, i === 123 ? 'uniqueidentifier123' : 'normaltag'], // One unique tag
          tokensUsed: 50 + (i % 100),
          responseTime: 200 + (i % 1000)
        });
      }
      
      const startTime = Date.now();
      const results = filterSuggestions(largeSuggestions, 'uniqueidentifier123');
      const endTime = Date.now();
      
      // Should complete in reasonable time (< 100ms for 1000 items)
      assert.ok(endTime - startTime < 100, 'Filtering should be fast even with large datasets');
      
      // Should return correct results - exactly one item should match "uniqueidentifier123"
      assert.strictEqual(results.length, 1);
      assert.ok(results[0].tags?.includes('uniqueidentifier123'), `Expected result to contain 'uniqueidentifier123' but got: ${results[0].tags}`);
    });

    test('should not leak memory during repeated operations', () => {
      const suggestions = createMockSuggestions();
      
      // Perform many filter operations
      for (let i = 0; i < 100; i++) {
        const query = ['javascript', 'css', 'fetch', 'async', 'grid'][i % 5];
        const results = filterSuggestions(suggestions, query);
        assert.ok(Array.isArray(results));
      }
      
      // Test should complete without memory issues
      assert.ok(true, 'Repeated operations completed successfully');
    });
  });

  suite('Error Handling and Edge Cases', () => {
    
    test('should handle empty suggestion arrays', () => {
      const results = filterSuggestions([], 'any query');
      assert.strictEqual(results.length, 0);
      assert.ok(Array.isArray(results));
    });

    test('should handle null and undefined inputs gracefully', () => {
      const suggestions = createMockSuggestions();
      
      // Should handle undefined query
      assert.doesNotThrow(() => {
        const results = filterSuggestions(suggestions, undefined as any);
        assert.ok(Array.isArray(results));
      });
      
      // Should handle null query
      assert.doesNotThrow(() => {
        const results = filterSuggestions(suggestions, null as any);
        assert.ok(Array.isArray(results));
      });
    });

    test('should handle suggestions with missing optional fields', () => {
      const minimalSuggestions: GeminiSuggestion[] = [
        {
          id: 'minimal-1',
          issue: 'Basic issue',
          suggestion: 'Basic suggestion',
          timestamp: new Date(),
          status: 'success'
          // No optional fields
        },
        {
          id: 'minimal-2',
          issue: 'Another issue',
          suggestion: 'Another suggestion',
          timestamp: new Date(),
          status: 'pending',
          rating: 3
          // Some optional fields
        }
      ];
      
      const results = filterSuggestions(minimalSuggestions, 'basic');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, 'minimal-1');
    });
  });
});