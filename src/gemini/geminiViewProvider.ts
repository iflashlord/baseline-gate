import * as vscode from 'vscode';
import { geminiService, type GeminiSuggestion } from './geminiService';
import { buildGeminiWebviewHtml } from './html';
import { handleGeminiMessage } from './messages';
import type { GeminiSuggestionState, GeminiWebviewMessage } from './types';
import {
  addSuggestionToState,
  applySearchFilter,
  clearSuggestionsState,
  initializeSuggestionState,
  persistSuggestions,
  removeSuggestionFromState,
} from './state';

export class GeminiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'baselineGate.geminiView';

  private view?: vscode.WebviewView;
  private state: GeminiSuggestionState;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.state = initializeSuggestionState(context);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data: GeminiWebviewMessage) => {
      console.log('Gemini webview received message:', data);
      handleGeminiMessage(data, {
        removeSuggestion: async (id) => {
          console.log('Removing suggestion:', id);
          await this.removeSuggestion(id);
        },
        clearAllSuggestions: async () => {
          console.log('Clearing all suggestions');
          await this.clearAllSuggestions();
        },
        goToFinding: async (findingId) => {
          await vscode.commands.executeCommand('baseline-gate.goToFinding', findingId);
        },
        openFileAtLocation: async (filePath, line, character) => {
          await this.openFileAtLocation(filePath, line, character);
        },
        searchSuggestions: (query) => {
          console.log('Searching suggestions with query:', query);
          this.filterSuggestions(query);
        },
        copySuggestion: async (id) => {
          console.log('Copying suggestion to clipboard:', id);
          await this.copySuggestionToClipboard(id);
        },
      });
    });
  }

  public async addSuggestion(issue: string, feature?: string, file?: string, findingId?: string): Promise<void> {
    if (!geminiService.isConfigured()) {
      const action = await vscode.window.showErrorMessage(
        'Gemini API key is not configured.',
        'Configure API Key',
        'Learn More',
      );

      if (action === 'Configure API Key') {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'baselineGate.geminiApiKey');
      } else if (action === 'Learn More') {
        await vscode.window.showInformationMessage(geminiService.getConfigurationGuide(), { modal: true });
      }
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Getting suggestion from Gemini...',
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ increment: 50 });
          const suggestionText = await geminiService.getSuggestion(issue, feature, file);

          const newSuggestion: GeminiSuggestion = {
            id: Date.now().toString(),
            timestamp: new Date(),
            issue,
            suggestion: suggestionText,
            feature,
            file,
            findingId,
          };

          this.state = addSuggestionToState(this.state, newSuggestion);
          await this.saveSuggestions();
          progress.report({ increment: 100 });

          await vscode.window.showInformationMessage('Gemini suggestion added successfully!');
          await vscode.commands.executeCommand('baselineGate.geminiView.focus');
          this.refresh();
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to get Gemini suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      },
    );
  }

  public refresh(): void {
    if (!this.view) {
      return;
    }

    console.log(
      'Refreshing Gemini webview. Suggestions:',
      this.state.suggestions.length,
      'Filtered:',
      this.state.filteredSuggestions.length,
      'Search query:',
      this.state.searchQuery,
    );

    this.view.webview.html = this.getHtmlForWebview(this.view.webview);
  }

  public hasSuggestionForFinding(findingId: string): boolean {
    return this.state.suggestions.some((suggestion) => suggestion.findingId === findingId);
  }

  public getSuggestionsForFinding(findingId: string): GeminiSuggestion[] {
    return this.state.suggestions.filter((suggestion) => suggestion.findingId === findingId);
  }

  private async removeSuggestion(id: string): Promise<void> {
    this.state = removeSuggestionFromState(this.state, id);
    await this.saveSuggestions();
    this.refresh();
  }

  private async clearAllSuggestions(): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
      'Are you sure you want to clear all Gemini suggestions? This action cannot be undone.',
      { modal: true },
      'Clear All',
      'Cancel',
    );

    if (confirmed === 'Clear All') {
      this.state = clearSuggestionsState(this.state);
      await this.saveSuggestions();
      this.refresh();
    }
  }

  private async saveSuggestions(): Promise<void> {
    await persistSuggestions(this.context, this.state.suggestions);
  }

  private async openFileAtLocation(filePath: string, line?: number, character?: number): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document, { preview: false });

      if (line !== undefined && character !== undefined) {
        const position = new vscode.Position(line, character);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenterIfOutsideViewport,
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to open file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async copySuggestionToClipboard(id: string): Promise<void> {
    const suggestion = this.state.suggestions.find((item) => item.id === id);

    if (!suggestion) {
      void vscode.window.showWarningMessage('Unable to copy Gemini suggestion: item was not found.');
      return;
    }

    try {
      await vscode.env.clipboard.writeText(suggestion.suggestion);
      vscode.window.setStatusBarMessage('Gemini suggestion copied to clipboard.', 3000);
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Failed to copy Gemini suggestion: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private filterSuggestions(query: string): void {
    this.state = applySearchFilter(this.state, query);
    this.refresh();
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    return buildGeminiWebviewHtml({
      webview,
      state: this.state,
      isGeminiConfigured: geminiService.isConfigured(),
    });
  }
}
