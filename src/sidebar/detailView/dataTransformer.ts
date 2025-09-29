import * as vscode from "vscode";
import type { BaselineFinding } from "../workspaceScanner";
import type { Target } from "../../core/targets";
import type { BaselineAnalysisAssets } from "../analysis/types";
import type { GeminiSupportContext } from "../analysis/html";
import type { SeverityIconUris } from "./types";
import type { Verdict } from "../../core/scoring";

/**
 * Transforms data for use in detail view rendering
 */
export class DetailViewDataTransformer {

  /**
   * Transform findings into severity icon URIs
   */
  public static createSeverityIconUris(
    webview: vscode.Webview,
    assets: BaselineAnalysisAssets
  ): SeverityIconUris {
    return {
      blocked: webview.asWebviewUri(assets.statusIcons.blocked).toString(),
      warning: webview.asWebviewUri(assets.statusIcons.warning).toString(),
      safe: webview.asWebviewUri(assets.statusIcons.safe).toString(),
    };
  }

  /**
   * Create Gemini context for a specific finding
   */
  public static createGeminiContext(
    finding: BaselineFinding,
    geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider
  ): GeminiSupportContext | undefined {
    if (!geminiProvider) {
      return undefined;
    }

    const findingId = this.generateFindingId(finding);
    const hasSuggestions = geminiProvider.hasSuggestionForFinding(findingId);
    const suggestions = hasSuggestions ? 
      geminiProvider.getSuggestionsForFinding(findingId) : [];

    return {
      hasExistingSuggestion: hasSuggestions,
      suggestions
    };
  }

  /**
   * Create Gemini context for multiple findings (file view)
   */
  public static createFileGeminiContext(
    finding: BaselineFinding,
    geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider
  ): GeminiSupportContext | undefined {
    if (!geminiProvider) {
      return undefined;
    }

    const findingId = this.generateFindingId(finding);
    const hasSuggestions = geminiProvider.hasSuggestionForFinding(findingId);
    const suggestions = hasSuggestions ? 
      geminiProvider.getSuggestionsForFinding(findingId) : [];

    return {
      hasExistingSuggestion: hasSuggestions,
      suggestions
    };
  }

  /**
   * Generate a consistent finding ID for Gemini context
   */
  public static generateFindingId(finding: BaselineFinding): string {
    const relativePath = vscode.workspace.asRelativePath(finding.uri, false);
    return `${finding.feature.name}_${relativePath}_${finding.range.start.line}`;
  }

  /**
   * Transform finding for display
   */
  public static transformFindingForDisplay(finding: BaselineFinding): {
    id: string;
    title: string;
    description: string;
    severity: Verdict;
    location: {
      file: string;
      line: number;
      character: number;
    };
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  } {
    const relativePath = vscode.workspace.asRelativePath(finding.uri, false);
    
    return {
      id: this.generateFindingId(finding),
      title: finding.feature.name,
      description: finding.feature.description || 'No description available',
      severity: finding.verdict,
      location: {
        file: relativePath,
        line: finding.range.start.line,
        character: finding.range.start.character
      },
      range: {
        start: finding.range.start,
        end: finding.range.end
      }
    };
  }

  /**
   * Transform multiple findings for file view
   */
  public static transformFindingsForFileView(findings: BaselineFinding[]): {
    file: string;
    totalFindings: number;
    severityCounts: Record<Verdict, number>;
    findings: ReturnType<typeof DetailViewDataTransformer.transformFindingForDisplay>[];
  } {
    if (findings.length === 0) {
      throw new Error('No findings provided for transformation');
    }

    const relativePath = vscode.workspace.asRelativePath(findings[0].uri, false);
    const severityCounts: Record<Verdict, number> = {
      blocked: 0,
      warning: 0,
      safe: 0
    };

    const transformedFindings = findings.map(finding => {
      severityCounts[finding.verdict]++;
      return this.transformFindingForDisplay(finding);
    });

    return {
      file: relativePath,
      totalFindings: findings.length,
      severityCounts,
      findings: transformedFindings
    };
  }

  /**
   * Create webview options for panel creation
   */
  public static createWebviewOptions(context: vscode.ExtensionContext): vscode.WebviewOptions & { retainContextWhenHidden?: boolean } {
    return {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
      retainContextWhenHidden: true
    };
  }

  /**
   * Generate panel title for single finding
   */
  public static generatePanelTitle(finding: BaselineFinding): string {
    return `Baseline Issue: ${finding.feature.name}`;
  }

  /**
   * Generate panel title for file view
   */
  public static generateFilePanelTitle(findings: BaselineFinding[]): string {
    if (findings.length === 0) {
      return 'Baseline Issues';
    }
    
    const relativePath = vscode.workspace.asRelativePath(findings[0].uri, false);
    return `Baseline Issues: ${relativePath}`;
  }

  /**
   * Generate panel title for feature view
   */
  public static generateFeaturePanelTitle(featureId: string, findings: BaselineFinding[]): string {
    if (findings.length === 0) {
      return `Feature: ${featureId}`;
    }
    
    const featureName = findings[0].feature.name;
    const occurrenceCount = findings.length;
    return `Feature: ${featureName} (${occurrenceCount} occurrence${occurrenceCount > 1 ? 's' : ''})`;
  }

  /**
   * Create view column for panel positioning
   */
  public static getViewColumn(): vscode.ViewColumn {
    return vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
  }

  /**
   * Extract file extension from URI
   */
  public static getFileExtension(uri: vscode.Uri): string {
    const path = uri.fsPath;
    const lastDot = path.lastIndexOf('.');
    return lastDot !== -1 ? path.substring(lastDot + 1) : '';
  }

  /**
   * Get language ID from file extension
   */
  public static getLanguageId(uri: vscode.Uri): string {
    const extension = this.getFileExtension(uri);
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascriptreact',
      'tsx': 'typescriptreact',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'json': 'json'
    };
    
    return languageMap[extension] || 'plaintext';
  }

  /**
   * Check if finding is in viewport
   */
  public static isFindingInViewport(
    finding: BaselineFinding,
    editor: vscode.TextEditor
  ): boolean {
    const visibleRanges = editor.visibleRanges;
    const findingRange = finding.range;
    
    return visibleRanges.some(visibleRange => 
      visibleRange.contains(findingRange) || 
      visibleRange.intersection(findingRange) !== undefined
    );
  }

  /**
   * Sort findings by severity and line number
   */
  public static sortFindings(findings: BaselineFinding[]): BaselineFinding[] {
    const severityOrder: Record<Verdict, number> = {
      blocked: 0,
      warning: 1,
      safe: 2
    };

    return [...findings].sort((a, b) => {
      // First sort by severity
      const severityDiff = severityOrder[a.verdict] - severityOrder[b.verdict];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      
      // Then sort by line number
      return a.range.start.line - b.range.start.line;
    });
  }
}