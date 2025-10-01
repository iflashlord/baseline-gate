import type { BaselineFinding } from "../../workspaceScanner";
import type { Target } from "../../../core/targets";
import type { GeminiSupportContext } from "../../analysis/types";
import { DetailViewDataTransformer } from "../dataTransformer";
import { DetailViewUtils } from "../utils";

export function buildDetailViewBody(
  detailHtml: string,
  finding: BaselineFinding,
  relativePath: string,
  target: Target,
  geminiContext?: GeminiSupportContext
): string {
  const findingId = DetailViewDataTransformer.generateFindingId(finding);
  const featureId = finding.feature.id || findingId;
  const containerAttributes = [
    `data-finding-id="${DetailViewUtils.sanitizeAttribute(findingId)}"`,
    `data-feature-id="${DetailViewUtils.sanitizeAttribute(featureId)}"`,
    `data-feature-name="${DetailViewUtils.sanitizeAttribute(finding.feature.name)}"`,
    `data-file-path="${DetailViewUtils.sanitizeAttribute(relativePath)}"`,
    `data-file-uri="${DetailViewUtils.sanitizeAttribute(finding.uri.toString())}"`,
    `data-target="${DetailViewUtils.sanitizeAttribute(target)}"`
  ].join(' ');

  return `
    <div class="detail-view-container" ${containerAttributes}>
        <!-- Search functionality -->
        <div class="search-container">
            <div class="search-box">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input 
                    type="text" 
                    class="search-input" 
                    id="searchInput"
                    placeholder="Search in page content..."
                >
                <button class="search-clear" id="searchClear" onclick="clearSearch()" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>

        <div class="detail-view-header">
            <div class="detail-view-title">
                <h1>${DetailViewUtils.escapeHtml(finding.feature.name)}</h1>
            </div>
            <div class="detail-view-actions">
                <button class="detail-view-button" onclick="refreshView()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                    </svg>
                    Refresh
                </button>
            </div>
        </div>
        
        <div class="file-breadcrumb">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"></path>
            </svg>
            ${DetailViewUtils.escapeHtml(relativePath)}
        </div>
        
        <div class="detail-content" id="detailContent">
            ${detailHtml}
        </div>
        
        ${geminiContext ? renderChatInterface(geminiContext) : ''}
    </div>
  `.trim();
}

export function buildFeatureViewBody(detailHtml: string): string {
  return `
    <div class="detail-view-container">
        ${detailHtml}
    </div>
  `.trim();
}

function renderChatInterface(geminiContext: GeminiSupportContext): string {
  const existingMessages = geminiContext.suggestions
    ? DetailViewUtils.renderExistingChatMessages(geminiContext.suggestions)
    : '';

  return `
    <div class="chat-interface">
        <div class="chat-header">
            <h3>
              <svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              AI Assistant
            </h3>
            <p>Ask questions about this issue or request help with implementation.</p>
        </div>
        
        <div class="chat-messages" id="chatMessages">
            ${existingMessages}
            <div id="responseArea"></div>
        </div>
        
        <div class="chat-input-container">
            <div class="chat-input-wrapper">
                <textarea 
                    class="chat-input" 
                    id="chatInput" 
                    placeholder="Ask a follow-up question about this issue..."
                    rows="2"
                ></textarea>
                <button class="chat-send-button" id="sendButton" onclick="sendFollowUpQuestion()" title="Send message">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22,2 15,22 11,13 2,9"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    </div>
  `.trim();
}
