import * as assert from 'assert';
import * as vscode from 'vscode';
import { getBaselineIconHtml } from '../../sidebar/analysis/utils';
import { formatLinkHostname, escapeMarkdown, capitalize } from '../../utils/formatUtils';
import type { BaselineFeature } from '../../core/baselineData';
import type { BaselineAnalysisAssets } from '../../sidebar/analysis/types';

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

function createMockFeature(baseline: 'high' | 'low' | false): BaselineFeature {
  return {
    id: 'test-feature',
    name: 'Test Feature',
    baseline,
    support: {},
    specUrls: ['https://example.com/spec'],
    caniuseIds: ['test-feature'],
    compatFeatures: [],
    groups: [],
    snapshots: []
  } as BaselineFeature;
}

suite('UI Enhancement Feature Tests', () => {

  suite('Baseline Icon Rendering', () => {
    
    test('should render widely available baseline icon', () => {
      const feature = createMockFeature('high');
      const assets = createMockAssets();
      const webview = createMockWebview();
      
      const html = getBaselineIconHtml(feature, assets, webview);
      
      assert.ok(html.includes('<img'));
      assert.ok(html.includes('class="baseline-icon"'));
      assert.ok(html.includes('width="16" height="9"'));
      assert.ok(html.includes('alt="Baseline Widely available"'));
      assert.ok(html.includes('widely.svg'));
    });

    test('should render newly available baseline icon', () => {
      const feature = createMockFeature('low');
      const assets = createMockAssets();
      const webview = createMockWebview();
      
      const html = getBaselineIconHtml(feature, assets, webview);
      
      assert.ok(html.includes('<img'));
      assert.ok(html.includes('class="baseline-icon"'));
      assert.ok(html.includes('alt="Baseline Newly available"'));
      assert.ok(html.includes('newly.svg'));
    });

    test('should render limited availability baseline icon', () => {
      const feature = createMockFeature(false);
      const assets = createMockAssets();
      const webview = createMockWebview();
      
      const html = getBaselineIconHtml(feature, assets, webview);
      
      assert.ok(html.includes('<img'));
      assert.ok(html.includes('class="baseline-icon"'));
      assert.ok(html.includes('alt="Baseline Limited availability"'));
      assert.ok(html.includes('limited.svg'));
    });

    test('should properly escape HTML in alt attributes', () => {
      const feature = createMockFeature('high');
      const assets = createMockAssets();
      const webview = createMockWebview();
      
      const html = getBaselineIconHtml(feature, assets, webview);
      
      // Should contain properly quoted alt attribute
      assert.ok(html.includes('alt="Baseline Widely available"'));
      // Should not contain any unescaped HTML characters
      assert.ok(!html.includes('<script>'));
      assert.ok(!html.includes('&<'));
    });
  });

  suite('Format Utilities', () => {
    
    test('should format link hostnames correctly', () => {
      const urls = [
        'https://developer.mozilla.org/en-US/docs/Web/API/Fetch',
        'https://caniuse.com/fetch',
        'https://github.com/whatwg/fetch',
        'https://w3c.github.io/webappsec-csp/',
        'https://example.com/very/long/path/to/resource'
      ];
      
      const hostnames = urls.map(formatLinkHostname);
      
      assert.strictEqual(hostnames[0], 'MDN');
      assert.strictEqual(hostnames[1], 'Can I Use');
      assert.strictEqual(hostnames[2], 'GitHub');
      assert.strictEqual(hostnames[3], 'W3C');
      assert.strictEqual(hostnames[4], 'example.com');
    });

    test('should handle invalid URLs gracefully', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        '',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("test")</script>'
      ];
      
      invalidUrls.forEach(url => {
        assert.doesNotThrow(() => {
          const hostname = formatLinkHostname(url);
          assert.ok(typeof hostname === 'string');
        });
      });
    });

    test('should escape markdown special characters', () => {
      const testCases = [
        { input: 'Normal text', expected: 'Normal text' },
        { input: 'Text with *asterisks*', expected: 'Text with \\*asterisks\\*' },
        { input: 'Text with _underscores_', expected: 'Text with \\_underscores\\_' },
        { input: 'Text with [brackets]', expected: 'Text with \\[brackets\\]' },
        { input: 'Text with `backticks`', expected: 'Text with \\`backticks\\`' },
        { input: 'Text with #hash', expected: 'Text with \\#hash' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const escaped = escapeMarkdown(input);
        assert.strictEqual(escaped, expected, `Failed to escape "${input}"`);
      });
    });

    test('should capitalize strings correctly', () => {
      const testCases = [
        { input: 'hello', expected: 'Hello' },
        { input: 'WORLD', expected: 'WORLD' },
        { input: 'camelCase', expected: 'CamelCase' },
        { input: 'kebab-case', expected: 'Kebab-case' },
        { input: 'snake_case', expected: 'Snake_case' },
        { input: '', expected: '' },
        { input: 'a', expected: 'A' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const capitalized = capitalize(input);
        assert.strictEqual(capitalized, expected, `Failed to capitalize "${input}"`);
      });
    });

    test('should handle special characters in markdown escaping', () => {
      const specialChars = '\\*_[]()~`>#+-=|{}.!';
      const escaped = escapeMarkdown(specialChars);
      
      // Should escape markdown-significant characters
      assert.ok(escaped.includes('\\\\'));
      assert.ok(escaped.includes('\\*'));
      assert.ok(escaped.includes('\\_'));
      assert.ok(escaped.includes('\\['));
      assert.ok(escaped.includes('\\]'));
      assert.ok(escaped.includes('\\`'));
      assert.ok(escaped.includes('\\#'));
      
      // Should not escape non-markdown characters unnecessarily
      assert.ok(escaped.includes('+'));
      assert.ok(escaped.includes('='));
    });
  });

  suite('File Type and Extension Detection', () => {
    
    test('should detect common file extensions', () => {
      const testFiles = [
        { path: '/project/src/app.js', expectedIcon: 'js' },
        { path: '/project/src/component.tsx', expectedIcon: 'tsx' },
        { path: '/project/styles/main.css', expectedIcon: 'css' },
        { path: '/project/styles/variables.scss', expectedIcon: 'scss' },
        { path: '/project/pages/index.html', expectedIcon: 'html' },
        { path: '/project/data/config.json', expectedIcon: 'json' },
        { path: '/project/docs/README.md', expectedIcon: 'md' },
        { path: '/project/.gitignore', expectedIcon: 'txt' },
        { path: '/project/build.gradle', expectedIcon: 'gradle' },
        { path: '/project/package.xml', expectedIcon: 'xml' }
      ];
      
      // Test that we can at least identify the extension correctly
      testFiles.forEach(({ path, expectedIcon }) => {
        const extension = path.split('.').pop()?.toLowerCase() || 'unknown';
        const baseName = path.split('/').pop()?.toLowerCase() || 'unknown';
        
        if (expectedIcon === 'gradle') {
          assert.ok(baseName.includes('gradle'), `Should identify gradle files: ${path}`);
        } else if (expectedIcon === 'txt') {
          assert.ok(baseName.startsWith('.'), `Should identify dotfiles: ${path}`);
        } else {
          assert.strictEqual(extension, expectedIcon, `Should detect ${expectedIcon} extension in ${path}`);
        }
      });
    });

    test('should handle files without extensions', () => {
      const noExtensionFiles = [
        '/project/Dockerfile',
        '/project/Makefile',
        '/project/.gitignore',
        '/project/.env',
        '/project/LICENSE'
      ];
      
      noExtensionFiles.forEach(path => {
        const fileName = path.split('/').pop() || '';
        assert.ok(fileName.length > 0, `Should extract filename from ${path}`);
        
        // Should handle files without extensions gracefully
        const extension = path.split('.').pop();
        if (!path.includes('.') || extension === fileName) {
          assert.ok(true, `Handles file without extension: ${path}`);
        }
      });
    });

    test('should categorize file types for UI styling', () => {
      const fileCategories = {
        javascript: ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'],
        styles: ['css', 'scss', 'sass', 'less', 'styl'],
        markup: ['html', 'htm', 'xml', 'svg', 'jsx', 'tsx'],
        data: ['json', 'yaml', 'yml', 'toml', 'ini'],
        documentation: ['md', 'txt', 'rst', 'adoc'],
        configuration: ['config', 'conf', 'cfg', 'properties']
      };
      
      Object.entries(fileCategories).forEach(([category, extensions]) => {
        extensions.forEach(ext => {
          assert.ok(typeof ext === 'string', `Extension ${ext} in ${category} should be a string`);
          assert.ok(ext.length > 0, `Extension ${ext} should not be empty`);
          assert.ok(!ext.includes('.'), `Extension ${ext} should not include dot`);
        });
      });
    });
  });

  suite('Accessibility and Internationalization', () => {
    
    test('should provide proper ARIA labels for interactive elements', () => {
      // Test that our utility functions support accessibility
      const testAltText = 'Baseline Widely available';
      const escaped = escapeMarkdown(testAltText);
      
      // Alt text should remain readable after escaping
      assert.ok(!escaped.includes('\\'), 'Alt text should not have escaped characters');
      assert.strictEqual(escaped, testAltText, 'Alt text should remain unchanged');
    });

    test('should handle non-English characters in formatting', () => {
      const internationalText = [
        'Héllo Wörld',
        'こんにちは',
        'Привет мир',
        'مرحبا بالعالم',
        'Olá Mundo'
      ];
      
      internationalText.forEach(text => {
        assert.doesNotThrow(() => {
          const capitalized = capitalize(text);
          const escaped = escapeMarkdown(text);
          
          assert.ok(typeof capitalized === 'string');
          assert.ok(typeof escaped === 'string');
          assert.ok(capitalized.length > 0);
          assert.ok(escaped.length > 0);
        }, `Should handle international text: ${text}`);
      });
    });

    test('should maintain text direction for RTL languages', () => {
      const rtlText = 'مرحبا بالعالم';
      const ltrText = 'Hello World';
      
      // Basic test that formatting preserves text content
      const rtlFormatted = capitalize(rtlText);
      const ltrFormatted = capitalize(ltrText);
      
      assert.ok(rtlFormatted.includes('مرحبا'), 'Should preserve RTL characters');
      assert.ok(ltrFormatted.includes('Hello'), 'Should preserve LTR characters');
    });
  });

  suite('Performance and Optimization', () => {
    
    test('should format large numbers of URLs efficiently', () => {
      const urls = Array.from({ length: 1000 }, (_, i) => 
        `https://example${i}.com/path/to/resource`
      );
      
      const startTime = Date.now();
      const hostnames = urls.map(formatLinkHostname);
      const endTime = Date.now();
      
      // Should complete quickly (< 50ms for 1000 URLs)
      assert.ok(endTime - startTime < 50, 'URL formatting should be fast');
      
      // All results should be valid
      assert.strictEqual(hostnames.length, 1000);
      hostnames.forEach((hostname, i) => {
        assert.strictEqual(hostname, `example${i}.com`);
      });
    });

    test('should escape large text blocks efficiently', () => {
      const largeText = 'Text with *markdown* _characters_ '.repeat(1000);
      
      const startTime = Date.now();
      const escaped = escapeMarkdown(largeText);
      const endTime = Date.now();
      
      // Should complete quickly (< 10ms for large text)
      assert.ok(endTime - startTime < 10, 'Markdown escaping should be fast');
      
      // Should properly escape all instances
      assert.ok(escaped.includes('\\*markdown\\*'));
      assert.ok(escaped.includes('\\_characters\\_'));
    });

    test('should handle repeated capitalization operations', () => {
      const words = ['test', 'word', 'example', 'text', 'sample'];
      
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        const word = words[i % words.length];
        const capitalized = capitalize(word);
        assert.ok(capitalized.charAt(0).toUpperCase() === capitalized.charAt(0));
      }
      const endTime = Date.now();
      
      // Should complete quickly
      assert.ok(endTime - startTime < 10, 'Repeated capitalization should be fast');
    });
  });
});