import * as vscode from "vscode";
import type { BaselineFinding } from "../workspaceScanner";
import type { Target } from "../../core/targets";
import type { BaselineAnalysisAssets } from "../analysis/types";
import type { GeminiSupportContext } from "../analysis/html";
import type { GeminiSuggestion } from "../../gemini/geminiService";
import type { Verdict } from "../../core/scoring";

/**
 * Configuration for creating or updating detail view panels
 */
export interface DetailViewConfig {
  context: vscode.ExtensionContext;
  finding: BaselineFinding;
  target: Target;
  assets: BaselineAnalysisAssets;
  geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider;
}

/**
 * Configuration for creating file detail views
 */
export interface FileDetailViewConfig {
  context: vscode.ExtensionContext;
  findings: BaselineFinding[];
  target: Target;
  assets: BaselineAnalysisAssets;
  geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider;
}

/**
 * Message types that can be received from the webview
 */
export type DetailViewMessage =
  | { type: 'openFile'; uri: string; start: { line: number; character: number }; end: { line: number; character: number } }
  | { type: 'openDocs'; url: string }
  | { type: 'askGemini'; issue: string; feature: string; findingId: string }
  | { type: 'askGeminiFollowUp'; question: string; findingId: string; feature: string; filePath: string; target: string }
  | { type: 'copyCodeSnippet'; code: string }
  | { type: 'refresh' };

/**
 * Context for rendering webview content
 */
export interface WebviewRenderContext {
  webview: vscode.Webview;
  finding: BaselineFinding;
  target: Target;
  assets: BaselineAnalysisAssets;
  geminiContext?: GeminiSupportContext;
}

/**
 * Context for rendering file detail content
 */
export interface FileWebviewRenderContext {
  webview: vscode.Webview;
  findings: BaselineFinding[];
  target: Target;
  assets: BaselineAnalysisAssets;
  geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider;
}

/**
 * Severity icon URIs mapping
 */
export type SeverityIconUris = Record<Verdict, string>;

/**
 * Panel state management interface
 */
export interface PanelState {
  currentPanel?: vscode.WebviewPanel;
  currentFinding?: BaselineFinding;
}

/**
 * HTML generation options
 */
export interface HtmlGenerationOptions {
  nonce: string;
  relativePath: string;
  detailHtml: string;
  geminiContext?: GeminiSupportContext;
}