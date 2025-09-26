import * as vscode from "vscode";

import type { Target } from "../../core/targets";
import type { Verdict } from "../../core/scoring";
import type { BaselineFinding } from "../workspaceScanner";
import type { BaselineAnalysisAssets } from "./types";
import type { GeminiSuggestion } from "../../gemini/geminiService";
import {
  buildGeminiIssueContent,
  capitalize,
  escapeAttribute,
  escapeHtml,
  formatBaselineSummary,
  formatDiscouraged,
  formatVerdict,
  generateNonce,
  getBaselineIconHtml,
  renderSimpleMarkdown,
  renderSupportTables
} from "./utils";

export function renderAnalysisWebviewHtml(webview: vscode.Webview): string {
    const nonce = generateNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        color-scheme: var(--vscode-color-scheme);
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
      .controls button {
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
      .controls button:hover {
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
      .controls button:disabled {
        opacity: 0.5;
        cursor: default;
        box-shadow: none;
      }
      .filters {
        display: grid;
        grid-template-columns: minmax(120px, 1fr);
        gap: 0.375rem;
        padding: 0 0.75rem 0.5rem;
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        background: var(--vscode-sideBar-background);
      }
      @media (min-width: 420px) {
        .filters {
          grid-template-columns: minmax(160px, 2fr) minmax(120px, 1fr);
          align-items: center;
        }
      }
      @media (min-width: 680px) {
        .filters {
          grid-template-columns: minmax(160px, 2fr) minmax(200px, 1.5fr) auto;
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
        display: flex;
        justify-content: flex-end;
        gap: 0.375rem;
        flex-wrap: wrap;
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
      }
      .sort-select label {
        font-size: 0.8rem;
        color: var(--vscode-descriptionForeground);
        font-weight: 500;
      }
      .summary {
        font-size: 0.8rem;
        opacity: 0.85;
        padding: 0.375rem 0.75rem;
        color: var(--vscode-descriptionForeground);
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        background: var(--vscode-sideBar-background);
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
        background: var(--vscode-tree-tableColumnsBorder, transparent);
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
          background: var(--vscode-editor-selectionHighlightBackground);
        }
      }
      
      /* Improved hover states */
      .file-header:hover {
        background: var(--vscode-list-hoverBackground);
      }
      
      .issue:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-list-hoverForeground);
      }
      .file-group.selected .file-header {
        background: var(--vscode-editor-selectionBackground, rgba(128, 128, 128, 0.15));
        border-left: 3px solid var(--vscode-focusBorder);
      }
      
      details[open] .file-header {
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        background: var(--vscode-list-activeSelectionBackground, rgba(128, 128, 128, 0.1));
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
        color: #fff;
        text-transform: uppercase;
      }
      .file-icon.js { background: #f1c40f; color: #222; }
      .file-icon.ts { background: #3178c6; }
      .file-icon.tsx { background: #2f74c0; }
      .file-icon.jsx { background: #61dafb; color: #0b1f33; }
      .file-icon.css { background: #264de4; font-size: 0.3rem; }
      .file-icon.scss { background: #c6538c; font-size: 0.3rem;}
      .file-icon.default { background: #7f8c8d; }
      .file-icon.html { background: #e34c26; font-size: 0.45rem; }
      .file-icon.json { background: #f39c12; font-size: 0.45rem; color: #222; }
      .file-icon.yaml, .file-icon.yml { background: #cb171e; font-size: 0.45rem; color: #fff; }
      .file-icon.md { background: #2b7489; font-size: 0.45rem; color: #fff; }
      .file-icon.py { background: #3572A5; font-size: 0.45rem; color: #fff; }
      .file-icon.go { background: #00ADD8; font-size: 0.45rem; color: #fff; }
      .file-icon.rb { background: #701516; font-size: 0.45rem; color: #fff; }
      .file-icon.php { background: #777bb3; font-size: 0.45rem; color: #fff; }
      .file-icon.java { background: #b07219; font-size: 0.45rem; color: #fff; }
      .file-icon.c { background: #555555; font-size: 0.45rem; color: #fff; }
      .file-icon.cpp { background: #f34b7d; font-size: 0.45rem; color: #fff; }
      .file-icon.cs { background: #178600; font-size: 0.45rem; color: #fff; }
      .file-icon.swift { background: #ffac45; font-size: 0.45rem; color: #fff; }
      .file-icon.kt, .file-icon.kts { background: #0095D5; font-size: 0.45rem; color: #fff; }
      .file-icon.dart { background: #00B4AB; font-size: 0.45rem; color: #fff; }
      .file-icon.rs { background: #dea584; font-size: 0.45rem; color: #fff; }
      .file-icon.sh { background: #89e051; font-size: 0.45rem; color: #222; }
      .file-icon.bash { background: #89e051; font-size: 0.45rem; color: #222; }
      .file-icon.zsh { background: #89e051; font-size: 0.45rem; color: #222; }
      .file-icon.dockerfile { background: #384d54; font-size: 0.45rem; color: #fff; }
      .file-icon.makefile { background: #427819; font-size: 0.45rem; color: #fff; }
      .file-icon.cmake { background: #6d8086; font-size: 0.45rem; color: #fff; }
      .file-icon.gradle { background: #02303a; font-size: 0.45rem; color: #fff; }
      .file-icon.xml { background: #0060ac; font-size: 0.45rem; color: #fff; }
      .file-icon.toml { background: #9c4221; font-size: 0.45rem; color: #fff; }
      .file-icon.ini { background: #6d8086; font-size: 0.45rem; color: #fff; }
      .file-icon.properties { background: #6d8086; font-size: 0.45rem; color: #fff; }
      .file-icon.dart { background: #00B4AB; font-size: 0.45rem; color: #fff; }
      .file-icon.lock { background: #444c56; font-size: 0.45rem; color: #fff; }
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
        color: var(--vscode-button-secondaryForeground);
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
        content: '▸';
        font-size: 1.25rem;
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
        border-color: rgba(16,124,65,0.2);
      }
      .issue.warning { 
        background: rgba(249, 209, 129, 0.12); 
        border-color: rgba(249, 209, 129, 0.3);
      }
      .issue.blocked { 
        background: rgba(209, 52, 56, 0.15); 
        border-color: rgba(209, 52, 56, 0.3);
      }
      .issue.selected {
        outline: 2px solid var(--vscode-focusBorder, rgba(90, 133, 204, 0.8));
        outline-offset: 1px;
        box-shadow: 0 0 0 1px var(--vscode-focusBorder, rgba(90, 133, 204, 0.4));
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
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
        background: var(--vscode-editor-selectionBackground, rgba(128, 128, 128, 0.15));
        border-left: 3px solid var(--vscode-focusBorder);
      }
      
      details[open] .file-header {
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        background: var(--vscode-list-activeSelectionBackground, rgba(128, 128, 128, 0.1));
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
        color: #d13438; 
        border: 1px solid rgba(209, 52, 56, 0.3);
      }
      .detail-badge.warning { 
        background: rgba(249, 209, 129, 0.2); 
        color: #8d6b0b; 
        border: 1px solid rgba(249, 209, 129, 0.4);
      }
      .detail-badge.safe { 
        background: rgba(16, 124, 65, 0.15); 
        color: #107c41; 
        border: 1px solid rgba(16, 124, 65, 0.3);
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
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.3rem 0.7rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        transition: opacity 0.2s ease;
      }
      .detail-gemini-button:hover {
        opacity: 0.9;
      }
      .gemini-icon {
        font-size: 1em;
      }
      .existing-suggestions-section {
        background: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 4px;
        padding: 8px;
        border-left: 3px solid #667eea;
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
      .detail-entry {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .detail-subtitle {
        font-size: 0.85rem;
        color: var(--vscode-descriptionForeground);
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
        .sort-select {
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
    </style>
  </head>
  <body>
    <a href="#main-content" class="skip-to-content">Skip to main content</a>
    <div class="view">
      <div class="controls">
        <button class="primary" data-action="scan">Scan workspace</button>
        <button data-action="clear-filters">Clear filters</button>
      </div>
      <div class="filters">
        <div class="search-box">
          <input type="search" placeholder="Search findings" data-search />
        </div>
        <div class="severity-filter" data-severity>
          <label data-verdict="blocked"><input type="checkbox" value="blocked" />Blocked</label>
          <label data-verdict="warning"><input type="checkbox" value="warning" />Needs review</label>
          <label data-verdict="safe"><input type="checkbox" value="safe" />Safe</label>
        </div>
        <div class="sort-select">
          <label>
            Sort by
            <select data-sort>
              <option value="severity">Severity (blocked first)</option>
              <option value="file">File path</option>
            </select>
          </label>
        </div>
      </div>
      <div class="summary" data-summary></div>
      <div class="content">
        <div class="results" data-results id="main-content"></div>
        <aside class="detail hidden" data-detail>
          <div class="detail-resize-handle" data-resize-handle></div>
          <div class="detail-content">
            <div class="detail-pane">
              <div class="detail-top">
                <div>
                  <div class="detail-heading" data-detail-title></div>
                  <div class="detail-subheading hidden" data-detail-subtitle></div>
                </div>
                <button class="detail-close" data-detail-close title="Close details" aria-label="Close details">×</button>
              </div>
              <div class="detail-path" data-detail-path></div>
              <div class="detail-body" data-detail-body></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();

      let currentState = null;
      let searchDebounce = null;

      const controls = document.querySelector('[data-action="scan"]');
      const clearBtn = document.querySelector('[data-action="clear-filters"]');
      const searchInput = document.querySelector('[data-search]');
      const severityContainer = document.querySelector('[data-severity]');
      const sortSelect = document.querySelector('[data-sort]');
      const resultsNode = document.querySelector('[data-results]');
      const summaryNode = document.querySelector('[data-summary]');
      const detailNode = document.querySelector('[data-detail]');
      const detailTitleNode = document.querySelector('[data-detail-title]');
      const detailSubtitleNode = document.querySelector('[data-detail-subtitle]');
      const detailPathNode = document.querySelector('[data-detail-path]');
      const detailBodyNode = document.querySelector('[data-detail-body]');
      const detailCloseBtn = document.querySelector('[data-detail-close]');
      const resizeHandle = document.querySelector('[data-resize-handle]');
      const MAX_SNIPPET_PREVIEW = 120;

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

      controls.addEventListener('click', () => {
        vscode.postMessage({ type: 'scan' });
      });

      clearBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'clearFilters' });
      });

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

      detailCloseBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'closeDetail' });
      });

      detailBodyNode.addEventListener('click', (event) => {
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
          const feature = geminiButton.getAttribute('data-feature-name');
          const filePath = geminiButton.getAttribute('data-file-path');
          const findingId = geminiButton.getAttribute('data-finding-id');
          vscode.postMessage({ type: 'askGemini', issue, feature, filePath, findingId });
          return;
        }
      });

      window.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        if (type === 'state') {
          currentState = payload;
          applyState();
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
        focusableElements = Array.from(resultsNode.querySelectorAll('.file-header, .issue, button, [tabindex="0"]'));
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
        updateFocusableElements();
        const clickedElement = event.target.closest('.file-header, .issue, button');
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

      function applyState() {
        if (!currentState) {
          return;
        }

        // Save scroll position before rendering changes
        saveScrollPosition();

        const { scanning, searchQuery, severityFilter, sortOrder, progressText, filteredSummary, summary, files, severityIconUris, filtersActive, lastScanAt, detail } = currentState;

        controls.disabled = Boolean(scanning);
        clearBtn.disabled = !filtersActive;

        if (document.activeElement !== searchInput) {
          searchInput.value = searchQuery;
        }

        updateSeverityControls(severityFilter);
        sortSelect.value = sortOrder;
        updateSummary(summary, filteredSummary, scanning, progressText, lastScanAt);
        renderResults(files, severityIconUris, scanning, progressText, filteredSummary.total);
        renderDetail(detail);
        
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

          const counts = document.createElement('span');
          counts.className = 'file-counts';
          counts.appendChild(createCountBadge('blocked', file.counts.blocked, severityIconUris.blocked));
          counts.appendChild(createCountBadge('warning', file.counts.warning, severityIconUris.warning));
          counts.appendChild(createCountBadge('safe', file.counts.safe, severityIconUris.safe));
          meta.appendChild(counts);

          const detailBtn = document.createElement('button');
          detailBtn.className = 'file-detail-button';
          detailBtn.type = 'button';
          detailBtn.textContent = '🔍';
          detailBtn.title = 'View file details';
          detailBtn.setAttribute('aria-label', 'View file details');
          detailBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            vscode.postMessage({ type: 'openFileDetail', uri: file.uri });
          });
          meta.appendChild(detailBtn);

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
            detailBtn.textContent = '🔍';
            detailBtn.title = 'Details';
            detailBtn.setAttribute('aria-label', 'View details');
            detailBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              vscode.postMessage({ type: 'openIssueDetail', id: issue.id });
            });
            actions.appendChild(detailBtn);

            const openBtn = document.createElement('button');
            openBtn.textContent = '📄';
            openBtn.title = 'Open file';
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
              docsBtn.textContent = '📖';
              docsBtn.title = 'Open documentation';
              docsBtn.setAttribute('aria-label', 'Open documentation');
              docsBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                vscode.postMessage({ type: 'openDocs', url: issue.docsUrl });
              });
              actions.appendChild(docsBtn);
            }

            const askAiBtn = document.createElement('button');
            askAiBtn.textContent = '✨';
            askAiBtn.title = 'Ask AI for help';
            askAiBtn.setAttribute('aria-label', 'Ask AI for help');
            askAiBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              vscode.postMessage({ 
                type: 'askGemini', 
                issue: issue.featureName + ' - ' + issue.verdictLabel,
                feature: issue.featureName,
                filePath: file.relativePath,
                findingId: issue.id
              });
            });
            actions.appendChild(askAiBtn);

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
        detailBodyNode.innerHTML = detail.html;
      }
    </script>
  </body>
</html>`;
}

export interface GeminiSupportContext {
  hasExistingSuggestion: boolean;
  suggestions: GeminiSuggestion[];
}

export function renderExistingSuggestions(suggestions: GeminiSuggestion[]): string {
  if (suggestions.length === 0) {
    return "";
  }

  const suggestionsHtml = suggestions
    .map(
      (suggestion) => `
      <div class="existing-suggestion">
        <div class="existing-suggestion-header">
          <span class="gemini-icon">✨</span>
          <span class="suggestion-timestamp">${suggestion.timestamp.toLocaleString()}</span>
        </div>
        <div class="existing-suggestion-content">${renderSimpleMarkdown(suggestion.suggestion)}</div>
      </div>
    `
    )
    .join("");

  return `
      <div class="detail-section existing-suggestions-section">
        <h4>Previous Gemini Suggestions (${suggestions.length})</h4>
        ${suggestionsHtml}
      </div>
    `;
}

export function buildIssueDetailHtml(options: {
  finding: BaselineFinding;
  severityIconUris: Record<Verdict, string>;
  target: Target;
  assets: BaselineAnalysisAssets;
  webview: vscode.Webview;
  gemini?: GeminiSupportContext;
}): string {
  const { finding, severityIconUris, target, assets, webview, gemini } = options;
  const feature = finding.feature;
  const relativePath = vscode.workspace.asRelativePath(finding.uri, false);
  const verdictLabel = formatVerdict(finding.verdict);
  const baselineSummary = formatBaselineSummary(feature);
  const baselineIcon = getBaselineIconHtml(feature, assets, webview);
  const supportTable = renderSupportTables(feature, target);
  const groups = feature.groups.map((group) => escapeHtml(group.name)).join(", ");
  const snapshots = feature.snapshots.map((snapshot) => escapeHtml(snapshot.name)).join(", ");
  const discouraged = feature.discouraged
    ? `<div class="detail-section detail-discouraged"><h4>Usage guidance</h4><p><strong>Discouraged:</strong> ${escapeHtml(
        formatDiscouraged(feature.discouraged)
      )}</p></div>`
    : "";

  const description = feature.description
    ? `<div class="detail-section"><h4>Description</h4><p>${escapeHtml(feature.description)}</p></div>`
    : "";

  const contextLines: string[] = [];
  if (groups) {
    contextLines.push(`<div><strong>Groups:</strong> ${groups}</div>`);
  }
  if (snapshots) {
    contextLines.push(`<div><strong>Snapshots:</strong> ${snapshots}</div>`);
  }

  const contextBlock = contextLines.length
    ? `<div class="detail-section"><h4>Context</h4><div class="detail-context">${contextLines.join("")}</div></div>`
    : "";

  const snippet = `<pre class="detail-code">${escapeHtml(finding.lineText)}</pre>`;

  const verdictBadge = `<span class="detail-badge ${finding.verdict}">${escapeHtml(verdictLabel)}</span>`;
  const severityIcon = `<img class="detail-icon" src="${severityIconUris[finding.verdict]}" alt="${escapeHtml(
    finding.verdict
  )}" />`;

  const location = `${escapeHtml(relativePath)} · line ${finding.range.start.line + 1}, column ${
    finding.range.start.character + 1
  }`;

  const geminiIssueContent = buildGeminiIssueContent(finding, target);
  const hasExistingSuggestion = gemini?.hasExistingSuggestion ?? false;
  const geminiButtonText = hasExistingSuggestion ? "Ask Gemini Again" : "Ask Gemini to Fix";
  const geminiButton = `<button class="detail-gemini-button" data-gemini-issue="${escapeAttribute(geminiIssueContent)}" data-feature-name="${escapeAttribute(feature.name)}" data-file-path="${escapeAttribute(relativePath)}" data-finding-id="${escapeAttribute(finding.id)}">
      <span class="gemini-icon">✨</span> ${geminiButtonText}
    </button>`;

  const docButton = feature.docsUrl
    ? `<button class="detail-doc-link" data-doc-url="${escapeAttribute(feature.docsUrl)}">Open documentation</button>`
    : "";

  const actionButtons = docButton || geminiButton
    ? `<div class="detail-section detail-actions">${docButton}${geminiButton}</div>`
    : "";

  const existingSuggestions = gemini?.suggestions ?? [];
  const suggestionsHtml = existingSuggestions.length
    ? renderExistingSuggestions(existingSuggestions)
    : "";

  return `
      <div class="detail-block">
        <header class="detail-header-block">
          ${severityIcon}
          <div>
            <div class="detail-title">${escapeHtml(feature.name)}</div>
            <div class="detail-meta">${verdictBadge} ${escapeHtml(location)}</div>
          </div>
        </header>
        <div class="detail-section">
          <h4>Summary</h4>
          <ul>
            <li>${escapeHtml(verdictLabel)} for ${escapeHtml(capitalize(target))} targets</li>
            <li>${baselineIcon} ${escapeHtml(baselineSummary)}</li>
          </ul>
        </div>
        ${description}
        ${discouraged}
        ${supportTable}
        ${contextBlock}
        <div class="detail-section">
          <h4>Code snippet</h4>
          ${snippet}
        </div>
        ${suggestionsHtml}
        ${actionButtons}
      </div>
    `;
}

export function buildFileDetailHtml(
  findings: BaselineFinding[],
  severityIconUris: Record<Verdict, string>,
  options: {
    target: Target;
    assets: BaselineAnalysisAssets;
    webview: vscode.Webview;
    getGeminiContext: (finding: BaselineFinding) => GeminiSupportContext | undefined;
  }
): string {
  const sections = findings
    .sort((a, b) => a.range.start.line - b.range.start.line)
    .map((finding, index) => {
      const anchor = `issue-${index + 1}`;
      const header =
        `<div class="detail-subtitle">Finding ${index + 1} — ${escapeHtml(formatVerdict(finding.verdict))} (line ${
          finding.range.start.line + 1
        })</div>`;
      const html = buildIssueDetailHtml({
        finding,
        severityIconUris,
        target: options.target,
        assets: options.assets,
        webview: options.webview,
        gemini: options.getGeminiContext(finding)
      });
      return `<section id="${anchor}" class="detail-entry">${header}${html}</section>`;
    });

  return sections.join("\n");
}
