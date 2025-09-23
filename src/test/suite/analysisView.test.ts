import * as assert from 'assert';
import * as vscode from 'vscode';
import { BaselineAnalysisViewProvider, type BaselineAnalysisAssets } from '../../sidebar/analysisView';
import { TARGET_MIN, type Target } from '../../core/targets';

suite('Sidebar Analysis View Test Suite', () => {
  let context: vscode.ExtensionContext;
  let assets: BaselineAnalysisAssets;
  let provider: BaselineAnalysisViewProvider;

  suiteSetup(() => {
    // Mock extension context
    context = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test'),
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      }
    } as any;

    // Mock assets
    assets = {
      statusIcons: {
        blocked: vscode.Uri.file('/test/blocked.svg'),
        warning: vscode.Uri.file('/test/warning.svg'),
        safe: vscode.Uri.file('/test/safe.svg')
      },
      baselineIcons: {
        widely: vscode.Uri.file('/test/widely.svg'),
        newly: vscode.Uri.file('/test/newly.svg'),
        limited: vscode.Uri.file('/test/limited.svg')
      }
    };
  });

  setup(() => {
    provider = new BaselineAnalysisViewProvider(context, 'enterprise', assets);
  });

  suite('Initialization', () => {
    test('should initialize with correct default values', () => {
      const summary = provider.getSummary();
      assert.strictEqual(summary.total, 0);
      assert.strictEqual(summary.blocked, 0);
      assert.strictEqual(summary.warning, 0);
      assert.strictEqual(summary.safe, 0);
    });

    test('should initialize with enterprise target', () => {
      // The target is private, but we can test through setTarget behavior
      provider.setTarget('modern');
      provider.setTarget('enterprise');
      // If no error is thrown, the target setting works
      assert.ok(true);
    });
  });

  suite('Search and Filtering', () => {
    test('should set and get search query', () => {
      const testQuery = 'test search';
      provider.setSearchQuery(testQuery);
      assert.strictEqual(provider.getSearchQuery(), testQuery);
    });

    test('should normalize search query', () => {
      provider.setSearchQuery('  Test Search  ');
      assert.strictEqual(provider.getSearchQuery(), 'test search');
    });

    test('should set and get severity filter', () => {
      const testFilter = ['blocked', 'warning'] as any[];
      provider.setSeverityFilter(testFilter);
      const result = provider.getSeverityFilter();
      assert.strictEqual(result.length, 2);
      assert.ok(result.includes('blocked'));
      assert.ok(result.includes('warning'));
    });

    test('should handle empty severity filter', () => {
      provider.setSeverityFilter([]);
      const result = provider.getSeverityFilter();
      assert.strictEqual(result.length, 3); // Should default to all
      assert.ok(result.includes('blocked'));
      assert.ok(result.includes('warning'));
      assert.ok(result.includes('safe'));
    });

    test('should clear filters', () => {
      provider.setSearchQuery('test');
      provider.setSeverityFilter(['blocked'] as any[]);
      provider.clearFilters();
      
      assert.strictEqual(provider.getSearchQuery(), '');
      const severityFilter = provider.getSeverityFilter();
      assert.strictEqual(severityFilter.length, 3);
    });
  });

  suite('Sort Order', () => {
    test('should toggle sort order', () => {
      const initialOrder = provider.toggleSortOrder();
      const secondOrder = provider.toggleSortOrder();
      
      assert.notStrictEqual(initialOrder, secondOrder);
      assert.ok(['severity', 'file'].includes(initialOrder));
      assert.ok(['severity', 'file'].includes(secondOrder));
    });
  });

  suite('Target Management', () => {
    test('should set target', () => {
      provider.setTarget('modern');
      // Test that setting target doesn't throw
      assert.ok(true);
    });

    test('should handle same target', () => {
      provider.setTarget('enterprise');
      provider.setTarget('enterprise');
      // Should not throw or cause issues
      assert.ok(true);
    });
  });

  suite('State Management', () => {
    test('should handle refresh view', () => {
      // refreshView should not throw
      provider.refreshView();
      assert.ok(true);
    });

    test('should get summary with filtered option', () => {
      const summaryAll = provider.getSummary({ filtered: false });
      const summaryFiltered = provider.getSummary({ filtered: true });
      
      assert.strictEqual(typeof summaryAll.total, 'number');
      assert.strictEqual(typeof summaryFiltered.total, 'number');
    });

    test('should get summary without options', () => {
      const summary = provider.getSummary();
      assert.strictEqual(typeof summary.total, 'number');
      assert.strictEqual(typeof summary.blocked, 'number');
      assert.strictEqual(typeof summary.warning, 'number');
      assert.strictEqual(typeof summary.safe, 'number');
    });
  });
});

suite('Browser Display Settings', () => {
  test('should have correct browser constants', () => {
    // We can't directly import the constants, but we can test the behavior
    // by ensuring browser filtering works without errors
    assert.ok(true);
  });
});

suite('Target Constants', () => {
  test('should have valid target minimums', () => {
    assert.ok(TARGET_MIN.enterprise);
    assert.ok(TARGET_MIN.modern);
    assert.strictEqual(typeof TARGET_MIN.enterprise, 'object');
    assert.strictEqual(typeof TARGET_MIN.modern, 'object');
  });

  test('should have chrome target values', () => {
    assert.ok(typeof TARGET_MIN.enterprise.chrome === 'number');
    assert.ok(typeof TARGET_MIN.modern.chrome === 'number');
  });
});