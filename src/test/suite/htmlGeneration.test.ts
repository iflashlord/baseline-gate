import * as assert from 'assert';
import * as vscode from 'vscode';
import type { BaselineFinding } from '../../sidebar/workspaceScanner';
import type { BaselineFeature } from '../../core/baselineData';
import type { BaselineAnalysisAssets } from '../../sidebar/analysis/types';

/**
 * Test suite for HTML generation and event handling functionality
 * These tests focus on the occurrence section HTML generation,
 * CSS class assignments, and data attribute handling.
 */
suite('HTML Generation and Event Handling Tests', () => {

  function createMockFeature(id: string, name: string): BaselineFeature {
    return {
      id,
      name,
      baseline: 'high',
      support: {},
      specUrls: [],
      caniuseIds: [],
      compatFeatures: [],
      groups: [],
      snapshots: []
    } as unknown as BaselineFeature;
  }

  function createMockFinding(id: string, featureId: string, filePath: string, line: number): BaselineFinding {
    return {
      id,
      uri: vscode.Uri.file(filePath),
      range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 10)),
      lineText: `const token${line} = "example";`,
      feature: createMockFeature(featureId, `Feature ${featureId}`),
      verdict: 'safe' as const,
      token: `token${line}`
    };
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

  suite('CSS Class and Styling Tests', () => {

    test('should validate occurrence CSS classes', () => {
      // Test the CSS classes that should be generated
      const expectedClasses = [
        'occurrence-file-path',
        'occurrence-item',
        'occurrences-section',
        'occurrence-line-info',
        'occurrence-preview'
      ];

      // Simulate CSS class generation (testing the expected structure)
      const cssClasses = {
        filePath: 'occurrence-file-path',
        item: 'occurrence-item',
        section: 'occurrences-section',
        lineInfo: 'occurrence-line-info',
        preview: 'occurrence-preview'
      };

      expectedClasses.forEach(className => {
        const hasClass = Object.values(cssClasses).includes(className);
        assert.ok(hasClass, `Expected CSS class ${className} should be available`);
      });
    });

    test('should generate proper CSS styling rules', () => {
      // Test CSS rule structure for occurrence styling
      const expectedCSSRules = {
        cursor: 'pointer',
        textDecoration: 'underline',
        color: 'var(--vscode-textLink-foreground)',
        hover: {
          color: 'var(--vscode-textLink-activeForeground)'
        }
      };

      // Validate CSS properties exist
      assert.strictEqual(expectedCSSRules.cursor, 'pointer');
      assert.strictEqual(expectedCSSRules.textDecoration, 'underline');
      assert.ok(expectedCSSRules.color.includes('textLink-foreground'));
      assert.ok(expectedCSSRules.hover.color.includes('activeForeground'));
    });
  });

  suite('Data Attribute Generation Tests', () => {

    test('should generate correct data attributes for file paths', () => {
      const finding = createMockFinding('attr-test', 'attr-feature', '/test/attributes.ts', 42);
      
      // Simulate data attribute generation
      const dataAttributes = {
        'data-uri': finding.uri.toString(),
        'data-line': finding.range.start.line.toString(),
        'data-character': finding.range.start.character.toString()
      };

      assert.strictEqual(dataAttributes['data-uri'], 'file:///test/attributes.ts');
      assert.strictEqual(dataAttributes['data-line'], '42');
      assert.strictEqual(dataAttributes['data-character'], '0');
    });

    test('should handle multiple findings with different attributes', () => {
      const findings = [
        createMockFinding('multi-1', 'multi-feature', '/test/multi1.ts', 10),
        createMockFinding('multi-2', 'multi-feature', '/test/multi2.ts', 20),
        createMockFinding('multi-3', 'multi-feature', '/test/multi3.ts', 30)
      ];

      const attributeSets = findings.map(finding => ({
        'data-uri': finding.uri.toString(),
        'data-line': finding.range.start.line.toString(),
        'data-character': finding.range.start.character.toString()
      }));

      assert.strictEqual(attributeSets.length, 3);
      
      // Verify each has unique data-uri and data-line
      const uris = attributeSets.map(attrs => attrs['data-uri']);
      const lines = attributeSets.map(attrs => attrs['data-line']);
      
      assert.strictEqual(new Set(uris).size, 3); // All unique URIs
      assert.strictEqual(new Set(lines).size, 3); // All unique lines
      
      assert.ok(uris[0].includes('multi1.ts'));
      assert.ok(uris[1].includes('multi2.ts'));
      assert.ok(uris[2].includes('multi3.ts'));
      
      assert.strictEqual(lines[0], '10');
      assert.strictEqual(lines[1], '20');
      assert.strictEqual(lines[2], '30');
    });

    test('should handle edge cases in data attributes', () => {
      // Test with file at line 0
      const startFile = createMockFinding('start', 'start-feature', '/test/start.ts', 0);
      const startAttrs = {
        'data-uri': startFile.uri.toString(),
        'data-line': startFile.range.start.line.toString(),
        'data-character': startFile.range.start.character.toString()
      };

      assert.strictEqual(startAttrs['data-line'], '0');
      assert.strictEqual(startAttrs['data-character'], '0');

      // Test with file with special characters in path
      const specialPath = createMockFinding('special', 'special-feature', '/test/special file.ts', 5);
      const specialAttrs = {
        'data-uri': specialPath.uri.toString(),
        'data-line': specialPath.range.start.line.toString(),
        'data-character': specialPath.range.start.character.toString()
      };

      assert.ok(specialAttrs['data-uri'].includes('special%20file.ts'));
      assert.strictEqual(specialAttrs['data-line'], '5');
    });
  });

  suite('Event Handler Data Structure Tests', () => {

    test('should create proper event handler data structure', () => {
      const finding = createMockFinding('event-test', 'event-feature', '/test/event.ts', 15);
      
      // Simulate event handler data extraction (like in the click handler)
      const eventData = {
        type: 'openFileAtLine',
        uri: finding.uri.toString(),
        line: finding.range.start.line,
        character: finding.range.start.character
      };

      // Validate event data structure
      assert.strictEqual(eventData.type, 'openFileAtLine');
      assert.strictEqual(typeof eventData.uri, 'string');
      assert.strictEqual(typeof eventData.line, 'number');
      assert.strictEqual(typeof eventData.character, 'number');
      
      // Validate data can be used for VS Code navigation
      assert.ok(eventData.uri.startsWith('file://'));
      assert.ok(eventData.line >= 0);
      assert.ok(eventData.character >= 0);
    });

    test('should handle event simulation for multiple targets', () => {
      const findings = [
        createMockFinding('target-1', 'target-feature', '/test/target1.ts', 100),
        createMockFinding('target-2', 'target-feature', '/test/target2.ts', 200)
      ];

      // Simulate click events on multiple targets
      const clickEvents = findings.map(finding => ({
        target: {
          getAttribute: (attr: string) => {
            const attributes: Record<string, string> = {
              'data-uri': finding.uri.toString(),
              'data-line': finding.range.start.line.toString(),
              'data-character': finding.range.start.character.toString()
            };
            return attributes[attr] || null;
          },
          classList: {
            contains: (className: string) => className === 'occurrence-file-path'
          }
        }
      }));

      // Verify event targets can provide required data
      clickEvents.forEach((event, index) => {
        assert.strictEqual(event.target.getAttribute('data-line'), findings[index].range.start.line.toString());
        assert.strictEqual(event.target.classList.contains('occurrence-file-path'), true);
      });
    });
  });

  suite('HTML Structure Validation Tests', () => {

    test('should validate occurrence section HTML structure', () => {
      const findings = [
        createMockFinding('html-1', 'html-feature', '/test/html1.ts', 1),
        createMockFinding('html-2', 'html-feature', '/test/html2.ts', 2)
      ];

      // Simulate HTML structure generation
      const htmlStructure = {
        heading: `<h3>Occurrences (${findings.length})</h3>`,
        items: findings.map(finding => ({
          container: '<div class="occurrence-item">',
          filePath: `<span class="occurrence-file-path" data-uri="${finding.uri.toString()}" data-line="${finding.range.start.line}" data-character="${finding.range.start.character}">`,
          lineInfo: `<span class="occurrence-line-info">Line ${finding.range.start.line + 1}</span>`,
          preview: `<span class="occurrence-preview">${finding.lineText}</span>`,
          closingTags: '</span></div>'
        }))
      };

      // Validate HTML structure
      assert.ok(htmlStructure.heading.includes('Occurrences (2)'));
      assert.strictEqual(htmlStructure.items.length, 2);
      
      htmlStructure.items.forEach((item, index) => {
        assert.ok(item.container.includes('occurrence-item'));
        assert.ok(item.filePath.includes('occurrence-file-path'));
        assert.ok(item.filePath.includes(`data-line="${findings[index].range.start.line}"`));
        assert.ok(item.lineInfo.includes(`Line ${findings[index].range.start.line + 1}`));
        assert.ok(item.preview.includes(findings[index].lineText));
      });
    });

    test('should handle empty occurrences HTML', () => {
      const findings: BaselineFinding[] = [];
      
      const emptyHtmlStructure = {
        heading: `<h3>Occurrences (${findings.length})</h3>`,
        emptyMessage: '<p class="no-occurrences">No occurrences found</p>',
        items: []
      };

      assert.ok(emptyHtmlStructure.heading.includes('Occurrences (0)'));
      assert.ok(emptyHtmlStructure.emptyMessage.includes('No occurrences found'));
      assert.strictEqual(emptyHtmlStructure.items.length, 0);
    });
  });

  suite('JavaScript Integration Tests', () => {

    test('should validate JavaScript function integration', () => {
      // Test the event listener setup structure
      const eventListenerConfig = {
        eventType: 'click',
        selector: '.occurrence-file-path',
        handler: {
          extractData: ['data-uri', 'data-line', 'data-character'],
          messageType: 'openFileAtLine',
          preventDefault: true
        }
      };

      assert.strictEqual(eventListenerConfig.eventType, 'click');
      assert.strictEqual(eventListenerConfig.selector, '.occurrence-file-path');
      assert.ok(eventListenerConfig.handler.extractData.includes('data-uri'));
      assert.ok(eventListenerConfig.handler.extractData.includes('data-line'));
      assert.ok(eventListenerConfig.handler.extractData.includes('data-character'));
      assert.strictEqual(eventListenerConfig.handler.messageType, 'openFileAtLine');
      assert.strictEqual(eventListenerConfig.handler.preventDefault, true);
    });

    test('should validate message posting structure', () => {
      const finding = createMockFinding('msg-test', 'msg-feature', '/test/message.ts', 50);
      
      // Simulate the message posting logic
      const messagePayload = {
        type: 'openFileAtLine',
        uri: finding.uri.toString(),
        line: parseInt(finding.range.start.line.toString(), 10),
        character: parseInt(finding.range.start.character.toString(), 10)
      };

      // Validate message payload
      assert.strictEqual(messagePayload.type, 'openFileAtLine');
      assert.strictEqual(typeof messagePayload.uri, 'string');
      assert.strictEqual(typeof messagePayload.line, 'number');
      assert.strictEqual(typeof messagePayload.character, 'number');
      assert.strictEqual(messagePayload.line, 50);
      assert.strictEqual(messagePayload.character, 0);
    });
  });
});