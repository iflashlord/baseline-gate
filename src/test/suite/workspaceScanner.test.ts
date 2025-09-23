import * as assert from 'assert';
import * as vscode from 'vscode';
import { scanWorkspaceForBaseline, type BaselineFinding } from '../../sidebar/workspaceScanner';

type WorkspaceFindFiles = typeof vscode.workspace.findFiles;
type WorkspaceOpenTextDocument = typeof vscode.workspace.openTextDocument;

suite('workspace scanner integration', () => {
  let originalFindFiles: WorkspaceFindFiles;
  let originalOpenTextDocument: WorkspaceOpenTextDocument;
  let originalWorkspaceFolders: readonly vscode.WorkspaceFolder[] | undefined;

  const jsUri = vscode.Uri.parse('file:///workspace/src/app.ts');
  const cssUri = vscode.Uri.parse('file:///workspace/src/styles.css');

  suiteSetup(() => {
    originalFindFiles = vscode.workspace.findFiles;
    originalOpenTextDocument = vscode.workspace.openTextDocument;
    originalWorkspaceFolders = vscode.workspace.workspaceFolders;
  });

  suiteTeardown(() => {
    Object.defineProperty(vscode.workspace, 'findFiles', {
      value: originalFindFiles,
      configurable: true
    });
    Object.defineProperty(vscode.workspace, 'openTextDocument', {
      value: originalOpenTextDocument,
      configurable: true
    });
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: originalWorkspaceFolders,
      configurable: true
    });
  });

  setup(() => {
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.parse('file:///workspace') }],
      configurable: true
    });

    Object.defineProperty(vscode.workspace, 'findFiles', {
      value: (async (include: vscode.GlobPattern) => {
        const pattern = include.toString();
        if (pattern.includes('js') || pattern.includes('ts')) {
          return [jsUri];
        }
        return [cssUri];
      }) as WorkspaceFindFiles,
      configurable: true
    });

    Object.defineProperty(vscode.workspace, 'openTextDocument', {
      value: (async (uri: vscode.Uri | string) => {
        const target = uri instanceof vscode.Uri ? uri : vscode.Uri.parse(uri);
        if (target.toString() === jsUri.toString()) {
          return createDocument(
            [
              'async function example(tasks) {',
              '  await navigator.clipboard.readText();',
              '  return Promise.any(tasks);',
              '}'
            ].join('\n'),
            target
          );
        }
        return createDocument('main:has(article) { text-wrap: balance; }', target);
      }) as unknown as WorkspaceOpenTextDocument,
      configurable: true
    });
  });

  teardown(() => {
    Object.defineProperty(vscode.workspace, 'findFiles', {
      value: originalFindFiles,
      configurable: true
    });
    Object.defineProperty(vscode.workspace, 'openTextDocument', {
      value: originalOpenTextDocument,
      configurable: true
    });
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: originalWorkspaceFolders,
      configurable: true
    });
  });

  test('scanWorkspaceForBaseline indexes JS and CSS findings', async () => {
    const findings = await scanWorkspaceForBaseline('enterprise');

    const ids = findings.map((finding) => finding.feature.id);
    assert.ok(ids.includes('async-clipboard'), 'should detect async clipboard usage');
    assert.ok(ids.includes('promise-any'), 'should detect Promise.any usage');
    assert.ok(ids.includes('has'), 'should detect :has CSS usage');
    assert.ok(ids.includes('text-wrap'), 'should detect text-wrap CSS usage');

    const hasJsFinding = findings.find((finding) => finding.uri.toString() === jsUri.toString());
    const hasCssFinding = findings.find((finding) => finding.uri.toString() === cssUri.toString());
    assert.ok(hasJsFinding, 'JS file should produce findings');
    assert.ok(hasCssFinding, 'CSS file should produce findings');

    const clipboardFinding = findings.find((finding) => finding.feature.id === 'async-clipboard') as BaselineFinding;
    assert.strictEqual(clipboardFinding.range.start.line >= 0, true);
    assert.strictEqual(clipboardFinding.token.includes('navigator.clipboard'), true);
  });

  test('scanWorkspaceForBaseline sorts findings by file then severity', async () => {
    const findings = await scanWorkspaceForBaseline('enterprise');
    const ordered = [...findings];
    const sorted = [...findings].sort(compareLikeScanner);

    assert.deepStrictEqual(ordered, sorted, 'findings should already be sorted deterministically');
  });
});

function createDocument(text: string, uri: vscode.Uri): vscode.TextDocument {
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  return {
    uri,
    getText: () => normalized,
    positionAt(offset: number) {
      let remainder = offset;
      for (let line = 0; line < lines.length; line += 1) {
        const lineLength = lines[line].length;
        if (remainder <= lineLength) {
          return new vscode.Position(line, remainder);
        }
        remainder -= lineLength + 1;
      }
      const last = lines.length - 1;
      return new vscode.Position(last, lines[last]?.length ?? 0);
    },
    lineAt(line: number) {
      const value = lines[line] ?? '';
      const range = new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, value.length));
      return { text: value, range } as unknown as vscode.TextLine;
    }
  } as unknown as vscode.TextDocument;
}

function compareLikeScanner(a: BaselineFinding, b: BaselineFinding): number {
  if (a.uri.fsPath !== b.uri.fsPath) {
    return a.uri.fsPath.localeCompare(b.uri.fsPath);
  }
  const weight = (verdict: BaselineFinding['verdict']) => {
    switch (verdict) {
      case 'blocked':
        return 3;
      case 'warning':
        return 2;
      case 'safe':
        return 1;
      default:
        return 0;
    }
  };
  const verdictDiff = weight(b.verdict) - weight(a.verdict);
  if (verdictDiff !== 0) {
    return verdictDiff;
  }
  if (a.range.start.line !== b.range.start.line) {
    return a.range.start.line - b.range.start.line;
  }
  if (a.range.start.character !== b.range.start.character) {
    return a.range.start.character - b.range.start.character;
  }
  return a.feature.name.localeCompare(b.feature.name);
}
