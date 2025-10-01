export function getDetailViewScript(): string {
  return `
        const vscode = acquireVsCodeApi();
        const detailMetadata = readDetailMetadata();

        // Initialize page functionality
        document.addEventListener('DOMContentLoaded', function() {
            initializeSearch();
            initializeChat();
            initializeButtonHandlers();
        });

        function readDetailMetadata() {
            const container = document.querySelector('.detail-view-container');
            if (!container) {
                return {
                    findingId: '',
                    featureId: '',
                    featureName: '',
                    filePath: '',
                    target: ''
                };
            }

            return {
                findingId: container.getAttribute('data-finding-id') || '',
                featureId: container.getAttribute('data-feature-id') || '',
                featureName: container.getAttribute('data-feature-name') || '',
                filePath: container.getAttribute('data-file-path') || '',
                target: container.getAttribute('data-target') || ''
            };
        }

        // Search functionality
        function initializeSearch() {
            const searchInput = document.getElementById('searchInput');
            const searchClear = document.getElementById('searchClear');
            
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    const query = e.target.value.trim();
                    if (query) {
                        searchClear.style.display = 'block';
                        performSearch(query);
                    } else {
                        searchClear.style.display = 'none';
                        clearSearchHighlights();
                    }
                });
                
                searchInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        clearSearch();
                    }
                });
            }
        }
        
        function performSearch(query) {
            clearSearchHighlights();
            if (!query) return;
            
            const content = document.getElementById('detailContent');
            const walker = document.createTreeWalker(
                content,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            
            const escapedQuery = escapeRegExp(query);
            const regex = new RegExp('(' + escapedQuery + ')', 'gi');
            
            textNodes.forEach(textNode => {
                const text = textNode.textContent;
                if (regex.test(text)) {
                    const highlightedText = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                    const wrapper = document.createElement('span');
                    wrapper.innerHTML = highlightedText;
                    textNode.parentNode.replaceChild(wrapper, textNode);
                }
            });
            
            // Scroll to first match
            const firstMatch = content.querySelector('.search-highlight');
            if (firstMatch) {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        function clearSearch() {
            const searchInput = document.getElementById('searchInput');
            const searchClear = document.getElementById('searchClear');
            searchInput.value = '';
            searchClear.style.display = 'none';
            clearSearchHighlights();
        }
        
        function clearSearchHighlights() {
            const highlights = document.querySelectorAll('.search-highlight');
            highlights.forEach(highlight => {
                const parent = highlight.parentNode;
                parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
                parent.normalize();
            });
        }
        
        function escapeRegExp(string) {
            return string.replace(/[\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
        }
        
        // Chat functionality
        function initializeChat() {
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.addEventListener('keydown', function(event) {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendFollowUpQuestion();
                    }
                });
                
                // Auto-resize textarea
                chatInput.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
                });
            }
        }
        
        // Button handlers
        function initializeButtonHandlers() {
            document.addEventListener('click', function(event) {
                const target = event.target instanceof Element ? event.target : null;
                if (!target) {
                    return;
                }

                const commandTarget = target.closest('[data-command]');
                if (commandTarget instanceof HTMLElement) {
                    event.preventDefault();
                    const command = commandTarget.getAttribute('data-command');
                    if (command) {
                        vscode.postMessage({
                            type: 'executeCommand',
                            command
                        });
                    }
                }

                // Handle occurrence file path clicks
                const occurrenceTarget = target.closest('.occurrence-file-path');
                if (occurrenceTarget instanceof HTMLElement) {
                    event.preventDefault();
                    const uri = occurrenceTarget.getAttribute('data-uri');
                    const line = occurrenceTarget.getAttribute('data-line');
                    const character = occurrenceTarget.getAttribute('data-character');
                    
                    if (uri && line && character) {
                        vscode.postMessage({
                            type: 'openFileAtLine',
                            uri: uri,
                            line: parseInt(line, 10),
                            character: parseInt(character, 10)
                        });
                    }
                }
            });
        }
        
        // Copy code to clipboard
        function copyCodeToClipboard(button) {
            const code = button.getAttribute('data-code');
            vscode.postMessage({
                type: 'copyCodeSnippet',
                code: code
            });
        }
        
        // Refresh view
        function refreshView() {
            vscode.postMessage({
                type: 'refresh'
            });
        }

        
        // Send follow-up question with enhanced functionality
        function sendFollowUpQuestion() {
            const input = document.getElementById('chatInput');
            const button = document.getElementById('sendButton');
            const question = input.value.trim();
            
            if (!question) return;
            
            // Disable input and button
            input.disabled = true;
            button.disabled = true;
            
            // Add user message to chat (separate entry as requested)
            addUserMessage(question);
            
            // Send message to extension
            vscode.postMessage({
                type: 'askGeminiFollowUp',
                question: question,
                findingId: detailMetadata.findingId || 'current',
                feature: detailMetadata.featureId || detailMetadata.featureName || '', // Use featureId for shared conversations
                filePath: detailMetadata.filePath || '',
                target: detailMetadata.target || ''
            });
            
            // Clear input
            input.value = '';
            input.style.height = 'auto';
        }
        
        // Add user message with SVG avatar
        function addUserMessage(message) {
            const messagesContainer = document.getElementById('chatMessages');
            
            // Remove empty state if it exists
            const emptyState = messagesContainer.querySelector('.chat-history-empty');
            if (emptyState) {
                emptyState.remove();
            }
            
            // Add separator if there are existing messages but no header yet
            if (!messagesContainer.querySelector('.chat-history-header') && messagesContainer.children.length > 0) {
                const separatorHtml = \`
                    <div class="new-conversation-separator">
                        <hr style="border: none; border-top: 1px solid var(--vscode-widget-border); margin: 20px 0;">
                        <small style="color: var(--vscode-descriptionForeground); text-align: center; display: block; margin-top: -10px; background: var(--vscode-editor-background); padding: 0 8px;">New Conversation</small>
                    </div>
                \`;
                messagesContainer.insertAdjacentHTML('beforeend', separatorHtml);
            }
            
            const messageHtml = \`
                <div class="chat-message user-message">
                    <div class="message-avatar">
                        <div class="avatar-icon user-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
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
        
        // Show enhanced loading indicator
        function showLoadingIndicator() {
            const messagesContainer = document.getElementById('chatMessages');
            const loadingHtml = \`
                <div class="chat-message ai-message loading-message">
                    <div class="message-avatar">
                        <div class="avatar-icon ai-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M9.663 17h4.673M12 3l1.735 3.013 3.408.494-2.463 2.401.582 3.392L12 10.695 8.738 12.3l.582-3.392-2.463-2.401 3.408-.494L12 3z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="message-content">
                        <div class="message-text">
                            <div class="loading-spinner"></div>
                            <span style="margin-left: 8px;">Thinking...</span>
                        </div>
                    </div>
                </div>
            \`;
            messagesContainer.insertAdjacentHTML('beforeend', loadingHtml);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'geminiResponse':
                    handleGeminiResponse(message);
                    break;
                case 'scrollToAIAssistant':
                    scrollToAIAssistant();
                    break;
            }
        });
        
        // Handle Gemini response with proper markdown formatting
        function handleGeminiResponse(response) {
            const input = document.getElementById('chatInput');
            const button = document.getElementById('sendButton');
            const messagesContainer = document.getElementById('chatMessages');
            
            // Remove loading message
            const loadingMessage = messagesContainer.querySelector('.loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
            
            // Re-enable input and button
            input.disabled = false;
            button.disabled = false;
            
            let responseHtml = '';
            
            if (response.state === 'success') {
                // Format response as proper markdown
                const formattedResponse = formatMarkdown(response.response || response.suggestion || '');
                responseHtml = \`
                    <div class="chat-message ai-message">
                        <div class="message-avatar">
                            <div class="avatar-icon ai-avatar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M9.663 17h4.673M12 3l1.735 3.013 3.408.494-2.463 2.401.582 3.392L12 10.695 8.738 12.3l.582-3.392-2.463-2.401 3.408-.494L12 3z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="message-content">
                            <div class="message-text">\${formattedResponse}</div>
                            <div class="message-time">\${new Date().toLocaleString()}</div>
                        </div>
                    </div>
                \`;
            } else if (response.state === 'error') {
                responseHtml = \`
                    <div class="chat-message ai-message">
                        <div class="message-avatar">
                            <div class="avatar-icon ai-avatar ai-avatar-error">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="15" y1="9" x2="9" y2="15"></line>
                                    <line x1="9" y1="9" x2="15" y2="15"></line>
                                </svg>
                            </div>
                        </div>
                        <div class="message-content">
                            <div class="error-message">
                                Error: \${response.error}
                            </div>
                            <div class="message-time">\${new Date().toLocaleString()}</div>
                        </div>
                    </div>
                \`;
            }
            
            // Add the response to the messages container
            if (responseHtml) {
                messagesContainer.insertAdjacentHTML('beforeend', responseHtml);
            }
            
            // Scroll to bottom (latest message appears at the end as requested)
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Format markdown for proper display - enhanced with better formatting
        function formatMarkdown(text) {  
            return text
                .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<div class="code-block" data-code-block><pre><code>$1</code></pre><button type="button" class="code-copy-btn" data-action="copy-code" aria-label="Copy code snippet" title="Copy code snippet">Copy</button></div>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\*\\*\\*([^*]+)\\*\\*\\*/g, '<strong><em>$1</em></strong>')
                .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\*([^*]+)\\*/g, '<em>$1</em>')
                .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                .replace(/^\\* (.+)$/gm, '<li>$1</li>')
                .replace(/^\\d+\\. (.+)$/gm, '<li>$1</li>')
                .replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>')
                .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
                .replace(/\\n\\n/g, '</p><p>')
                .replace(/\\n/g, '<br>');
        }
        
        // Scroll to AI Assistant section
        function scrollToAIAssistant() {
            const aiAssistantSection = document.querySelector('.chat-interface');
            if (aiAssistantSection) {
                aiAssistantSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                // Optional: Add a brief highlight effect
                aiAssistantSection.style.backgroundColor = 'var(--vscode-editor-findMatchBackground)';
                setTimeout(() => {
                    aiAssistantSection.style.backgroundColor = '';
                }, 2000);
            }
        }
        
        // CSS for search highlights
        const style = document.createElement('style');
        style.textContent = \`
            .search-highlight {
                background: var(--vscode-editor-findMatchHighlightBackground);
                color: var(--vscode-editor-findMatchHighlightForeground);
                border-radius: 2px;
                padding: 1px 2px;
            }
        \`;
        document.head.appendChild(style);
  `.trim();
}
