import * as vscode from "vscode";
import type { DetailViewMessage } from "./types";
import { DetailViewStateManager } from "./stateManager";

/**
 * Handles messages received from the detail view webview
 */
export class DetailViewMessageHandler {
  
  /**
   * Process a message from the webview
   */
  public static async handleMessage(
    message: DetailViewMessage,
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext
  ): Promise<void> {
    switch (message.type) {
      case 'openFile':
        await this.handleOpenFile(message.uri, message.start, message.end);
        break;
      
      case 'openDocs':
        await this.handleOpenDocs(message.url);
        break;
      
      case 'askGemini':
        await this.handleAskGemini(message.issue, message.feature, message.findingId);
        break;
      
      case 'askGeminiFollowUp':
        await this.handleAskGeminiFollowUp(
          message.question, 
          message.findingId, 
          message.feature, 
          message.filePath, 
          message.target,
          panel
        );
        break;
      
      case 'copyCodeSnippet':
        await this.handleCopyCodeSnippet(message.code);
        break;
      
      case 'refresh':
        await this.handleRefresh();
        break;
      
      default:
        console.warn('Unknown message type received:', (message as any).type);
    }
  }

  /**
   * Handle opening a file at a specific location
   */
  private static async handleOpenFile(
    uri: string,
    start: { line: number; character: number },
    end: { line: number; character: number }
  ): Promise<void> {
    try {
      const fileUri = vscode.Uri.parse(uri);
      const document = await vscode.workspace.openTextDocument(fileUri);
      const editor = await vscode.window.showTextDocument(document, {
        selection: new vscode.Range(
          new vscode.Position(start.line, start.character),
          new vscode.Position(end.line, end.character)
        ),
        preserveFocus: false
      });

      // Reveal the selection
      const range = new vscode.Range(
        new vscode.Position(start.line, start.character),
        new vscode.Position(end.line, end.character)
      );
      editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle opening documentation
   */
  private static async handleOpenDocs(url: string): Promise<void> {
    if (url) {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }
  }

  /**
   * Handle asking Gemini for help
   */
  private static async handleAskGemini(issue: string, feature: string, findingId: string): Promise<void> {
    await vscode.commands.executeCommand("baseline-gate.askGemini", {
      issue,
      feature,
      findingId,
      context: "detail"
    });
  }

  /**
   * Handle asking Gemini a follow-up question
   */
  private static async handleAskGeminiFollowUp(
    question: string,
    findingId: string,
    feature: string,
    filePath: string,
    target: string,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      // Show loading state
      await this.sendLoadingState(panel.webview);
      
      await vscode.commands.executeCommand("baseline-gate.askGeminiFollowUp", {
        question,
        findingId,
        feature,
        filePath,
        target
      });
    } catch (error) {
      // Send error state to webview
      await this.sendErrorState(panel.webview, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle copying code snippet to clipboard
   */
  private static async handleCopyCodeSnippet(code: string): Promise<void> {
    await vscode.env.clipboard.writeText(code);
    await vscode.window.showInformationMessage('Code copied to clipboard');
  }

  /**
   * Handle refresh request
   */
  private static async handleRefresh(): Promise<void> {
    const currentFinding = DetailViewStateManager.getCurrentFinding();
    if (currentFinding) {
      // Trigger a refresh by executing the refresh command
      await vscode.commands.executeCommand('baseline-gate.refreshDetailView');
    }
  }

  /**
   * Send loading state to webview
   */
  public static async sendLoadingState(webview: vscode.Webview): Promise<void> {
    await webview.postMessage({
      type: 'geminiResponse',
      state: 'loading'
    });
  }

  /**
   * Send error state to webview
   */
  public static async sendErrorState(webview: vscode.Webview, error: string): Promise<void> {
    await webview.postMessage({
      type: 'geminiResponse',
      state: 'error',
      error
    });
  }

  /**
   * Send success state to webview
   */
  public static async sendSuccessState(webview: vscode.Webview, response: string): Promise<void> {
    await webview.postMessage({
      type: 'geminiResponse',
      state: 'success',
      response
    });
  }
}