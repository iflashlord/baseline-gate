export function getGeminiFullPageScript(nonce: string, initialState: string): string {
  return `<script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();
            const initialState = ${initialState};
            
            // Restore state
            vscode.setState(initialState);
            
            // Handle search input - only search on Enter key or button click
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                // Search on Enter key
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const query = e.target.value;
                        vscode.postMessage({ type: 'searchSuggestions', query });
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        e.target.value = '';
                        vscode.postMessage({ type: 'searchSuggestions', query: '' });
                    }
                });
            }

            // Handle clear search button
            document.addEventListener('click', (e) => {
                if (e.target.dataset.action === 'clear-search') {
                    if (searchInput) {
                        searchInput.value = '';
                        vscode.postMessage({
                            type: 'searchSuggestions',
                            query: ''
                        });
                    }
                }
            });

            // Handle clear all button
            document.addEventListener('click', (e) => {
                if (e.target.dataset.action === 'clear-all') {
                    vscode.postMessage({ type: 'clearAllSuggestions' });
                }
            });

            // Handle export conversation button
            document.addEventListener('click', (e) => {
                if (e.target.dataset.action === 'export-conversation') {
                    vscode.postMessage({ 
                        type: 'exportConversation',
                        format: 'markdown'
                    });
                }
            });

            // Handle all actions with comprehensive event delegation (matching original)
            document.addEventListener('click', function(event) {
                if (!(event.target instanceof Element)) {
                    return;
                }

                const actionable = event.target.closest('[data-action]');
                if (!actionable) {
                    return;
                }

                const action = actionable.getAttribute('data-action');
                
                // Don't prevent default for rating and follow-up actions to avoid scroll issues
                if (action !== 'rate' && action !== 'follow-up' && action !== 'send-follow-up') {
                    event.preventDefault();
                }
                switch (action) {
                    case 'remove': {
                        const suggestionId = actionable.getAttribute('data-suggestion-id');
                        if (suggestionId) {
                            vscode.postMessage({ type: 'removeSuggestion', id: suggestionId });
                        }
                        break;
                    }
                    case 'clear-all': {
                        vscode.postMessage({ type: 'clearAllSuggestions' });
                        break;
                    }
                    case 'open-file': {
                        const filePath = actionable.getAttribute('data-file-path');
                        if (filePath) {
                            vscode.postMessage({ type: 'openFileAtLocation', filePath });
                        }
                        break;
                    }
                    case 'go-to-finding': {
                        const findingId = actionable.getAttribute('data-finding-id');
                        if (findingId) {
                            vscode.postMessage({ type: 'goToFinding', findingId });
                        }
                        break;
                    }
                    case 'copy': {
                        const suggestionId = actionable.getAttribute('data-suggestion-id');
                        if (suggestionId) {
                            vscode.postMessage({ type: 'copySuggestion', id: suggestionId });
                        }
                        break;
                    }
                    case 'copy-code': {
                        const codeBlock = actionable.closest('[data-code-block]') || actionable.closest('.code-block');
                        const codeElement = codeBlock ? codeBlock.querySelector('code') : null;
                        const code = codeElement ? codeElement.textContent ?? '' : '';
                        vscode.postMessage({ type: 'copyCodeSnippet', code });
                        
                        // Show visual feedback
                        const originalSvg = actionable.innerHTML;
                        actionable.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"></polyline></svg>';
                        setTimeout(() => {
                            actionable.innerHTML = originalSvg;
                        }, 1000);
                        break;
                    }
                    case 'clear-search': {
                        clearSearchField();
                        break;
                    }
                    case 'perform-search': {
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) {
                            const query = searchInput.value;
                            vscode.postMessage({ type: 'searchSuggestions', query });
                        }
                        break;
                    }
                    case 'rate': {
                        const suggestionId = actionable.getAttribute('data-suggestion-id');
                        const rating = actionable.getAttribute('data-rating');
                        if (suggestionId && rating) {
                            vscode.postMessage({ 
                                type: 'rateSuggestion', 
                                id: suggestionId, 
                                rating: parseInt(rating) 
                            });
                        }
                        break;
                    }
                    case 'retry': {
                        const suggestionId = actionable.getAttribute('data-suggestion-id');
                        if (suggestionId) {
                            vscode.postMessage({ type: 'retrySuggestion', id: suggestionId });
                        }
                        break;
                    }
                    case 'follow-up': {
                        const suggestionId = actionable.getAttribute('data-suggestion-id');
                        showFollowUpInput(suggestionId);
                        break;
                    }
                    case 'export-markdown': {
                        vscode.postMessage({ type: 'exportConversation', format: 'markdown' });
                        break;
                    }
                    case 'export-json': {
                        vscode.postMessage({ type: 'exportConversation', format: 'json' });
                        break;
                    }
                    case 'export-conversation': {
                        vscode.postMessage({ type: 'exportConversation', format: 'markdown' });
                        break;
                    }
                    case 'send-follow-up': {
                        const suggestionId = actionable.getAttribute('data-suggestion-id');
                        const input = document.getElementById('follow-up-' + suggestionId);
                        if (input && input.value.trim()) {
                            vscode.postMessage({ 
                                type: 'sendFollowUp', 
                                message: input.value.trim(),
                                parentId: suggestionId
                            });
                            hideFollowUpInput(suggestionId);
                        }
                        break;
                    }
                    case 'cancel-follow-up': {
                        const suggestionId = actionable.getAttribute('data-suggestion-id');
                        hideFollowUpInput(suggestionId);
                        break;
                    }
                    default:
                        break;
                }
            });

            function showFollowUpInput(suggestionId) {
                const suggestion = document.querySelector('[data-suggestion-id="' + suggestionId + '"]');
                if (!suggestion) return;

                // Remove existing follow-up if any
                hideFollowUpInput(suggestionId);

                const followUpHtml = 
                    '<div class="follow-up-container" id="follow-up-container-' + suggestionId + '">' +
                        '<input type="text" class="follow-up-input" id="follow-up-' + suggestionId + '" ' +
                               'placeholder="Ask a follow-up question..." />' +
                        '<div class="follow-up-actions">' +
                            '<button type="button" class="action-btn" data-action="send-follow-up" data-suggestion-id="' + suggestionId + '">Send</button>' +
                            '<button type="button" class="action-btn" data-action="cancel-follow-up" data-suggestion-id="' + suggestionId + '">Cancel</button>' +
                        '</div>' +
                    '</div>';
                
                suggestion.insertAdjacentHTML('beforeend', followUpHtml);
                const input = document.getElementById('follow-up-' + suggestionId);
                if (input) {
                    input.focus();
                    input.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            const sendBtn = document.querySelector('[data-action="send-follow-up"][data-suggestion-id="' + suggestionId + '"]');
                            if (sendBtn) sendBtn.click();
                        }
                    });
                }
            }

            function hideFollowUpInput(suggestionId) {
                const container = document.getElementById('follow-up-container-' + suggestionId);
                if (container) {
                    container.remove();
                }
            }

            function clearSearchField() {
                if (searchInput) {
                    searchInput.value = '';
                    vscode.postMessage({
                        type: 'searchSuggestions',
                        query: ''
                    });
                }
            }

            // Auto-scroll to latest suggestion
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.type === 'scrollToLatest') {
                    const suggestions = document.querySelectorAll('.suggestion-card');
                    if (suggestions.length > 0) {
                        suggestions[suggestions.length - 1].scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                    }
                }
            });

            // Handle keyboard shortcuts
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape' && searchInput && document.activeElement === searchInput && searchInput.value) {
                    clearSearchField();
                }
            });
        })();
    </script>`;
}
