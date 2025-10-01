export function getAnalysisViewStyles(): string {
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
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        box-sizing: border-box;
      }
      .view {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
      
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        padding: 0.5rem 0.75rem;
        padding-bottom: 0.375rem;
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        background: var(--vscode-sideBar-background);
      }
      .controls button,
      .filter-actions button {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        border: 1px solid var(--vscode-button-border, transparent);
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        padding: 0.25rem 0.625rem;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 500;
        height: 28px;
        min-width: 28px;
      }
      .controls button:hover,
      .filter-actions button:hover {
        background: var(--vscode-button-secondaryHoverBackground);
        border-color: var(--vscode-button-border);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .controls button.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .controls button.primary:hover {
        background: var(--vscode-button-hoverBackground);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
      }
      .controls button:disabled,
      .filter-actions button:disabled {
        opacity: 0.5;
        cursor: default;
        box-shadow: none;
      }
      .filter-panel {
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        background: var(--vscode-sideBar-background);
      }
      .filter-panel summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--vscode-foreground);
      }
      .filter-panel summary::-webkit-details-marker {
        display: none;
      }
      .filter-panel summary:hover {
        background: var(--vscode-sideBarSectionHeader-background, rgba(255, 255, 255, 0.04));
      }
      .filter-panel summary:focus-visible {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: 2px;
      }
      .filter-summary-content {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      .filter-summary-title {
        font-size: 0.85rem;
      }
      .filter-summary-status {
        font-size: 0.75rem;
        color: var(--vscode-descriptionForeground);
      }
      .filter-summary-status.active {
        color: var(--vscode-focusBorder);
        font-weight: 600;
      }
      .filter-summary-icon {
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid var(--vscode-foreground);
        transition: transform 150ms ease;
        flex-shrink: 0;
      }
      .filter-panel:not([open]) .filter-summary-icon {
        transform: rotate(-90deg);
      }
      .filter-content {
        padding: 0.5rem 0.75rem 0.75rem;
        border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
      }
      .filter-panel:not([open]) .filter-content {
        display: none;
      }
      .filters {
        display: grid;
        grid-template-columns: minmax(140px, 1fr);
        grid-template-areas:
          "search"
          "severity"
          "actions";
        gap: 0.5rem;
      }
      .search-box {
        grid-area: search;
      }
      .severity-filter {
        grid-area: severity;
      }
      .filter-actions {
        grid-area: actions;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      @media (min-width: 420px) {
        .filters {
          grid-template-columns: minmax(180px, 1.6fr) minmax(140px, 1fr);
          grid-template-areas:
            "search actions"
            "severity actions";
          align-items: center;
        }
        .filter-actions {
          justify-content: flex-end;
        }
      }
      @media (min-width: 680px) {
        .filters {
          grid-template-columns: minmax(220px, 2fr) minmax(220px, 1.5fr) auto;
          grid-template-areas: "search severity actions";
        }
      }
      .search-box input {
        width: 100%;
        padding: 0.3rem 0.5rem;
        border-radius: 3px;
        border: 1px solid var(--vscode-input-border, transparent);
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        font-size: 0.8rem;
        height: 28px;
        box-sizing: border-box;
      }
      .search-box input:focus {
        border-color: var(--vscode-focusBorder);
        outline: none;
        box-shadow: 0 0 0 2px rgba(90, 133, 204, 0.2);
      }
      .search-box input::placeholder {
        color: var(--vscode-input-placeholderForeground);
      }
      .severity-filter {
        display: flex;
        gap: 0.25rem;
        flex-wrap: wrap;
      }
      .severity-filter label {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        border: 1px solid var(--vscode-inputOption-border, transparent);
        background: var(--vscode-inputOption-activeBackground);
        color: var(--vscode-inputOption-activeForeground);
        padding: 0.125rem 0.5rem;
        border-radius: 12px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
        height: 26px;
      }
      .severity-filter label.inactive {
        background: transparent;
        color: var(--vscode-input-foreground);
        border-color: var(--vscode-input-border, transparent);
        opacity: 0.65;
      }
      .severity-filter label:hover:not(.inactive) {
        background: var(--vscode-inputOption-hoverBackground, var(--vscode-inputOption-activeBackground));
      }
      .severity-filter input {
        display: none;
      }
      .sort-select {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.8rem;
        color: var(--vscode-descriptionForeground);
        font-weight: 500;
      }
      .sort-select select {
        padding: 0.25rem 0.4rem;
        border-radius: 3px;
        border: 1px solid var(--vscode-dropdown-border, transparent);
        background: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        font-size: 0.8rem;
        height: 28px;
        cursor: pointer;
        min-width: 150px;
      }
      .sort-select select:focus-visible {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 1px;
      }
      .summary {
        font-size: 0.8rem;
        opacity: 0.85;
        padding: 0.375rem 0.75rem;
        color: var(--vscode-descriptionForeground);
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        background: var(--vscode-sideBar-background);
      }
      .insights-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        opacity: 0;
        pointer-events: none;
        transition: opacity 150ms ease;
        z-index: 60;
      }
      .insights-backdrop.visible {
        opacity: 1;
        pointer-events: auto;
      }
      .insights-panel {
        position: fixed;
        top: 52px;
        right: 16px;
        bottom: 16px;
        width: min(420px, calc(100% - 32px));
        max-width: 460px;
        background: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-sideBarSectionHeader-border);
        border-radius: 8px;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
        transform: translateX(120%);
        transition: transform 180ms ease;
        display: flex;
        flex-direction: column;
        z-index: 70;
      }
      .insights-panel.open {
        transform: translateX(0);
      }
      .insights-panel.hidden {
        display: none;
      }
      .insights-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 0.9rem;
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        background: var(--vscode-sideBarSectionHeader-background, var(--vscode-sideBar-background));
      }
      .insights-header h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--vscode-foreground);
      }
      .insights-close {
        border: 1px solid var(--vscode-button-border, transparent);
        border-radius: 4px;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .insights-close:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }
      .insights-content {
        flex: 1;
        overflow-y: auto;
        padding: 0.75rem 0.9rem 0.9rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .insights {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0.5rem;
        padding: 0;
      }
      .chart-card {
        border: 1px solid var(--vscode-tree-indentGuidesStroke, transparent);
        border-radius: 6px;
        padding: 0.65rem 0.75rem;
        background: var(--vscode-editor-background, rgba(0, 0, 0, 0.02));
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }
      .chart-card.hidden {
        display: none;
      }
      .chart-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--vscode-foreground);
        display: flex;
        align-items: center;
        gap: 0.3rem;
      }
      .chart-title span {
        font-size: 0.8em;
        color: var(--vscode-descriptionForeground);
      }
      .chart-body {
        min-height: 60px;
      }
      .chart-caption {
        font-size: 0.7rem;
        color: var(--vscode-descriptionForeground);
        margin: 0;
      }
      .chart-empty {
        font-size: 0.75rem;
        color: var(--vscode-descriptionForeground);
        margin: 0;
      }
      .chart-svg {
        width: 100%;
        height: 64px;
      }
      .chart-line-blocked {
        fill: none;
        stroke: var(--vscode-errorForeground, #d13438);
        stroke-width: 2;
        stroke-linecap: round;
      }
      .chart-line-safe {
        fill: none;
        stroke: var(--vscode-testing-iconPassed, #2e8b57);
        stroke-width: 2;
        stroke-linecap: round;
        opacity: 0.8;
      }
      .chart-axis {
        stroke: var(--vscode-editorLineNumber-foreground, rgba(150, 150, 150, 0.4));
        stroke-width: 1;
      }
      .chart-axis-label {
        fill: var(--vscode-descriptionForeground);
        font-size: 0.6rem;
      }
      .chart-dot {
        fill: var(--vscode-errorForeground, #d13438);
        stroke: var(--vscode-editor-background, #1e1e1e);
        stroke-width: 1;
      }
      .bar-row {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.5rem;
        align-items: center;
        margin-bottom: 0.35rem;
      }
      .bar-row:last-child {
        margin-bottom: 0;
      }
      .bar-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--vscode-foreground);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .bar-metrics {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      .bar-track {
        display: flex;
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        background: var(--vscode-editor-inactiveSelection, rgba(128, 128, 128, 0.15));
      }
      .bar-fill {
        height: 100%;
      }
      .bar-fill.blocked { background: var(--baseline-color-error); }
      .bar-fill.warning { background: var(--baseline-color-warning); }
      .bar-fill.safe { background: var(--baseline-color-safe); }
      .bar-meta {
        font-size: 0.7rem;
        color: var(--vscode-descriptionForeground);
      }
      .budget-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .budget-row {
        padding: 0.5rem 0.6rem;
        border: 1px solid var(--vscode-tree-indentGuidesStroke, transparent);
        border-radius: 6px;
        background: var(--vscode-editor-background, rgba(0, 0, 0, 0.02));
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.5rem;
        align-items: center;
      }
      .budget-row.over-limit {
        border-color: var(--baseline-color-error);
        background: rgba(209, 52, 56, 0.12);
        background: var(--baseline-color-error-surface);
      }
      .budget-row.under-goal {
        border-color: var(--baseline-color-warning);
        background: rgba(249, 209, 129, 0.12);
        background: var(--baseline-color-warning-surface);
      }
      .budget-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--vscode-foreground);
      }
      .budget-status {
        font-size: 0.7rem;
        color: var(--vscode-descriptionForeground);
      }
      .budget-meter {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .budget-meter-track {
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        background: var(--vscode-editor-inactiveSelection, rgba(128, 128, 128, 0.2));
      }
      .budget-meter-fill {
        display: block;
        height: 100%;
      }
      .budget-meter-fill.blocked {
        background: var(--baseline-color-error);
      }
      .budget-meter-fill.warning {
        background: var(--baseline-color-warning);
      }
      .budget-meter-fill.safe {
        background: var(--baseline-color-safe);
      }
      .budget-meter-text {
        font-size: 0.7rem;
        color: var(--vscode-descriptionForeground);
      }
      .content {
        flex: 1;
        display: flex;
        gap: 0.1rem;
        padding: 0.25rem 0.5rem 0.25rem;
        box-sizing: border-box;
        overflow: hidden;
        min-height: 0;
      }
      
      /* Scroll shadows to indicate scrollable content */
      .content::before,
      .content::after {
        content: '';
        position: absolute;
        left: 0.5rem;
        right: 0.5rem;
        height: 8px;
        pointer-events: none;
        z-index: 1;
      }
      
      .content::before {
        top: 0;
        background: linear-gradient(to bottom, var(--vscode-sideBar-background), transparent);
      }
      
      .content::after {
        bottom: 0.5rem;
        background: linear-gradient(to top, var(--vscode-sideBar-background), transparent);
      }
      /* Fixed scrolling implementation */
      .results {
        flex: 1 1 55%;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0.125rem 0;
        display: block;
        box-sizing: border-box;
        min-height: 0;
        /* Improved scrolling */
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: var(--vscode-scrollbarSlider-background) var(--vscode-scrollbar-shadow);
      }
      
      /* Webkit scrollbar styling for Chromium-based browsers */
      .results::-webkit-scrollbar {
        width: 8px;
      }
      
      .results::-webkit-scrollbar-track {
        background: var(--vscode-scrollbar-shadow);
        border-radius: 4px;
      }
      
      .results::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        border-radius: 4px;
        border: 1px solid var(--vscode-scrollbar-shadow);
      }
      
      .results::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground);
      }
      
      .results::-webkit-scrollbar-thumb:active {
        background: var(--vscode-scrollbarSlider-activeBackground);
      }
      .empty-state, .progress-state {
        margin: 1.5rem 1rem;
        font-size: 0.95rem;
        opacity: 0.75;
      }
      .file-group {
        border: 1px solid var(--vscode-tree-indentGuidesStroke, transparent);
        border-radius: 4px;
        background: var(--vscode-sideBarSectionHeader-background, transparent);
        overflow: hidden;
        margin-bottom: 0.125rem;
        display: block;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      
      .file-group:hover {
        border-color: var(--vscode-list-hoverBackground);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }
      .file-header {
        display: grid;
        grid-template-columns: auto auto 1fr auto;
        gap: 0.375rem;
        align-items: center;
        padding: 0.375rem 0.5rem;
        cursor: pointer;
        min-height: 36px;
        position: relative;
      }
      
      /* Enhanced focus indicators */
      .file-header:focus,
      .issue:focus,
      button:focus {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: 1px;
        border-radius: 3px;
      }
      
      /* High contrast focus for better accessibility */
      @media (prefers-contrast: high) {
        .file-header:focus,
        .issue:focus,
        button:focus {
          outline: 3px solid var(--vscode-contrastBorder, #ffffff);
         
        }
      }
       
      .issue:hover {
        background: var(--vscode-list-hoverBackground);
        color: var(--vscode-list-hoverForeground);
        border-color: var(--vscode-list-hoverForeground);
      }
      .file-group.selected .file-header {
        border-left: 3px solid var(--vscode-focusBorder);
      }

      .file-group.selected .file-header,
      .file-group.selected .file-header :is(.file-path, .file-counts, .file-counts span, .file-meta, .file-meta span, .file-detail-button, .file-toggle, .file-counts strong, svg) {
        color: var(--vscode-badge-foreground);
      }
      


      .file-group.selected .file-header .file-detail-button:hover {
        background: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 65%, transparent);
         border-color: var(--vscode-list-activeSelectionForeground);
      }

      .file-group.selected .file-header .file-icon {
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--vscode-sideBar-background) 50%, transparent);
      }

      details[open] .file-header {
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      }
      .file-icon {
        width: 1rem;
        height: 1rem;
        border-radius: 2px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.65rem;
        text-transform: uppercase;
        background: var(--file-icon-bg, var(--vscode-badge-background));
        color: var(--file-icon-foreground, color-mix(in srgb, #ffffff 45%, var(--vscode-foreground) 55%));
        text-shadow: 0 0 1px rgba(0, 0, 0, 0.25);
      }

      .vscode-light .file-icon {
        background: color-mix(in srgb, var(--file-icon-bg, var(--vscode-badge-background)) 45%, #ffffff 55%);
        color: var(--file-icon-foreground-light, var(--vscode-sideBar-foreground));
        text-shadow: none;
      }

      .vscode-dark .file-icon,
      .vscode-high-contrast-dark .file-icon {
        background: var(--file-icon-bg, var(--vscode-badge-background));
        color: var(--file-icon-foreground-dark, #f4f4f4);
      }

      .issue-icon {
        text-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
      }

      .file-icon.js {
        --file-icon-bg: #f1c40f;
        --file-icon-foreground: #3a2800;
        --file-icon-foreground-light: #3a2800;
        --file-icon-foreground-dark: #3a2800;
      }

      .file-icon.ts {
        --file-icon-bg: #3178c6;
        --file-icon-foreground-dark: #eef4ff;
      }

      .file-icon.tsx {
        --file-icon-bg: #2f74c0;
        --file-icon-foreground-dark: #e8f1ff;
      }

      .file-icon.jsx {
        --file-icon-bg: #61dafb;
        --file-icon-foreground: #0b1f33;
        --file-icon-foreground-light: #0b1f33;
        --file-icon-foreground-dark: #0b1f33;
      }

      .file-icon.css {
        --file-icon-bg: #264de4;
        --file-icon-foreground-dark: #f0f3ff;
        font-size: 0.3rem;
      }

      .file-icon.scss {
        --file-icon-bg: #c6538c;
        --file-icon-foreground-dark: #fff2f8;
        font-size: 0.3rem;
      }

      .file-icon.default {
        --file-icon-bg: #7f8c8d;
        --file-icon-foreground-dark: #f6f9f9;
      }

      .file-icon.html {
        --file-icon-bg: #e34c26;
        --file-icon-foreground-dark: #ffe9e1;
        font-size: 0.45rem;
      }

      .file-icon.json {
        --file-icon-bg: #f39c12;
        --file-icon-foreground: #2b1c00;
        --file-icon-foreground-light: #2b1c00;
        --file-icon-foreground-dark: #2b1c00;
        font-size: 0.45rem;
      }

      .file-icon.yaml,
      .file-icon.yml {
        --file-icon-bg: #cb171e;
        --file-icon-foreground-dark: #ffe9eb;
        font-size: 0.45rem;
      }

      .file-icon.md {
        --file-icon-bg: #2b7489;
        --file-icon-foreground-dark: #e4f7ff;
        font-size: 0.45rem;
      }

      .file-icon.py {
        --file-icon-bg: #3572A5;
        --file-icon-foreground-dark: #eaf4ff;
        font-size: 0.45rem;
      }

      .file-icon.go {
        --file-icon-bg: #00ADD8;
        --file-icon-foreground: #003948;
        --file-icon-foreground-light: #003948;
        --file-icon-foreground-dark: #003948;
        font-size: 0.45rem;
      }

      .file-icon.rb {
        --file-icon-bg: #701516;
        --file-icon-foreground-dark: #ffd9da;
        font-size: 0.45rem;
      }

      .file-icon.php {
        --file-icon-bg: #777bb3;
        --file-icon-foreground-dark: #f0f2ff;
        font-size: 0.45rem;
      }

      .file-icon.java {
        --file-icon-bg: #b07219;
        --file-icon-foreground-dark: #fff1dc;
        font-size: 0.45rem;
      }

      .file-icon.c {
        --file-icon-bg: #555555;
        --file-icon-foreground-dark: #f5f5f5;
        font-size: 0.45rem;
      }

      .file-icon.cpp {
        --file-icon-bg: #f34b7d;
        --file-icon-foreground-dark: #ffe1eb;
        font-size: 0.45rem;
      }

      .file-icon.cs {
        --file-icon-bg: #178600;
        --file-icon-foreground-dark: #dfffe1;
        font-size: 0.45rem;
      }

      .file-icon.swift {
        --file-icon-bg: #ffac45;
        --file-icon-foreground: #3a2000;
        --file-icon-foreground-light: #3a2000;
        --file-icon-foreground-dark: #3a2000;
        font-size: 0.45rem;
      }

      .file-icon.kt,
      .file-icon.kts {
        --file-icon-bg: #0095D5;
        --file-icon-foreground: #002a3e;
        --file-icon-foreground-light: #002a3e;
        --file-icon-foreground-dark: #e9f8ff;
        font-size: 0.45rem;
      }

      .file-icon.dart {
        --file-icon-bg: #00B4AB;
        --file-icon-foreground: #013e3a;
        --file-icon-foreground-light: #013e3a;
        --file-icon-foreground-dark: #e4fffd;
        font-size: 0.45rem;
      }

      .file-icon.rs {
        --file-icon-bg: #dea584;
        --file-icon-foreground: #3b2a15;
        --file-icon-foreground-light: #3b2a15;
        --file-icon-foreground-dark: #3b2a15;
        font-size: 0.45rem;
      }

      .file-icon.sh,
      .file-icon.bash,
      .file-icon.zsh {
        --file-icon-bg: #89e051;
        --file-icon-foreground: #1e2c09;
        --file-icon-foreground-light: #1e2c09;
        --file-icon-foreground-dark: #1e2c09;
        font-size: 0.45rem;
      }

      .file-icon.dockerfile {
        --file-icon-bg: #384d54;
        --file-icon-foreground-dark: #e6f4f8;
        font-size: 0.45rem;
      }

      .file-icon.makefile {
        --file-icon-bg: #427819;
        --file-icon-foreground-dark: #e3f7d1;
        font-size: 0.45rem;
      }

      .file-icon.cmake {
        --file-icon-bg: #6d8086;
        --file-icon-foreground-dark: #edf3f5;
        font-size: 0.45rem;
      }

      .file-icon.gradle {
        --file-icon-bg: #02303a;
        --file-icon-foreground-dark: #e3f4f7;
        font-size: 0.45rem;
      }

      .file-icon.xml {
        --file-icon-bg: #0060ac;
        --file-icon-foreground-dark: #e7f1ff;
        font-size: 0.45rem;
      }

      .file-icon.toml {
        --file-icon-bg: #9c4221;
        --file-icon-foreground-dark: #ffe7db;
        font-size: 0.45rem;
      }

      .file-icon.ini,
      .file-icon.properties {
        --file-icon-bg: #6d8086;
        --file-icon-foreground-dark: #edf3f5;
        font-size: 0.45rem;
      }

      .file-icon.lock {
        --file-icon-bg: #444c56;
        --file-icon-foreground-dark: #f1f3f6;
        font-size: 0.45rem;
      }
      .file-path {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
        font-size: 0.8rem;
        color: var(--vscode-foreground);
      }
      .file-counts {
        font-size: 0.75rem;
        display: inline-flex;
        gap: 0.3rem;
        color: var(--vscode-descriptionForeground);
        font-weight: 500;
      }
      .file-counts span {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
      }
      .file-counts img {
        width: 0.7rem;
        height: 0.7rem;
      }
      .file-meta {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.35rem;
      }
      .file-detail-button {
        border: 1px solid transparent;
        border-radius: 3px;
        background: transparent;
        color: var(--vscode-button-secondaryBackground);
        cursor: pointer;
        padding: 0.25rem;
        font-size: 0.8rem;
        line-height: 1.2;
        font-weight: 500;
        height: 24px;
        width: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .file-detail-button:hover {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-secondaryHoverBackground);
        border-color: var(--vscode-button-border);
      }
      .file-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 0.8rem;
        height: 0.8rem;
        color: var(--vscode-descriptionForeground);
      }
      .file-toggle::before {
        content: '▶';
        font-size: 0.9rem;
        line-height: 1;
      }
      .file-group[open] .file-toggle {
        transform: rotate(90deg);
      }
      .issues {
        display: flex;
        flex-direction: column;
        gap: 0.075rem;
        padding: 0.25rem 0.375rem 0.375rem;
        background: var(--vscode-editor-background, rgba(0, 0, 0, 0.02));
      }
      .issue {
        border: 1px solid var(--vscode-tree-indentGuidesStroke, transparent);
        border-radius: 3px;
        padding: 0.25rem 0.375rem;
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.3rem;
        background: var(--vscode-editor-inactiveSelection);
        cursor: pointer;
        min-height: 36px;
        align-items: center;
        position: relative;
      }
      
      /* Improved color contrast for better readability */
      .issue.safe { 
        background: var(--vscode-editor-inactiveSelection, rgba(16,124,65,0.08)); 
        background: var(--baseline-color-safe-surface);
        border-color: var(--baseline-color-safe);
      }
      .issue.warning { 
        background: rgba(249, 209, 129, 0.12); 
        background: var(--baseline-color-warning-surface);
        border-color: var(--baseline-color-warning);
      }
      .issue.blocked { 
        background: rgba(209, 52, 56, 0.15); 
        background: var(--baseline-color-error-surface);
        border-color: var(--baseline-color-error);
      }
      .issue.selected {
        outline: 2px solid var(--vscode-focusBorder, rgba(90, 133, 204, 0.8));
        outline-offset: 1px;
        box-shadow: 0 0 0 1px var(--vscode-focusBorder, rgba(90, 133, 204, 0.4));
        
      }
      
      /* Better button accessibility */
      .issue-actions button,
      .file-detail-button,
      .detail-close,
      .detail-doc-link,
      .detail-gemini-button {
        min-height: 24px;
        min-width: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      /* Smooth state transitions - optimized to prevent blinking */
      .file-group.selected .file-header {
        border-left: 3px solid var(--vscode-focusBorder);
        color: var(--vscode-list-activeSelectionForeground);
      }
      
      details[open] .file-header {
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        color: var(--vscode-list-activeSelectionForeground);
      }
      
      /* Skip link for keyboard users */
      .skip-to-content {
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1000;
      }
      
      .skip-to-content:focus {
        top: 6px;
      }
      .issue-icon {
        width: 1rem;
        height: 1rem;
      }
      .issue-main {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        min-width: 0;
      }
      .issue-title {
        font-weight: 500;
        font-size: 0.8rem;
        line-height: 1.3;
        color: var(--vscode-foreground);
      }
      .issue-snippet {
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 0.75rem;
        white-space: normal;
        word-break: break-word;
        color: var(--vscode-foreground);
        opacity: 0.75;
        background: var(--vscode-editor-background, transparent);
        border-radius: 2px;
        padding: 0.125rem 0.25rem;
        line-height: 1.3;
      }
      .issue-actions {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        gap: 0.25rem;
      }
      .issue-actions button {
        border: 1px solid transparent;
        border-radius: 3px;
        background: transparent;
        color: var(--vscode-button-secondaryForeground);
        cursor: pointer;
        padding: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        height: 24px;
        width: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .issue-actions button:hover {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-secondaryHoverBackground);
        border-color: var(--vscode-button-border);
      }
      
      /* Grouped issues styles */
      .grouped-issue {
        border: 1px solid var(--vscode-tree-indentGuidesStroke, transparent);
        border-radius: 6px;
        padding: 0;
        background: var(--vscode-editor-inactiveSelection);
        cursor: pointer;
        margin-bottom: 0.5rem;
        overflow: hidden;
      }
      
      .grouped-issue.safe { 
        background: var(--vscode-editor-inactiveSelection, rgba(16,124,65,0.08)); 
        background: var(--baseline-color-safe-surface);
        border-color: var(--baseline-color-safe);
      }
      .grouped-issue.warning { 
        background: rgba(249, 209, 129, 0.12); 
        background: var(--baseline-color-warning-surface);
        border-color: var(--baseline-color-warning);
      }
      .grouped-issue.blocked { 
        background: rgba(209, 52, 56, 0.15); 
        background: var(--baseline-color-error-surface);
        border-color: var(--baseline-color-error);
      }
      
      .grouped-issue-header {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 0.375rem;
        align-items: center;
        padding: 0.375rem 0.5rem;
        border-bottom: 1px solid var(--vscode-tree-indentGuidesStroke, transparent);
        background: var(--vscode-editor-background, rgba(0, 0, 0, 0.05));
      }
      
      .grouped-issue-main {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        min-width: 0;
      }
      
      .grouped-issue-title {
        font-weight: 500;
        font-size: 0.85rem;
        line-height: 1.3;
        color: var(--vscode-foreground);
      }
      
      .grouped-issue-meta {
        font-size: 0.75rem;
        color: var(--vscode-descriptionForeground);
        opacity: 0.8;
      }
      
      .grouped-issue-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 0.7rem;
        font-weight: 600;
        min-width: 20px;
        height: 20px;
      }
      
      .grouped-issue-toggle {
        background: transparent;
        border: none;
        color: var(--vscode-foreground);
        cursor: pointer;
        padding: 2px;
        border-radius: 3px;
        transition: transform 0.15s ease;
        font-size: 0.9rem;
      } 

      .grouped-issue-occurrences {
        display: none;
        padding: 0.25rem;
        background: var(--vscode-editor-background, rgba(0, 0, 0, 0.02));
      }
      
      .grouped-issue.expanded .grouped-issue-occurrences {
        display: block;
      }
      
      .occurrence-item {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.375rem;
        align-items: center;
        padding: 0.25rem 0.375rem;
        margin-bottom: 0.125rem;
        border-radius: 3px;
        background: var(--vscode-input-background);
        border: 1px solid transparent;
        cursor: pointer;
        min-height: 32px;
      }
      
      .occurrence-item:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-tree-indentGuidesStroke);
      }
      
      .occurrence-item.selected {
        color: var(--vscode-list-activeSelectionForeground);
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: 1px;
      }
      
      .occurrence-main {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        min-width: 0;
      }
      
      .occurrence-location {
        font-size: 0.75rem;
        color: var(--vscode-descriptionForeground);
        font-weight: 500;
      }
      
      .occurrence-snippet {
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 0.7rem;
        color: var(--vscode-foreground);
        opacity: 0.8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .occurrence-actions {
        display: flex;
        gap: 0.25rem;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      
      .occurrence-item:hover .occurrence-actions,
      .occurrence-item.selected .occurrence-actions {
        opacity: 1;
      }
      
      .occurrence-actions button {
        border: 1px solid transparent;
        border-radius: 3px;
        background: transparent;
        color: var(--vscode-button-secondaryForeground);
        cursor: pointer;
        padding: 0.2rem;
        font-size: 0.7rem;
        height: 20px;
        width: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .occurrence-actions button:hover {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-secondaryHoverBackground);
        border-color: var(--vscode-button-border);
      }
      
      .grouping-toggle {
        display: inline-flex;
        align-items: center;
      }
      .grouping-toggle label {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        font-size: 0.8rem;
        color: var(--vscode-descriptionForeground);
        font-weight: 500;
        cursor: pointer;
        user-select: none;
        position: relative;
      }
      .grouping-toggle input[type="checkbox"] {
        position: absolute;
        opacity: 0;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        white-space: nowrap;
      }
      .grouping-toggle .toggle-visual {
        position: relative;
        width: 32px;
        height: 18px;
        border-radius: 999px;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, rgba(255, 255, 255, 0.08));
        transition: background-color 120ms ease, border-color 120ms ease;
        flex-shrink: 0;
      }
      .grouping-toggle .toggle-visual::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--vscode-input-foreground);
        transition: transform 120ms ease, background-color 120ms ease;
      }
      .grouping-toggle input[type="checkbox"]:checked + .toggle-visual {
        background: var(--vscode-button-background);
        border-color: var(--vscode-button-background);
      }
      .grouping-toggle input[type="checkbox"]:checked + .toggle-visual::after {
        transform: translateX(14px);
        background: var(--vscode-button-foreground);
      }
      .grouping-toggle input[type="checkbox"]:focus-visible + .toggle-visual {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: 2px;
      }
      .grouping-toggle input[type="checkbox"]:disabled + .toggle-visual {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .detail {
        flex: 1 1 45%;
        border-left: 1px solid var(--vscode-sideBarSectionHeader-border);
        padding: 0;
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 0;
        background: var(--vscode-editor-background, rgba(0, 0, 0, 0.02));
        position: relative;
        resize: vertical;
        min-height: 200px;
        max-height: 80vh;
      }
      
      .detail-resize-handle {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--vscode-sideBarSectionHeader-border, #606060);
        cursor: ns-resize;
        z-index: 10;
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
      }
      
      .detail-resize-handle:hover {
        background: var(--vscode-focusBorder, #4a9eff);
      }
      
      .detail-resize-handle.dragging {
        background: var(--vscode-focusBorder, #007acc);
      }
      
      .detail-resize-handle::before {
        content: '';
        width: 24px;
        height: 2px;
        background: var(--vscode-sideBarSectionHeader-border);
        border-radius: 1px;
        opacity: 0.5;
        transition: opacity 0.2s ease;
      }
      
      .detail-resize-handle:hover::before,
      .detail-resize-handle.dragging::before {
        opacity: 1;
        background: var(--vscode-focusBorder, #007ACC);
      }
      
      .detail-content {
        flex: 1;
        overflow: auto;
        padding: 0.25rem 0 0.25rem 0.375rem;
        /* Improved scrolling */
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: var(--vscode-scrollbarSlider-background) var(--vscode-scrollbar-shadow);
      }
      
      /* Detail panel scrollbar styling */
      .detail-content::-webkit-scrollbar {
        width: 8px;
      }
      
      .detail-content::-webkit-scrollbar-track {
        background: var(--vscode-scrollbar-shadow);
        border-radius: 4px;
      }
      
      .detail-content::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        border-radius: 4px;
        border: 1px solid var(--vscode-scrollbar-shadow);
      }
      
      .detail-content::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground);
      }
      
      .detail-content::-webkit-scrollbar-thumb:active {
        background: var(--vscode-scrollbarSlider-activeBackground);
      }
      .detail.hidden {
        display: none;
      }
      .detail-pane {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        padding: 0.75rem;
        padding-top: 0;
        box-sizing: border-box;
      }
      .detail-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem 0.75rem 0.5rem 0.75rem;
        margin: -0.75rem -0.75rem 0 -0.75rem;
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        background: var(--vscode-sideBar-background);
        position: sticky;
        top: 0;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .detail-close {
        border: 1px solid var(--vscode-button-border, transparent);
        border-radius: 4px;
        padding: 0.25rem;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        cursor: pointer;
        flex-shrink: 0;
        font-size: 1.1rem;
        font-weight: 400;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
      .detail-close:hover {
        background: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-secondaryBackground));
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
      }
      .detail-heading {
        font-weight: 600;
        font-size: 1.1rem;
        line-height: 1.3;
        color: var(--vscode-foreground);
      }
      .detail-subheading {
        font-size: 0.9rem;
        color: var(--vscode-descriptionForeground);
        margin-top: 0.25rem;
        line-height: 1.4;
      }
      .detail-subheading.hidden {
        display: none;
      }
      .detail-path {
        font-size: 0.85rem;
        color: var(--vscode-descriptionForeground);
        font-family: var(--vscode-editor-font-family, monospace);
        background: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.1));
        padding: 0.4rem 0.6rem;
        border-radius: 4px;
        border-left: 3px solid var(--vscode-focusBorder, #007ACC);
        margin: -0.25rem 0 0.25rem 0;
      }
      .detail-body {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .detail-block {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        border: 1px solid var(--vscode-tree-indentGuidesStroke, transparent);
        border-radius: 8px;
        padding: 1rem;
        background: var(--vscode-sideBarSectionHeader-background, rgba(128, 128, 128, 0.06));
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transition: box-shadow 0.2s ease;
      }
      .detail-block:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      }
      .detail-header-block {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.75rem;
        align-items: center;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      }
      .detail-icon {
        width: 2rem;
        height: 2rem;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
      .baseline-icon {
        width: 1.5rem;
        height: 0.85rem;
        margin-right: 0.5rem;
        vertical-align: middle;
      }
      .detail-title {
        font-weight: 600;
        font-size: 1.05rem;
        line-height: 1.3;
        color: var(--vscode-foreground);
      }
      .detail-meta {
        font-size: 0.85rem;
        color: var(--vscode-descriptionForeground);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.25rem;
      }
      .detail-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.2rem 0.6rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .detail-badge.blocked { 
        background: rgba(209, 52, 56, 0.15); 
        background: var(--baseline-color-error-surface); 
        color: var(--baseline-color-error); 
        border: 1px solid var(--baseline-color-error);
      }
      .detail-badge.warning { 
        background: rgba(249, 209, 129, 0.2); 
        background: var(--baseline-color-warning-surface); 
        color: var(--baseline-color-warning); 
        border: 1px solid var(--baseline-color-warning);
      }
      .detail-badge.safe { 
        background: rgba(16, 124, 65, 0.15); 
        background: var(--baseline-color-safe-surface); 
        color: var(--baseline-color-safe); 
        border: 1px solid var(--baseline-color-safe);
      }
      .detail-section h4 {
        margin: 0 0 0.5rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--vscode-foreground);
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        padding-bottom: 0.25rem;
      }
      .detail-section ul {
        margin: 0;
        padding-left: 1.5rem;
        line-height: 1.5;
      }
      .detail-section ul li {
        margin-bottom: 0.3rem;
        color: var(--vscode-foreground);
      }
      .detail-code {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        padding: 0.75rem;
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 0.9rem;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.4;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .detail-context div {
        margin-bottom: 0.4rem;
        padding: 0.3rem 0;
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      }
      .detail-context div:last-child {
        border-bottom: none;
      }
      .detail-table {
        margin-top: 0.35rem;
      }
      .detail-table table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .detail-table th,
      .detail-table td {
        border: 1px solid var(--vscode-sideBarSectionHeader-border);
        padding: 0.3rem 0.4rem;
        text-align: left;
      }
      .detail-table th {
        background: var(--vscode-sideBarSectionHeader-background, rgba(128, 128, 128, 0.1));
      }
      
      /* Enhanced Browser Support Table Styling */
      .browser-support-container {
        margin-top: 0.5rem;
      }
      .browser-support-table {
        margin-top: 0.5rem;
      }
      .support-heading {
        font-size: 0.9rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        color: var(--vscode-foreground);
      }
      .support-table {
        width: 100%;
        border-collapse: collapse;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        background: var(--vscode-editor-background);
      }
      .support-table thead {
        background: var(--vscode-sideBar-background);
      }
      .support-table th {
        padding: 0.6rem 0.8rem;
        text-align: left;
        font-weight: 600;
        font-size: 0.8rem;
        color: var(--vscode-sideBarTitle-foreground);
        border-bottom: 2px solid var(--vscode-sideBarSectionHeader-border);
      }
      .browser-header {
        width: 40%;
      }
      .support-header, .target-header {
        width: 20%;
        text-align: center;
      }
      .status-header {
        width: 20%;
        text-align: center;
      }
      .browser-support-row {
        transition: background-color 0.2s ease;
      }
      .browser-support-row:hover {
        background: var(--vscode-list-hoverBackground);
      }
      .browser-support-row.status-supported {
        border-left: 3px solid var(--baseline-color-safe);
      }
      .browser-support-row.status-blocked {
        border-left: 3px solid var(--baseline-color-error);
      }
      .browser-support-row.status-unsupported {
        border-left: 3px solid var(--baseline-color-warning);
      }
      .browser-support-row.status-unknown {
        border-left: 3px solid var(--baseline-color-unknown);
      }
      .support-table td {
        padding: 0.6rem 0.8rem;
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        font-size: 0.85rem;
      }
      .browser-cell {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .browser-icon {
        font-size: 1.1rem;
        width: 1.2rem;
        text-align: center;
      }
      .browser-name {
        font-weight: 500;
      }
      .support-cell, .target-cell {
        text-align: center;
        font-family: var(--vscode-editor-font-family, monospace);
        font-weight: 500;
      }
      .status-cell {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
      }
      .status-icon {
        font-size: 0.9rem;
      }
      .status-text {
        font-size: 0.8rem;
        font-weight: 500;
      }
      
      .detail-discouraged p {
        margin: 0;
      }
      .detail-actions {
        display: flex;
        gap: 0.5rem;
      }
      .detail-doc-link {
        border: 1px solid var(--vscode-button-border, transparent);
        border-radius: 4px;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        padding: 0.3rem 0.7rem;
        cursor: pointer;
      }
      .detail-doc-link:hover {
        background: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-secondaryBackground));
      }
      .detail-gemini-button {
        border: 1px solid var(--vscode-button-border, transparent);
        border-radius: 4px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        padding: 0.3rem 0.7rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        transition: background-color 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      }
      .detail-gemini-button:hover {
        background: var(--vscode-button-hoverBackground);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }
      .gemini-icon {
        font-size: 1em;
      }
      .existing-suggestions-section {
        background: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 4px;
        padding: 8px;
        border-left: 3px solid var(--vscode-focusBorder);
      }
      .existing-suggestion {
        background: var(--vscode-editor-background);
        border-radius: 4px;
        padding: 8px;
        margin: 6px 0;
        border: 1px solid var(--vscode-widget-border);
      }
      .existing-suggestion-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }
      .existing-suggestion-content {
        font-size: 12px;
        line-height: 1.4;
      }
      .existing-suggestion-content code {
        background: var(--vscode-editorWidget-background);
        color: var(--vscode-foreground);
        padding: 2px 4px;
        border-radius: 4px;
        font-family: var(--vscode-editor-font-family);
      }
      .existing-suggestion-content code mark {
        background: var(--vscode-editor-selectionBackground);
        color: inherit;
      }
      .existing-suggestion-content .code-block {
        position: relative;
        margin: 8px 0;
        border-radius: 6px;
        background: var(--vscode-editorWidget-background);
        border: 1px solid var(--vscode-widget-border);
      }
      .existing-suggestion-content .code-block pre {
        margin: 0;
        padding: 12px;
        max-width: 100%;
        overflow-x: auto;
        box-sizing: border-box;
        font-size: 12px;
      }
      .existing-suggestion-content .code-block code {
        display: block;
        background: transparent;
        padding: 0;
        white-space: pre;
      }
      .existing-suggestion-content .code-copy-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        padding: 2px 6px;
      }
      .existing-suggestion-content .code-copy-btn:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }

      /* ChatGPT-like Chat Interface Styles */
      .gemini-chat-section {
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
        background: var(--vscode-editor-background);
        margin-top: 16px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .chat-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--vscode-widget-border);
        background: var(--vscode-titleBar-activeBackground, var(--vscode-sideBar-background));
      }

      .chat-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .title-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        background: var(--vscode-button-background);
        border-radius: 6px;
        color: var(--vscode-button-foreground);
      }

      .chat-title h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--vscode-titleBar-activeForeground, var(--vscode-foreground));
      }

      /* Collapsible Context */
      .chat-context-section {
        border-bottom: 1px solid var(--vscode-widget-border);
      }

      .chat-context-toggle {
        width: 100%;
        background: transparent;
        color: var(--vscode-foreground);
        border: none;
        padding: 0;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .context-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        font-size: 13px;
        font-weight: 500;
      }

      .chat-context-toggle:hover .context-header {
        background: var(--vscode-list-hoverBackground);
      }

      .context-icon {
        font-size: 14px;
      }

      .context-toggle-icon {
        margin-left: auto;
        transition: transform 0.2s ease;
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .chat-context-toggle[data-expanded="true"] .context-toggle-icon {
        transform: rotate(90deg);
      }

      .chat-context-details {
        padding: 16px 20px;
        background: var(--vscode-textCodeBlock-background);
      }

      .context-grid {
        display: grid;
        gap: 12px;
      }

      .context-item {
        display: flex;
        align-items: center;
        font-size: 13px;
      }

      .context-label {
        font-weight: 500;
        color: var(--vscode-foreground);
        min-width: 60px;
        margin-right: 12px;
      }

      .context-value {
        color: var(--vscode-descriptionForeground);
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 12px;
      }

      /* Conversation Area */
      .chat-conversation {
        display: flex;
        flex-direction: column;
        min-height: 200px;
        max-height: 600px;
      }

      .chat-messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }

      .chat-messages {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .chat-content-area {
        flex: 1;
        overflow-y: auto;
        max-height: 400px;
      }

      .typing-indicator {
        opacity: 0.7;
      }

      .typing-indicator .message-text {
        font-style: italic;
      }

      /* Message Styles */
      .chat-message {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }

      .message-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .avatar-icon {
        font-size: 14px;
      }

      .user-message .message-avatar {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .ai-message .message-avatar {
        background: var(--baseline-color-safe);
        color: var(--vscode-editor-foreground);
      }

      .message-content {
        flex: 1;
        min-width: 0;
      }

      .message-text {
        background: transparent;
        padding: 0;
        border-radius: 0;
        font-size: 14px;
        line-height: 1.6;
        color: var(--vscode-foreground);
        word-wrap: break-word;
      }

      .message-text p {
        margin: 0 0 12px 0;
      }

      .message-text p:last-child {
        margin-bottom: 0;
      }

      .message-text strong {
        font-weight: 600;
        color: var(--vscode-foreground);
      }

      .message-text em {
        font-style: italic;
        color: var(--vscode-foreground);
      }

      .message-text .inline-code {
        background: var(--vscode-textCodeBlock-background);
        color: var(--vscode-textPreformat-foreground);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 13px;
        border: 1px solid var(--vscode-widget-border);
      }

      .message-text .code-block-container {
        margin: 12px 0;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--vscode-widget-border);
        background: var(--vscode-textCodeBlock-background);
      }

      .code-block-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: var(--vscode-titleBar-activeBackground, var(--vscode-button-secondaryBackground));
        border-bottom: 1px solid var(--vscode-widget-border);
        font-size: 12px;
        font-weight: 500;
      }

      .code-block-lang {
        color: var(--vscode-descriptionForeground);
      }

      .code-copy-button {
        background: transparent;
        border: none;
        color: var(--vscode-descriptionForeground);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        transition: all 0.2s;
      }

      .code-copy-button:hover {
        background: var(--vscode-list-hoverBackground);
        color: var(--vscode-foreground);
      }

      .copy-icon {
        width: 14px;
        height: 14px;
      }

      .code-block {
        position: relative;
        margin: 8px 0;
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 13px;
        line-height: 1.4;
        padding: 12px;
        background: var(--vscode-textCodeBlock-background);
        color: var(--vscode-textPreformat-foreground);
        overflow-x: auto;
        border-radius: 4px;
        border: 1px solid var(--vscode-widget-border);
      }

      .code-block code {
        background: transparent;
        padding: 0;
        font-family: inherit;
        font-size: inherit;
        color: inherit;
      }

      .code-copy-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: 1px solid var(--vscode-button-border);
        border-radius: 3px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
        z-index: 1;
      }

      .code-copy-btn:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }

      .message-time {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        margin-top: 6px;
        opacity: 0.8;
      }

      /* Typing Indicator */
      .typing-indicator {
        padding: 0 20px 16px;
      }

      .typing-dots {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 12px 16px;
        background: var(--vscode-textCodeBlock-background);
        border-radius: 16px;
        width: fit-content;
      }

      .typing-dots span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--vscode-descriptionForeground);
        animation: typing-pulse 1.5s ease-in-out infinite;
      }

      .typing-dots span:nth-child(1) { animation-delay: 0s; }
      .typing-dots span:nth-child(2) { animation-delay: 0.3s; }
      .typing-dots span:nth-child(3) { animation-delay: 0.6s; }

      @keyframes typing-pulse {
        0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
        30% { opacity: 1; transform: scale(1); }
      }

      /* Input Area */
      .chat-input-container {
        border-top: 1px solid var(--vscode-widget-border);
        padding: 16px 20px;
        background: var(--vscode-editor-background);
      }

      .chat-input-wrapper {
        display: flex;
        align-items: flex-end;
        background: var(--vscode-input-background);
        border: 2px solid var(--vscode-input-border);
        border-radius: 12px;
        padding: 8px 12px;
        transition: border-color 0.2s ease;
        position: relative;
      }

      .chat-input-wrapper:focus-within {
        border-color: var(--vscode-focusBorder);
        box-shadow: 0 0 0 1px var(--vscode-focusBorder);
      }

      .chat-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--vscode-input-foreground);
        font-family: var(--vscode-font-family);
        font-size: 14px;
        line-height: 1.5;
        resize: none;
        min-height: 20px;
        max-height: 120px;
        padding: 4px 0;
      }

      .chat-input::placeholder {
        color: var(--vscode-input-placeholderForeground);
      }

      .chat-send-button {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 8px;
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
        margin-left: 8px;
      }

      .chat-send-button:hover:not(:disabled) {
        background: var(--vscode-button-hoverBackground);
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .chat-send-button:disabled {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        cursor: not-allowed;
        opacity: 0.5;
        transform: none;
        box-shadow: none;
      }

      .send-icon {
        width: 16px;
        height: 16px;
      }

      .chat-input-footer {
        margin-top: 8px;
        text-align: center;
      }

      .chat-input-footer small {
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
      }

      .detail-entry {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .detail-subtitle {
        font-size: 0.85rem;
        color: var(--vscode-descriptionForeground);
      }

      .issue-detail-button{
        color: var(--vscode-button-foreground) !important;
        background: var(--vscode-button-background) !important;
        border: 1px solid var(--vscode-button-border, transparent);
      }
      .issue-detail-button:hover {
        background: var(--vscode-button-hoverBackground) !important;
      }
  
      .issue-open-button{
        color: var(--vscode-button-foreground) !important;
        background: var(--vscode-button-background) !important;
        border: 1px solid var(--vscode-button-border, transparent);
      }
      .issue-open-button:hover {
        background: var(--vscode-button-hoverBackground) !important;
      }
      .issue-docs-button{
        color: var(--vscode-button-foreground) !important;
        background: var(--vscode-button-background) !important;
        border: 1px solid var(--vscode-button-border, transparent);
      }
      .issue-docs-button:hover {
        background: var(--vscode-button-hoverBackground) !important;
      }
      .issue-askai-button{
        color: var(--vscode-button-foreground) !important;
        background: var(--vscode-button-background) !important;
        border: 1px solid var(--vscode-button-border, transparent);
      }
      .issue-askai-button:hover {
        background: var(--vscode-button-hoverBackground) !important;
      }

      @media (max-width: 880px) {
        .content {
          flex-direction: column;
          gap: 0.125rem;
        }
        .detail {
          border-left: none;
          border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
          padding: 0;
          min-height: 250px;
          max-height: 60vh;
        }
        .detail-resize-handle {
          top: 0;
          height: 6px;
          background: var(--vscode-sideBarSectionHeader-border, #707070);
          opacity: 0.7;
          transition: background-color 0.2s ease, opacity 0.2s ease;
        }
        .detail-resize-handle:hover {
          background: var(--vscode-focusBorder, #4a9eff);
          opacity: 1;
        }
        .detail-resize-handle.dragging {
          background: var(--vscode-focusBorder, #007acc);
          opacity: 1;
        }
        .detail-content {
          padding: 0.375rem;
        }
        .detail-pane {
          padding: 0.5rem;
        }
        .filters {
          grid-template-columns: 1fr;
        }
        .severity-filter {
          justify-content: center;
        }
        .filter-actions {
          justify-content: center;
        }
      }
      
      /* Compact mode for smaller screens */
      @media (max-width: 600px) {
        .controls {
          padding: 0.375rem 0.5rem;
        }
        .file-header {
          padding: 0.25rem 0.375rem;
          gap: 0.25rem;
        }
        .issue {
          padding: 0.2rem 0.3rem;
          gap: 0.25rem;
        }
        .file-icon, .issue-icon {
          width: 0.9rem;
          height: 0.9rem;
        }
      }
      .hidden {
        display: none !important;
      }
      
      .external-icon {
        opacity: 0.7;
        font-size: 0.75em;
        margin-left: 0.2em;
        color: var(--vscode-textLink-foreground);
      }
      
      .resource-link:hover .external-icon {
        opacity: 1;
      }
    
  `.trim();
}
