import * as vscode from 'vscode';
import { geminiService, type GeminiSuggestion } from './geminiService';
import type { GeminiSuggestionState } from './types';
import {
  GEMINI_SUGGESTIONS_FILE,
  addSuggestionToState,
  applySearchFilter,
  clearSuggestionsState,
  clearSuggestionsFromStorage,
  initializeSuggestionState,
  parseStoredSuggestions,
  persistSuggestions,
  removeSuggestionFromState,
} from './state';
import { readStorageJson } from '../utils/storage';

export class GeminiViewProvider {
  public static readonly viewType = 'baselineGate.geminiView';

  private state: GeminiSuggestionState;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.state = initializeSuggestionState(context);
    void this.restoreSuggestionsFromDisk();
  }



  public async addUserMessage(userPrompt: string, findingId?: string, feature?: string): Promise<void> {
    // Add a user message to the chat history without calling Gemini
    // This is used when we want to show user's input in chat before sending the actual request
    const userMessage: GeminiSuggestion = {
      id: `user-${Date.now()}`,
      timestamp: new Date(),
      issue: userPrompt,
      suggestion: '', // Empty for user messages
      feature,
      file: undefined,
      findingId,
      status: 'user' as any, // Special status for user messages
      tags: ['user-message'],
    };

    this.state = addSuggestionToState(this.state, userMessage);
    await this.saveSuggestions();
    this.refresh();
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

    let progressResolve: (() => void) | undefined;
    const progressPromise = new Promise<void>((resolve) => {
      progressResolve = resolve;
    });

    const progressTask = vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Getting suggestion from Gemini',
        cancellable: true,
      },
      async (progress) => {
        try {
          progress.report({ increment: 30, message: 'Connecting to Gemini...' });
          const response = await geminiService.getSuggestion(issue, feature, file);

          progress.report({ increment: 70, message: 'Processing response...' });

          const newSuggestion: GeminiSuggestion = {
            id: Date.now().toString(),
            timestamp: new Date(),
            issue,
            suggestion: response.text,
            feature,
            file,
            findingId,
            status: 'success',
            tokensUsed: response.tokensUsed,
            responseTime: response.responseTime,
            tags: this.generateTags(issue, feature, file),
          };

          this.state = addSuggestionToState(this.state, newSuggestion);
          await this.saveSuggestions();
          
          progress.report({ increment: 100, message: 'Complete!' });

          
          // Send response to detail view via command
          await vscode.commands.executeCommand('baseline-gate.sendGeminiResponse', {
            type: 'success',
            response: response.text,
            findingId
          });

          this.refresh();

          // Notify detail view to refresh if it's showing this finding
          await vscode.commands.executeCommand('baseline-gate.refreshDetailView', findingId);
          
          // Focus the analysis view to show the new suggestion
          await vscode.commands.executeCommand('baselineGate.analysisView.focus');
          
          // Don't show success notification for follow-up questions to reduce spam
          if (!issue.includes('Follow-up question about')) {
             await vscode.window.showInformationMessage('Gemini suggestion added successfully!');
          }

          // close progress notification
          if (progressResolve) {
            progressResolve();
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Send error to detail view via command
          await vscode.commands.executeCommand('baseline-gate.sendGeminiResponse', {
            type: 'error',
            error: errorMessage,
            findingId
          });

          vscode.window.showErrorMessage(
            `Failed to get Gemini suggestion: ${errorMessage}`,
          );
        } finally {
          // Ensure progress notification is always dismissed
          if (progressResolve) {
            progressResolve();
          }
        }
        
        // Wait for the promise to ensure progress is properly handled
        return progressPromise;
      },
    );
 

    // Await the progress task to ensure it completes properly
    await progressTask;
  }

  public refresh(): void {
    console.log(
      'Refreshing Gemini state. Suggestions:',
      this.state.suggestions.length,
      'Filtered:',
      this.state.filteredSuggestions.length,
      'Search query:',
      this.state.searchQuery,
    );

    // Refresh the full view if it's open
    this.refreshFullView();
  }

  private async restoreSuggestionsFromDisk(): Promise<void> {
    const stored = await readStorageJson<unknown>(GEMINI_SUGGESTIONS_FILE);
    const suggestions = parseStoredSuggestions(stored);
    if (!suggestions.length) {
      return;
    }

    const nextState: GeminiSuggestionState = {
      ...this.state,
      suggestions,
    };
    this.state = applySearchFilter(nextState, this.state.originalSearchQuery);
    await persistSuggestions(this.context, this.state.suggestions);
    this.refresh();
  }

  private refreshFullView(): void {
    // Import here to avoid circular dependency
    const { GeminiFullViewProvider } = require('./geminiFullViewProvider');
    GeminiFullViewProvider.updateCurrentPanel(this.context, this);
  }

  public hasSuggestionForFinding(findingId: string): boolean {
    return this.state.suggestions.some((suggestion) => suggestion.findingId === findingId);
  }

  public getSuggestionsForFinding(findingId: string): GeminiSuggestion[] {
    return this.state.suggestions.filter((suggestion) => suggestion.findingId === findingId);
  }

  public focusOnFinding(findingId: string): void {
    // Set search query to filter suggestions by finding ID
    const suggestions = this.getSuggestionsForFinding(findingId);
    if (suggestions.length > 0) {
      // Use the feature name from the first suggestion as search term
      const searchTerm = suggestions[0].feature || findingId;
      this.state = applySearchFilter(this.state, searchTerm);
      this.refresh();
    }
  }

  // Public methods for external access
  public getState(): GeminiSuggestionState {
    return this.state;
  }

  public async removeSuggestionPublic(id: string): Promise<void> {
    await this.removeSuggestion(id);
  }

  public async clearAllSuggestionsPublic(): Promise<void> {
    await this.clearAllSuggestions();
  }

  public searchSuggestionsPublic(query: string): void {
    this.filterSuggestions(query);
  }

  public async rateSuggestionPublic(id: string, rating: 1 | 2 | 3 | 4 | 5): Promise<void> {
    await this.rateSuggestion(id, rating);
  }

  public async copySuggestionPublic(id: string): Promise<void> {
    await this.copySuggestionToClipboard(id);
  }

  public async copyCodeSnippetPublic(code: string): Promise<void> {
    await this.copyCodeSnippet(code);
  }

  public async retrySuggestionPublic(id: string): Promise<void> {
    await this.retrySuggestion(id);
  }

  public async sendFollowUpPublic(message: string, parentId?: string): Promise<void> {
    await this.sendFollowUp(message, parentId);
  }

  public async exportConversationPublic(format: 'markdown' | 'json'): Promise<void> {
    await this.exportConversation(format);
  }

  public async openFileAtLocationPublic(filePath: string, line?: number, character?: number): Promise<void> {
    await this.openFileAtLocation(filePath, line, character);
  }

  public toggleConversationViewPublic(conversationId: string): void {
    // Placeholder for conversation view toggle functionality
    // This can be implemented later if needed
    console.log('Toggle conversation view for:', conversationId);
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
      await clearSuggestionsFromStorage();
      this.state = clearSuggestionsState(this.state);
      this.refresh();
    }
  }

  private async saveSuggestions(): Promise<void> {
    await persistSuggestions(this.context, this.state.suggestions);
  }

  private async openFileAtLocation(filePath: string, line?: number, character?: number): Promise<void> {
    try {
      let resolvedPath = filePath;
      
      // If the path is relative, resolve it relative to the workspace
      if (!filePath.startsWith('/') && !filePath.match(/^[a-zA-Z]:/)) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
          resolvedPath = vscode.Uri.joinPath(workspaceFolder.uri, filePath).fsPath;
        }
      }
      
      const uri = vscode.Uri.file(resolvedPath);
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
    // Note: No webview refresh needed since we use full-page view
  }

  private async copyCodeSnippet(code: string): Promise<void> {
    if (!code) {
      void vscode.window.showWarningMessage('Unable to copy code snippet: content was empty.');
      return;
    }

    try {
      await vscode.env.clipboard.writeText(code);
      vscode.window.setStatusBarMessage('Gemini code snippet copied to clipboard.', 3000);
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Failed to copy Gemini code snippet: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private generateTags(issue: string, feature?: string, file?: string): string[] {
    const tags: string[] = [];
    
    // Add feature-based tags
    if (feature) {
      tags.push(feature.toLowerCase());
    }
    
    // Add file extension tags
    if (file) {
      const ext = file.split('.').pop()?.toLowerCase();
      if (ext) {
        tags.push(ext);
      }
    }
    
    // Add issue-based tags
    const issueLower = issue.toLowerCase();
    if (issueLower.includes('error') || issueLower.includes('bug')) {
      tags.push('bug');
    }
    if (issueLower.includes('performance')) {
      tags.push('performance');
    }
    if (issueLower.includes('security')) {
      tags.push('security');
    }
    if (issueLower.includes('optimization')) {
      tags.push('optimization');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  private async rateSuggestion(id: string, rating: 1 | 2 | 3 | 4 | 5): Promise<void> {
    const suggestionIndex = this.state.suggestions.findIndex(s => s.id === id);
    if (suggestionIndex === -1) {
      void vscode.window.showWarningMessage('Suggestion not found.');
      return;
    }

    this.state.suggestions[suggestionIndex].rating = rating;
    await this.saveSuggestions();
    this.refresh();

    // Send telemetry data (anonymized)
    vscode.window.setStatusBarMessage(`Thank you for rating this suggestion!`, 3000);
  }

  private async retrySuggestion(id: string): Promise<void> {
    const suggestion = this.state.suggestions.find(s => s.id === id);
    if (!suggestion) {
      void vscode.window.showWarningMessage('Suggestion not found.');
      return;
    }

    // Remove the old suggestion and create a new one
    await this.removeSuggestion(id);
    await this.addSuggestion(suggestion.issue, suggestion.feature, suggestion.file, suggestion.findingId);
  }

  private async sendFollowUp(message: string, parentId?: string): Promise<void> {
    const parentSuggestion = parentId ? this.state.suggestions.find(s => s.id === parentId) : undefined;
    let contextualIssue = message;
    
    if (parentSuggestion) {
      contextualIssue = `Follow-up question about "${parentSuggestion.issue}": ${message}`;
    }
    
    await this.addSuggestion(contextualIssue, parentSuggestion?.feature, parentSuggestion?.file, parentSuggestion?.findingId);
  }

  private async exportConversation(format: 'markdown' | 'json'): Promise<void> {
    if (this.state.suggestions.length === 0) {
      void vscode.window.showWarningMessage('No suggestions to export.');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `gemini-conversation-${timestamp}.${format}`;

    try {
      let content: string;
      
      if (format === 'markdown') {
        content = this.generateMarkdownExport();
      } else {
        content = JSON.stringify(this.state.suggestions, null, 2);
      }

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(fileName),
        filters: {
          [format.toUpperCase()]: [format]
        }
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        vscode.window.showInformationMessage(`Conversation exported to ${uri.fsPath}`);
      }
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Failed to export conversation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private generateMarkdownExport(): string {
    const stats = geminiService.getUsageStats();
    let markdown = `# Gemini AI Conversation Export\n\n`;
    markdown += `**Export Date:** ${new Date().toLocaleString()}\n`;
    markdown += `**Total Suggestions:** ${this.state.suggestions.length}\n`;
    markdown += `**Usage Stats:** ${stats.requests} requests, ${stats.successRate}% success rate\n\n`;
    markdown += `---\n\n`;

    this.state.suggestions.forEach((suggestion, index) => {
      markdown += `## Suggestion ${index + 1}\n\n`;
      markdown += `**Timestamp:** ${suggestion.timestamp.toLocaleString()}\n`;
      markdown += `**Issue:** ${suggestion.issue}\n`;
      if (suggestion.feature) {
        markdown += `**Feature:** ${suggestion.feature}\n`;
      }
      if (suggestion.file) {
        markdown += `**File:** ${suggestion.file}\n`;
      }
      if (suggestion.rating) {
        markdown += `**Rating:** ${'⭐'.repeat(suggestion.rating)}\n`;
      }
      if (suggestion.tags?.length) {
        markdown += `**Tags:** ${suggestion.tags.join(', ')}\n`;
      }
      markdown += `\n**Solution:**\n${suggestion.suggestion}\n\n`;
      if (suggestion.responseTime) {
        markdown += `*Response time: ${suggestion.responseTime}ms*\n`;
      }
      if (suggestion.tokensUsed) {
        markdown += `*Tokens used: ${suggestion.tokensUsed}*\n`;
      }
      markdown += `\n---\n\n`;
    });

    return markdown;
  }
}
