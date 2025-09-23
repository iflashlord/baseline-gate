// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { registerJsHover } from './hover/jsHover';
import { registerCssHover } from './hover/cssHover';
import { getFeatureById } from './core/baselineData';

export function activate(context: vscode.ExtensionContext) {
  const target = vscode.workspace
    .getConfiguration('baselineGate')
    .get<'modern' | 'enterprise'>('target') ?? 'enterprise';

  registerJsHover(context, target);
  registerCssHover(context, target);

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = `Baseline: ${target}`;
  status.tooltip = 'Change with baselineGate.target';
  status.show();
  context.subscriptions.push(status);

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
}

export function deactivate() {}
