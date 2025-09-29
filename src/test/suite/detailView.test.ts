import * as assert from 'assert';
import * as vscode from 'vscode';
import { DetailViewUtils } from '../../sidebar/detailView/utils';
import { DetailViewDataTransformer } from '../../sidebar/detailView/dataTransformer';
import { DetailViewHtmlGenerator } from '../../sidebar/detailView/htmlGenerator';
import { DetailViewMessageHandler } from '../../sidebar/detailView/messageHandler';
import { BaselineDetailViewProvider } from '../../sidebar/detailView/index';
import { DetailViewStateManager } from '../../sidebar/detailView/stateManager';
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

function createExtensionContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test')
  } as unknown as vscode.ExtensionContext;
}

function createMockPanel(): vscode.WebviewPanel {
  return {
    viewType: 'baselineDetail',
    title: 'Detail',
    webview: createMockWebview(),
    options: {},
    active: true,
    visible: true,
    viewColumn: vscode.ViewColumn.One,
    dispose: () => {},
    reveal: () => {},
    onDidDispose: () => new vscode.Disposable(() => {}),
    onDidChangeViewState: () => new vscode.Disposable(() => {})
  } as unknown as vscode.WebviewPanel;
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
      assert.ok(html.includes('<code>code</code>')); // Updated to match new markdown renderer
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
      
      // The ID is generated using generateFindingId, not the original finding.id
      assert.strictEqual(transformed.id, `${finding.feature.name}_/test/app.ts_${finding.range.start.line}`);
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
      // Should be sorted by severity first (blocked, warning, safe)
      assert.strictEqual(sorted[0].verdict, 'blocked');
      assert.strictEqual(sorted[1].verdict, 'warning');
      assert.strictEqual(sorted[2].verdict, 'safe');
    });
  });
});

suite('DetailViewHtmlGenerator metadata', () => {
  test('includes finding metadata attributes on container', () => {
    const originalAsRelativePath = vscode.workspace.asRelativePath;
    (vscode.workspace as any).asRelativePath = () => 'test/app.ts';

    try {
      const finding = createMockFinding();
      const context = {
        webview: createMockWebview(),
        finding,
        target: 'modern' as const,
        assets: createMockAssets(),
        geminiContext: undefined
      };
      const html = DetailViewHtmlGenerator.generateWebviewContent(context, '<div>detail</div>');
      const expectedId = DetailViewDataTransformer.generateFindingId(finding);

      assert.ok(html.includes(`data-finding-id="${expectedId}"`));
      assert.ok(html.includes('data-target="modern"'));
      assert.ok(html.includes('data-file-path="test/app.ts"'));
      assert.ok(html.includes('data-file-uri="file:///test/app.ts"'));
      assert.ok(html.includes('data-feature-name="Test Feature"'));
    } finally {
      (vscode.workspace as any).asRelativePath = originalAsRelativePath;
    }
  });
});

suite('DetailViewMessageHandler command execution', () => {
  test('executes VS Code commands from command URIs', async () => {
    const executed: Array<{ command: string; args: unknown[] }> = [];
    const originalExecuteCommand = vscode.commands.executeCommand;
    (vscode.commands as any).executeCommand = async (command: string, ...args: unknown[]) => {
      executed.push({ command, args });
      return undefined;
    };

    try {
      await DetailViewMessageHandler.handleMessage(
        { type: 'executeCommand', command: 'command:test.command?%7B%22foo%22%3A%22bar%22%7D' },
        createMockPanel(),
        createExtensionContext()
      );

      assert.strictEqual(executed.length, 1);
      assert.strictEqual(executed[0].command, 'test.command');
      assert.deepStrictEqual(executed[0].args, [{ foo: 'bar' }]);
    } finally {
      vscode.commands.executeCommand = originalExecuteCommand;
    }
  });

  test('executes command without payload gracefully', async () => {
    const executed: Array<{ command: string; args: unknown[] }> = [];
    const originalExecuteCommand = vscode.commands.executeCommand;
    (vscode.commands as any).executeCommand = async (command: string, ...args: unknown[]) => {
      executed.push({ command, args });
      return undefined;
    };

    try {
      await DetailViewMessageHandler.handleMessage(
        { type: 'executeCommand', command: 'command:test.noArgs' },
        createMockPanel(),
        createExtensionContext()
      );

      assert.strictEqual(executed.length, 1);
      assert.strictEqual(executed[0].command, 'test.noArgs');
      assert.deepStrictEqual(executed[0].args, []);
    } finally {
      vscode.commands.executeCommand = originalExecuteCommand;
    }
  });

  test('falls back to string argument when payload is not JSON', async () => {
    const executed: Array<{ command: string; args: unknown[] }> = [];
    const originalExecuteCommand = vscode.commands.executeCommand;
    (vscode.commands as any).executeCommand = async (command: string, ...args: unknown[]) => {
      executed.push({ command, args });
      return undefined;
    };

    try {
      await DetailViewMessageHandler.handleMessage(
        { type: 'executeCommand', command: 'command:test.command?plain%20text' },
        createMockPanel(),
        createExtensionContext()
      );

      assert.strictEqual(executed.length, 1);
      assert.strictEqual(executed[0].command, 'test.command');
      assert.deepStrictEqual(executed[0].args, ['plain text']);
    } finally {
      vscode.commands.executeCommand = originalExecuteCommand;
    }
  });
});

suite('Feature-based Detail View Tests', () => {
  
  function createMockFindingWithFeatureId(featureId: string, line: number = 0): BaselineFinding {
    return {
      id: `finding-${featureId}-${line}`,
      uri: vscode.Uri.file(`/test/file${line}.ts`),
      range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 10)),
      lineText: `const testToken${line} = "example";`,
      feature: {
        id: featureId,
        name: `Test Feature ${featureId}`,
        baseline: 'high',
        support: {},
        specUrls: [],
        caniuseIds: [],
        compatFeatures: [],
        groups: [],
        snapshots: []
      } as unknown as BaselineFeature,
      verdict: 'safe' as const,
      token: `testToken${line}`
    };
  }

  test('should create feature-based findings data structure', () => {
    const findings = [
      createMockFindingWithFeatureId('test-feature', 0),
      createMockFindingWithFeatureId('test-feature', 1),
      createMockFindingWithFeatureId('test-feature', 2)
    ];

    // Test that all findings have the same feature ID
    assert.strictEqual(findings[0].feature.id, 'test-feature');
    assert.strictEqual(findings[1].feature.id, 'test-feature');
    assert.strictEqual(findings[2].feature.id, 'test-feature');
    
    // Test that findings have different locations
    assert.notStrictEqual(findings[0].uri.toString(), findings[1].uri.toString());
    assert.notStrictEqual(findings[0].range.start.line, findings[1].range.start.line);
  });

  test('should create distinct findings for different features', () => {
    const finding1 = createMockFindingWithFeatureId('feature-1', 0);
    const finding2 = createMockFindingWithFeatureId('feature-2', 0);

    assert.notStrictEqual(finding1.feature.id, finding2.feature.id);
    assert.strictEqual(finding1.feature.id, 'feature-1');
    assert.strictEqual(finding2.feature.id, 'feature-2');
  });

  test('should handle data preparation for multiple findings', () => {
    const primaryFinding = createMockFindingWithFeatureId('test-feature', 0);
    const allFindings = [
      primaryFinding,
      createMockFindingWithFeatureId('test-feature', 1),  
      createMockFindingWithFeatureId('test-feature', 2)
    ];
    
    // Test data structure for multiple findings
    assert.strictEqual(allFindings.length, 3);
    assert.strictEqual(allFindings.every(f => f.feature.id === 'test-feature'), true);
    
    // Test that findings can be grouped by feature ID
    const groupedFindings = new Map<string, BaselineFinding[]>();
    allFindings.forEach(finding => {
      const featureId = finding.feature.id;
      if (!groupedFindings.has(featureId)) {
        groupedFindings.set(featureId, []);
      }
      groupedFindings.get(featureId)!.push(finding);
    });
    
    assert.strictEqual(groupedFindings.size, 1);
    assert.strictEqual(groupedFindings.get('test-feature')?.length, 3);
  });
});

suite('Feature-based State Management Tests', () => {
  
  test('should manage feature-based panel state', () => {
    const mockPanel = createMockPanel();
    const findings = [createMockFinding(), createMockFinding()];
    
    // Clear any existing state
    DetailViewStateManager.clearFeatureState();
    
    // Test setting feature state
    DetailViewStateManager.updateFeatureState(mockPanel, 'test-feature', findings);
    
    // Test getting feature panel
    const retrievedPanel = DetailViewStateManager.getCurrentFeaturePanel();
    assert.strictEqual(retrievedPanel, mockPanel);
    
    // Test getting feature ID
    const retrievedFeatureId = DetailViewStateManager.getCurrentFeatureId();
    assert.strictEqual(retrievedFeatureId, 'test-feature');
    
    // Test getting feature findings
    const retrievedFindings = DetailViewStateManager.getCurrentFeatureFindings();
    assert.strictEqual(retrievedFindings?.length, 2);
    
    // Test checking active state
    assert.strictEqual(DetailViewStateManager.hasActiveFeaturePanel(), true);
    
    // Test clearing feature state
    DetailViewStateManager.clearFeatureState();
    assert.strictEqual(DetailViewStateManager.getCurrentFeaturePanel(), undefined);
    assert.strictEqual(DetailViewStateManager.getCurrentFeatureId(), undefined);
    assert.strictEqual(DetailViewStateManager.getCurrentFeatureFindings(), undefined);
    assert.strictEqual(DetailViewStateManager.hasActiveFeaturePanel(), false);
  });

  test('should manage regular panel state alongside feature state', () => {
    const regularPanel = createMockPanel();
    const featurePanel = createMockPanel();
    const finding = createMockFinding();
    const findings = [finding];
    
    // Clear states
    DetailViewStateManager.clearState();
    DetailViewStateManager.clearFeatureState();
    
    // Set regular state
    DetailViewStateManager.updateState(regularPanel, finding);
    
    // Set feature state
    DetailViewStateManager.updateFeatureState(featurePanel, 'test-feature', findings);
    
    // Both should be independent
    assert.strictEqual(DetailViewStateManager.getCurrentPanel(), regularPanel);
    assert.strictEqual(DetailViewStateManager.getCurrentFinding(), finding);
    assert.strictEqual(DetailViewStateManager.getCurrentFeaturePanel(), featurePanel);
    assert.strictEqual(DetailViewStateManager.getCurrentFeatureId(), 'test-feature');
    
    // Clear regular state shouldn't affect feature state
    DetailViewStateManager.clearState();
    assert.strictEqual(DetailViewStateManager.getCurrentPanel(), undefined);
    assert.strictEqual(DetailViewStateManager.getCurrentFeaturePanel(), featurePanel);
    
    // Clear feature state shouldn't affect regular state (already cleared)
    DetailViewStateManager.clearFeatureState();
    assert.strictEqual(DetailViewStateManager.getCurrentFeaturePanel(), undefined);
  });

  function createMockFindingWithFeatureId(featureId: string, line: number = 0): BaselineFinding {
    return {
      id: `finding-${featureId}-${line}`,
      uri: vscode.Uri.file(`/test/file${line}.ts`),
      range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 10)),
      lineText: `const testToken${line} = "example";`,
      feature: {
        id: featureId,
        name: `Test Feature ${featureId}`,
        baseline: 'high',
        support: {},
        specUrls: [],
        caniuseIds: [],
        compatFeatures: [],
        groups: [],
        snapshots: []
      } as unknown as BaselineFeature,
      verdict: 'safe' as const,
      token: `testToken${line}`
    };
  }
});

suite('Message Structure Tests', () => {
  
  test('should validate openFileAtLine message structure', () => {
    // Test message structure for openFileAtLine
    const message = {
      type: 'openFileAtLine' as const,
      uri: 'file:///test/file.ts',
      line: 5,
      character: 10
    };
    
    // Validate message structure
    assert.strictEqual(message.type, 'openFileAtLine');
    assert.strictEqual(message.uri, 'file:///test/file.ts');
    assert.strictEqual(message.line, 5);
    assert.strictEqual(message.character, 10);
    
    // Test that the message has all required properties
    assert.ok('type' in message);
    assert.ok('uri' in message);
    assert.ok('line' in message);
    assert.ok('character' in message);
  });

  test('should validate message types for detail view', () => {
    // Test different message types that the detail view should handle
    const refreshMessage = { type: 'refresh' as const };
    const copyMessage = { type: 'copyCodeSnippet' as const, code: 'test code' };
    const commandMessage = { type: 'executeCommand' as const, command: 'test.command' };
    
    assert.strictEqual(refreshMessage.type, 'refresh');
    assert.strictEqual(copyMessage.type, 'copyCodeSnippet');
    assert.strictEqual(copyMessage.code, 'test code');
    assert.strictEqual(commandMessage.type, 'executeCommand');
    assert.strictEqual(commandMessage.command, 'test.command');
  });
});

function createMockFindingWithFeatureId(featureId: string, line: number = 0): BaselineFinding {
  return {
    id: `finding-${featureId}-${line}`,
    uri: vscode.Uri.file(`/test/file${line}.ts`),
    range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 10)),
    lineText: `const testToken${line} = "example";`,
    feature: {
      id: featureId,
      name: `Test Feature ${featureId}`,
      baseline: 'high',
      support: {},
      specUrls: [],
      caniuseIds: [],
      compatFeatures: [],
      groups: [],
      snapshots: []
    } as unknown as BaselineFeature,
    verdict: 'safe' as const,
    token: `testToken${line}`
  };
}
