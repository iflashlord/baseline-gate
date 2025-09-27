import * as assert from 'assert';
import * as vscode from 'vscode';
import { GeminiViewProvider } from '../../gemini/geminiViewProvider';
import type { GeminiSuggestion } from '../../gemini/geminiService';
import type { GeminiSuggestionState } from '../../gemini/types';
import { renderSuggestionCard } from '../../gemini/dataTransform';

function createWorkspaceState(initialSuggestions: GeminiSuggestion[] = []) {
  const storage = new Map<string, unknown>();
  storage.set('geminiSuggestions', initialSuggestions);

  return {
    get: <T>(key: string, defaultValue?: T) => {
      if (storage.has(key)) {
        return storage.get(key) as T;
      }
      return defaultValue as T;
    },
    update: async (key: string, value: unknown) => {
      storage.set(key, value);
    },
    keys: () => Array.from(storage.keys())
  } satisfies vscode.Memento;
}

function createContext(initialSuggestions: GeminiSuggestion[] = []): vscode.ExtensionContext {
  const workspaceState = createWorkspaceState(initialSuggestions);
  return {
    extensionUri: vscode.Uri.parse('file:///test-extension'),
    subscriptions: [],
    workspaceState,
    globalState: createWorkspaceState(),
    environmentVariableCollection: {
      persistent: true,
      get: () => undefined,
      replace: () => {},
      append: () => {},
      prepend: () => {},
      delete: () => {}
    },
    secrets: {
      store: async () => {},
      get: async () => undefined,
      delete: async () => {},
      onDidChange: () => new vscode.Disposable(() => {})
    },
    storageUri: undefined,
    globalStorageUri: undefined,
    logUri: undefined,
    extensionMode: vscode.ExtensionMode.Test,
    asAbsolutePath: (relativePath: string) => vscode.Uri.joinPath(vscode.Uri.parse('file:///test-extension'), relativePath).fsPath
  } as unknown as vscode.ExtensionContext;
}

type AttachedView = {
  emit: (message: unknown) => void;
  html: () => string;
};

function attachView(provider: GeminiViewProvider): AttachedView {
  const listeners: Array<(message: unknown) => void> = [];
  let htmlContent = '';
  const webview: vscode.Webview = {
    cspSource: 'test-csp',
    options: {},
    onDidReceiveMessage: (listener: (message: unknown) => void) => {
      listeners.push(listener);
      return new vscode.Disposable(() => {});
    },
    postMessage: async () => true,
    asWebviewUri: (uri: vscode.Uri) => uri,
    set html(value: string) {
      htmlContent = value;
    },
    get html(): string {
      return htmlContent;
    }
  } as unknown as vscode.Webview;

  const view = { webview } as vscode.WebviewView;
  provider.resolveWebviewView(view, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);

  return {
    emit: (message) => {
      for (const listener of listeners) {
        listener(message);
      }
    },
    html: () => webview.html
  };
}

suite('Gemini view provider', () => {
  const baseSuggestion = {
    id: '1',
    issue: 'Use of deprecated API',
    suggestion: 'Replace with supported alternative',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    status: 'success' as const
  } satisfies GeminiSuggestion;

  test('constructor normalises stored suggestions into filtered list', () => {
    const persisted: Partial<GeminiSuggestion>[] = [
      {
        id: 'persisted',
        issue: 'Stored issue',
        suggestion: 'Stored suggestion',
        timestamp: '2024-03-05T10:00:00.000Z' as unknown as Date,
        status: 'success' as const
      }
    ];

    const provider = new GeminiViewProvider(createContext(persisted as GeminiSuggestion[]));
    const state = (provider as unknown as { state: GeminiSuggestionState }).state;

    assert.strictEqual(state.suggestions.length, 1, 'should load stored suggestions');
    assert.strictEqual(state.filteredSuggestions.length, 1, 'filtered list should mirror suggestions initially');
    assert.ok(state.suggestions[0].timestamp instanceof Date, 'timestamp should be normalised to Date');

  });

  test('filterSuggestions applies case-insensitive multi-term matching', () => {
    const provider = new GeminiViewProvider(createContext([
      { ...baseSuggestion, id: 'first', feature: 'Clipboard', file: '/workspace/src/clipboard.ts', status: 'success' as const },
      { ...baseSuggestion, id: 'second', feature: 'Fetch API', file: '/workspace/src/network.ts', issue: 'Missing fetch polyfill', status: 'success' as const }
    ]));

    (provider as unknown as { filterSuggestions: (query: string) => void }).filterSuggestions(' fetch network');

    const state = (provider as unknown as { state: GeminiSuggestionState }).state;
    const filtered = state.filteredSuggestions;
    const searchQuery = state.searchQuery;

    assert.deepStrictEqual(filtered.map((item) => item.id), ['second'], 'should keep suggestions matching all terms');
    assert.strictEqual(searchQuery, 'fetch network', 'stored search query should be lower-cased and trimmed');
  });

  test('filterSuggestions resets when query is cleared', () => {
    const provider = new GeminiViewProvider(createContext([
      { ...baseSuggestion, id: 'first', status: 'success' as const },
      { ...baseSuggestion, id: 'second', issue: 'Another issue', status: 'success' as const }
    ]));

    (provider as unknown as { filterSuggestions: (query: string) => void }).filterSuggestions('another');
    (provider as unknown as { filterSuggestions: (query: string) => void }).filterSuggestions('');

    const state = (provider as unknown as { state: GeminiSuggestionState }).state;
    const filtered = state.filteredSuggestions;
    assert.strictEqual(filtered.length, 2, 'clearing the query should restore all suggestions');
  });

  test('renderSuggestionCard highlights search terms and renders metadata', () => {
    const suggestion: GeminiSuggestion = {
      ...baseSuggestion,
      id: 'render-test',
      feature: 'IndexedDB',
      file: '/app/src/storage/indexed-db.ts',
      suggestion: 'Use **IndexedDB** for offline caching.\n```js\nconst db = await open();\n```',
      status: 'success' as const
    };

    const markup = renderSuggestionCard(suggestion, 'indexed');

    assert.ok(markup.includes('<mark>Indexed</mark>'), 'issue metadata should highlight search term');
    assert.ok(markup.includes('📄'), 'file chip should include icon');
    assert.ok(markup.includes('<strong'), 'markdown should convert bold text');
    assert.ok(markup.includes('data-action="copy-code"'), 'code blocks should render copy buttons');
  });

  test('webview messages dispatch to the associated handlers', () => {
    const provider = new GeminiViewProvider(createContext([baseSuggestion]));

    const received: Record<string, unknown[]> = {
      remove: [],
      clear: [],
      search: [],
      copy: [],
      open: [],
      code: []
    };

    (provider as unknown as { removeSuggestion: (id: string) => Promise<void> }).removeSuggestion = async (id: string) => {
      received.remove.push(id);
    };
    (provider as unknown as { clearAllSuggestions: () => Promise<void> }).clearAllSuggestions = async () => {
      received.clear.push(true);
    };
    (provider as unknown as { filterSuggestions: (query: string) => void }).filterSuggestions = (query: string) => {
      received.search.push(query);
    };
    (provider as unknown as { copySuggestionToClipboard: (id: string) => Promise<void> }).copySuggestionToClipboard = async (id: string) => {
      received.copy.push(id);
    };
    (provider as unknown as { copyCodeSnippet: (code: string) => Promise<void> }).copyCodeSnippet = async (code: string) => {
      received.code.push(code);
    };
    (provider as unknown as { openFileAtLocation: (filePath: string, line?: number, character?: number) => Promise<void> }).openFileAtLocation = async (filePath: string, line?: number, character?: number) => {
      received.open.push(filePath, line, character);
    };

    const originalExecuteCommand = vscode.commands.executeCommand;
    const executed: unknown[][] = [];
    (vscode.commands as unknown as { executeCommand: (...args: unknown[]) => Thenable<unknown> }).executeCommand = async (...args: unknown[]) => {
      executed.push(args);
      return undefined;
    };

    const view = attachView(provider);

    view.emit({ type: 'removeSuggestion', id: 'remove-me' });
    view.emit({ type: 'clearAllSuggestions' });
    view.emit({ type: 'searchSuggestions', query: 'polyfill' });
    view.emit({ type: 'copySuggestion', id: 'copy-me' });
    view.emit({ type: 'openFileAtLocation', filePath: '/tmp/file.ts', line: 4, character: 2 });
    view.emit({ type: 'goToFinding', findingId: 'finding-123' });
    view.emit({ type: 'copyCodeSnippet', code: 'const sample = true;' });

    assert.deepStrictEqual(received.remove, ['remove-me']);
    assert.strictEqual(received.clear.length, 1, 'clear handler should run once');
    assert.deepStrictEqual(received.search, ['polyfill']);
    assert.deepStrictEqual(received.copy, ['copy-me']);
    assert.deepStrictEqual(received.open, ['/tmp/file.ts', 4, 2]);
    assert.deepStrictEqual(received.code, ['const sample = true;']);
    assert.deepStrictEqual(executed, [['baseline-gate.goToFinding', 'finding-123']]);

    (vscode.commands as unknown as { executeCommand: typeof originalExecuteCommand }).executeCommand = originalExecuteCommand;
  });
});
