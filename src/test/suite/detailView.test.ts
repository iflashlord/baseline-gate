import * as assert from 'assert';
import * as vscode from 'vscode';
import { DetailViewUtils } from '../../sidebar/detailView/utils';
import { DetailViewDataTransformer } from '../../sidebar/detailView/dataTransformer';
import type { BaselineFinding } from '../../sidebar/workspaceScanner';
import type { BaselineFeature } from '../../core/baselineData';
import type { BaselineAnalysisAssets } from '../../sidebar/analysis/types';
import type { GeminiSuggestion } from '../../gemini/geminiService';

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
      specUrls: [],
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
    issue: 'Test issue',
    suggestion: 'Test response',
    timestamp: new Date('2023-01-01'),
    rating: 4,
    tags: ['test'],
    status: 'success',
    tokensUsed: 100,
    responseTime: 1000
  };
}

suite('Detail View SVG Icon Rendering Tests', () => {

  suite('DetailViewUtils SVG Rendering', () => {
    
    test('should escape HTML correctly', () => {
      const dangerous = '<script>alert("xss")</script>';
      const escaped = DetailViewUtils.escapeHtml(dangerous);
      
      assert.strictEqual(escaped, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('should format timestamps consistently', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      const formatted = DetailViewUtils.formatTimestamp(date);
      
      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.length > 0);
    });

    test('should render chat messages with SVG icons instead of emojis', () => {
      const suggestions = [createMockGeminiSuggestion()];
      const html = DetailViewUtils.renderExistingChatMessages(suggestions);
      
      // Check for SVG icons
      assert.ok(html.includes('<svg'));
      assert.ok(html.includes('viewBox="0 0 24 24"'));
      assert.ok(html.includes('stroke="currentColor"'));
      
      // Check for message content
      assert.ok(html.includes('Test issue'));
      assert.ok(html.includes('Test response'));
      
      // Ensure no emojis are present
      assert.ok(!html.includes('👤'));
      assert.ok(!html.includes('✨'));
      assert.ok(!html.includes('🔍'));
      assert.ok(!html.includes('📄'));
    });

    test('should handle empty chat messages with SVG empty state', () => {
      const html = DetailViewUtils.renderExistingChatMessages([]);
      
      assert.ok(html.includes('No previous conversations'));
      assert.ok(html.includes('<svg')); // Empty state icon
      assert.ok(html.includes('viewBox="0 0 24 24"'));
    });

    test('should render simple markdown without HTML vulnerabilities', () => {
      const markdown = '**Bold** and *italic* text with `code`';
      const html = DetailViewUtils.renderSimpleMarkdown(markdown);
      
      assert.ok(html.includes('<strong>Bold</strong>'));
      assert.ok(html.includes('<em>italic</em>'));
      assert.ok(html.includes('<code>code</code>'));
    });

    test('should generate secure nonce values', () => {
      const nonce1 = DetailViewUtils.generateNonce();
      const nonce2 = DetailViewUtils.generateNonce();
      
      assert.ok(typeof nonce1 === 'string');
      assert.ok(typeof nonce2 === 'string');
      assert.ok(nonce1.length > 0);
      assert.ok(nonce2.length > 0);
      assert.notStrictEqual(nonce1, nonce2); // Should be unique
    });
  });

  suite('DetailViewDataTransformer SVG Assets', () => {
    
    test('should create severity icon URIs correctly', () => {
      const webview = createMockWebview();
      const assets = createMockAssets();
      
      const iconUris = DetailViewDataTransformer.createSeverityIconUris(webview, assets);
      
      assert.ok(iconUris.blocked);
      assert.ok(iconUris.warning);
      assert.ok(iconUris.safe);
      assert.ok(typeof iconUris.blocked === 'string');
      assert.ok(typeof iconUris.warning === 'string');
      assert.ok(typeof iconUris.safe === 'string');
    });

    test('should transform finding display data correctly', () => {
      const finding = createMockFinding();
      const transformed = DetailViewDataTransformer.transformFindingForDisplay(finding);
      
      assert.strictEqual(transformed.id, finding.id);
      assert.strictEqual(transformed.title, finding.feature.name);
      assert.strictEqual(transformed.severity, finding.verdict);
      assert.ok(transformed.location);
      assert.ok(transformed.description);
    });

    test('should generate unique finding IDs', () => {
      const finding1 = createMockFinding();
      const finding2 = {
        ...createMockFinding(),
        id: 'different-finding',
        range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 10))
      };
      
      const id1 = DetailViewDataTransformer.generateFindingId(finding1);
      const id2 = DetailViewDataTransformer.generateFindingId(finding2);
      
      assert.ok(typeof id1 === 'string');
      assert.ok(typeof id2 === 'string');
      assert.notStrictEqual(id1, id2);
    });

    test('should get file extensions correctly', () => {
      const jsUri = vscode.Uri.file('/test/app.js');
      const tsUri = vscode.Uri.file('/test/component.tsx');
      const cssUri = vscode.Uri.file('/test/styles.css');
      
      assert.strictEqual(DetailViewDataTransformer.getFileExtension(jsUri), 'js');
      assert.strictEqual(DetailViewDataTransformer.getFileExtension(tsUri), 'tsx');
      assert.strictEqual(DetailViewDataTransformer.getFileExtension(cssUri), 'css');
    });

    test('should get language IDs correctly', () => {
      const jsUri = vscode.Uri.file('/test/app.js');
      const tsUri = vscode.Uri.file('/test/component.ts');
      const cssUri = vscode.Uri.file('/test/styles.css');
      
      const jsLang = DetailViewDataTransformer.getLanguageId(jsUri);
      const tsLang = DetailViewDataTransformer.getLanguageId(tsUri);
      const cssLang = DetailViewDataTransformer.getLanguageId(cssUri);
      
      assert.ok(typeof jsLang === 'string');
      assert.ok(typeof tsLang === 'string');
      assert.ok(typeof cssLang === 'string');
    });

    test('should sort findings by location and severity', () => {
      const findings = [
        {
          ...createMockFinding(),
          range: new vscode.Range(new vscode.Position(10, 0), new vscode.Position(10, 5)),
          verdict: 'warning' as const
        },
        {
          ...createMockFinding(),
          range: new vscode.Range(new vscode.Position(5, 0), new vscode.Position(5, 5)),
          verdict: 'blocked' as const
        },
        {
          ...createMockFinding(),
          range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 5)),
          verdict: 'safe' as const
        }
      ];
      
      const sorted = DetailViewDataTransformer.sortFindings(findings);
      
      assert.strictEqual(sorted.length, 3);
      // Should be sorted by line number first (position-based sorting)
      assert.ok(sorted[0].range.start.line <= sorted[1].range.start.line);
      assert.ok(sorted[1].range.start.line <= sorted[2].range.start.line);
    });
  });
});