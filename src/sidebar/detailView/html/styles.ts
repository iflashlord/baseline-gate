export function getDetailViewStyles(): string {
  return /* css */ `
        :root {
            color-scheme: var(--vscode-color-scheme);
            --baseline-color-error: var(--vscode-editorError-foreground, var(--vscode-errorForeground, #d13438));
            --baseline-color-warning: var(--vscode-editorWarning-foreground, #f1c40f);
            --baseline-color-safe: var(--vscode-testing-iconPassed, #2e8b57);
            --baseline-color-unknown: var(--vscode-descriptionForeground, #888888);
            --baseline-color-error-surface: color-mix(in srgb, var(--baseline-color-error) 16%, transparent);
            --baseline-color-warning-surface: color-mix(in srgb, var(--baseline-color-warning) 18%, transparent);
            --baseline-color-safe-surface: color-mix(in srgb, var(--baseline-color-safe) 14%, transparent);
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            line-height: 1.6;
        }

        a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }

        a:hover {
            color: var(--vscode-textLink-activeForeground);
        }

        svg {
            stroke: currentColor;
        }

        .detail-view-container {
            max-width: 960px;
            margin: 0 auto;
            padding: 28px 32px 48px;
        }

        .search-container {
            position: sticky;
            top: 0;
            padding: 18px 0 12px;
            margin-bottom: 20px;
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
            z-index: 2;
        }

        .search-box {
            position: relative;
            max-width: 420px;
        }

        .search-input {
            width: 100%;
            padding: 10px 36px;
            border: 1px solid var(--vscode-input-border, transparent);
            border-radius: 6px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 0.9rem;
            transition: border-color 0.15s ease;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            opacity: 0.7;
            pointer-events: none;
        }

        .search-clear {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            border: none;
            background: transparent;
            padding: 4px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.6;
        }

        .search-clear:hover {
            background: var(--vscode-toolbar-hoverBackground);
            opacity: 1;
        }

        .search-clear svg {
            width: 14px;
            height: 14px;
        }

        .detail-view-header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-end;
            margin-bottom: 16px;
        }

        .detail-view-title h1 {
            margin: 0;
            font-size: 1.6rem;
            line-height: 1.2;
            font-weight: 600;
        }

        .detail-view-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .detail-view-button,
        .detail-baseline-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border-radius: 6px;
            padding: 8px 14px;
            border: 1px solid var(--vscode-button-border, transparent);
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            font-size: 0.85rem;
            cursor: pointer;
            transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }

        .detail-view-button svg,
        .detail-baseline-button svg {
            width: 16px;
            height: 16px;
        }

        .button-icon {
            width: 16px;
            height: 16px;
        }

        .detail-view-button:hover,
        .detail-baseline-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
        }

        .detail-baseline-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .detail-baseline-button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .file-breadcrumb {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 24px;
        }

        .detail-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .detail-block {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
        }

        .detail-header-block {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            margin-bottom: 16px;
        }

        .detail-icon {
            width: 28px;
            height: 28px;
            flex-shrink: 0;
        }

        .detail-title {
            font-size: 1.1rem;
            font-weight: 600;
        }

        .detail-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            font-size: 0.85rem;
            color: var(--vscode-descriptionForeground);
        }

        .detail-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 2px 10px;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            border: 1px solid transparent;
        }

        .detail-badge.blocked {
            background: var(--baseline-color-error-surface);
            color: var(--baseline-color-error);
            border: 1px solid var(--baseline-color-error);
        }

        .detail-badge.warning {
            background: var(--baseline-color-warning-surface);
            color: var(--baseline-color-warning);
            border: 1px solid var(--baseline-color-warning);
        }

        .detail-badge.safe {
            background: var(--baseline-color-safe-surface);
            color: var(--baseline-color-safe);
            border: 1px solid var(--baseline-color-safe);
        }

        .detail-icon {
            color: var(--baseline-color-unknown);
        }

        .detail-icon.blocked {
            color: var(--baseline-color-error);
        }

        .detail-icon.warning {
            color: var(--baseline-color-warning);
        }

        .detail-icon.safe {
            color: var(--baseline-color-safe);
        }

        .detail-section {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px 0;
            border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
        }

        .detail-section:first-of-type {
            padding-top: 0;
            border-top: none;
        }

        .detail-section h4 {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            font-size: 1rem;
            font-weight: 600;
        }

        .section-icon {
            width: 18px;
            height: 18px;
        }

        .detail-section ul {
            margin: 0;
            padding-left: 18px;
        }

        .detail-context {
            display: grid;
            gap: 8px;
            font-size: 0.9rem;
        }

        .detail-code {
            padding: 12px;
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            overflow: hidden;
            background: var(--vscode-editor-background);
        }

        th, td {
            padding: 10px 14px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-widget-border);
            font-size: 0.9rem;
        }

        th {
            background: var(--vscode-editorWidget-background);
            font-weight: 600;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .resource-links {
            list-style: none;
            margin: 0;
            padding: 0;
            display: grid;
            gap: 8px;
        }

        .resource-link {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 8px;
            background: var(--vscode-editor-background);
            border: 1px solid transparent;
            transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .resource-link .link-icon {
            width: 16px;
            height: 16px;
        }

        .resource-link:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-widget-border);
        }

        .detail-actions {
            display: flex;
            justify-content: flex-start;
        }

        .chat-interface {
            margin-top: 32px;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 12px;
            background: var(--vscode-editorWidget-background);
            overflow: hidden;
        }

        .chat-header {
            padding: 18px 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
        }

        .chat-header h3 {
            margin: 0 0 6px;
            font-size: 1.1rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .chat-header p {
            margin: 0;
            font-size: 0.9rem;
            color: var(--vscode-descriptionForeground);
        }

        .chat-icon {
            width: 20px;
            height: 20px;
        }

        .chat-messages {
            max-height: 420px;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .chat-message {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .message-avatar {
            flex-shrink: 0;
        }

        .avatar-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .user-message .avatar-icon {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .ai-message .avatar-icon {
            background: var(--baseline-color-safe);
            color: var(--vscode-editor-foreground);
        }

        .ai-avatar-error {
            background: var(--baseline-color-error);
            color: var(--vscode-editor-foreground);
        }

        .message-content {
            flex: 1;
            min-width: 0;
        }

        .message-text {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 4px;
            line-height: 1.5;
        }

        .user-message .message-text {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .message-time {
            font-size: 0.75rem;
            color: var(--vscode-descriptionForeground);
        }

        .chat-history-empty {
            text-align: center;
            padding: 36px 16px;
            color: var(--vscode-descriptionForeground);
        }

        .chat-input-container {
            padding: 18px 20px;
            border-top: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
        }

        .chat-input-wrapper {
            display: flex;
            gap: 12px;
            align-items: flex-end;
        }

        .chat-input {
            flex: 1;
            min-height: 44px;
            max-height: 140px;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid var(--vscode-input-border, transparent);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            resize: vertical;
            font-size: 0.95rem;
        }

        .chat-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .chat-send-button {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            border: none;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.15s ease, transform 0.15s ease;
            flex-shrink: 0;
        }

        .chat-send-button svg {
            width: 18px;
            height: 18px;
            flex-shrink: 0;
        }

        .chat-send-button:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }

        .chat-send-button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
        }

        .code-block {
            margin: 12px 0;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            overflow: hidden;
            background: var(--vscode-textCodeBlock-background);
        }

        .code-header {
            display: flex;
            justify-content: flex-end;
            padding: 8px 10px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editorWidget-background);
        }

        .copy-code-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border: none;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 0.75rem;
            cursor: pointer;
            transition: background 0.15s ease;
        }

        .copy-code-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .code-block pre {
            margin: 0;
            padding: 12px 16px;
            overflow-x: auto;
        }

        .code-block code,
        .inline-code {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }

        .inline-code {
            padding: 2px 4px;
            border-radius: 4px;
            background: var(--vscode-textCodeBlock-background);
        }

        .search-highlight {
            background: var(--vscode-editor-findMatchHighlightBackground);
            color: var(--vscode-editor-findMatchHighlightForeground);
            border-radius: 3px;
        }

        .loading-spinner {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid var(--vscode-descriptionForeground);
            border-top-color: var(--vscode-progressBar-background);
            animation: spin 0.8s linear infinite;
            display: inline-block;
        }

        .error-message {
            padding: 12px 14px;
            border-radius: 8px;
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @media (max-width: 720px) {
            .detail-view-container {
                padding: 20px 18px 32px;
            }

            .detail-view-header {
                flex-direction: column;
                align-items: flex-start;
            }

            .detail-view-actions {
                width: 100%;
                justify-content: flex-start;
            }

            .chat-input-wrapper {
                flex-direction: column;
                align-items: stretch;
            }

            .chat-send-button {
                width: 40px !important;
                height: 40px !important;
                min-width: 40px;
                max-width: 40px;
                flex-shrink: 0;
            }

            .chat-send-button svg {
                width: 16px !important;
                height: 16px !important;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        }
  `.trim();
}

export function getDetailViewFeatureStyles(): string {
  return /* css */ `
        .feature-occurrences {
            margin-top: 24px;
        }

        .feature-occurrence-item {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBarSectionHeader-border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            transition: all 0.2s ease;
        }

        .feature-occurrence-item:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }

        .occurrence-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .occurrence-file-info {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .occurrence-file-path {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
        }

        .occurrence-file-path:hover {
            text-decoration: underline;
        }

        .occurrence-line-info {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }

        .occurrence-verdict {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .occurrence-code {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            color: var(--vscode-editor-foreground);
            white-space: pre-wrap;
            overflow-x: auto;
        }

        .feature-summary {
            background: var(--vscode-inputOption-hoverBackground);
            border-left: 4px solid var(--vscode-focusBorder);
            padding: 16px;
            margin-bottom: 24px;
            border-radius: 0 4px 4px 0;
        }

        .feature-summary h2 {
            margin: 0 0 8px 0;
            color: var(--vscode-foreground);
        }

        .feature-count {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }

        /* Occurrences section styles for enhanced single view */
        .occurrences-list {
            margin-top: 12px;
        }

        .occurrence-item {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBarSectionHeader-border);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            transition: all 0.2s ease;
        }

        .occurrence-item:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }

        .occurrence-item.current-occurrence {
            border-color: var(--vscode-focusBorder);
            background: var(--vscode-inputOption-hoverBackground);
        }

        .occurrence-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .occurrence-file-info {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .occurrence-file-path {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
        }

        .occurrence-file-path:hover {
            text-decoration: underline;
        }

        .occurrence-line-info {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }

        .current-indicator {
            background: var(--vscode-focusBorder);
            color: var(--vscode-button-foreground);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
        }

        .occurrence-verdict {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .occurrence-code {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 6px 10px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            color: var(--vscode-editor-foreground);
            white-space: pre-wrap;
            overflow-x: auto;
        }
  `.trim();
}
