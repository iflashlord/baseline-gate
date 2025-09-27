import * as vscode from "vscode";
import type { 
  WebviewRenderContext, 
  HtmlGenerationOptions,
  SeverityIconUris 
} from "./types";
import type { BaselineFinding } from "../workspaceScanner";
import type { Target } from "../../core/targets";
import type { GeminiSupportContext } from "../analysis/html";
import { DetailViewUtils } from "./utils";

/**
 * Generates HTML content for detail view webviews
 */
export class DetailViewHtmlGenerator {

  /**
   * Generate complete webview HTML content
   */
  public static generateWebviewContent(
    context: WebviewRenderContext,
    detailHtml: string
  ): string {
    const nonce = DetailViewUtils.generateNonce();
    const relativePath = vscode.workspace.asRelativePath(context.finding.uri, false);

    const options: HtmlGenerationOptions = {
      nonce,
      relativePath,
      detailHtml,
      geminiContext: context.geminiContext
    };

    return this.buildHtmlDocument(options, context);
  }

  /**
   * Build the complete HTML document structure
   */
  private static buildHtmlDocument(
    options: HtmlGenerationOptions,
    context: WebviewRenderContext
  ): string {
    const { nonce, relativePath, detailHtml, geminiContext } = options;
    const { finding, webview } = context;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    ${this.generateHtmlHead(nonce, webview, finding)}
    ${this.generateStyles()}
</head>
<body>
    ${this.generateBodyContent(detailHtml, finding, relativePath, geminiContext)}
    ${this.generateJavaScript(nonce)}
</body>
</html>`;
  }

  /**
   * Generate HTML head section
   */
  private static generateHtmlHead(
    nonce: string,
    webview: vscode.Webview,
    finding: BaselineFinding
  ): string {
    return `
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Baseline Issue: ${DetailViewUtils.escapeHtml(finding.feature.name)}</title>`;
  }

  /**
   * Generate CSS styles
   */
  private static generateStyles(): string {
    return `<style>
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

        /* Chat Interface Styles */
        .chat-interface {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            margin-top: 16px;
        }

        .chat-header {
            padding: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
            border-radius: 8px 8px 0 0;
        }

        .chat-messages {
            max-height: 400px;
            overflow-y: auto;
            padding: 16px;
        }

        .chat-message {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            align-items: flex-start;
        }

        .message-avatar {
            flex-shrink: 0;
            width: 32px;
            height: 32px;
        }

        .avatar-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--vscode-badge-background);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }

        .user-message .avatar-icon {
            background: var(--vscode-button-background);
        }

        .ai-message .avatar-icon {
            background: var(--vscode-textLink-foreground);
        }

        .message-content {
            flex: 1;
            background: var(--vscode-input-background);
            border-radius: 8px;
            padding: 12px;
            border: 1px solid var(--vscode-input-border);
        }

        .message-text {
            margin-bottom: 8px;
        }

        .message-time {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .chat-input-area {
            padding: 16px;
            border-top: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
            border-radius: 0 0 8px 8px;
        }

        .chat-input {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
            resize: vertical;
            min-height: 40px;
        }

        .chat-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .chat-send-button {
            margin-top: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
        }

        .chat-send-button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .chat-send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Code block styles */
        .code-block {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            margin: 8px 0;
            overflow: hidden;
        }

        .code-header {
            background: var(--vscode-editorWidget-background);
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-widget-border);
            display: flex;
            justify-content: flex-end;
        }

        .copy-code-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
        }

        .copy-code-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .code-block pre {
            margin: 0;
            padding: 12px;
            overflow-x: auto;
        }

        .code-block code {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }

        .inline-code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }

        /* Loading and status styles */
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-descriptionForeground);
            border-radius: 50%;
            border-top-color: var(--vscode-progressBar-background);
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .error-message {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            padding: 8px 12px;
            margin: 8px 0;
        }

        .success-message {
            color: var(--vscode-foreground);
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px 12px;
            margin: 8px 0;
        }

        /* Responsive styles */
        @media (max-width: 768px) {
            .detail-view-container {
                padding: 16px;
            }
            
            .detail-view-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }
            
            .detail-view-actions {
                align-self: stretch;
            }
        }
    </style>`;
  }

  /**
   * Generate body content
   */
  private static generateBodyContent(
    detailHtml: string,
    finding: BaselineFinding,
    relativePath: string,
    geminiContext?: GeminiSupportContext
  ): string {
    return `
    <div class="detail-view-container">
        <div class="detail-view-header">
            <div class="detail-view-title">
                <h1>${DetailViewUtils.escapeHtml(finding.feature.name)}</h1>
            </div>
            <div class="detail-view-actions">
                <button class="detail-view-button" onclick="refreshView()">
                    🔄 Refresh
                </button>
            </div>
        </div>
        
        <div class="file-breadcrumb">
            📁 ${DetailViewUtils.escapeHtml(relativePath)}
        </div>
        
        <div class="detail-content">
            ${detailHtml}
        </div>
        
        ${geminiContext ? this.generateChatInterface(geminiContext) : ''}
    </div>`;
  }

  /**
   * Generate chat interface HTML
   */
  private static generateChatInterface(geminiContext: GeminiSupportContext): string {
    const existingMessages = geminiContext.suggestions ? 
      DetailViewUtils.renderExistingChatMessages(geminiContext.suggestions) : '';
    
    return `
    <div class="chat-interface">
        <div class="chat-header">
            <h3>💬 AI Assistant</h3>
            <p>Ask questions about this issue or request help with implementation.</p>
        </div>
        
        <div class="chat-messages" id="chatMessages">
            ${existingMessages}
            <div id="responseArea"></div>
        </div>
        
        <div class="chat-input-area">
            <textarea 
                class="chat-input" 
                id="chatInput" 
                placeholder="Ask a follow-up question about this issue..."
                rows="2"
            ></textarea>
            <button class="chat-send-button" id="sendButton" onclick="sendFollowUpQuestion()">
                Send
            </button>
        </div>
    </div>`;
  }

  /**
   * Generate JavaScript for interactivity
   */
  private static generateJavaScript(nonce: string): string {
    return `
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        // Handle copying code to clipboard
        function copyCodeToClipboard(button) {
            const code = button.getAttribute('data-code');
            vscode.postMessage({
                type: 'copyCodeSnippet',
                code: code
            });
        }
        
        // Handle refresh view
        function refreshView() {
            vscode.postMessage({
                type: 'refresh'
            });
        }
        
        // Handle sending follow-up questions
        function sendFollowUpQuestion() {
            const input = document.getElementById('chatInput');
            const button = document.getElementById('sendButton');
            const question = input.value.trim();
            
            if (!question) return;
            
            // Disable input and button
            input.disabled = true;
            button.disabled = true;
            button.textContent = 'Sending...';
            
            // Add user message to chat
            addUserMessage(question);
            
            // Send message to extension
            vscode.postMessage({
                type: 'askGeminiFollowUp',
                question: question,
                findingId: '${DetailViewUtils.sanitizeAttribute("current")}',
                feature: '',
                filePath: '',
                target: ''
            });
            
            // Clear input
            input.value = '';
        }
        
        // Add user message to chat
        function addUserMessage(message) {
            const messagesContainer = document.getElementById('chatMessages');
            const messageHtml = \`
                <div class="chat-message user-message">
                    <div class="message-avatar">
                        <div class="avatar-icon">👤</div>
                    </div>
                    <div class="message-content">
                        <div class="message-text">\${message}</div>
                        <div class="message-time">\${new Date().toLocaleString()}</div>
                    </div>
                </div>
            \`;
            messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Show loading indicator
            showLoadingIndicator();
        }
        
        // Show loading indicator
        function showLoadingIndicator() {
            const responseArea = document.getElementById('responseArea');
            responseArea.innerHTML = \`
                <div class="chat-message ai-message">
                    <div class="message-avatar">
                        <div class="avatar-icon">✨</div>
                    </div>
                    <div class="message-content">
                        <div class="loading-spinner"></div>
                        <span style="margin-left: 8px;">Thinking...</span>
                    </div>
                </div>
            \`;
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'geminiResponse':
                    handleGeminiResponse(message);
                    break;
            }
        });
        
        // Handle Gemini response
        function handleGeminiResponse(response) {
            const input = document.getElementById('chatInput');
            const button = document.getElementById('sendButton');
            const responseArea = document.getElementById('responseArea');
            
            // Re-enable input and button
            input.disabled = false;
            button.disabled = false;
            button.textContent = 'Send';
            
            if (response.state === 'success') {
                responseArea.innerHTML = \`
                    <div class="chat-message ai-message">
                        <div class="message-avatar">
                            <div class="avatar-icon">✨</div>
                        </div>
                        <div class="message-content">
                            <div class="message-text">\${response.response}</div>
                            <div class="message-time">\${new Date().toLocaleString()}</div>
                        </div>
                    </div>
                \`;
            } else if (response.state === 'error') {
                responseArea.innerHTML = \`
                    <div class="error-message">
                        ❌ Error: \${response.error}
                    </div>
                \`;
            }
            
            // Scroll to bottom
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Handle Enter key in textarea
        document.getElementById('chatInput').addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendFollowUpQuestion();
            }
        });
    </script>`;
  }
}