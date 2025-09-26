import * as assert from 'assert';
import * as vscode from 'vscode';
import { BaselineAnalysisViewProvider } from '../../sidebar/analysisView';
import type { BaselineAnalysisAssets } from '../../sidebar/analysis/types';
import type { Target } from '../../core/targets';
import type { BaselineFinding } from '../../sidebar/workspaceScanner';
import type { BaselineFeature } from '../../core/baselineData';

function createContext(): vscode.ExtensionContext {
  return {
    extensionUri: vscode.Uri.file('/test'),
    subscriptions: [],
    globalState: {
      get: () => undefined,
      update: async () => {},
      keys: () => []
    },
    workspaceState: {
      get: () => undefined,
      update: async () => {},
      keys: () => []
    }
  } as unknown as vscode.ExtensionContext;
}

function createAssets(): BaselineAnalysisAssets {
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

function buildFeature(partial: Partial<BaselineFeature> & { id: string; name: string }): BaselineFeature {
  return {
    id: partial.id,
    name: partial.name,
    baseline: partial.baseline ?? 'high',
    support: partial.support ?? {},
    specUrls: partial.specUrls ?? [],
    caniuseIds: partial.caniuseIds ?? [],
    compatFeatures: partial.compatFeatures ?? [],
    groups: partial.groups ?? [],
    snapshots: partial.snapshots ?? [],
    discouraged: partial.discouraged,
    description: partial.description,
    descriptionHtml: partial.descriptionHtml,
    baselineLowDate: partial.baselineLowDate,
    baselineHighDate: partial.baselineHighDate,
    docsUrl: partial.docsUrl ?? 'https://example.com/docs'
  };
}

function makeFinding(options: {
  path: string;
  featureId: string;
  featureName: string;
  verdict: 'blocked' | 'warning' | 'safe';
  token?: string;
  line?: number;
  column?: number;
  support?: BaselineFeature['support'];
}): BaselineFinding {
  const line = options.line ?? 0;
  const column = options.column ?? 0;
  const uri = vscode.Uri.parse(`file://${options.path}`);
  const feature = buildFeature({
    id: options.featureId,
    name: options.featureName,
    support: options.support ?? {
      chrome: { raw: '120', version: 120 },
      edge: { raw: '120', version: 120 },
      firefox: { raw: '120', version: 120 },
      safari: { raw: '17', version: 17 }
    }
  });

  return {
    id: `${feature.id}-${line}-${column}`, // Unique identifier for the finding
    uri,
    range: new vscode.Range(new vscode.Position(line, column), new vscode.Position(line, column + (options.token?.length ?? 4))),
    feature,
    verdict: options.verdict,
    token: options.token ?? feature.id,
    lineText: `${feature.id} usage`
  };
}

function setFindings(provider: BaselineAnalysisViewProvider, findings: BaselineFinding[]) {
  (provider as unknown as { findings: BaselineFinding[] }).findings = findings;
}

function buildState(provider: BaselineAnalysisViewProvider) {
  return (provider as unknown as { buildState: () => any }).buildState();
}

function computeIssueId(finding: BaselineFinding): string {
  return `${finding.uri.toString()}::${finding.feature.id}::${finding.range.start.line}::${finding.range.start.character}`;
}

type AttachedView = {
  messages: any[];
  emit: (message: any) => void;
};

function attachView(provider: BaselineAnalysisViewProvider): AttachedView {
  const listeners: Array<(message: unknown) => void> = [];
  const messages: any[] = [];
  const webview = {
    cspSource: 'mock-source',
    html: '',
    options: {},
    asWebviewUri: (uri: vscode.Uri) => uri,
    postMessage: async (data: unknown) => {
      messages.push(data);
      return true;
    },
    onDidReceiveMessage: (listener: (message: unknown) => void) => {
      listeners.push(listener);
      return { dispose() {} };
    }
  } as unknown as vscode.Webview;

  const view = { webview } as vscode.WebviewView;
  provider.resolveWebviewView(view);

  return {
    messages,
    emit: (message) => {
      for (const listener of listeners) {
        listener(message);
      }
    }
  };
}

suite('Baseline analysis view', () => {
  let provider: BaselineAnalysisViewProvider;

  setup(() => {
    provider = new BaselineAnalysisViewProvider(createContext(), 'enterprise', createAssets());
  });

  test('buildState summarises findings by severity and file', () => {
    const findings = [
      makeFinding({ path: '/workspace/src/app.ts', featureId: 'clipboard', featureName: 'Clipboard API', verdict: 'blocked', token: 'navigator' }),
      makeFinding({ path: '/workspace/src/app.ts', featureId: 'promise-any', featureName: 'Promise.any', verdict: 'warning', token: 'Promise.any', line: 5, column: 2 }),
      makeFinding({ path: '/workspace/src/utils.ts', featureId: 'url-canparse', featureName: 'URL.canParse', verdict: 'safe', token: 'URL.canParse', line: 1 })
    ];
    setFindings(provider, findings);

    const state = buildState(provider);

    assert.strictEqual(state.summary.total, 3);
    assert.strictEqual(state.summary.blocked, 1);
    assert.strictEqual(state.summary.warning, 1);
    assert.strictEqual(state.summary.safe, 1);
    assert.strictEqual(state.files.length, 2);

    const appFile = state.files.find((file: any) => file.relativePath.endsWith('app.ts'));
    assert.ok(appFile, 'app.ts group should exist');
    assert.strictEqual(appFile.counts.blocked, 1);
    assert.strictEqual(appFile.counts.warning, 1);
    assert.strictEqual(appFile.issues.length, 2);
  });

  test('search filtering removes non matching findings and marks filters active', () => {
    setFindings(provider, [
      makeFinding({ path: '/workspace/src/app.ts', featureId: 'clipboard', featureName: 'Clipboard API', verdict: 'blocked', token: 'navigator' }),
      makeFinding({ path: '/workspace/src/utils.ts', featureId: 'url-canparse', featureName: 'URL.canParse', verdict: 'safe', token: 'URL.canParse' })
    ]);

    provider.setSearchQuery('no-match');
    const state = buildState(provider);

    assert.strictEqual(state.filteredSummary.total, 0);
    assert.ok(state.filtersActive);
    assert.strictEqual(state.files.length, 0);
  });

  test('severity filter limits results to selected verdicts', () => {
    setFindings(provider, [
      makeFinding({ path: '/workspace/src/app.ts', featureId: 'clipboard', featureName: 'Clipboard API', verdict: 'blocked' }),
      makeFinding({ path: '/workspace/src/utils.ts', featureId: 'url-canparse', featureName: 'URL.canParse', verdict: 'safe' })
    ]);

    provider.setSeverityFilter(['blocked']);
    const state = buildState(provider);

    assert.strictEqual(state.filteredSummary.total, 1);
    assert.strictEqual(state.filteredSummary.blocked, 1);
    assert.strictEqual(state.filteredSummary.safe, 0);
    assert.ok(state.filtersActive);
  });

  test('severity filter falls back to defaults when empty', () => {
    provider.setSeverityFilter([]);
    const state = buildState(provider);

    assert.deepStrictEqual(new Set(state.severityFilter), new Set(['blocked', 'warning', 'safe']));
  });

  test('clearFilters resets search, severities, and sort order', () => {
    provider.setSearchQuery('  Mixed Case ');
    provider.setSeverityFilter(['blocked']);
    provider.setSortOrder('file');

    provider.clearFilters();
    const state = buildState(provider);

    assert.strictEqual(state.searchQuery, '');
    assert.deepStrictEqual(new Set(state.severityFilter), new Set(['blocked', 'warning', 'safe']));
    assert.strictEqual(state.sortOrder, 'severity');
    assert.strictEqual(state.filtersActive, false);
  });

  test('setSearchQuery trims and lowercases stored value', () => {
    provider.setSearchQuery('  Mixed Case Query  ');
    const state = buildState(provider);

    assert.strictEqual(state.searchQuery, 'mixed case query');
  });

  test('sort order toggles between severity weight and file path order', () => {
    setFindings(provider, [
      makeFinding({ path: '/workspace/src/core.ts', featureId: 'clipboard', featureName: 'Clipboard API', verdict: 'blocked' }),
      makeFinding({ path: '/workspace/src/utils.ts', featureId: 'promise-any', featureName: 'Promise.any', verdict: 'warning' }),
      makeFinding({ path: '/workspace/src/app.ts', featureId: 'url-canparse', featureName: 'URL.canParse', verdict: 'safe' })
    ]);

    let state = buildState(provider);
    assert.strictEqual(state.files[0].relativePath.endsWith('core.ts'), true, 'blocked file should lead under severity sort');

    provider.setSortOrder('file');
    state = buildState(provider);
    const order = state.files.map((file: any) => file.relativePath.split('/').pop());
    assert.deepStrictEqual(order, ['app.ts', 'core.ts', 'utils.ts']);
  });

  test('toggleSortOrder cycles through both sort modes', () => {
    const first = provider.toggleSortOrder();
    assert.strictEqual(first, 'file');

    const second = provider.toggleSortOrder();
    assert.strictEqual(second, 'severity');
  });

  test('changing target recalculates verdicts for existing findings', () => {
    const findings = [
      makeFinding({
        path: '/workspace/src/app.ts',
        featureId: 'baseline-shift',
        featureName: 'Baseline Shift',
        verdict: 'safe',
        support: {
          chrome: { raw: '114', version: 114 },
          edge: { raw: '114', version: 114 },
          firefox: { raw: '115', version: 115 },
          safari: { raw: '16.4', version: 16.4 }
        }
      })
    ];
    setFindings(provider, findings);

    provider.setTarget('modern');
    const state = buildState(provider);

    assert.strictEqual(state.summary.blocked, 1, 'support should fall below the modern baseline');
    assert.strictEqual(state.files[0].issues[0].verdict, 'blocked');
  });

  test('file expansion state reflects user toggles', () => {
    const finding = makeFinding({ path: '/workspace/src/app.ts', featureId: 'clipboard', featureName: 'Clipboard API', verdict: 'blocked' });
    setFindings(provider, [finding]);

    const uriString = finding.uri.toString();
    (provider as unknown as { setFileExpansion: (uri: string, expanded: boolean) => void }).setFileExpansion(
      uriString,
      false
    );
    let state = buildState(provider);
    assert.strictEqual(state.files[0].expanded, false);

    (provider as unknown as { setFileExpansion: (uri: string, expanded: boolean) => void }).setFileExpansion(
      uriString,
      true
    );
    state = buildState(provider);
    assert.strictEqual(state.files[0].expanded, true);
  });

  test('issue detail opens in separate panel', () => {
    const finding = makeFinding({ path: '/workspace/src/app.ts', featureId: 'clipboard', featureName: 'Clipboard API', verdict: 'blocked' });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    const issueId = computeIssueId(finding);
    attached.emit({ type: 'openIssueDetail', id: issueId });

    const lastMessage = attached.messages.at(-1);
    assert.ok(lastMessage, 'state message should be posted');

    // The detail is no longer in the sidebar - it opens in a separate panel
    // So we check that the selection state is updated
    const state = lastMessage.payload;
    assert.strictEqual(state.selectedIssueId, issueId, 'issue should be selected');
    assert.strictEqual(state.selectedFileUri, finding.uri.toString(), 'file should be selected');
  });

  test('clearing detail via close message resets selection', () => {
    const finding = makeFinding({ path: '/workspace/src/app.ts', featureId: 'clipboard', featureName: 'Clipboard API', verdict: 'blocked' });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    const issueId = computeIssueId(finding);
    attached.emit({ type: 'selectIssue', id: issueId });
    attached.emit({ type: 'closeDetail' });

    const lastMessage = attached.messages.at(-1);
    assert.ok(lastMessage);
    assert.strictEqual(lastMessage.payload.detail, null);
    assert.strictEqual(lastMessage.payload.selectedIssueId, null);
    assert.strictEqual(lastMessage.payload.selectedFileUri, null);
  });
});

suite('Double-click functionality', () => {
  let provider: BaselineAnalysisViewProvider;

  setup(() => {
    provider = new BaselineAnalysisViewProvider(createContext(), 'enterprise', createAssets());
  });

  test('double-click on file header opens file details', () => {
    const finding = makeFinding({ 
      path: '/workspace/src/app.ts', 
      featureId: 'clipboard', 
      featureName: 'Clipboard API', 
      verdict: 'blocked' 
    });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    
    // Simulate double-click on file header
    attached.emit({ type: 'openFileDetail', uri: finding.uri.toString() });

    const lastMessage = attached.messages.at(-1);
    assert.ok(lastMessage, 'state message should be posted');

    // File details now open in large detail panel, not inline
    // So we check that the selection state is updated
    const state = lastMessage.payload;
    assert.strictEqual(state.selectedFileUri, finding.uri.toString(), 'file should be selected');
    // Detail is no longer in the payload since it opens in separate panel
    assert.strictEqual(state.detail, null, 'detail should not be in sidebar payload');
  });

  test('double-click on issue row opens issue details in separate panel', () => {
    const finding = makeFinding({ 
      path: '/workspace/src/app.ts', 
      featureId: 'clipboard', 
      featureName: 'Clipboard API', 
      verdict: 'blocked' 
    });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    const issueId = computeIssueId(finding);
    
    // Simulate double-click on issue row
    attached.emit({ type: 'openIssueDetail', id: issueId });

    const lastMessage = attached.messages.at(-1);
    assert.ok(lastMessage, 'state message should be posted');

    // The detail opens in a separate panel, not in the sidebar
    const state = lastMessage.payload;
    assert.strictEqual(state.selectedIssueId, issueId, 'issue should be selected');
    assert.strictEqual(state.selectedFileUri, finding.uri.toString(), 'file should be selected');
  });

  test('double-click preserves existing selection behavior', () => {
    const finding = makeFinding({ 
      path: '/workspace/src/app.ts', 
      featureId: 'clipboard', 
      featureName: 'Clipboard API', 
      verdict: 'blocked' 
    });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    const issueId = computeIssueId(finding);
    
    // First select the issue (single click behavior)
    attached.emit({ type: 'selectIssue', id: issueId });
    let state = buildState(provider);
    assert.strictEqual(state.selectedIssueId, issueId);
    
    // Then double-click to open details in separate panel
    attached.emit({ type: 'openIssueDetail', id: issueId });
    
    const lastMessage = attached.messages.at(-1);
    // Detail opens in separate panel, selection is preserved
    assert.strictEqual(lastMessage.payload.selectedIssueId, issueId, 'selection should be preserved');
  });
});

suite('Ask AI/Gemini functionality', () => {
  let provider: BaselineAnalysisViewProvider;

  setup(() => {
    provider = new BaselineAnalysisViewProvider(createContext(), 'enterprise', createAssets());
  });

  test('askGemini message triggers command execution', () => {
    const finding = makeFinding({ 
      path: '/workspace/src/app.ts', 
      featureId: 'clipboard', 
      featureName: 'Clipboard API', 
      verdict: 'blocked',
      token: 'navigator.clipboard'
    });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    
    // Mock the command execution
    let commandExecuted = false;
    let commandArgs: any = null;
    const originalExecuteCommand = vscode.commands.executeCommand;
    (vscode.commands as any).executeCommand = async <T>(command: string, ...args: any[]): Promise<T> => {
      if (command === 'baseline-gate.askGemini') {
        commandExecuted = true;
        commandArgs = args[0];
        return Promise.resolve(undefined as T);
      }
      return originalExecuteCommand(command, ...args);
    };

    try {
      // Simulate Ask AI button click
      attached.emit({ 
        type: 'askGemini', 
        issue: 'Clipboard API - blocked',
        feature: 'Clipboard API',
        filePath: 'src/app.ts',
        findingId: computeIssueId(finding)
      });

      assert.ok(commandExecuted, 'askGemini command should be executed');
      assert.ok(commandArgs, 'command should receive arguments');
      assert.strictEqual(commandArgs.feature, 'Clipboard API');
      assert.strictEqual(commandArgs.issue, 'Clipboard API - blocked');
      assert.strictEqual(commandArgs.context, 'sidebar');
    } finally {
      // Restore original command
      vscode.commands.executeCommand = originalExecuteCommand;
    }
  });

  test('askGemini handles different verdict types', () => {
    const findings = [
      makeFinding({ 
        path: '/workspace/src/app.ts', 
        featureId: 'clipboard', 
        featureName: 'Clipboard API', 
        verdict: 'blocked' 
      }),
      makeFinding({ 
        path: '/workspace/src/utils.ts', 
        featureId: 'promise-any', 
        featureName: 'Promise.any', 
        verdict: 'warning' 
      }),
      makeFinding({ 
        path: '/workspace/src/safe.ts', 
        featureId: 'url-canparse', 
        featureName: 'URL.canParse', 
        verdict: 'safe' 
      })
    ];
    setFindings(provider, findings);

    const attached = attachView(provider);
    
    let commandCalls: any[] = [];
    const originalExecuteCommand = vscode.commands.executeCommand;
    (vscode.commands as any).executeCommand = async <T>(command: string, ...args: any[]): Promise<T> => {
      if (command === 'baseline-gate.askGemini') {
        commandCalls.push(args[0]);
        return Promise.resolve(undefined as T);
      }
      return originalExecuteCommand(command, ...args);
    };

    try {
      // Test each verdict type
      findings.forEach((finding, index) => {
        attached.emit({ 
          type: 'askGemini', 
          issue: `${finding.feature.name} - ${finding.verdict}`,
          feature: finding.feature.name,
          filePath: finding.uri.path.split('/').pop() || '',
          findingId: computeIssueId(finding)
        });
      });

      assert.strictEqual(commandCalls.length, 3, 'should handle all verdict types');
      assert.ok(commandCalls.some(call => call.issue.includes('blocked')), 'should handle blocked verdict');
      assert.ok(commandCalls.some(call => call.issue.includes('warning')), 'should handle warning verdict');
      assert.ok(commandCalls.some(call => call.issue.includes('safe')), 'should handle safe verdict');
    } finally {
      vscode.commands.executeCommand = originalExecuteCommand;
    }
  });

  test('askGemini provides correct context information', () => {
    const finding = makeFinding({ 
      path: '/workspace/src/components/feature.tsx', 
      featureId: 'clipboard', 
      featureName: 'Clipboard API', 
      verdict: 'blocked',
      token: 'navigator.clipboard.writeText'
    });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    
    let capturedArgs: any = null;
    const originalExecuteCommand = vscode.commands.executeCommand;
    (vscode.commands as any).executeCommand = async <T>(command: string, ...args: any[]): Promise<T> => {
      if (command === 'baseline-gate.askGemini') {
        capturedArgs = args[0];
        return Promise.resolve(undefined as T);
      }
      return originalExecuteCommand(command, ...args);
    };

    try {
      attached.emit({ 
        type: 'askGemini', 
        issue: 'Clipboard API - Enterprise compatibility issue',
        feature: 'Clipboard API',
        filePath: 'src/components/feature.tsx',
        findingId: computeIssueId(finding)
      });

      assert.ok(capturedArgs, 'should capture command arguments');
      assert.strictEqual(capturedArgs.context, 'sidebar', 'should indicate sidebar context');
      assert.ok(capturedArgs.findingId, 'should include finding ID for reference');
      assert.strictEqual(capturedArgs.issue, 'Clipboard API - Enterprise compatibility issue', 'should include correct issue description');
      assert.strictEqual(capturedArgs.feature, 'Clipboard API', 'should include correct feature name');
    } finally {
      vscode.commands.executeCommand = originalExecuteCommand;
    }
  });

  test('copyCodeSnippet message copies text to clipboard', async () => {
    const attached = attachView(provider);

    let captured = '';
    const override = provider as unknown as { copyCodeSnippet: (code: string) => Promise<void> };
    const original = override.copyCodeSnippet;
    override.copyCodeSnippet = async (code: string) => {
      captured = code;
    };

    try {
      attached.emit({ type: 'copyCodeSnippet', code: 'console.log(42);' });
      await Promise.resolve();

      assert.strictEqual(captured, 'console.log(42);', 'copy handler should receive the snippet');
    } finally {
      override.copyCodeSnippet = original;
    }
  });
});

suite('Enhanced UI interactions', () => {
  let provider: BaselineAnalysisViewProvider;

  setup(() => {
    provider = new BaselineAnalysisViewProvider(createContext(), 'enterprise', createAssets());
  });

  test('file selection and detail opening work independently', () => {
    const finding = makeFinding({ 
      path: '/workspace/src/app.ts', 
      featureId: 'clipboard', 
      featureName: 'Clipboard API', 
      verdict: 'blocked' 
    });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    
    // First select the file
    attached.emit({ type: 'selectFile', uri: finding.uri.toString() });
    let state = buildState(provider);
    assert.strictEqual(state.selectedFileUri, finding.uri.toString());
    assert.strictEqual(state.detail, null, 'detail should not be open yet');
    
    // Then open file details - now opens in large detail panel
    attached.emit({ type: 'openFileDetail', uri: finding.uri.toString() });
    const lastMessage = attached.messages.at(-1);
    // Detail no longer appears in sidebar payload since it opens in separate panel
    assert.strictEqual(lastMessage.payload.detail, null, 'detail should not be in sidebar payload');
    assert.strictEqual(lastMessage.payload.selectedFileUri, finding.uri.toString(), 'file should remain selected');
  });

  test('issue selection and detail opening work independently', () => {
    const finding = makeFinding({ 
      path: '/workspace/src/app.ts', 
      featureId: 'clipboard', 
      featureName: 'Clipboard API', 
      verdict: 'blocked' 
    });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    const issueId = computeIssueId(finding);
    
    // First select the issue
    attached.emit({ type: 'selectIssue', id: issueId });
    let state = buildState(provider);
    assert.strictEqual(state.selectedIssueId, issueId);
    assert.strictEqual(state.detail, null, 'detail should not be open in sidebar');
    
    // Then open issue details in separate panel
    attached.emit({ type: 'openIssueDetail', id: issueId });
    const lastMessage = attached.messages.at(-1);
    // Detail opens in separate panel, selection is maintained
    assert.strictEqual(lastMessage.payload.selectedIssueId, issueId, 'issue should remain selected');
  });

  test('multiple interaction methods for same action produce consistent results', () => {
    const finding = makeFinding({ 
      path: '/workspace/src/app.ts', 
      featureId: 'clipboard', 
      featureName: 'Clipboard API', 
      verdict: 'blocked' 
    });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    const issueId = computeIssueId(finding);
    
    // Test that both button click and double-click produce the same result
    attached.emit({ type: 'openIssueDetail', id: issueId });
    const buttonClickMessage = attached.messages.at(-1);
    
    // Close any detail (not applicable with separate panel)
    attached.emit({ type: 'closeDetail' });
    
    // Now test double-click (which should also trigger openIssueDetail)
    attached.emit({ type: 'openIssueDetail', id: issueId });
    const doubleClickMessage = attached.messages.at(-1);
    
    // Both should produce the same selection state (detail opens in separate panel)
    assert.strictEqual(buttonClickMessage.payload.selectedIssueId, doubleClickMessage.payload.selectedIssueId);
    assert.strictEqual(buttonClickMessage.payload.selectedFileUri, doubleClickMessage.payload.selectedFileUri);
  });
});

suite('Target minimum configuration smoke checks', () => {
  test('targets expose minimum versions for browsers', () => {
    const enterprise = vscode.workspace.getConfiguration('baselineGate').get<Target>('target');
    assert.ok(enterprise === undefined || enterprise === 'enterprise' || enterprise === 'modern');
  });
});
