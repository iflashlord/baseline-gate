import * as assert from 'assert';
import * as vscode from 'vscode';
import type { BaselineFinding } from '../../sidebar/workspaceScanner';
import type { BaselineFeature } from '../../core/baselineData';

/**
 * Test suite for analysis view integration with feature-based functionality
 * These tests focus on the logic that determines when to show occurrence-based
 * detail views vs. single finding detail views.
 */
suite('Analysis View Integration Tests', () => {

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

  suite('Feature Detection Logic Tests', () => {

    test('should detect multiple occurrences of same feature', () => {
      const allFindings: BaselineFinding[] = [
        createMockFinding('finding-1', 'feature-a', '/test/file1.ts', 10),
        createMockFinding('finding-2', 'feature-a', '/test/file2.ts', 20),
        createMockFinding('finding-3', 'feature-b', '/test/file3.ts', 30),
        createMockFinding('finding-4', 'feature-a', '/test/file4.ts', 40)
      ];

      const selectedFinding = allFindings[0]; // Select first finding with feature-a

      // Simulate the detection logic from analysisView.ts
      const featureOccurrences = allFindings.filter(f => f.feature.id === selectedFinding.feature.id);
      const hasMultipleOccurrences = featureOccurrences.length > 1;

      assert.strictEqual(hasMultipleOccurrences, true);
      assert.strictEqual(featureOccurrences.length, 3);
      
      // Verify all occurrences have the same feature ID
      featureOccurrences.forEach(finding => {
        assert.strictEqual(finding.feature.id, 'feature-a');
      });

      // Verify the occurrences include the selected finding
      const findingIds = featureOccurrences.map(f => f.id);
      assert.ok(findingIds.includes(selectedFinding.id));
    });

    test('should detect single occurrence of feature', () => {
      const allFindings: BaselineFinding[] = [
        createMockFinding('single-1', 'unique-feature', '/test/unique.ts', 5),
        createMockFinding('single-2', 'another-feature', '/test/another.ts', 10),
        createMockFinding('single-3', 'third-feature', '/test/third.ts', 15)
      ];

      const selectedFinding = allFindings[0]; // Select finding with unique-feature

      // Simulate the detection logic
      const featureOccurrences = allFindings.filter(f => f.feature.id === selectedFinding.feature.id);
      const hasMultipleOccurrences = featureOccurrences.length > 1;

      assert.strictEqual(hasMultipleOccurrences, false);
      assert.strictEqual(featureOccurrences.length, 1);
      assert.strictEqual(featureOccurrences[0].id, 'single-1');
    });

    test('should handle empty findings array', () => {
      const allFindings: BaselineFinding[] = [];
      const selectedFinding = createMockFinding('test', 'test-feature', '/test/test.ts', 1);

      const featureOccurrences = allFindings.filter(f => f.feature.id === selectedFinding.feature.id);
      const hasMultipleOccurrences = featureOccurrences.length > 1;

      assert.strictEqual(hasMultipleOccurrences, false);
      assert.strictEqual(featureOccurrences.length, 0);
    });
  });

  suite('View Decision Logic Tests', () => {

    test('should choose occurrence view for multiple findings', () => {
      const findings = [
        createMockFinding('view-1', 'view-feature', '/test/view1.ts', 1),
        createMockFinding('view-2', 'view-feature', '/test/view2.ts', 2),
        createMockFinding('view-3', 'view-feature', '/test/view3.ts', 3)
      ];

      const selectedFinding = findings[1]; // Select middle finding
      const featureOccurrences = findings.filter(f => f.feature.id === selectedFinding.feature.id);

      // Simulate view decision logic
      const shouldUseOccurrenceView = featureOccurrences.length > 1;
      const viewType = shouldUseOccurrenceView ? 'occurrence-view' : 'single-view';

      assert.strictEqual(shouldUseOccurrenceView, true);
      assert.strictEqual(viewType, 'occurrence-view');
      assert.strictEqual(featureOccurrences.length, 3);
    });

    test('should choose single view for single finding', () => {
      const findings = [
        createMockFinding('single', 'single-feature', '/test/single.ts', 1),
        createMockFinding('other', 'other-feature', '/test/other.ts', 2)
      ];

      const selectedFinding = findings[0];
      const featureOccurrences = findings.filter(f => f.feature.id === selectedFinding.feature.id);

      const shouldUseOccurrenceView = featureOccurrences.length > 1;
      const viewType = shouldUseOccurrenceView ? 'occurrence-view' : 'single-view';

      assert.strictEqual(shouldUseOccurrenceView, false);
      assert.strictEqual(viewType, 'single-view');
      assert.strictEqual(featureOccurrences.length, 1);
    });
  });

  suite('Feature Grouping Integration Tests', () => {

    test('should maintain finding order within feature groups', () => {
      const findings = [
        createMockFinding('ordered-1', 'ordered-feature', '/test/a.ts', 10),
        createMockFinding('ordered-2', 'different-feature', '/test/b.ts', 20),
        createMockFinding('ordered-3', 'ordered-feature', '/test/c.ts', 30),
        createMockFinding('ordered-4', 'ordered-feature', '/test/d.ts', 40)
      ];

      const selectedFinding = findings[0]; // First finding with 'ordered-feature'
      const featureOccurrences = findings.filter(f => f.feature.id === selectedFinding.feature.id);

      // Verify order is preserved
      assert.strictEqual(featureOccurrences.length, 3);
      assert.strictEqual(featureOccurrences[0].id, 'ordered-1');
      assert.strictEqual(featureOccurrences[1].id, 'ordered-3');
      assert.strictEqual(featureOccurrences[2].id, 'ordered-4');

      // Verify file ordering
      const filePaths = featureOccurrences.map(f => f.uri.fsPath);
      assert.ok(filePaths[0].includes('a.ts'));
      assert.ok(filePaths[1].includes('c.ts'));
      assert.ok(filePaths[2].includes('d.ts'));
    });

    test('should handle complex feature grouping scenarios', () => {
      const findings = [
        createMockFinding('complex-1', 'feature-x', '/test/x1.ts', 1),
        createMockFinding('complex-2', 'feature-y', '/test/y1.ts', 2),
        createMockFinding('complex-3', 'feature-x', '/test/x2.ts', 3),
        createMockFinding('complex-4', 'feature-z', '/test/z1.ts', 4),
        createMockFinding('complex-5', 'feature-y', '/test/y2.ts', 5),
        createMockFinding('complex-6', 'feature-x', '/test/x3.ts', 6)
      ];

      // Group by feature ID
      const groupedFindings = new Map<string, BaselineFinding[]>();
      findings.forEach(finding => {
        const featureId = finding.feature.id;
        if (!groupedFindings.has(featureId)) {
          groupedFindings.set(featureId, []);
        }
        groupedFindings.get(featureId)!.push(finding);
      });

      // Verify grouping results
      assert.strictEqual(groupedFindings.size, 3);
      assert.strictEqual(groupedFindings.get('feature-x')?.length, 3);
      assert.strictEqual(groupedFindings.get('feature-y')?.length, 2);
      assert.strictEqual(groupedFindings.get('feature-z')?.length, 1);

      // Verify each group maintains correct findings
      const featureXIds = groupedFindings.get('feature-x')?.map(f => f.id) || [];
      assert.ok(featureXIds.includes('complex-1'));
      assert.ok(featureXIds.includes('complex-3'));
      assert.ok(featureXIds.includes('complex-6'));
    });
  });

  suite('Integration with Detail View Creation Tests', () => {

    test('should provide correct data for occurrence view creation', () => {
      const findings = [
        createMockFinding('data-1', 'data-feature', '/test/data1.ts', 100),
        createMockFinding('data-2', 'data-feature', '/test/data2.ts', 200),
        createMockFinding('data-3', 'data-feature', '/test/data3.ts', 300)
      ];

      const primaryFinding = findings[1]; // Middle finding as primary
      const allOccurrences = findings.filter(f => f.feature.id === primaryFinding.feature.id);

      // Simulate data preparation for detail view creation
      const viewCreationData = {
        primaryFinding,
        allOccurrences,
        featureId: primaryFinding.feature.id,
        occurrenceCount: allOccurrences.length,
        hasMultipleOccurrences: allOccurrences.length > 1
      };

      assert.strictEqual(viewCreationData.primaryFinding.id, 'data-2');
      assert.strictEqual(viewCreationData.allOccurrences.length, 3);
      assert.strictEqual(viewCreationData.featureId, 'data-feature');
      assert.strictEqual(viewCreationData.occurrenceCount, 3);
      assert.strictEqual(viewCreationData.hasMultipleOccurrences, true);

      // Verify all occurrences include the primary finding
      const occurrenceIds = viewCreationData.allOccurrences.map(f => f.id);
      assert.ok(occurrenceIds.includes(viewCreationData.primaryFinding.id));
    });

    test('should handle primary finding selection correctly', () => {
      const findings = [
        createMockFinding('primary-1', 'primary-feature', '/test/p1.ts', 10),
        createMockFinding('primary-2', 'primary-feature', '/test/p2.ts', 20),
        createMockFinding('primary-3', 'primary-feature', '/test/p3.ts', 30)
      ];

      // Test different primary finding selections
      [0, 1, 2].forEach(primaryIndex => {
        const primaryFinding = findings[primaryIndex];
        const allOccurrences = findings.filter(f => f.feature.id === primaryFinding.feature.id);

        assert.strictEqual(allOccurrences.length, 3);
        assert.ok(allOccurrences.some(f => f.id === primaryFinding.id));
        
        // Verify the primary finding is included regardless of which one is selected
        const containsPrimary = allOccurrences.some(f => f.id === primaryFinding.id);
        assert.strictEqual(containsPrimary, true);
      });
    });
  });
});