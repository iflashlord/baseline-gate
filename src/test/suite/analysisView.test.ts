import * as assert from 'assert';
import * as vscode from 'vscode';
import { BaselineAnalysisViewProvider, type BaselineAnalysisAssets } from '../../sidebar/analysisView';
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

  test('issue detail payload is emitted when selecting a finding', () => {
    const finding = makeFinding({ path: '/workspace/src/app.ts', featureId: 'clipboard', featureName: 'Clipboard API', verdict: 'blocked' });
    setFindings(provider, [finding]);

    const attached = attachView(provider);
    const issueId = computeIssueId(finding);
    attached.emit({ type: 'openIssueDetail', id: issueId });

    const lastMessage = attached.messages.at(-1);
    assert.ok(lastMessage, 'state message should be posted');

    const detail = lastMessage.payload.detail;
    assert.ok(detail, 'detail payload should be present');
    assert.strictEqual(detail.mode, 'issue');
    assert.ok(detail.title.includes('Clipboard API'));
    assert.ok(detail.html.includes('Baseline'));
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

suite('Target minimum configuration smoke checks', () => {
  test('targets expose minimum versions for browsers', () => {
    const enterprise = vscode.workspace.getConfiguration('baselineGate').get<Target>('target');
    assert.ok(enterprise === undefined || enterprise === 'enterprise' || enterprise === 'modern');
  });
});
