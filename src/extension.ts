// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { registerJsHover } from './hover/jsHover';
import { registerCssHover } from './hover/cssHover';
import { getFeatureById } from './core/baselineData';
import { BaselineAnalysisViewProvider } from './sidebar/analysisView';
import { BaselineDetailViewProvider } from './sidebar/detailView/index';
import type { BaselineAnalysisAssets } from './sidebar/analysis/types';
import { computeFindingId } from './sidebar/analysis/dataTransformation';
import { GeminiViewProvider } from './gemini/geminiViewProvider';
import { GeminiFullViewProvider } from './gemini/geminiFullViewProvider';
import type { Target } from './core/targets';
import type { Verdict } from './core/scoring';

export function activate(context: vscode.ExtensionContext) {
  let target = readConfiguredTarget();

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

  // Create Gemini provider for hover integration and other functionality
  const geminiProvider = new GeminiViewProvider(context);

  // Register hover providers with gemini integration
  registerJsHover(context, target, geminiProvider);
  registerCssHover(context, target, geminiProvider);

  const analysisProvider = new BaselineAnalysisViewProvider(context, target, panelAssets, geminiProvider);
  context.subscriptions.push(analysisProvider.register());

  // Check if this is a fresh start (no .baseline-gate directory)
  if (vscode.workspace.workspaceFolders?.length) {
    void (async () => {
      const isStorageMissing = await analysisProvider.isStorageDirectoryMissing();
      if (isStorageMissing) {
        // This is a fresh start - show information message
        const message = 'BaselineGate: Starting fresh. All data will be stored in the .baseline-gate directory in your workspace.';
        void vscode.window.showInformationMessage(message);
      }
    })();
  }

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

  const clearAllData = vscode.commands.registerCommand('baseline-gate.clearAllData', async () => {
    const confirmed = await vscode.window.showWarningMessage(
      'This will clear all BaselineGate data including scan results and Gemini suggestions. This action cannot be undone.',
      { modal: true },
      'Clear All Data',
      'Cancel'
    );

    if (confirmed === 'Clear All Data') {
      await analysisProvider.clearAllData();
      void vscode.window.showInformationMessage('All BaselineGate data has been cleared. You can now start fresh.');
    }
  });
  context.subscriptions.push(clearAllData);

  const openSettings = vscode.commands.registerCommand('baseline-gate.openSettings', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'baselineGate');
  });
  context.subscriptions.push(openSettings);

  const openInsights = vscode.commands.registerCommand('baseline-gate.openInsights', () => {
    analysisProvider.showInsightsPanel();
  });
  context.subscriptions.push(openInsights);

  // Register Gemini commands
  const askGemini = vscode.commands.registerCommand('baseline-gate.askGemini', async (args?: { issue: string; feature?: string; context?: string; findingId?: string }) => {
    if (!args || !args.issue) {
      void vscode.window.showErrorMessage('No issue provided for Gemini suggestion.');
      return;
    }
    
    await geminiProvider.addSuggestion(args.issue, args.feature, undefined, args.findingId);
  });
  context.subscriptions.push(askGemini);

  const askGeminiFollowUp = vscode.commands.registerCommand('baseline-gate.askGeminiFollowUp', async (args?: { question: string; findingId?: string; feature?: string; filePath?: string; target?: string }) => {
    if (!args || !args.question) {
      void vscode.window.showErrorMessage('No question provided for Gemini follow-up.');
      return;
    }
    
    // Build context-aware issue for follow-up
    const contextualIssue = `Follow-up question about ${args.feature || 'baseline issue'} in ${args.filePath || 'file'} (Target: ${args.target || 'unknown'}): ${args.question}

Context: This is a follow-up question about fixing a baseline compatibility issue. Please focus on practical solutions and implementation details.`;
    
    await geminiProvider.addSuggestion(contextualIssue, args.feature, args.filePath, args.findingId);
  });
  context.subscriptions.push(askGeminiFollowUp);

  const clearGeminiResults = vscode.commands.registerCommand('baseline-gate.clearGeminiResults', async (id?: string) => {
    // This command is handled by the webview, but we register it for completeness
  });
  context.subscriptions.push(clearGeminiResults);

  const closeDetailView = vscode.commands.registerCommand('baseline-gate.closeDetailView', async () => {
    BaselineDetailViewProvider.dispose();
  });
  context.subscriptions.push(closeDetailView);

  const refreshDetailView = vscode.commands.registerCommand('baseline-gate.refreshDetailView', async (findingId?: string) => {
    if (BaselineDetailViewProvider.getCurrentPanel() && findingId) {
      // Find the finding and refresh the detail view
      const findings = analysisProvider.getAllFindings();
      const finding = findings.find(f => computeFindingId(f) === findingId);
      if (finding) {
        BaselineDetailViewProvider.updateCurrentPanel(finding, target, panelAssets, geminiProvider);
      }
    }
  });
  context.subscriptions.push(refreshDetailView);

  const sendGeminiResponse = vscode.commands.registerCommand('baseline-gate.sendGeminiResponse', async (args?: { type: string; response?: string; error?: string; findingId?: string }) => {
    const currentPanel = BaselineDetailViewProvider.getCurrentPanel();
    if (currentPanel && args) {
      switch (args.type) {
        case 'success':
          if (args.response) {
            await BaselineDetailViewProvider.sendSuccessState(currentPanel.webview, args.response);
            // Automatically refresh the analysis view to show updated chat
            analysisProvider.refreshView();
          }
          break;
        case 'error':
          if (args.error) {
            await BaselineDetailViewProvider.sendErrorState(currentPanel.webview, args.error);
            // Also refresh on error to show error state in chat
            analysisProvider.refreshView();
          }
          break;
        case 'loading':
          await BaselineDetailViewProvider.sendLoadingState(currentPanel.webview);
          break;
      }
    }
  });
  context.subscriptions.push(sendGeminiResponse);

  const goToFinding = vscode.commands.registerCommand('baseline-gate.goToFinding', async (findingId: string) => {
    // Switch focus to the analysis view and highlight the finding
    await vscode.commands.executeCommand('baselineGate.analysisView.focus');
    analysisProvider.highlightFinding(findingId);
  });
  context.subscriptions.push(goToFinding);

  const showGeminiSuggestions = vscode.commands.registerCommand('baseline-gate.showGeminiSuggestions', async (args?: { findingId: string; feature?: string }) => {
    if (!args || !args.findingId) {
      void vscode.window.showErrorMessage('No finding ID provided for Gemini suggestions.');
      return;
    }
    
    // Focus on the analysis view and filter by the finding ID
    await vscode.commands.executeCommand('baselineGate.analysisView.focus');
    geminiProvider.focusOnFinding(args.findingId);
  });
  context.subscriptions.push(showGeminiSuggestions);

  const openGeminiFullView = vscode.commands.registerCommand('baseline-gate.openGeminiFullView', async () => {
    GeminiFullViewProvider.createOrShow(context, geminiProvider);
  });
  context.subscriptions.push(openGeminiFullView);

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
      // Re-register hover providers with new target (note: this will duplicate registrations, but VS Code handles it)
      registerJsHover(context, target, geminiProvider);
      registerCssHover(context, target, geminiProvider);
    }
    
    if (event.affectsConfiguration('baselineGate.showDesktopBrowsers') || 
        event.affectsConfiguration('baselineGate.showMobileBrowsers')) {
      analysisProvider.refreshView();
    }

    if (event.affectsConfiguration('baselineGate.blockedBudget') ||
        event.affectsConfiguration('baselineGate.warningBudget') ||
        event.affectsConfiguration('baselineGate.safeGoal')) {
      analysisProvider.refreshBudgetConfig();
    }
  });
  context.subscriptions.push(configWatcher);
}

export function deactivate() {
  BaselineDetailViewProvider.dispose();
  GeminiFullViewProvider.dispose();
}

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
