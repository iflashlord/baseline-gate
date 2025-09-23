// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { registerJsHover } from './hover/jsHover';
import { registerCssHover } from './hover/cssHover';
import { getFeatureById } from './core/baselineData';
import { BaselineAnalysisViewProvider, type BaselineAnalysisAssets } from './sidebar/analysisView';
import type { Target } from './core/targets';
import type { Verdict } from './core/scoring';

export function activate(context: vscode.ExtensionContext) {
  let target = readConfiguredTarget();

  registerJsHover(context, target);
  registerCssHover(context, target);

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  const updateStatus = () => {
    status.text = `Baseline: ${formatTarget(target)}`;
  };
  updateStatus();
  status.tooltip = 'Change with baselineGate.target';
  status.show();
  context.subscriptions.push(status);

  const statusIcon = (filename: string) => vscode.Uri.joinPath(context.extensionUri, 'media', 'status', filename);
  const baselineIcon = (filename: string) => vscode.Uri.joinPath(context.extensionUri, 'media', 'baseline', filename);

  const panelAssets: BaselineAnalysisAssets = {
    statusIcons: {
      blocked: statusIcon('blocked.svg'),
      warning: statusIcon('warning.svg'),
      safe: statusIcon('safe.svg')
    },
    baselineIcons: {
      widely: baselineIcon('baseline-widely-icon.svg'),
      newly: baselineIcon('baseline-newly-icon.svg'),
      limited: baselineIcon('baseline-limited-icon.svg')
    }
  };

  const analysisProvider = new BaselineAnalysisViewProvider(context, target, panelAssets);
  context.subscriptions.push(analysisProvider.register());

  const scanWorkspace = vscode.commands.registerCommand('baseline-gate.scanWorkspace', async () => {
    if (!vscode.workspace.workspaceFolders?.length) {
      void vscode.window.showWarningMessage('Open a folder or workspace to scan for baseline issues.');
      return;
    }

    await analysisProvider.runScan();

    const summary = analysisProvider.getSummary({ filtered: false });
    if (!summary.total) {
      void vscode.window.showInformationMessage(`No baseline features found for the ${formatTarget(target)} target.`);
      return;
    }

    const parts = [];
    if (summary.blocked) {
      parts.push(`${summary.blocked} blocked`);
    }
    if (summary.warning) {
      parts.push(`${summary.warning} warnings`);
    }
    if (summary.safe && !summary.blocked && !summary.warning) {
      parts.push(`${summary.safe} safe`);
    }
    const message = parts.length ? parts.join(', ') : `${summary.total} findings`;
    void vscode.window.showInformationMessage(`Baseline scan complete: ${message}.`);
  });
  context.subscriptions.push(scanWorkspace);

  const searchFindings = vscode.commands.registerCommand('baseline-gate.searchFindings', async () => {
    const value = await vscode.window.showInputBox({
      title: 'Baseline Gate: Search Findings',
      prompt: 'Filter results by feature, token, or filename',
      value: analysisProvider.getSearchQuery(),
      ignoreFocusOut: true
    });
    if (value === undefined) {
      return;
    }
    analysisProvider.setSearchQuery(value);
  });
  context.subscriptions.push(searchFindings);

  const configureSeverityFilter = vscode.commands.registerCommand('baseline-gate.configureSeverityFilter', async () => {
    const current = new Set(analysisProvider.getSeverityFilter());
    const options: Array<vscode.QuickPickItem & { verdict: Verdict }> = [
      { label: 'Blocked', description: 'Show features that block the target baseline', picked: current.has('blocked'), verdict: 'blocked' },
      { label: 'Needs review', description: 'Show features that need manual review', picked: current.has('warning'), verdict: 'warning' },
      { label: 'Safe', description: 'Show features that are safe for the chosen target', picked: current.has('safe'), verdict: 'safe' }
    ];

    const picks = await vscode.window.showQuickPick(options, {
      title: 'Baseline Gate: Filter by severity',
      canPickMany: true,
      placeHolder: 'Select severity levels to include',
      ignoreFocusOut: true
    });

    if (!picks) {
      return;
    }

    const verdicts = picks.map((pick) => pick.verdict);
    analysisProvider.setSeverityFilter(verdicts);
  });
  context.subscriptions.push(configureSeverityFilter);

  const clearFilters = vscode.commands.registerCommand('baseline-gate.clearFilters', () => {
    analysisProvider.clearFilters();
  });
  context.subscriptions.push(clearFilters);

  const toggleSortOrder = vscode.commands.registerCommand('baseline-gate.toggleSortOrder', () => {
    const order = analysisProvider.toggleSortOrder();
    const label = order === 'severity' ? 'severity (blocked first)' : 'file order';
    void vscode.window.showInformationMessage(`Baseline findings sorted by ${label}.`);
  });
  context.subscriptions.push(toggleSortOrder);

  const openSettings = vscode.commands.registerCommand('baseline-gate.openSettings', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'baselineGate');
  });
  context.subscriptions.push(openSettings);

  const openDocs = vscode.commands.registerCommand('baseline-gate.openDocs', async (payload?: { id?: string } | string) => {
    const id = typeof payload === 'string' ? payload : payload?.id;
    if (!id) {
      void vscode.window.showInformationMessage('No feature information available for this selection yet.');
      return;
    }

    const feature = getFeatureById(id);
    if (!feature?.docsUrl) {
      void vscode.window.showInformationMessage('No documentation link found for this feature yet.');
      return;
    }

    await vscode.env.openExternal(vscode.Uri.parse(feature.docsUrl));
  });
  context.subscriptions.push(openDocs);

  const configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('baselineGate.target')) {
      target = readConfiguredTarget();
      updateStatus();
      analysisProvider.setTarget(target);
    }
    
    if (event.affectsConfiguration('baselineGate.showDesktopBrowsers') || 
        event.affectsConfiguration('baselineGate.showMobileBrowsers')) {
      analysisProvider.refreshView();
    }
  });
  context.subscriptions.push(configWatcher);
}

export function deactivate() {}

function readConfiguredTarget(): Target {
  return vscode.workspace.getConfiguration('baselineGate').get<Target>('target') ?? 'enterprise';
}

function formatTarget(target: Target): string {
  return target.charAt(0).toUpperCase() + target.slice(1);
}

export function readBrowserDisplaySettings() {
  const config = vscode.workspace.getConfiguration('baselineGate');
  return {
    showDesktop: config.get<boolean>('showDesktopBrowsers', true),
    showMobile: config.get<boolean>('showMobileBrowsers', true)
  };
}
