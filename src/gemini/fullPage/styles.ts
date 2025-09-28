export function getGeminiFullPageStyles(): string {
  return `<style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            height: 100vh;
            overflow-x: hidden;
        }

        /* Global SVG styling */
        svg {
            color: var(--vscode-foreground);
            stroke: currentColor;
        }

        svg[stroke]:not([stroke="none"]):not([stroke="#22c55e"]):not([stroke="#ef4444"]):not([stroke="#f59e0b"]):not([stroke="#4285f4"]):not([stroke="#f97316"]) {
            stroke: currentColor;
        }

        .full-view-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            max-width: 1200px;
            margin: 0 auto;
        }

        .full-view-header {
            position: sticky;
            top: 0;
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-widget-border);
            padding: 20px 24px;
            z-index: 100;
        }

        .header-main {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 24px;
            margin-bottom: 16px;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .gemini-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #4285f4, #34a853, #fbbc05, #ea4335);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }

        .header-title h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }

        .count-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 12px;
            border-radius: 12px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            font-size: 13px;
            font-weight: 500;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-search {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
        }

        .search-box {
            position: relative;
            min-width: 300px;
            flex: 1;
            max-width: 600px;
        }

        .search-input {
            width: 100%;
            padding: 12px 50px 12px 40px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 14px;
            box-sizing: border-box;
        }

        .search-input:focus {
            outline: 2px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }

        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0.7;
            width: 16px;
            height: 16px;
            pointer-events: none;
            color: var(--vscode-input-foreground);
        }

        .search-button {
            position: absolute;
            right: 4px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            padding: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
            width: 36px;
            height: 36px;
        }

        .search-button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .search-button svg {
            width: 16px;
            height: 16px;
        }

        .search-results-info {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            text-align: left;
            padding: 4px 0;
        }

        .search-results-info small {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }

        .primary-button, .secondary-button {
            padding: 8px 16px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s ease;
        }

        .primary-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .primary-button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .secondary-button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .secondary-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .icon-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 6px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .icon-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .usage-stats-large {
            display: flex;
            gap: 24px;
            padding: 16px 0;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }

        .stat-number {
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
        }

        .stat-label {
            font-size: 12px;
            opacity: 0.8;
        }

        /* Metrics section */
        .metrics {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-left: auto;
        }

        .metric {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            background: var(--vscode-badge-background);
            padding: 2px 6px;
            border-radius: 8px;
        }

        /* Tags section */
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin: 12px 0;
        }

        .tag {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 12px;
            font-size: 11px;
            color: var(--vscode-foreground);
        }

        .full-view-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
        }

        .suggestions-grid {
            display: flex;
            flex-direction: column;
            gap: 32px;
            max-width: none;
        }

        /* Section separators */
        .section-separator {
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--vscode-widget-border), transparent);
            margin: 24px 0;
            position: relative;
        }

        .section-separator::after {
            content: '✨';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background: var(--vscode-editor-background);
            padding: 0 12px;
            font-size: 12px;
            opacity: 0.6;
        }

        .empty-state-large {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 60px 20px;
            height: 50vh;
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .empty-state-large h2 {
            margin: 0 0 8px 0;
            font-size: 20px;
            font-weight: 600;
        }

        .empty-state-large p {
            margin: 0 0 20px 0;
            opacity: 0.8;
            max-width: 400px;
            line-height: 1.5;
        }

        /* Enhanced suggestion cards for full view */
        .suggestion-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            transition: all 0.3s ease;
            position: relative;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .suggestion-card:hover {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            transform: translateY(-2px);
        }

        .suggestion-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--vscode-textLink-foreground), var(--vscode-progressBar-background));
            border-radius: 12px 12px 0 0;
        }

        .suggestion-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
            gap: 12px;
        }

        .header-buttons {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .metadata {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .suggestion-meta {
            flex: 1;
            min-width: 0;
        }

        /* Chip styling */
        .chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 12px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            font-size: 12px;
            font-weight: 500;
        }

        .chip-link {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .chip-link:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
        }

        .chip svg {
            width: 14px;
            height: 14px;
            color: inherit;
            stroke: currentColor;
        }

        /* Link button styling */
        .link-button {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: transparent;
            color: var(--vscode-textLink-foreground);
            border: none;
            cursor: pointer;
            font-size: 13px;
            text-decoration: underline;
            padding: 4px 0;
        }

        .link-button:hover {
            color: var(--vscode-textLink-activeForeground);
        }

        .link-button svg {
            width: 14px;
            height: 14px;
            color: inherit;
            stroke: currentColor;
        }

        .suggestion-issue {
            font-weight: 600;
            margin-bottom: 8px;
            line-height: 1.4;
            word-wrap: break-word;
        }

        .suggestion-details {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 12px;
            opacity: 0.8;
            margin-bottom: 16px;
        }

        .suggestion-content {
            margin: 20px 0;
            line-height: 1.7;
            font-size: 14px;
        }

        /* Enhanced code blocks styling */
        .suggestion-content pre {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            overflow-x: auto;
            position: relative;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            line-height: 1.5;
        }

        .suggestion-content code {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            padding: 2px 6px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }

        .suggestion-content pre code {
            background: transparent;
            border: none;
            padding: 0;
            border-radius: 0;
        }

        /* Code block with copy button */
        .code-block-container {
            position: relative;
            margin: 16px 0;
        }

        .code-block {
            position: relative;
            margin: 16px 0;
            border-radius: 8px;
            overflow: hidden;
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .code-block pre {
            margin: 0;
            padding: 16px;
            background: transparent;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.4;
        }

        .code-copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            padding: 8px;
            cursor: pointer;
            opacity: 0;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .code-block:hover .code-copy-btn,
        .code-block-container:hover .code-copy-btn {
            opacity: 1;
            transform: translateY(-1px);
        }

        .code-copy-btn:hover {
            background: var(--vscode-button-hoverBackground);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .code-copy-btn svg {
            width: 16px;
            height: 16px;
        }

        .suggestion-actions {
            display: flex;
            gap: 12px;
            margin-top: 16px;
            flex-wrap: wrap;
            align-items: center;
        }

        /* Enhanced suggestion item styling */
        .suggestion-item {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .suggestion-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #4285f4, #34a853, #fbbc05, #ea4335);
            opacity: 0.8;
        }

        .suggestion-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
            border-color: var(--vscode-focusBorder);
        }

        .suggestion-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .suggestion-content h4 {
            font-weight: 600;
            font-size: 16px;
            margin: 0 0 8px 0;
            color: var(--vscode-editor-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .issue-section h4::before {
            content: '';
            display: inline-block;
            width: 16px;
            height: 16px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f97316' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='12' y1='8' x2='12' y2='12'/%3E%3Cline x1='12' y1='16' x2='12.01' y2='16'/%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
        }

        .suggestion-section h4::before {
            content: '';
            display: inline-block;
            width: 16px;
            height: 16px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234285f4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9.663 17h4.673M12 3l1.735 3.013 3.408.494-2.463 2.401.582 3.392L12 10.695 8.738 12.3l.582-3.392-2.463-2.401 3.408-.494L12 3z'/%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
        }

        /* Icon button improvements */
        .icon-btn {
            background: transparent;
            border: none;
            padding: 8px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .icon-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
            transform: translateY(-1px);
        }

        .icon-btn svg {
            width: 16px;
            height: 16px;
            color: var(--vscode-foreground);
            stroke: var(--vscode-foreground);
        }

        /* Action button improvements */
        .action-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
        }

        .action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .action-btn svg {
            width: 16px;
            height: 16px;
            color: inherit;
            stroke: currentColor;
        }

        /* Star rating improvements */
        .star {
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px;
            transition: all 0.2s ease;
        }

        .star:hover {
            transform: scale(1.1);
        }

        .star svg {
            width: 16px;
            height: 16px;
            color: #fbbf24;
        }

        .star-filled svg {
            fill: #fbbf24;
        }

        .action-button {
            padding: 6px 12px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }

        .action-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        /* Rating section */
        .rating {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 12px;
        }

        .rating-label {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
        }

        .rating-stars {
            display: flex;
            gap: 2px;
        }

        .star {
            cursor: pointer;
            font-size: 16px;
            color: var(--vscode-descriptionForeground);
            transition: color 0.2s ease;
            background: none;
            border: none;
            padding: 2px;
        }

        .star.filled,
        .star.star-filled {
            color: #ffd700;
        }

        .star:hover {
            color: #ffd700;
        }

        /* Suggestion footer */
        .suggestion-footer {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-widget-border);
        }

        /* Follow-up input styles */
        .follow-up-container {
            margin-top: 16px;
            padding: 12px;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            background: var(--vscode-input-background);
        }

        .follow-up-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 13px;
            margin-bottom: 8px;
        }

        .follow-up-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }

        .follow-up-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        .action-btn {
            padding: 4px 12px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }

        .action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .header-main {
                flex-direction: column;
                align-items: stretch;
                gap: 16px;
            }

            .search-box {
                min-width: auto;
            }

            .usage-stats-large {
                justify-content: center;
            }

            .full-view-content {
                padding: 16px;
            }

            .suggestions-grid {
                gap: 16px;
            }
        }

        /* Scrollbar styling */
        .full-view-content::-webkit-scrollbar {
            width: 8px;
        }

        .full-view-content::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background);
        }

        .full-view-content::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-hoverBackground);
            border-radius: 4px;
        }

        .full-view-content::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-activeBackground);
        }
    </style>`;
}
