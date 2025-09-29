import * as assert from 'assert';
import * as vscode from 'vscode';
import { DetailViewStateManager } from '../../sidebar/detailView/stateManager';
import type { BaselineFinding } from '../../sidebar/workspaceScanner';
import type { BaselineFeature } from '../../core/baselineData';

/**
 * Test suite for occurrence handling functionality
 * These tests focus on the new feature-based detail view functionality
 * including occurrence grouping, state management, and navigation.
 */
suite('Occurrence Handling Tests', () => {

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

  teardown(() => {
    // Clean up state after each test
    DetailViewStateManager.clearState();
    DetailViewStateManager.clearFeatureState();
  });

  suite('Occurrence Grouping Tests', () => {

    test('should group findings by feature ID', () => {
      const findings: BaselineFinding[] = [
        createMockFinding('finding-1', 'feature-a', '/test/file1.ts', 10),
        createMockFinding('finding-2', 'feature-a', '/test/file2.ts', 20),
        createMockFinding('finding-3', 'feature-b', '/test/file3.ts', 30),
        createMockFinding('finding-4', 'feature-a', '/test/file4.ts', 40)
      ];

      // Group findings by feature ID (simulating the grouping logic)
      const groupedFindings = new Map<string, BaselineFinding[]>();
      
      findings.forEach(finding => {
        const featureId = finding.feature.id;
        if (!groupedFindings.has(featureId)) {
          groupedFindings.set(featureId, []);
        }
        groupedFindings.get(featureId)!.push(finding);
      });

      // Verify grouping results
      assert.strictEqual(groupedFindings.size, 2);
      assert.strictEqual(groupedFindings.get('feature-a')?.length, 3);
      assert.strictEqual(groupedFindings.get('feature-b')?.length, 1);

      // Verify correct findings in each group
      const featureAFindings = groupedFindings.get('feature-a')!;
      const findingIds = featureAFindings.map(f => f.id);
      assert.ok(findingIds.includes('finding-1'));
      assert.ok(findingIds.includes('finding-2'));
      assert.ok(findingIds.includes('finding-4'));
    });

    test('should handle empty findings array', () => {
      const findings: BaselineFinding[] = [];
      
      const groupedFindings = new Map<string, BaselineFinding[]>();
      findings.forEach(finding => {
        const featureId = finding.feature.id;
        if (!groupedFindings.has(featureId)) {
          groupedFindings.set(featureId, []);
        }
        groupedFindings.get(featureId)!.push(finding);
      });

      assert.strictEqual(groupedFindings.size, 0);
    });

    test('should handle single finding', () => {
      const findings = [createMockFinding('single', 'feature-x', '/test/single.ts', 1)];
      
      const groupedFindings = new Map<string, BaselineFinding[]>();
      findings.forEach(finding => {
        const featureId = finding.feature.id;
        if (!groupedFindings.has(featureId)) {
          groupedFindings.set(featureId, []);
        }
        groupedFindings.get(featureId)!.push(finding);
      });

      assert.strictEqual(groupedFindings.size, 1);
      assert.strictEqual(groupedFindings.get('feature-x')?.length, 1);
      assert.strictEqual(groupedFindings.get('feature-x')?.[0].id, 'single');
    });
  });

  suite('Feature State Management Tests', () => {

    test('should manage feature state independently from regular state', () => {
      const regularFinding = createMockFinding('regular', 'regular-feature', '/test/regular.ts', 1);
      const featureFindings = [
        createMockFinding('feature-1', 'feature-id', '/test/feature1.ts', 1),
        createMockFinding('feature-2', 'feature-id', '/test/feature2.ts', 2)
      ];

      const regularPanel = createMockPanel('regular');
      const featurePanel = createMockPanel('feature');

      // Set regular state
      DetailViewStateManager.updateState(regularPanel, regularFinding);

      // Set feature state
      DetailViewStateManager.updateFeatureState(featurePanel, 'feature-id', featureFindings);

      // Verify both states exist independently
      assert.strictEqual(DetailViewStateManager.getCurrentPanel(), regularPanel);
      assert.strictEqual(DetailViewStateManager.getCurrentFinding(), regularFinding);
      assert.strictEqual(DetailViewStateManager.getCurrentFeaturePanel(), featurePanel);
      assert.strictEqual(DetailViewStateManager.getCurrentFeatureId(), 'feature-id');
      assert.strictEqual(DetailViewStateManager.getCurrentFeatureFindings()?.length, 2);

      // Clear regular state, feature state should remain
      DetailViewStateManager.clearState();
      assert.strictEqual(DetailViewStateManager.getCurrentPanel(), undefined);
      assert.strictEqual(DetailViewStateManager.getCurrentFeaturePanel(), featurePanel);
      assert.strictEqual(DetailViewStateManager.getCurrentFeatureId(), 'feature-id');
    });

    test('should properly clear feature state', () => {
      const featureFindings = [createMockFinding('test', 'test-feature', '/test/test.ts', 1)];
      const featurePanel = createMockPanel('test');

      // Set state
      DetailViewStateManager.updateFeatureState(featurePanel, 'test-feature', featureFindings);
      assert.strictEqual(DetailViewStateManager.hasActiveFeaturePanel(), true);

      // Clear state
      DetailViewStateManager.clearFeatureState();
      assert.strictEqual(DetailViewStateManager.getCurrentFeaturePanel(), undefined);
      assert.strictEqual(DetailViewStateManager.getCurrentFeatureId(), undefined);
      assert.strictEqual(DetailViewStateManager.getCurrentFeatureFindings(), undefined);
      assert.strictEqual(DetailViewStateManager.hasActiveFeaturePanel(), false);
    });
  });

  suite('Navigation Data Structure Tests', () => {

    test('should create proper navigation data for occurrences', () => {
      const findings = [
        createMockFinding('nav-1', 'nav-feature', '/test/nav1.ts', 5),
        createMockFinding('nav-2', 'nav-feature', '/test/nav2.ts', 10),
        createMockFinding('nav-3', 'nav-feature', '/test/nav3.ts', 15)
      ];

      // Simulate creating navigation data (like we do in buildOccurrencesSection)
      const navigationData = findings.map(finding => ({
        uri: finding.uri.toString(),
        line: finding.range.start.line,
        character: finding.range.start.character,
        filePath: finding.uri.fsPath,
        lineText: finding.lineText
      }));

      assert.strictEqual(navigationData.length, 3);
      
      // Verify first navigation item
      assert.strictEqual(navigationData[0].uri, 'file:///test/nav1.ts');
      assert.strictEqual(navigationData[0].line, 5);
      assert.strictEqual(navigationData[0].character, 0);
      assert.ok(navigationData[0].filePath.includes('nav1.ts'));
      
      // Verify all items have required navigation properties
      navigationData.forEach(item => {
        assert.ok('uri' in item);
        assert.ok('line' in item);
        assert.ok('character' in item);
        assert.ok('filePath' in item);
        assert.ok('lineText' in item);
      });
    });

    test('should handle file path extraction', () => {
      const finding = createMockFinding('path-test', 'path-feature', '/complex/path/to/file.ts', 42);
      
      const navigationItem = {
        uri: finding.uri.toString(),
        line: finding.range.start.line,
        character: finding.range.start.character,
        filePath: finding.uri.fsPath,
        fileName: finding.uri.fsPath.split('/').pop() || 'unknown'
      };

      assert.strictEqual(navigationItem.line, 42);
      assert.strictEqual(navigationItem.character, 0);
      assert.strictEqual(navigationItem.fileName, 'file.ts');
      assert.ok(navigationItem.filePath.includes('complex/path/to/file.ts'));
    });
  });

  suite('Message Type Validation Tests', () => {

    test('should validate openFileAtLine message properties', () => {
      const finding = createMockFinding('msg-test', 'msg-feature', '/test/message.ts', 25);
      
      // Create message like the event handler would
      const message = {
        type: 'openFileAtLine' as const,
        uri: finding.uri.toString(),
        line: finding.range.start.line,
        character: finding.range.start.character
      };

      // Validate message structure
      assert.strictEqual(message.type, 'openFileAtLine');
      assert.strictEqual(typeof message.uri, 'string');
      assert.strictEqual(typeof message.line, 'number');
      assert.strictEqual(typeof message.character, 'number');
      assert.ok(message.uri.startsWith('file://'));
      assert.ok(message.line >= 0);
      assert.ok(message.character >= 0);
    });

    test('should handle edge cases for message creation', () => {
      // Test with line 0, character 0 (start of file)
      const startOfFile = createMockFinding('start', 'start-feature', '/test/start.ts', 0);
      const startMessage = {
        type: 'openFileAtLine' as const,
        uri: startOfFile.uri.toString(),
        line: startOfFile.range.start.line,
        character: startOfFile.range.start.character
      };

      assert.strictEqual(startMessage.line, 0);
      assert.strictEqual(startMessage.character, 0);

      // Test with larger line numbers
      const deepFile = createMockFinding('deep', 'deep-feature', '/test/deep.ts', 999);
      const deepMessage = {
        type: 'openFileAtLine' as const,
        uri: deepFile.uri.toString(),
        line: deepFile.range.start.line,
        character: deepFile.range.start.character
      };

      assert.strictEqual(deepMessage.line, 999);
      assert.strictEqual(deepMessage.character, 0);
    });
  });

  // Helper function to create mock webview panels
  function createMockPanel(title: string): vscode.WebviewPanel {
    return {
      viewType: 'baselineDetail',
      title: title,
      webview: {
        asWebviewUri: (localResource: vscode.Uri) => localResource,
        html: '',
        options: {},
        cspSource: 'vscode-webview:',
        postMessage: async () => true,
        onDidReceiveMessage: () => new vscode.Disposable(() => {})
      } as unknown as vscode.Webview,
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
});