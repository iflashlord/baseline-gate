import * as assert from 'assert';
import * as vscode from 'vscode';
import { renderAnalysisWebviewHtml, buildIssueDetailHtml } from '../../sidebar/analysis/html';
import { renderSuggestionCard } from '../../gemini/dataTransform';
import type { BaselineFinding } from '../../sidebar/workspaceScanner';
import type { BaselineFeature } from '../../core/baselineData';
import type { BaselineAnalysisAssets } from '../../sidebar/analysis/types';
import type { GeminiSuggestion } from '../../gemini/geminiService';
import type { Target } from '../../core/targets';

function createMockWebview(): vscode.Webview {
  return {
    asWebviewUri: (localResource: vscode.Uri) => localResource,
    html: '',
    options: {},
    cspSource: 'vscode-webview:',
    postMessage: async () => true,
    onDidReceiveMessage: new vscode.EventEmitter<any>().event
  } as unknown as vscode.Webview;
}

function createMockAssets(): BaselineAnalysisAssets {
  const base = vscode.Uri.file('/test');
  return {
    statusIcons: {
      blocked: vscode.Uri.joinPath(base, 'blocked.svg'),
      warning: vscode.Uri.joinPath(base, 'warning.svg'),
      safe: vscode.Uri.joinPath(base, 'safe.svg')
    },
    baselineIcons: {
      widely: vscode.Uri.joinPath(base, 'widely.svg'),
      newly: vscode.Uri.joinPath(base, 'newly.svg'),
      limited: vscode.Uri.joinPath(base, 'limited.svg')
    }
  };
}

function createMockFinding(): BaselineFinding {
  return {
    id: 'test-finding',
    uri: vscode.Uri.file('/test/app.ts'),
    range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
    lineText: 'const testToken = "example";',
    feature: {
      id: 'test-feature',
      name: 'Test Feature',
      baseline: 'high',
      support: {},
      specUrls: ['https://example.com/spec'],
      caniuseIds: [],
      compatFeatures: [],
      groups: [],
      snapshots: []
    } as unknown as BaselineFeature,
    verdict: 'safe' as const,
    token: 'testToken'
  };
}

function createMockGeminiSuggestion(): GeminiSuggestion {
  return {
    id: 'test-suggestion',
    issue: 'How do I fix this warning?',
    suggestion: 'You can fix this by updating the code to use modern syntax.',
    timestamp: new Date('2023-01-01'),
    rating: 4,
    tags: ['javascript', 'modernization'],
    status: 'success',
    tokensUsed: 150,
    responseTime: 1200
  };
}

suite('SVG Icon Rendering Tests', () => {

  suite('Analysis View SVG Icons', () => {
    
    test('renders analysis webview with SVG icons instead of emojis', () => {
      const webview = createMockWebview();
      const html = renderAnalysisWebviewHtml(webview);
      
      // Should contain SVG icons
      assert.ok(html.includes('<svg'));
      assert.ok(html.includes('viewBox="0 0 24 24"'));
      assert.ok(html.includes('stroke="currentColor"'));
      
      // Should NOT contain any emojis
      assert.ok(!html.includes('✨')); // AI/Gemini sparkle
      assert.ok(!html.includes('🔍')); // Search magnifying glass
      assert.ok(!html.includes('🎯')); // Target
      assert.ok(!html.includes('👤')); // User
      assert.ok(!html.includes('📋')); // Clipboard
      assert.ok(!html.includes('📄')); // File/document
      assert.ok(!html.includes('📖')); // Book/documentation
      
      // Should contain proper SVG structure
      assert.ok(html.includes('stroke-width="2"'));
      assert.ok(html.includes('stroke-linecap="round"'));
      assert.ok(html.includes('stroke-linejoin="round"'));
    });

    test('renders file action buttons with SVG icons', () => {
      const webview = createMockWebview();
      const html = renderAnalysisWebviewHtml(webview);
      
      // Look for file open and documentation SVG patterns
      assert.ok(html.includes('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"')); // File icon
      assert.ok(html.includes('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"')); // Book icon
      
      // Ensure buttons have proper SVG styling
      assert.ok(html.includes('width="14" height="14"')); // Consistent icon sizing
    });

    test('renders chat interface with user and AI SVG avatars', () => {
      const webview = createMockWebview();
      const html = renderAnalysisWebviewHtml(webview);
      
      // User avatar SVG
      assert.ok(html.includes('<path d="M20 21v-2a4 4 0 0 0-3-3.87"')); // User icon part
      assert.ok(html.includes('<circle cx="12" cy="7" r="4"')); // User head
      
      // AI/Star avatar SVG
      assert.ok(html.includes('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"')); // Star icon
      
      // Avatar containers
      assert.ok(html.includes('avatar-icon'));
    });
  });

  suite('Issue Detail View SVG Icons', () => {
    
    test('renders issue detail with severity SVG icons', () => {
      const finding = createMockFinding();
      const webview = createMockWebview();
      const assets = createMockAssets();
      const target: Target = 'modern';
      
      const severityIconUris = {
        blocked: 'test://blocked.svg',
        warning: 'test://warning.svg',
        safe: 'test://safe.svg'
      };
      
      const html = buildIssueDetailHtml({
        finding,
        severityIconUris,
        target,
        assets,
        webview
      });
      
      // Should contain severity-specific SVG icons
      assert.ok(html.includes('<svg class="detail-icon safe"')); // Safe icon
      assert.ok(html.includes('stroke="#22c55e"')); // Green for safe
      
      // Should contain proper structure
      assert.ok(html.includes('viewBox="0 0 24 24"'));
      assert.ok(html.includes('stroke-width="2"'));
    });

    test('renders blocked finding with red SVG icon', () => {
      const finding = {
        ...createMockFinding(),
        verdict: 'blocked' as const
      };
      const webview = createMockWebview();
      const assets = createMockAssets();
      const target: Target = 'modern';
      
      const severityIconUris = {
        blocked: 'test://blocked.svg',
        warning: 'test://warning.svg',
        safe: 'test://safe.svg'
      };
      
      const html = buildIssueDetailHtml({
        finding,
        severityIconUris,
        target,
        assets,
        webview
      });
      
      // Should contain blocked-specific SVG
      assert.ok(html.includes('<svg class="detail-icon blocked"'));
      assert.ok(html.includes('stroke="#ef4444"')); // Red for blocked
      assert.ok(html.includes('<circle cx="12" cy="12" r="10"')); // Blocked circle
      assert.ok(html.includes('<line x1="15" y1="9" x2="9" y2="15"')); // X mark
    });

    test('renders warning finding with orange SVG icon', () => {
      const finding = {
        ...createMockFinding(),
        verdict: 'warning' as const
      };
      const webview = createMockWebview();
      const assets = createMockAssets();
      const target: Target = 'modern';
      
      const severityIconUris = {
        blocked: 'test://blocked.svg',
        warning: 'test://warning.svg',
        safe: 'test://safe.svg'
      };
      
      const html = buildIssueDetailHtml({
        finding,
        severityIconUris,
        target,
        assets,
        webview
      });
      
      // Should contain warning-specific SVG
      assert.ok(html.includes('<svg class="detail-icon warning"'));
      assert.ok(html.includes('stroke="#f59e0b"')); // Orange for warning
      assert.ok(html.includes('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"')); // Triangle
    });

    test('renders resource links with external link SVG icon', () => {
      const finding = createMockFinding();
      const webview = createMockWebview();
      const assets = createMockAssets();
      const target: Target = 'modern';
      
      const severityIconUris = {
        blocked: 'test://blocked.svg',
        warning: 'test://warning.svg',
        safe: 'test://safe.svg'
      };
      
      const html = buildIssueDetailHtml({
        finding,
        severityIconUris,
        target,
        assets,
        webview
      });
      
      // Should contain external link SVG
      assert.ok(html.includes('<svg class="link-icon"'));
      assert.ok(html.includes('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"')); // External link icon
      assert.ok(html.includes('<line x1="10" y1="14" x2="21" y2="3"')); // Arrow
    });
  });

  suite('Gemini Suggestion Card SVG Icons', () => {
    
    test('renders suggestion card with SVG icons instead of emojis', () => {
      const suggestion = createMockGeminiSuggestion();
      const html = renderSuggestionCard(suggestion, '');
      
      // Should contain SVG icons
      assert.ok(html.includes('<svg'));
      assert.ok(html.includes('viewBox="0 0 24 24"'));
      
      // Should NOT contain emojis
      assert.ok(!html.includes('⭐')); // Star emoji
      assert.ok(!html.includes('🔄')); // Refresh emoji
      assert.ok(!html.includes('📋')); // Clipboard emoji
      assert.ok(!html.includes('✕')); // X emoji
      
      // Should contain action button SVGs
      assert.ok(html.includes('data-action="copy"')); // Copy button
      assert.ok(html.includes('data-action="retry"')); // Retry button
      assert.ok(html.includes('data-action="remove"')); // Remove button
    });

    test('renders star rating with SVG stars', () => {
      const suggestion = {
        ...createMockGeminiSuggestion(),
        rating: 3 as const
      };
      const html = renderSuggestionCard(suggestion, '');
      
      // Should contain star SVGs
      assert.ok(html.includes('<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"')); // Star shape
      
      // Should have filled and unfilled stars
      assert.ok(html.includes('fill="currentColor"')); // Filled stars
      assert.ok(html.includes('fill="none"')); // Empty stars
    });

    test('renders status indicator with appropriate SVG icon', () => {
      const successSuggestion = {
        ...createMockGeminiSuggestion(),
        status: 'success' as const
      };
      const errorSuggestion = {
        ...createMockGeminiSuggestion(),
        status: 'error' as const
      };
      
      const successHtml = renderSuggestionCard(successSuggestion, '');
      const errorHtml = renderSuggestionCard(errorSuggestion, '');
      
      // Success should have green checkmark
      assert.ok(successHtml.includes('stroke="#22c55e"')); // Green
      assert.ok(successHtml.includes('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"')); // Checkmark circle
      
      // Error should have red X or warning
      assert.ok(errorHtml.includes('stroke="#ef4444"') || errorHtml.includes('stroke="#f59e0b"')); // Red or orange
    });

    test('highlights search terms in suggestion cards', () => {
      const suggestion = createMockGeminiSuggestion();
      const html = renderSuggestionCard(suggestion, 'fix');
      
      // Should highlight the search term
      assert.ok(html.includes('<mark>fix</mark>') || html.includes('class="highlight"'));
      
      // Should still contain SVG icons
      assert.ok(html.includes('<svg'));
      assert.ok(html.includes('viewBox="0 0 24 24"'));
    });
  });

  suite('SVG Icon Consistency Tests', () => {
    
    test('all SVG icons use consistent properties', () => {
      const webview = createMockWebview();
      const html = renderAnalysisWebviewHtml(webview);
      
      // Count SVG elements
      const svgMatches = html.match(/<svg[^>]*>/g) || [];
      assert.ok(svgMatches.length > 0, 'Should contain multiple SVG icons');
      
      // Most SVGs should use standard viewBox
      const standardViewBoxCount = (html.match(/viewBox="0 0 24 24"/g) || []).length;
      assert.ok(standardViewBoxCount > 0, 'Should use consistent 24x24 viewBox');
      
      // Should use currentColor for theme integration
      const currentColorCount = (html.match(/stroke="currentColor"/g) || []).length;
      assert.ok(currentColorCount > 0, 'Should use currentColor for theme integration');
      
      // Should have consistent stroke width
      const strokeWidthCount = (html.match(/stroke-width="2"/g) || []).length;
      assert.ok(strokeWidthCount > 0, 'Should use consistent stroke width');
    });

    test('no emojis remain in rendered HTML', () => {
      const webview = createMockWebview();
      const finding = createMockFinding();
      const suggestion = createMockGeminiSuggestion();
      
      const analysisHtml = renderAnalysisWebviewHtml(webview);
      const suggestionHtml = renderSuggestionCard(suggestion, '');
      
      // List of emojis that should have been replaced
      const emojis = ['✨', '🔍', '🎯', '👤', '📋', '📄', '📖', '⭐', '🔄', '✕', '❌', '⏳', '✅', '💬'];
      
      for (const emoji of emojis) {
        assert.ok(!analysisHtml.includes(emoji), `Analysis HTML should not contain ${emoji} emoji`);
        assert.ok(!suggestionHtml.includes(emoji), `Suggestion HTML should not contain ${emoji} emoji`);
      }
    });

    test('SVG icons are properly sized and styled', () => {
      const webview = createMockWebview();
      const html = renderAnalysisWebviewHtml(webview);
      
      // Should have proper sizing attributes
      assert.ok(html.includes('width="14" height="14"') || html.includes('width="16" height="16"'));
      
      // Should have proper styling classes
      assert.ok(html.includes('avatar-icon') || html.includes('detail-icon') || html.includes('link-icon'));
      
      // Should have accessible attributes
      assert.ok(html.includes('stroke-linecap="round"'));
      assert.ok(html.includes('stroke-linejoin="round"'));
    });
  });
});