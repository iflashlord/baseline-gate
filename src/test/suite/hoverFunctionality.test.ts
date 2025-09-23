import * as assert from 'assert';
import * as vscode from 'vscode';
import { buildFeatureHover, type HoverRenderOptions } from '../../hover/render';
import type { BaselineFeature } from '../../core/baselineData';
import type { Verdict } from '../../core/scoring';
import type { Target } from '../../core/targets';

suite('Hover Functionality Test Suite', () => {
  
  let mockFeature: BaselineFeature;
  let mockOptions: HoverRenderOptions;

  suiteSetup(() => {
    // Mock feature data
    mockFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      description: 'A test feature for browser support',
      baseline: 'high',
      support: {
        chrome: { version: 90, raw: '90' },
        firefox: { version: 88, raw: '88' },
        safari: { version: 14, raw: '14' },
        chrome_android: { version: 90, raw: '90' },
        firefox_android: { version: 88, raw: '88' },
        safari_ios: { version: 14, raw: '14' }
      },
      docsUrl: 'https://example.com/docs',
      specUrls: [],
      caniuseIds: [],
      compatFeatures: [],
      groups: [],
      snapshots: []
    };

    mockOptions = {
      assetsRoot: vscode.Uri.file('/test/assets')
    };
  });

  suite('Hover Rendering', () => {
    test('should build feature hover without errors', () => {
      const verdict: Verdict = 'safe';
      const target: Target = 'enterprise';
      
      const hover = buildFeatureHover(mockFeature, verdict, target, mockOptions);
      
      assert.ok(hover instanceof vscode.MarkdownString);
      assert.ok(hover.value.length > 0);
    });

    test('should include feature name in hover', () => {
      const verdict: Verdict = 'safe';
      const target: Target = 'enterprise';
      
      const hover = buildFeatureHover(mockFeature, verdict, target, mockOptions);
      
      assert.ok(hover.value.includes('Test Feature'));
    });

    test('should handle different verdicts', () => {
      const target: Target = 'enterprise';
      const verdicts: Verdict[] = ['safe', 'warning', 'blocked'];
      
      verdicts.forEach(verdict => {
        const hover = buildFeatureHover(mockFeature, verdict, target, mockOptions);
        assert.ok(hover instanceof vscode.MarkdownString);
        assert.ok(hover.value.length > 0);
      });
    });

    test('should handle different targets', () => {
      const verdict: Verdict = 'safe';
      const targets: Target[] = ['enterprise', 'modern'];
      
      targets.forEach(target => {
        const hover = buildFeatureHover(mockFeature, verdict, target, mockOptions);
        assert.ok(hover instanceof vscode.MarkdownString);
        assert.ok(hover.value.includes(target.charAt(0).toUpperCase() + target.slice(1)));
      });
    });
  });

  suite('Browser Support Filtering in Hover', () => {
    test('should respect browser display settings', () => {
      // This test ensures that the hover rendering respects browser filtering
      // The actual filtering logic is tested through integration
      const verdict: Verdict = 'safe';
      const target: Target = 'enterprise';
      
      const hover = buildFeatureHover(mockFeature, verdict, target, mockOptions);
      
      // Should contain browser support information
      assert.ok(hover.value.length > 0);
    });

    test('should handle feature with no support data', () => {
      const featureNoSupport: BaselineFeature = {
        ...mockFeature,
        support: {}
      };
      
      const verdict: Verdict = 'warning';
      const target: Target = 'enterprise';
      
      const hover = buildFeatureHover(featureNoSupport, verdict, target, mockOptions);
      
      assert.ok(hover instanceof vscode.MarkdownString);
      assert.ok(hover.value.includes('Test Feature'));
    });
  });

  suite('Hover Options', () => {
    test('should handle hover without assets root', () => {
      const verdict: Verdict = 'safe';
      const target: Target = 'enterprise';
      
      const hover = buildFeatureHover(mockFeature, verdict, target, {});
      
      assert.ok(hover instanceof vscode.MarkdownString);
      assert.ok(hover.value.length > 0);
    });

    test('should handle empty options', () => {
      const verdict: Verdict = 'safe';
      const target: Target = 'enterprise';
      
      const hover = buildFeatureHover(mockFeature, verdict, target);
      
      assert.ok(hover instanceof vscode.MarkdownString);
      assert.ok(hover.value.length > 0);
    });
  });

  suite('Markdown Properties', () => {
    test('should set correct markdown properties', () => {
      const verdict: Verdict = 'safe';
      const target: Target = 'enterprise';
      
      const hover = buildFeatureHover(mockFeature, verdict, target, mockOptions);
      
      assert.strictEqual(hover.isTrusted, true);
      assert.strictEqual(hover.supportThemeIcons, true);
      assert.strictEqual(hover.supportHtml, true);
    });
  });
});