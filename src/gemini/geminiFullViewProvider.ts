import * as vscode from 'vscode';
import { GeminiViewProvider } from './geminiViewProvider';
import type { GeminiWebviewMessage } from './types';
// Import the HTML builder
import { buildGeminiFullPageHtml } from './geminiFullPageHtml';

/**
 * Provides a full-page webview panel for displaying Gemini suggestions
 * Similar to the detail view but specifically for Gemini suggestions
 */
export class GeminiFullViewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly geminiViewProvider: GeminiViewProvider
  ) {}

  /**
   * Create or show the Gemini full view panel
   */
  public static createOrShow(
    context: vscode.ExtensionContext,
    geminiViewProvider: GeminiViewProvider
  ): void {
    const column = vscode.ViewColumn.One;

    // If we already have a panel, show it
    if (GeminiFullViewProvider.currentPanel) {
      GeminiFullViewProvider.currentPanel.reveal(column);
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'geminiFullView',
      'Gemini Suggestions',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      }
    );

    // Set the icon for the panel
    panel.iconPath = {
      light: vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.svg'),
      dark: vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.svg')
    };

    GeminiFullViewProvider.currentPanel = panel;

    // Create provider instance and update content
    const provider = new GeminiFullViewProvider(context, geminiViewProvider);
    provider.updateContent(panel);

    // Handle panel disposal
    panel.onDidDispose(() => {
      GeminiFullViewProvider.currentPanel = undefined;
    });

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async (data: GeminiWebviewMessage) => {
      console.log('Gemini full view received message:', data);
      
      switch (data.type) {
        case 'removeSuggestion':
          await geminiViewProvider.removeSuggestionPublic(data.id);
          provider.updateContent(panel);
          break;
        case 'clearAllSuggestions':
          await geminiViewProvider.clearAllSuggestionsPublic();
          provider.updateContent(panel);
          break;
        case 'goToFinding':
          console.log('Executing goToFinding command with findingId:', data.findingId);
          try {
            await vscode.commands.executeCommand('baseline-gate.goToFinding', data.findingId);
            console.log('goToFinding command executed successfully');
          } catch (error) {
            console.error('Error executing goToFinding command:', error);
            vscode.window.showErrorMessage(`Failed to go to finding: ${error instanceof Error ? error.message : String(error)}`);
          }
          break;
        case 'openFileAtLocation':
          await geminiViewProvider.openFileAtLocationPublic(data.filePath, data.line, data.character);
          break;
        case 'searchSuggestions':
          geminiViewProvider.searchSuggestionsPublic(data.query);
          provider.updateContent(panel);
          break;
        case 'copySuggestion':
          await geminiViewProvider.copySuggestionPublic(data.id);
          break;
        case 'copyCodeSnippet':
          await geminiViewProvider.copyCodeSnippetPublic(data.code);
          break;
        case 'rateSuggestion':
          await geminiViewProvider.rateSuggestionPublic(data.id, data.rating);
          provider.updateContent(panel);
          break;
        case 'retrySuggestion':
          await geminiViewProvider.retrySuggestionPublic(data.id);
          provider.updateContent(panel);
          break;
        case 'sendFollowUp':
          await geminiViewProvider.sendFollowUpPublic(data.message, data.parentId);
          // Refresh the content after asking follow-up
          setTimeout(() => provider.updateContent(panel), 1000);
          break;
        case 'exportConversation':
          await geminiViewProvider.exportConversationPublic(data.format);
          break;
        case 'toggleConversationView':
          geminiViewProvider.toggleConversationViewPublic(data.conversationId);
          break;
        default:
          // Handle open settings message
          if ((data as any).type === 'openSettings') {
            await vscode.commands.executeCommand('baseline-gate.openSettings');
          }
          break;
      }
    });
  }

  /**
   * Update the content of the current panel
   */
  private updateContent(panel: vscode.WebviewPanel): void {
    const state = this.geminiViewProvider.getState();
    
    try {
      panel.webview.html = buildGeminiFullPageHtml({
        webview: panel.webview,
        state: state,
        isGeminiConfigured: this.isGeminiConfigured()
      });
    } catch (error) {
      // Fallback in case of import issues
      console.error('Error building Gemini full page HTML:', error);
      panel.webview.html = `
        <html>
          <body style="font-family: var(--vscode-font-family); padding: 20px;">
            <h1>Gemini Suggestions</h1>
            <p>Loading...</p>
            <script>
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            </script>
          </body>
        </html>
      `;
    }
  }

  /**
   * Update the current panel content (static method for external access)
   */
  public static updateCurrentPanel(
    context: vscode.ExtensionContext,
    geminiViewProvider: GeminiViewProvider
  ): void {
    if (GeminiFullViewProvider.currentPanel) {
      const provider = new GeminiFullViewProvider(context, geminiViewProvider);
      provider.updateContent(GeminiFullViewProvider.currentPanel);
    }
  }

  /**
   * Get the current panel
   */
  public static getCurrentPanel(): vscode.WebviewPanel | undefined {
    return GeminiFullViewProvider.currentPanel;
  }

  /**
   * Dispose the current panel
   */
  public static dispose(): void {
    if (GeminiFullViewProvider.currentPanel) {
      GeminiFullViewProvider.currentPanel.dispose();
      GeminiFullViewProvider.currentPanel = undefined;
    }
  }

  /**
   * Check if Gemini is configured
   */
  private isGeminiConfigured(): boolean {
    const config = vscode.workspace.getConfiguration('baselineGate');
    const apiKey = config.get<string>('geminiApiKey', '');
    return apiKey.trim().length > 0;
  }
}