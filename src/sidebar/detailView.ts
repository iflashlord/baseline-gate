import * as vscode from "vscode";
import type { BaselineFinding } from "./workspaceScanner";
import type { Target } from "../core/targets";
import type { BaselineAnalysisAssets } from "./analysis/types";
import type { GeminiSupportContext } from "./analysis/html";
import { buildIssueDetailHtml } from "./analysis/html";
import { scoreFeature, type Verdict } from "../core/scoring";

export class BaselineDetailViewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private static currentFinding: BaselineFinding | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly assets: BaselineAnalysisAssets,
    private readonly geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ) {}

  public static createOrShow(
    context: vscode.ExtensionContext,
    finding: BaselineFinding,
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it and update content
    if (BaselineDetailViewProvider.currentPanel) {
      BaselineDetailViewProvider.currentPanel.reveal(column);
      BaselineDetailViewProvider.updateContent(finding, target, assets, geminiProvider);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'baselineDetail',
      `Baseline Issue: ${finding.feature.name}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
        retainContextWhenHidden: true
      }
    );

    BaselineDetailViewProvider.currentPanel = panel;
    BaselineDetailViewProvider.currentFinding = finding;

    // Set the webview's initial html content
    BaselineDetailViewProvider.updateContent(finding, target, assets, geminiProvider);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'openFile':
            await BaselineDetailViewProvider.openFile(message.uri, message.start, message.end);
            break;
          case 'openDocs':
            if (message.url) {
              await vscode.env.openExternal(vscode.Uri.parse(message.url));
            }
            break;
          case 'askGemini':
            await vscode.commands.executeCommand("baseline-gate.askGemini", {
              issue: message.issue,
              feature: message.feature,
              findingId: message.findingId,
              context: "detail"
            });
            break;
          case 'askGeminiFollowUp':
            await vscode.commands.executeCommand("baseline-gate.askGeminiFollowUp", {
              question: message.question,
              findingId: message.findingId,
              feature: message.feature,
              filePath: message.filePath,
              target: message.target
            });
            break;
          case 'copyCodeSnippet':
            await vscode.env.clipboard.writeText(message.code);
            await vscode.window.showInformationMessage('Code copied to clipboard');
            break;
          case 'refresh':
            if (BaselineDetailViewProvider.currentFinding) {
              BaselineDetailViewProvider.updateContent(
                BaselineDetailViewProvider.currentFinding,
                target,
                assets,
                geminiProvider
              );
            }
            break;
        }
      },
      undefined,
      context.subscriptions
    );

    // When the panel is disposed, reset the current panel
    panel.onDidDispose(() => {
      BaselineDetailViewProvider.currentPanel = undefined;
      BaselineDetailViewProvider.currentFinding = undefined;
    }, null, context.subscriptions);

    // Update panel title when content changes
    panel.onDidChangeViewState(() => {
      if (panel.visible && BaselineDetailViewProvider.currentFinding) {
        panel.title = `Baseline Issue: ${BaselineDetailViewProvider.currentFinding.feature.name}`;
      }
    });
  }

  private static updateContent(
    finding: BaselineFinding,
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    if (!BaselineDetailViewProvider.currentPanel) {
      return;
    }

    BaselineDetailViewProvider.currentFinding = finding;
    
    // Update panel title
    BaselineDetailViewProvider.currentPanel.title = `Baseline Issue: ${finding.feature.name}`;

    // Get Gemini context if available
    let geminiContext: GeminiSupportContext | undefined;
    if (geminiProvider) {
      const suggestions = geminiProvider.getSuggestionsForFinding(finding.id);
      geminiContext = {
        hasExistingSuggestion: suggestions.length > 0,
        suggestions: suggestions
      };
    }

    // Build severity icon URIs
    const severityIconUris: Record<Verdict, string> = {
      blocked: BaselineDetailViewProvider.currentPanel.webview.asWebviewUri(assets.statusIcons.blocked).toString(),
      warning: BaselineDetailViewProvider.currentPanel.webview.asWebviewUri(assets.statusIcons.warning).toString(),
      safe: BaselineDetailViewProvider.currentPanel.webview.asWebviewUri(assets.statusIcons.safe).toString(),
    };

    // Generate the detail HTML
    const detailHtml = buildIssueDetailHtml({
      finding,
      severityIconUris,
      target,
      assets,
      webview: BaselineDetailViewProvider.currentPanel.webview,
      gemini: geminiContext
    });

    // Create the full page HTML
    const html = BaselineDetailViewProvider.getWebviewContent(
      BaselineDetailViewProvider.currentPanel.webview,
      detailHtml,
      finding
    );

    BaselineDetailViewProvider.currentPanel.webview.html = html;
  }

  private static getWebviewContent(
    webview: vscode.Webview,
    detailHtml: string,
    finding: BaselineFinding
  ): string {
    const nonce = getNonce();
    const relativePath = vscode.workspace.asRelativePath(finding.uri, false);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Baseline Issue: ${finding.feature.name}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }

        .detail-view-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
        }

        .detail-view-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .detail-view-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .detail-view-title h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }

        .detail-view-actions {
            display: flex;
            gap: 8px;
        }

        .detail-view-button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .detail-view-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .detail-view-button.primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .detail-view-button.primary:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .file-breadcrumb {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }

        .file-breadcrumb a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }

        .file-breadcrumb a:hover {
            text-decoration: underline;
        }

        /* Import existing detail styles */
        .detail-block {
            background: var(--vscode-editor-background);
            border: none;
            border-radius: 8px;
            margin: 0;
            box-shadow: none;
        }

        .detail-header-block {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 24px;
            padding: 20px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-widget-border);
        }

        .detail-icon {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .detail-title {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 4px 0;
        }

        .detail-meta {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .detail-section {
            margin-bottom: 24px;
            padding: 20px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-widget-border);
        }

        .detail-section h4 {
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .detail-actions {
            background: transparent;
            border: none;
            padding: 0;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .detail-gemini-button,
        .detail-doc-link {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            text-decoration: none;
        }

        .detail-gemini-button:hover,
        .detail-doc-link:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }

        .detail-doc-link {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .detail-doc-link:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .gemini-icon {
            font-size: 16px;
        }

        /* Chat interface styles */
        .gemini-chat-section {
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            background: var(--vscode-editor-background);
            margin-top: 12px;
        }

        .chat-context-info {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 12px;
            border-radius: 6px 6px 0 0;
            margin-bottom: 16px;
        }

        .chat-context-info h5 {
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: 600;
        }

        .context-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 12px;
            opacity: 0.9;
        }

        .chat-history {
            margin-bottom: 16px;
        }

        .chat-message {
            margin-bottom: 16px;
            padding: 12px;
            border-radius: 6px;
        }

        .chat-message.initial-question {
            background: var(--vscode-inputValidation-infoBackground);
            border-left: 3px solid var(--vscode-inputValidation-infoBorder);
        }

        .chat-message.gemini-response {
            background: var(--vscode-textPreformat-background);
            border-left: 3px solid var(--vscode-charts-yellow);
        }

        .chat-message.follow-up-question {
            background: var(--vscode-inputValidation-warningBackground);
            border-left: 3px solid var(--vscode-inputValidation-warningBorder);
        }

        .message-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .message-content {
            font-size: 13px;
            line-height: 1.5;
        }

        .chat-input-section {
            border-top: 1px solid var(--vscode-widget-border);
            padding: 16px;
        }

        .chat-input-header {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .chat-input-area {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .chat-input {
            min-height: 80px;
            max-height: 200px;
            resize: vertical;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            line-height: 1.4;
        }

        .chat-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .chat-send-button {
            align-self: flex-end;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.2s;
        }

        .chat-send-button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }

        .chat-send-button:disabled {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
            opacity: 0.6;
        }

        .chat-guidelines {
            margin-top: 8px;
            padding: 8px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .detail-view-container {
                padding: 16px;
            }

            .detail-view-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 16px;
            }

            .detail-section {
                padding: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="detail-view-container">
        <div class="detail-view-header">
            <div class="detail-view-title">
                <h1>${finding.feature.name}</h1>
            </div>
            <div class="detail-view-actions">
                <button class="detail-view-button" onclick="openInEditor()">
                    📝 Open in Editor
                </button>
                <button class="detail-view-button primary" onclick="refreshContent()">
                    🔄 Refresh
                </button>
            </div>
        </div>
        
        <div class="file-breadcrumb">
            <a href="#" onclick="openInEditor()">${relativePath}</a> · 
            line ${finding.range.start.line + 1}, 
            column ${finding.range.start.character + 1}
        </div>

        ${detailHtml}
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        function openInEditor() {
            vscode.postMessage({
                type: 'openFile',
                uri: '${finding.uri.toString()}',
                start: { line: ${finding.range.start.line}, character: ${finding.range.start.character} },
                end: { line: ${finding.range.end.line}, character: ${finding.range.end.character} }
            });
        }

        function refreshContent() {
            vscode.postMessage({ type: 'refresh' });
        }

        // Handle clicks on buttons and links
        document.addEventListener('click', (event) => {
            const copyCodeButton = event.target.closest('[data-action="copy-code"]');
            if (copyCodeButton) {
                const container = copyCodeButton.closest('[data-code-block]');
                const codeElement = container ? container.querySelector('code') : null;
                const codeText = codeElement ? codeElement.textContent || '' : '';
                vscode.postMessage({ type: 'copyCodeSnippet', code: codeText });
                return;
            }

            const docButton = event.target.closest('[data-doc-url]');
            if (docButton) {
                const url = docButton.getAttribute('data-doc-url');
                vscode.postMessage({ type: 'openDocs', url });
                return;
            }

            const geminiButton = event.target.closest('[data-gemini-issue]');
            if (geminiButton) {
                const issue = geminiButton.getAttribute('data-gemini-issue');
                const feature = geminiButton.getAttribute('data-feature-name');
                const filePath = geminiButton.getAttribute('data-file-path');
                const findingId = geminiButton.getAttribute('data-finding-id');
                const hasExisting = geminiButton.getAttribute('data-has-existing') === 'true';
                
                if (hasExisting) {
                    // Show chat interface for "Continue with Gemini"
                    const chatSection = document.querySelector('.gemini-chat-section');
                    if (chatSection) {
                        chatSection.style.display = chatSection.style.display === 'none' ? 'block' : 'none';
                    }
                } else {
                    // Regular "Fix with Gemini" behavior
                    vscode.postMessage({ type: 'askGemini', issue, feature, filePath, findingId });
                }
                return;
            }

            const chatSendButton = event.target.closest('.chat-send-button');
            if (chatSendButton && !chatSendButton.disabled) {
                const chatInput = chatSendButton.parentElement.querySelector('.chat-input');
                const followUpQuestion = chatInput.value.trim();
                
                if (followUpQuestion) {
                    const findingId = chatInput.getAttribute('data-finding-id');
                    const feature = chatInput.getAttribute('data-feature-name');
                    const filePath = chatInput.getAttribute('data-file-path');
                    const target = chatInput.getAttribute('data-target');
                    
                    vscode.postMessage({ 
                        type: 'askGeminiFollowUp', 
                        question: followUpQuestion,
                        findingId,
                        feature,
                        filePath,
                        target
                    });
                    
                    // Clear the input and disable button
                    chatInput.value = '';
                    chatSendButton.disabled = true;
                }
                return;
            }
        });

        // Handle chat input changes
        document.addEventListener('input', (event) => {
            if (event.target.classList.contains('chat-input')) {
                const input = event.target;
                const sendButton = input.parentElement.querySelector('.chat-send-button');
                const hasText = input.value.trim().length > 0;
                sendButton.disabled = !hasText;
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.target.classList.contains('chat-input') && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                const sendButton = event.target.parentElement.querySelector('.chat-send-button');
                if (!sendButton.disabled) {
                    sendButton.click();
                }
            }
        });
    </script>
</body>
</html>`;
  }

  private static async openFile(
    uri: string,
    start: { line: number; character: number },
    end: { line: number; character: number }
  ): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
      const editor = await vscode.window.showTextDocument(document);
      
      const startPos = new vscode.Position(start.line, start.character);
      const endPos = new vscode.Position(end.line, end.character);
      const range = new vscode.Range(startPos, endPos);
      
      editor.selection = new vscode.Selection(startPos, endPos);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    } catch (error) {
      console.error('Error opening file:', error);
      await vscode.window.showErrorMessage('Failed to open file');
    }
  }

  public static updateCurrentPanel(
    finding: BaselineFinding,
    target: Target,
    assets: BaselineAnalysisAssets,
    geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
  ): void {
    if (BaselineDetailViewProvider.currentPanel) {
      BaselineDetailViewProvider.updateContent(finding, target, assets, geminiProvider);
    }
  }

  public static getCurrentPanel(): vscode.WebviewPanel | undefined {
    return BaselineDetailViewProvider.currentPanel;
  }

  public static dispose(): void {
    BaselineDetailViewProvider.currentPanel?.dispose();
    BaselineDetailViewProvider.currentPanel = undefined;
    BaselineDetailViewProvider.currentFinding = undefined;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}