export function getAnalysisViewScript(): string {
  return `
      const vscode = acquireVsCodeApi();

      let currentState = null;
      let searchDebounce = null;

      const controls = document.querySelector('[data-action="scan"]');
      const clearBtn = document.querySelector('[data-action="clear-filters"]');
      const detailedAnalysisBtn = document.querySelector('[data-action="open-detailed-analysis"]');
      const searchInput = document.querySelector('[data-search]');
      const severityContainer = document.querySelector('[data-severity]');
      const sortSelect = document.querySelector('[data-sort]');
      const groupSimilarToggle = document.querySelector('[data-group-similar]');
      const resultsNode = document.querySelector('[data-results]');
      const summaryNode = document.querySelector('[data-summary]');
      const filterPanel = document.querySelector('[data-filter-panel]');
      const filterSummaryStatus = document.querySelector('[data-filter-summary]');
      const filterSummaryToggle = filterPanel ? filterPanel.querySelector('summary') : null;
      const detailNode = document.querySelector('[data-detail]');
      const detailTitleNode = document.querySelector('[data-detail-title]');
      const detailSubtitleNode = document.querySelector('[data-detail-subtitle]');
      const detailPathNode = document.querySelector('[data-detail-path]');
      const detailBodyNode = document.querySelector('[data-detail-body]');
      const detailCloseBtn = document.querySelector('[data-detail-close]');
      const resizeHandle = document.querySelector('[data-resize-handle]');
      const insightsBackdrop = document.querySelector('[data-insights-backdrop]');
      const insightsPanel = document.querySelector('[data-insights-panel]');
      const insightsCloseBtn = document.querySelector('[data-insights-close]');
      const insightsGrid = insightsPanel ? insightsPanel.querySelector('[data-insights]') : null;
      const historyCard = insightsGrid ? insightsGrid.querySelector('[data-history-card]') : null;
      const historyChart = historyCard ? historyCard.querySelector('[data-history-chart]') : null;
      const historyCaption = historyCard ? historyCard.querySelector('[data-history-caption]') : null;
      const statsCard = insightsGrid ? insightsGrid.querySelector('[data-stats-card]') : null;
      const statsBars = statsCard ? statsCard.querySelector('[data-stats-bars]') : null;
      const statsCaption = statsCard ? statsCard.querySelector('[data-stats-caption]') : null;
      const budgetCard = insightsGrid ? insightsGrid.querySelector('[data-budget-card]') : null;
      const budgetGrid = budgetCard ? budgetCard.querySelector('[data-budget-grid]') : null;
      const budgetCaption = budgetCard ? budgetCard.querySelector('[data-budget-caption]') : null;
      const allSeverityValues = severityContainer
        ? Array.from(severityContainer.querySelectorAll('input')).map((input) => input.value)
        : [];
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const MAX_SNIPPET_PREVIEW = 120;
      let filterPanelTouched = false;

      if (filterSummaryToggle) {
        filterSummaryToggle.setAttribute('aria-expanded', filterPanel && filterPanel.open ? 'true' : 'false');
      }

      if (filterPanel && filterSummaryToggle) {
        filterPanel.addEventListener('toggle', (event) => {
          if (event.isTrusted) {
            filterPanelTouched = true;
          }
          filterSummaryToggle.setAttribute('aria-expanded', filterPanel.open ? 'true' : 'false');
        });
      }

      // Resize functionality
      let isResizing = false;
      let startY = 0;
      let startHeight = 0;

      resizeHandle.addEventListener('mousedown', (event) => {
        isResizing = true;
        startY = event.clientY;
        startHeight = detailNode.offsetHeight;
        resizeHandle.classList.add('dragging');
        
        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ns-resize';
        
        event.preventDefault();
      });

      // Touch support for mobile devices
      resizeHandle.addEventListener('touchstart', (event) => {
        isResizing = true;
        startY = event.touches[0].clientY;
        startHeight = detailNode.offsetHeight;
        resizeHandle.classList.add('dragging');
        
        // Prevent scrolling during resize
        document.body.style.touchAction = 'none';
        
        event.preventDefault();
      });

      document.addEventListener('mousemove', (event) => {
        if (!isResizing) return;
        
        const deltaY = startY - event.clientY; // Inverted for natural drag feel
        const newHeight = Math.max(200, Math.min(window.innerHeight * 0.8, startHeight + deltaY));
        
        detailNode.style.height = newHeight + 'px';
        detailNode.style.flex = 'none'; // Override flex sizing
        
        event.preventDefault();
      });

      document.addEventListener('touchmove', (event) => {
        if (!isResizing) return;
        
        const deltaY = startY - event.touches[0].clientY;
        const newHeight = Math.max(200, Math.min(window.innerHeight * 0.8, startHeight + deltaY));
        
        detailNode.style.height = newHeight + 'px';
        detailNode.style.flex = 'none';
        
        event.preventDefault();
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          resizeHandle.classList.remove('dragging');
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
        }
      });

      document.addEventListener('touchend', () => {
        if (isResizing) {
          isResizing = false;
          resizeHandle.classList.remove('dragging');
          document.body.style.touchAction = '';
        }
      });

      if (insightsCloseBtn) {
        insightsCloseBtn.addEventListener('click', () => {
          closeInsightsPanel();
        });
      }
      if (insightsBackdrop) {
        insightsBackdrop.addEventListener('click', () => {
          closeInsightsPanel();
        });
      }
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeInsightsPanel();
        }
      });

      controls.addEventListener('click', () => {
        vscode.postMessage({ type: 'scan' });
      });

      clearBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'clearFilters' });
      });

      if (detailedAnalysisBtn) {
        detailedAnalysisBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'showInsights' });
        });
      }

      searchInput.addEventListener('input', (event) => {
        const value = event.target.value || '';
        if (searchDebounce) {
          clearTimeout(searchDebounce);
        }
        searchDebounce = setTimeout(() => {
          vscode.postMessage({ type: 'setSearch', value });
        }, 150);
      });

      severityContainer.addEventListener('click', (event) => {
        const label = event.target.closest('label[data-verdict]');
        if (!label) {
          return;
        }
        event.preventDefault();
        const checkbox = label.querySelector('input');
        checkbox.checked = !checkbox.checked;
        label.classList.toggle('inactive', !checkbox.checked);
        const verdicts = Array.from(severityContainer.querySelectorAll('input:checked')).map((input) => input.value);
        vscode.postMessage({ type: 'setSeverity', value: verdicts });
      });

      sortSelect.addEventListener('change', (event) => {
        vscode.postMessage({ type: 'setSort', value: event.target.value });
      });

      groupSimilarToggle.addEventListener('change', (event) => {
        // Re-render results with the new grouping preference
        if (currentState) {
          renderResults(currentState.files, currentState.severityIconUris, currentState.scanning, currentState.progressText, currentState.filteredSummary.total);
        }
      });

      detailCloseBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'closeDetail' });
      });

      detailBodyNode.addEventListener('click', (event) => {
        // Handle code copy buttons in chat interface
        const codeCopyButton = event.target.closest('.code-copy-button');
        if (codeCopyButton) {
          const codeId = codeCopyButton.getAttribute('data-code-id');
          const codeElement = document.getElementById(codeId);
          const codeText = codeElement ? codeElement.textContent || '' : '';
          navigator.clipboard.writeText(codeText).then(() => {
            // Visual feedback
            const originalContent = codeCopyButton.innerHTML;
            codeCopyButton.innerHTML = '<span>✓</span>';
            setTimeout(() => {
              codeCopyButton.innerHTML = originalContent;
            }, 2000);
          }).catch(() => {
            // Fallback to VS Code message
            vscode.postMessage({ type: 'copyCodeSnippet', code: codeText });
          });
          return;
        }

        // Handle context toggle
        const contextToggle = event.target.closest('.chat-context-toggle');
        if (contextToggle) {
          const isExpanded = contextToggle.getAttribute('data-expanded') === 'true';
          const contextDetails = contextToggle.parentElement.querySelector('.chat-context-details');
          
          if (contextDetails) {
            contextToggle.setAttribute('data-expanded', !isExpanded);
            contextDetails.style.display = isExpanded ? 'none' : 'block';
          }
          return;
        }

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
          const featureId = geminiButton.getAttribute('data-feature-id') || geminiButton.getAttribute('data-feature-name');
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
            // Regular "Fix with Gemini" behavior - use featureId for shared conversations
            vscode.postMessage({ type: 'askGemini', issue, feature: featureId, filePath, findingId });
          }
          return;
        }

        const chatSendButton = event.target.closest('.chat-send-button');
        if (chatSendButton && !chatSendButton.disabled) {
          const chatInput = chatSendButton.parentElement.querySelector('.chat-input');
          const followUpQuestion = chatInput.value.trim();
          
          if (followUpQuestion) {
            const findingId = chatInput.getAttribute('data-finding-id');
            const featureId = chatInput.getAttribute('data-feature-id') || chatInput.getAttribute('data-feature-name');
            const filePath = chatInput.getAttribute('data-file-path');
            const target = chatInput.getAttribute('data-target');
            
            // Show user message immediately
            const chatContentArea = detailBodyNode.querySelector('.chat-content-area');
            if (chatContentArea) {
              const userMessage = document.createElement('div');
              userMessage.className = 'chat-message user-message';
              userMessage.innerHTML = \`
                <div class="message-avatar">
                  <div class="avatar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M4 21v-2a4 4 0 0 1 3-3.87"/><circle cx="12" cy="7" r="4"/></svg></div>
                </div>
                <div class="message-content">
                  <div class="message-text">\${followUpQuestion.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                  <div class="message-time">\${new Date().toLocaleString()}</div>
                </div>
              \`;
              
              // Find chat-messages container or create one if it doesn't exist
              let messagesContainer = chatContentArea.querySelector('.chat-messages');
              if (!messagesContainer) {
                messagesContainer = document.createElement('div');
                messagesContainer.className = 'chat-messages';
                chatContentArea.appendChild(messagesContainer);
              }
              
              messagesContainer.appendChild(userMessage);
              
              // Add typing indicator
              const typingIndicator = document.createElement('div');
              typingIndicator.className = 'chat-message ai-message typing-indicator';
              typingIndicator.innerHTML = \`
                <div class="message-avatar">
                  <div class="avatar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
                </div>
                <div class="message-content">
                  <div class="message-text">Gemini is thinking...</div>
                </div>
              \`;
              messagesContainer.appendChild(typingIndicator);
              
              // Scroll to bottom
              setTimeout(() => {
                chatContentArea.scrollTop = chatContentArea.scrollHeight;
              }, 10);
            }
            
            vscode.postMessage({ 
              type: 'askGeminiFollowUp', 
              question: followUpQuestion,
              findingId,
              feature: featureId, // Use featureId for shared conversations
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

      window.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        if (type === 'state') {
          currentState = payload;
          applyState();
        } else if (type === 'showInsights') {
          openInsightsPanel();
        } else if (type === 'hideInsights') {
          closeInsightsPanel();
        }
      });

      // Chat input handling
      detailBodyNode.addEventListener('input', (event) => {
        if (event.target.classList.contains('chat-input')) {
          const input = event.target;
          const sendButton = input.parentElement.querySelector('.chat-send-button');
          const hasText = input.value.trim().length > 0;
          sendButton.disabled = !hasText;

          // Auto-resize textarea
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        }
      });

      detailBodyNode.addEventListener('keydown', (event) => {
        if (event.target.classList.contains('chat-input')) {
          if (event.key === 'Enter' && !event.shiftKey) {
            // Enter sends message
            event.preventDefault();
            const sendButton = event.target.parentElement.querySelector('.chat-send-button');
            if (!sendButton.disabled) {
              sendButton.click();
            }
          } else if (event.key === 'Enter' && event.shiftKey) {
            // Shift+Enter adds new line (default behavior)
            return;
          }
        }
      });

      // Keyboard navigation for accessibility
      let currentFocusIndex = -1;
      let focusableElements = [];
      let scrollPositions = new Map(); // Store scroll positions for different states
      let currentScrollState = 'default';
      
      function saveScrollPosition(state = currentScrollState) {
        scrollPositions.set(state, resultsNode.scrollTop);
      }
      
      function restoreScrollPosition(state = currentScrollState) {
        const savedPosition = scrollPositions.get(state);
        if (savedPosition !== undefined) {
          resultsNode.scrollTop = savedPosition;
        }
      }
      
      function scrollToElement(element) {
        if (element && element.scrollIntoView) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }
      
      function updateFocusableElements() {
        focusableElements = Array.from(resultsNode.querySelectorAll('.file-header, .issue, .grouped-issue-header, .occurrence-item, button, [tabindex="0"]'));
      }
      
      function setFocus(index) {
        if (index >= 0 && index < focusableElements.length) {
          focusableElements[currentFocusIndex]?.setAttribute('tabindex', '-1');
          currentFocusIndex = index;
          const element = focusableElements[currentFocusIndex];
          element.setAttribute('tabindex', '0');
          element.focus();
          scrollToElement(element);
        }
      }
      
      resultsNode.addEventListener('keydown', (event) => {
        updateFocusableElements();
        
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            if (currentFocusIndex < focusableElements.length - 1) {
              setFocus(currentFocusIndex + 1);
            }
            break;
            
          case 'ArrowUp':
            event.preventDefault();
            if (currentFocusIndex > 0) {
              setFocus(currentFocusIndex - 1);
            }
            break;
            
          case 'Enter':
          case ' ':
            event.preventDefault();
            const focused = focusableElements[currentFocusIndex];
            if (focused) {
              if (focused.classList.contains('file-header')) {
                focused.click();
                const details = focused.closest('details');
                if (details) {
                  const toggle = details.hasAttribute('open') ? 'close' : 'open';
                  // Trigger the toggle event
                  details.dispatchEvent(new Event('toggle'));
                }
              } else if (focused.classList.contains('issue')) {
                focused.click();
              } else if (focused.classList.contains('grouped-issue-header')) {
                // Toggle the group or select first occurrence
                const groupContainer = focused.closest('.grouped-issue');
                if (groupContainer) {
                  const toggle = focused.querySelector('.grouped-issue-toggle');
                  if (toggle) {
                    toggle.click();
                  }
                }
              } else if (focused.classList.contains('occurrence-item')) {
                focused.click();
              } else if (focused.tagName === 'BUTTON') {
                focused.click();
              }
            }
            break;
            
          case 'Home':
            event.preventDefault();
            setFocus(0);
            break;
            
          case 'End':
            event.preventDefault();
            setFocus(focusableElements.length - 1);
            break;
        }
      });
      
      // Handle focus management
      resultsNode.addEventListener('click', (event) => {
        // Skip focus management if the click is on grouped issue elements that handle their own events
        if (event.target.closest('.grouped-issue-toggle') || 
            event.target.closest('.occurrence-item') ||
            event.target.closest('.grouped-issue-occurrences')) {
          return;
        }
        
        updateFocusableElements();
        const clickedElement = event.target.closest('.file-header, .issue, .grouped-issue-header, .occurrence-item, button');
        if (clickedElement) {
          currentFocusIndex = focusableElements.indexOf(clickedElement);
          setFocus(currentFocusIndex);
        }
      });
      
      // Save scroll position periodically during manual scrolling
      let scrollTimeout;
      resultsNode.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          saveScrollPosition();
        }, 200);
      });

      function clearSvg(svg) {
        if (!svg) {
          return;
        }
        while (svg.firstChild) {
          svg.removeChild(svg.firstChild);
        }
      }

      function buildPath(points) {
        if (!points.length) {
          return '';
        }
        return points
          .map((point, index) => (index === 0 ? 'M' : 'L') + point.x + ' ' + point.y)
          .join(' ');
      }

      function renderHistoryCard(history) {
        if (!historyCard || !historyChart || !historyCaption) {
          return;
        }

        historyCard.classList.remove('hidden');
        clearSvg(historyChart);

        if (!Array.isArray(history) || history.length === 0) {
          historyCaption.textContent = 'Run a scan to build history.';
          historyChart.setAttribute('aria-label', 'No baseline history yet');
          return;
        }

        const entries = history.slice(-10);
        const width = 240;
        const height = 70;
        const padX = 12;
        const padY = 12;
        const innerWidth = width - padX * 2;
        const innerHeight = height - padY * 2;
        const blockedSeries = entries.map((entry) => entry.summary.blocked);
        const safeSeries = entries.map((entry) => entry.summary.safe);
        const maxValue = Math.max(1, ...blockedSeries, ...safeSeries);

        const toPoints = (series) =>
          entries.map((entry, index) => {
            const value = series[index];
            const x =
              entries.length === 1
                ? width / 2
                : padX + (innerWidth * index) / (entries.length - 1);
            const y = height - padY - (value / maxValue) * innerHeight;
            return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
          });

        const blockedPoints = toPoints(blockedSeries);
        const safePoints = toPoints(safeSeries);

        historyChart.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        historyChart.setAttribute('aria-label', 'Baseline scan history (blocked vs safe findings)');

        const axisX = document.createElementNS(SVG_NS, 'line');
        axisX.setAttribute('x1', String(padX));
        axisX.setAttribute('y1', String(height - padY));
        axisX.setAttribute('x2', String(width - padX));
        axisX.setAttribute('y2', String(height - padY));
        axisX.setAttribute('class', 'chart-axis');
        historyChart.appendChild(axisX);

        const axisY = document.createElementNS(SVG_NS, 'line');
        axisY.setAttribute('x1', String(padX));
        axisY.setAttribute('y1', String(padY));
        axisY.setAttribute('x2', String(padX));
        axisY.setAttribute('y2', String(height - padY));
        axisY.setAttribute('class', 'chart-axis');
        historyChart.appendChild(axisY);

        const axisMax = document.createElementNS(SVG_NS, 'text');
        axisMax.setAttribute('x', String(padX + 2));
        axisMax.setAttribute('y', String(padY - 2));
        axisMax.setAttribute('class', 'chart-axis-label');
        axisMax.textContent = String(maxValue);
        historyChart.appendChild(axisMax);

        const axisZero = document.createElementNS(SVG_NS, 'text');
        axisZero.setAttribute('x', String(padX + 2));
        axisZero.setAttribute('y', String(height - padY + 10));
        axisZero.setAttribute('class', 'chart-axis-label');
        axisZero.textContent = '0';
        historyChart.appendChild(axisZero);

        const firstEntry = entries[0];
        const lastEntry = entries[entries.length - 1];
        if (firstEntry) {
          const axisStart = document.createElementNS(SVG_NS, 'text');
          axisStart.setAttribute('x', String(padX));
          axisStart.setAttribute('y', String(height - padY + 20));
          axisStart.setAttribute('class', 'chart-axis-label');
          axisStart.textContent = new Date(firstEntry.timestamp).toLocaleDateString();
          historyChart.appendChild(axisStart);
        }
        if (lastEntry && entries.length > 1) {
          const axisEnd = document.createElementNS(SVG_NS, 'text');
          axisEnd.setAttribute('x', String(width - padX - 30));
          axisEnd.setAttribute('y', String(height - padY + 20));
          axisEnd.setAttribute('class', 'chart-axis-label');
          axisEnd.textContent = new Date(lastEntry.timestamp).toLocaleDateString();
          historyChart.appendChild(axisEnd);
        }

        if (safeSeries.some((value) => value > 0)) {
          const safePath = document.createElementNS(SVG_NS, 'path');
          safePath.setAttribute('d', buildPath(safePoints));
          safePath.setAttribute('class', 'chart-line-safe');
          const safeTitle = document.createElementNS(SVG_NS, 'title');
          safeTitle.textContent = 'Safe findings per scan';
          safePath.appendChild(safeTitle);
          historyChart.appendChild(safePath);
        }

        const blockedPath = document.createElementNS(SVG_NS, 'path');
        blockedPath.setAttribute('d', buildPath(blockedPoints));
        blockedPath.setAttribute('class', 'chart-line-blocked');
        const blockedTitle = document.createElementNS(SVG_NS, 'title');
        blockedTitle.textContent = 'Blocked findings per scan';
        blockedPath.appendChild(blockedTitle);
        historyChart.appendChild(blockedPath);

        blockedPoints.forEach((point, index) => {
          const dot = document.createElementNS(SVG_NS, 'circle');
          dot.setAttribute('cx', String(point.x));
          dot.setAttribute('cy', String(point.y));
          dot.setAttribute('r', String(index === blockedPoints.length - 1 ? 3 : 2));
          dot.setAttribute('class', 'chart-dot');
          const title = document.createElementNS(SVG_NS, 'title');
          const entry = entries[index];
          const dateLabel = new Date(entry.timestamp).toLocaleString();
          title.textContent = dateLabel + ': ' + entry.summary.blocked + ' blocked, ' + entry.summary.safe + ' safe';
          dot.appendChild(title);
          historyChart.appendChild(dot);
        });

        const latest = entries[entries.length - 1];
        const when = new Date(latest.timestamp);
        historyCaption.textContent =
          'Latest scan · ' +
          latest.summary.blocked +
          ' blocked · ' +
          latest.summary.warning +
          ' needs review · ' +
          latest.summary.safe +
          ' safe (' +
          when.toLocaleString() +
          ')';
      }

      function percent(part, total) {
        if (!total) {
          return 0;
        }
        return Math.max(0, Math.min(100, (part / total) * 100));
      }

      function appendFill(track, width, className) {
        const clamped = Math.max(0, Math.min(100, width));
        if (clamped <= 0) {
          return;
        }
        const fill = document.createElement('span');
        fill.className = 'bar-fill ' + className;
        fill.style.width = clamped + '%';
        track.appendChild(fill);
      }

      function renderStatsCard(stats) {
        if (!statsCard || !statsBars || !statsCaption) {
          return;
        }

        statsCard.classList.remove('hidden');

        if (!stats || !stats.total) {
          statsBars.innerHTML = '<p class="chart-empty">No findings yet.</p>';
          statsCaption.textContent = 'Scan your project to populate feature groups.';
          return;
        }

        const topGroups = stats.groups.slice(0, 4);
        statsBars.innerHTML = '';

        topGroups.forEach((group) => {
          if (!group || !group.total) {
            return;
          }

          const row = document.createElement('div');
          row.className = 'bar-row';

          const label = document.createElement('div');
          label.className = 'bar-label';
          label.textContent = group.name || 'Ungrouped features';
          label.title = group.name || 'Ungrouped features';
          row.appendChild(label);

          const metrics = document.createElement('div');
          metrics.className = 'bar-metrics';

          const track = document.createElement('div');
          track.className = 'bar-track';

          const blockedPct = percent(group.blocked, group.total);
          const warningPct = percent(group.warning, group.total);
          const safePct = Math.max(0, 100 - blockedPct - warningPct);

          appendFill(track, blockedPct, 'blocked');
          appendFill(track, warningPct, 'warning');
          appendFill(track, safePct, 'safe');

          const meta = document.createElement('div');
          meta.className = 'bar-meta';
          const metaText =
            group.blocked +
            ' blocked · ' +
            group.warning +
            ' review · ' +
            group.safe +
            ' safe';
          meta.textContent = metaText;

          row.title = metaText;

          metrics.appendChild(track);
          metrics.appendChild(meta);
          row.appendChild(metrics);

          statsBars.appendChild(row);
        });

        const remainder = Math.max(0, (stats.groups?.length || 0) - 4);
      const summaryText =
        'Totals · ' +
        stats.blocked +
        ' blocked · ' +
        stats.warning +
        ' needs review · ' +
        stats.wins +
        ' wins';
      statsCaption.textContent =
        remainder > 0 ? summaryText + ' · +' + remainder + ' more groups' : summaryText;
    }

      function renderBudgetCard(budget) {
        if (!budgetCard || !budgetGrid || !budgetCaption) {
          return;
        }

        budgetCard.classList.remove('hidden');

        if (!budget) {
          budgetGrid.innerHTML = '<p class="chart-empty">No budgets configured.</p>';
          budgetCaption.textContent = 'Set budgets in the Baseline Gate settings to start tracking progress.';
          return;
        }

        const rows = [];
        const statusMessages = [];

        const metrics = [
          {
            key: 'blocked',
            label: 'Blocked',
            actual: budget.blocked,
            limit: budget.blockedLimit ?? 0,
            variant: 'blocked',
            type: 'max'
          },
          {
            key: 'warning',
            label: 'Needs review',
            actual: budget.warning,
            limit: budget.warningLimit ?? undefined,
            variant: 'warning',
            type: 'max'
          },
          {
            key: 'safe',
            label: 'Wins',
            actual: budget.safe,
            limit: budget.safeLimit ?? undefined,
            variant: 'safe',
            type: 'min'
          }
        ];

        budgetGrid.innerHTML = '';

        metrics.forEach((metric) => {
          const row = document.createElement('div');
          row.className = 'budget-row';

          const label = document.createElement('div');
          label.className = 'budget-label';
          label.textContent = metric.label;

          const status = document.createElement('div');
          status.className = 'budget-status';

          let statusText = '';
          let overBudget = false;

          if (metric.type === 'max') {
            if (metric.limit === undefined) {
              statusText = metric.actual + ' findings (no limit)';
            } else {
              statusText = metric.actual + ' of ' + metric.limit + ' allowed';
              if (metric.actual > metric.limit) {
                overBudget = true;
                row.classList.add('over-limit');
                statusMessages.push(metric.label + ' over budget by ' + (metric.actual - metric.limit));
              }
            }
          } else {
            if (metric.limit === undefined || metric.limit === 0) {
              statusText = metric.actual + ' safe findings';
            } else {
              statusText = metric.actual + ' of ' + metric.limit + ' goal';
              if (metric.actual < metric.limit) {
                row.classList.add('under-goal');
                statusMessages.push('Need ' + (metric.limit - metric.actual) + ' more wins');
              }
            }
          }

          row.title = statusText;

          const meter = document.createElement('div');
          meter.className = 'budget-meter';
          const track = document.createElement('div');
          track.className = 'budget-meter-track';

          let ratio = 0;
          if (metric.type === 'max') {
            if (metric.limit !== undefined && metric.limit > 0) {
              ratio = Math.min(100, (metric.actual / metric.limit) * 100);
            } else if (metric.actual > 0) {
              ratio = 100;
            }
          } else if (metric.limit && metric.limit > 0) {
            ratio = Math.min(100, (metric.actual / metric.limit) * 100);
          } else if (metric.actual > 0) {
            ratio = 100;
          }

          const fill = document.createElement('span');
          fill.className = 'budget-meter-fill ' + metric.variant;
          fill.style.width = ratio + '%';

          const meterText = document.createElement('div');
          meterText.className = 'budget-meter-text';
          meterText.textContent = statusText;

          track.appendChild(fill);
          meter.appendChild(track);
          meter.appendChild(meterText);

          status.textContent = overBudget ? 'Over budget' : metric.type === 'min' && metric.limit !== undefined && metric.actual < metric.limit ? 'Below goal' : 'On track';

          row.appendChild(label);
          row.appendChild(status);
          row.appendChild(meter);

          budgetGrid.appendChild(row);
        });

        if (statusMessages.length) {
          budgetCaption.textContent = statusMessages.join(' · ');
        } else {
          budgetCaption.textContent = 'All budgets are on track.';
        }
      }

      function openInsightsPanel() {
        if (!insightsPanel || !insightsBackdrop) {
          return;
        }
        if (!insightsPanel.classList.contains('hidden') && insightsPanel.classList.contains('open')) {
          return;
        }
        insightsPanel.classList.remove('hidden');
        insightsPanel.setAttribute('aria-hidden', 'false');
        insightsBackdrop.classList.remove('hidden');
        requestAnimationFrame(() => {
          insightsPanel.classList.add('open');
          insightsBackdrop.classList.add('visible');
        });
      }

      function closeInsightsPanel() {
        if (!insightsPanel || !insightsBackdrop) {
          return;
        }
        if (insightsPanel.classList.contains('hidden')) {
          return;
        }
        insightsPanel.classList.remove('open');
        insightsPanel.setAttribute('aria-hidden', 'true');
        insightsBackdrop.classList.remove('visible');
        const transitionDuration = 200;
        setTimeout(() => {
          insightsPanel.classList.add('hidden');
          insightsBackdrop.classList.add('hidden');
        }, transitionDuration);
      }

      function applyState() {
        if (!currentState) {
          return;
        }

        // Save scroll position before rendering changes
        saveScrollPosition();

        const { scanning, searchQuery, severityFilter, sortOrder, progressText, filteredSummary, summary, files, severityIconUris, filtersActive, lastScanAt, detail, history, stats, budget } = currentState;

        controls.disabled = Boolean(scanning);
        clearBtn.disabled = !filtersActive;
        clearBtn.setAttribute('aria-disabled', (!filtersActive).toString());

        if (filterSummaryStatus) {
          const activeParts = [];
          if (searchQuery && searchQuery.trim()) {
            activeParts.push('Search');
          }
          if (Array.isArray(severityFilter) && severityFilter.length && severityFilter.length !== allSeverityValues.length) {
            activeParts.push('Severity');
          }
          if (sortOrder && sortOrder !== 'severity') {
            activeParts.push(sortOrder === 'file' ? 'Sort: File path' : 'Sort: ' + sortOrder);
          }
          if (groupSimilarToggle && groupSimilarToggle.checked) {
            activeParts.push('Grouped');
          }
          const statusText = filtersActive
            ? (activeParts.length ? activeParts.join(' | ') : 'Filters applied')
            : 'Default view';
          filterSummaryStatus.textContent = statusText;
          filterSummaryStatus.classList.toggle('active', filtersActive);
        }

        if (filterPanel && filtersActive && !filterPanel.open && !filterPanelTouched) {
          filterPanel.open = true;
          if (filterSummaryToggle) {
            filterSummaryToggle.setAttribute('aria-expanded', 'true');
          }
        }

        if (document.activeElement !== searchInput) {
          searchInput.value = searchQuery;
        }

        updateSeverityControls(severityFilter);
        sortSelect.value = sortOrder;
        updateSummary(summary, filteredSummary, scanning, progressText, lastScanAt);
        renderResults(files, severityIconUris, scanning, progressText, filteredSummary.total);
        renderDetail(detail);
        renderHistoryCard(history);
        renderStatsCard(stats);
        renderBudgetCard(budget);
        
        // Restore scroll position after rendering
        requestAnimationFrame(() => {
          restoreScrollPosition();
          
          // If there's a selected item, scroll to it
          const selectedFile = resultsNode.querySelector('.file-group.selected');
          const selectedIssue = resultsNode.querySelector('.issue.selected');
          
          if (selectedIssue) {
            scrollToElement(selectedIssue);
          } else if (selectedFile) {
            scrollToElement(selectedFile);
          }
        });
      }

      function updateSeverityControls(activeVerdicts) {
        const active = new Set(activeVerdicts);
        severityContainer.querySelectorAll('label').forEach((label) => {
          const verdict = label.dataset.verdict;
          const checked = active.has(verdict);
          const checkbox = label.querySelector('input');
          checkbox.checked = checked;
          label.classList.toggle('inactive', !checked);
        });
      }

      function updateSummary(summary, filteredSummary, scanning, progressText, lastScanAt) {
        const parts = [];
        if (scanning) {
          parts.push(progressText || 'Scanning workspace…');
        } else if (filteredSummary.total) {
          parts.push(
            filteredSummary.total +
              ' findings (blocked ' +
              filteredSummary.blocked +
              ', warnings ' +
              filteredSummary.warning +
              ', safe ' +
              filteredSummary.safe +
              ')'
          );
        } else {
          parts.push('No findings for current filters.');
        }
        if (summary.total && lastScanAt) {
          const when = new Date(lastScanAt).toLocaleString();
          parts.push('Last scan: ' + when);
        }
        summaryNode.textContent = parts.join(' · ');
      }
      function renderResults(files, severityIconUris, scanning, progressText, filteredTotal) {
        resultsNode.innerHTML = '';
        
        // Add ARIA attributes to results container
        resultsNode.setAttribute('role', 'tree');
        resultsNode.setAttribute('aria-label', 'Baseline analysis results');

        if (scanning) {
          const info = document.createElement('div');
          info.className = 'progress-state';
          info.textContent = progressText || 'Scanning workspace…';
          info.setAttribute('aria-live', 'polite');
          resultsNode.appendChild(info);
          return;
        }

        if (!filteredTotal) {
          const empty = document.createElement('div');
          empty.className = 'empty-state';
          empty.textContent = 'No baseline findings match the current filters. Run a scan or adjust filters to see results.';
          empty.setAttribute('aria-live', 'polite');
          resultsNode.appendChild(empty);
          return;
        }

        for (const file of files) {
          const details = document.createElement('details');
          details.className = 'file-group';
          details.setAttribute('role', 'treeitem');
          details.setAttribute('aria-expanded', file.expanded.toString());
          details.setAttribute('aria-label', 'File ' + file.relativePath + ' with ' + file.counts.total + ' findings');
          
          if (file.expanded) {
            details.setAttribute('open', '');
          }
          if (file.selected) {
            details.classList.add('selected');
            details.setAttribute('aria-selected', 'true');
          } else {
            details.setAttribute('aria-selected', 'false');
          }

          const summary = document.createElement('summary');
          summary.className = 'file-header';
          summary.setAttribute('tabindex', '0');
          summary.setAttribute('role', 'button');
          summary.setAttribute('aria-controls', 'file-issues-' + file.uri.replace(/[^a-zA-Z0-9]/g, '_'));
          summary.addEventListener('click', () => {
            vscode.postMessage({ type: 'selectFile', uri: file.uri });
          });
          
          summary.addEventListener('dblclick', () => {
            vscode.postMessage({ type: 'openFileDetail', uri: file.uri });
          });

          const toggle = document.createElement('span');
          toggle.className = 'file-toggle';
          toggle.setAttribute('aria-hidden', 'true');
          summary.appendChild(toggle);

          const icon = document.createElement('span');
          icon.className = 'file-icon ' + file.iconVariant;
          icon.textContent = file.iconLabel;
          icon.setAttribute('aria-hidden', 'true');
          summary.appendChild(icon);

          const path = document.createElement('span');
          path.className = 'file-path';
          path.textContent = file.relativePath;
          summary.appendChild(path);

          const meta = document.createElement('div');
          meta.className = 'file-meta';

          const detailBtn = document.createElement('button');
          detailBtn.className = 'file-detail-button';
          detailBtn.type = 'button';
          detailBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
          detailBtn.title = 'View file details';
          detailBtn.setAttribute('aria-label', 'View file details');
          detailBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            vscode.postMessage({ type: 'openFileDetail', uri: file.uri });
          });
          meta.appendChild(detailBtn);

          const counts = document.createElement('span');
          counts.className = 'file-counts';
          counts.appendChild(createCountBadge('blocked', file.counts.blocked, severityIconUris.blocked));
          counts.appendChild(createCountBadge('warning', file.counts.warning, severityIconUris.warning));
          counts.appendChild(createCountBadge('safe', file.counts.safe, severityIconUris.safe));
          meta.appendChild(counts);

          

          summary.appendChild(meta);

          details.appendChild(summary);
          details.addEventListener('toggle', () => {
            // Save scroll position before expansion change
            saveScrollPosition();
            vscode.postMessage({ type: 'setFileExpansion', uri: file.uri, expanded: details.open });
            
            // Restore scroll position after a brief delay to allow for DOM updates
            setTimeout(() => {
              restoreScrollPosition();
            }, 100);
          });

          const issuesList = document.createElement('div');
          issuesList.className = 'issues';
          issuesList.setAttribute('role', 'group');
          issuesList.setAttribute('aria-label', 'Issues in ' + file.relativePath);
          issuesList.id = 'file-issues-' + file.uri.replace(/[^a-zA-Z0-9]/g, '_');

          // Check if grouping is enabled
          const shouldGroupIssues = groupSimilarToggle && groupSimilarToggle.checked;
          
          if (shouldGroupIssues && file.groupedIssues) {
            // Render grouped issues
            for (const groupedIssue of file.groupedIssues) {
              const groupContainer = document.createElement('div');
              groupContainer.className = 'grouped-issue ' + groupedIssue.verdict;
              if (groupedIssue.selected) {
                groupContainer.classList.add('selected');
              }
              if (groupedIssue.expanded) {
                groupContainer.classList.add('expanded');
              }

              // Group header
              const header = document.createElement('div');
              header.className = 'grouped-issue-header';
              
              const toggle = document.createElement('button');
              toggle.className = 'grouped-issue-toggle';
              toggle.innerHTML = groupedIssue.expanded ? '▼' : '▶';
              toggle.setAttribute('aria-label', 'Toggle group');
              toggle.setAttribute('aria-expanded', groupedIssue.expanded.toString());
              toggle.setAttribute('type', 'button');
              header.appendChild(toggle);

              const iconImg = document.createElement('img');
              iconImg.className = 'issue-icon';
              iconImg.src = severityIconUris[groupedIssue.verdict];
              iconImg.alt = groupedIssue.verdict;
              header.appendChild(iconImg);

              const main = document.createElement('div');
              main.className = 'grouped-issue-main';

              const title = document.createElement('div');
              title.className = 'grouped-issue-title';
              title.textContent = groupedIssue.featureName + ' — ' + groupedIssue.verdictLabel;
              main.appendChild(title);

              const meta = document.createElement('div');
              meta.className = 'grouped-issue-meta';
              meta.textContent = groupedIssue.token + ' · ' + groupedIssue.count + ' occurrence' + (groupedIssue.count > 1 ? 's' : '');
              main.appendChild(meta);

              header.appendChild(main);

              const count = document.createElement('div');
              count.className = 'grouped-issue-count';
              count.textContent = groupedIssue.count.toString();
              header.appendChild(count);

              groupContainer.appendChild(header);

              // Occurrences list
              const occurrencesList = document.createElement('div');
              occurrencesList.className = 'grouped-issue-occurrences';
              
              // Prevent any clicks in the occurrences area from bubbling up and causing collapse
              occurrencesList.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
              });

              for (const occurrence of groupedIssue.occurrences) {
                const occurrenceItem = document.createElement('div');
                occurrenceItem.className = 'occurrence-item';
                if (occurrence.selected) {
                  occurrenceItem.classList.add('selected');
                }

                const occurrenceMain = document.createElement('div');
                occurrenceMain.className = 'occurrence-main';

                const location = document.createElement('div');
                location.className = 'occurrence-location';
                location.textContent = 'Line ' + occurrence.line + ', column ' + occurrence.column;
                occurrenceMain.appendChild(location);

                const snippet = document.createElement('div');
                snippet.className = 'occurrence-snippet';
                snippet.textContent = formatSnippet(occurrence.snippet);
                occurrenceMain.appendChild(snippet);

                occurrenceItem.appendChild(occurrenceMain);

                // Occurrence actions
                const actions = document.createElement('div');
                actions.className = 'occurrence-actions';

                const detailBtn = document.createElement('button');
                detailBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
                detailBtn.className = 'issue-detail-button';
                detailBtn.title = 'Details';
                detailBtn.addEventListener('click', (event) => {
                  event.stopPropagation();
                  vscode.postMessage({ type: 'openIssueDetail', id: occurrence.id });
                });
                actions.appendChild(detailBtn);

                const openBtn = document.createElement('button');
                openBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>';
                openBtn.className = 'issue-open-button';
                openBtn.title = 'Open file';
                openBtn.addEventListener('click', (event) => {
                  event.stopPropagation();
                  vscode.postMessage({
                    type: 'openFile',
                    uri: file.uri,
                    start: occurrence.range.start,
                    end: occurrence.range.end
                  });
                });
                actions.appendChild(openBtn);

                occurrenceItem.appendChild(actions);

                occurrenceItem.addEventListener('click', (e) => {
                  e.stopPropagation();
                  vscode.postMessage({ type: 'selectIssue', id: occurrence.id });
                });

                occurrencesList.appendChild(occurrenceItem);
              }

              groupContainer.appendChild(occurrencesList);

              // Toggle functionality for header
              header.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                const isExpanded = groupContainer.classList.contains('expanded');
                const newExpanded = !isExpanded;
                
                // Send message to update state
                vscode.postMessage({ 
                  type: 'setGroupExpansion', 
                  groupId: groupedIssue.id, 
                  expanded: newExpanded 
                });
              });

              // Group header click handler (but not for toggle button)
              header.addEventListener('click', (e) => {
                // Only handle clicks that are NOT on the toggle button
                if (!e.target.closest('.grouped-issue-toggle')) {
                  e.stopPropagation();
                  // Select the first occurrence when clicking the group header
                  if (groupedIssue.occurrences.length > 0) {
                    vscode.postMessage({ type: 'selectIssue', id: groupedIssue.occurrences[0].id });
                  }
                }
              });

              // Add a container-level handler to manage any remaining bubbling issues
              groupContainer.addEventListener('click', (e) => {
                // If the click is within the occurrences area, don't let it bubble further
                if (e.target.closest('.grouped-issue-occurrences')) {
                  e.stopPropagation();
                }
              });

              issuesList.appendChild(groupContainer);
            }
          } else {
            // Render individual issues (existing logic)
            for (const issue of file.issues) {
              const issueRow = document.createElement('div');
              issueRow.className = 'issue ' + issue.verdict;
              issueRow.setAttribute('role', 'treeitem');
              issueRow.setAttribute('tabindex', '0');
              issueRow.setAttribute('aria-label', issue.featureName + ' issue at line ' + issue.line + ', ' + issue.verdictLabel);
              
              if (issue.selected) {
                issueRow.classList.add('selected');
                issueRow.setAttribute('aria-selected', 'true');
              } else {
                issueRow.setAttribute('aria-selected', 'false');
              }

              const iconImg = document.createElement('img');
              iconImg.className = 'issue-icon';
              iconImg.src = severityIconUris[issue.verdict];
              iconImg.alt = issue.verdict;
              issueRow.appendChild(iconImg);

              const main = document.createElement('div');
              main.className = 'issue-main';

              const title = document.createElement('div');
              title.className = 'issue-title';
              title.textContent = issue.featureName + ' — ' + issue.verdictLabel;
              main.appendChild(title);

              const meta = document.createElement('div');
            meta.className = 'issue-meta';
            meta.textContent =
              issue.token +
              ' · line ' +
              issue.line +
              ', column ' +
              issue.column;
            main.appendChild(meta);

            issueRow.appendChild(main);

            const actions = document.createElement('div');
            actions.className = 'issue-actions';

            const detailBtn = document.createElement('button');
            detailBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
            detailBtn.title = 'Details';
            detailBtn.className = 'issue-detail-button';
            detailBtn.setAttribute('aria-label', 'View details');
            detailBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              vscode.postMessage({ type: 'openIssueDetail', id: issue.id });
            });
            actions.appendChild(detailBtn);

            const openBtn = document.createElement('button');
            openBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>';
            openBtn.title = 'Open file';
            openBtn.className = 'issue-open-button';
            openBtn.setAttribute('aria-label', 'Open file');
            openBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              vscode.postMessage({
                type: 'openFile',
                uri: file.uri,
                start: issue.range.start,
                end: issue.range.end
              });
            });
            actions.appendChild(openBtn);

            if (issue.docsUrl) {
              const docsBtn = document.createElement('button');
              docsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
              docsBtn.className = 'issue-docs-button';
              docsBtn.title = 'Open documentation';
              docsBtn.setAttribute('aria-label', 'Open documentation');
              docsBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                vscode.postMessage({ type: 'openDocs', url: issue.docsUrl });
              });
              actions.appendChild(docsBtn);
            }

            // const askAiBtn = document.createElement('button');
            // askAiBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            // askAiBtn.title = 'Ask AI for help';
            // askAiBtn.className = 'issue-askai-button';
            // askAiBtn.setAttribute('aria-label', 'Ask AI for help');
            // askAiBtn.addEventListener('click', (event) => {
            //   event.stopPropagation();
            //   vscode.postMessage({ 
            //     type: 'askGemini', 
            //     issue: issue.featureName + ' - ' + issue.verdictLabel,
            //     feature: issue.featureName,
            //     filePath: file.relativePath,
            //     findingId: issue.id
            //   });
            // });
            // actions.appendChild(askAiBtn);

            issueRow.appendChild(actions);
            issueRow.addEventListener('click', (event) => {
              if (event.target.closest('button')) {
                return;
              }
              vscode.postMessage({ type: 'selectIssue', id: issue.id });
            });
            
            issueRow.addEventListener('dblclick', (event) => {
              if (event.target.closest('button')) {
                return;
              }
              vscode.postMessage({ type: 'openIssueDetail', id: issue.id });
            });
              issuesList.appendChild(issueRow);
            }
          }

          details.appendChild(issuesList);
          resultsNode.appendChild(details);
        }
      }

      function formatSnippet(snippet) {
        if (!snippet) {
          return '';
        }
        const condensed = snippet.replace(/\s+/g, ' ').trim();
        if (condensed.length <= MAX_SNIPPET_PREVIEW) {
          return condensed;
        }
        return condensed.slice(0, MAX_SNIPPET_PREVIEW - 3).trimEnd() + '...';
      }

      function createCountBadge(label, value, iconUri) {
        const span = document.createElement('span');
        const icon = document.createElement('img');
        icon.src = iconUri;
        icon.alt = label;
        span.appendChild(icon);
        const text = document.createElement('span');
        text.textContent = value;
        span.appendChild(text);
        return span;
      }

      function renderDetail(detail) {
        if (!detail) {
          detailNode.classList.add('hidden');
          detailTitleNode.textContent = '';
          detailSubtitleNode.textContent = '';
          detailSubtitleNode.classList.add('hidden');
          detailPathNode.textContent = '';
          detailBodyNode.innerHTML = '';
          return;
        }

        detailNode.classList.remove('hidden');
        detailTitleNode.textContent = detail.title;
        if (detail.mode === 'issue' && detail.subtitle) {
          detailSubtitleNode.textContent = detail.subtitle;
          detailSubtitleNode.classList.remove('hidden');
        } else {
          detailSubtitleNode.textContent = '';
          detailSubtitleNode.classList.add('hidden');
        }
        detailPathNode.textContent = detail.filePath;
        
        // Check if this is a Gemini chat update by looking for existing chat section
        const existingChatSection = detailBodyNode.querySelector('.gemini-chat-section');
        const existingChatContentArea = existingChatSection ? existingChatSection.querySelector('.chat-content-area') : null;
        
        if (existingChatContentArea && detail.html.includes('gemini-chat-section')) {
          // This is a Gemini chat update - only update the content area, preserve input
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = detail.html;
          const newChatSection = tempDiv.querySelector('.gemini-chat-section');
          const newContentArea = newChatSection ? newChatSection.querySelector('.chat-content-area') : null;
          
          if (newContentArea) {
            // Remove typing indicators before updating content
            const typingIndicators = existingChatContentArea.querySelectorAll('.typing-indicator');
            typingIndicators.forEach(indicator => indicator.remove());
            
            // Update only the conversation content, preserve the input area
            existingChatContentArea.innerHTML = newContentArea.innerHTML;
            
            // Scroll to bottom of conversation
            setTimeout(() => {
              existingChatContentArea.scrollTop = existingChatContentArea.scrollHeight;
            }, 10);
          }
        } else {
          // Regular detail update - preserve chat input state if any
          const existingChatInput = detailBodyNode.querySelector('.chat-input');
          const chatInputValue = existingChatInput ? existingChatInput.value : '';
          const chatInputFocused = existingChatInput && document.activeElement === existingChatInput;
          
          detailBodyNode.innerHTML = detail.html;
          
          // Restore chat input state after HTML update
          const newChatInput = detailBodyNode.querySelector('.chat-input');
          if (newChatInput && chatInputValue) {
            newChatInput.value = chatInputValue;
            const sendButton = newChatInput.parentElement.querySelector('.chat-send-button');
            if (sendButton) {
              sendButton.disabled = chatInputValue.trim().length === 0;
            }
            // Restore textarea height
            newChatInput.style.height = 'auto';
            newChatInput.style.height = Math.min(newChatInput.scrollHeight, 120) + 'px';
          }
          if (newChatInput && chatInputFocused) {
            // Restore focus after a brief delay to ensure DOM is ready
            setTimeout(() => {
              newChatInput.focus();
              // Move cursor to end of text
              newChatInput.setSelectionRange(newChatInput.value.length, newChatInput.value.length);
            }, 10);
          }
        }
      }
      vscode.postMessage({ type: 'ready' });
    
  `.trim();
}
