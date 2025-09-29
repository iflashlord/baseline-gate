import * as vscode from "vscode";
import type { BaselineFinding } from "../workspaceScanner";
import type { PanelState } from "./types";

/**
 * Manages the state of detail view panels
 */
export class DetailViewStateManager {
  private static state: PanelState = {
    currentPanel: undefined,
    currentFinding: undefined
  };

  // New state for feature-based views
  private static featureState: {
    currentPanel?: vscode.WebviewPanel;
    currentFeatureId?: string;
    currentFindings?: BaselineFinding[];
  } = {};

  /**
   * Get the current panel
   */
  public static getCurrentPanel(): vscode.WebviewPanel | undefined {
    return this.state.currentPanel;
  }

  /**
   * Get the current finding
   */
  public static getCurrentFinding(): BaselineFinding | undefined {
    return this.state.currentFinding;
  }

  /**
   * Set the current panel
   */
  public static setCurrentPanel(panel: vscode.WebviewPanel | undefined): void {
    this.state.currentPanel = panel;
  }

  /**
   * Set the current finding
   */
  public static setCurrentFinding(finding: BaselineFinding | undefined): void {
    this.state.currentFinding = finding;
  }

  /**
   * Update both panel and finding
   */
  public static updateState(panel: vscode.WebviewPanel | undefined, finding: BaselineFinding | undefined): void {
    this.state.currentPanel = panel;
    this.state.currentFinding = finding;
  }

  /**
   * Clear the current state
   */
  public static clearState(): void {
    this.state.currentPanel = undefined;
    this.state.currentFinding = undefined;
  }

  /**
   * Check if a panel is currently active
   */
  public static hasActivePanel(): boolean {
    return this.state.currentPanel !== undefined;
  }

  /**
   * Dispose the current panel and clear state
   */
  public static dispose(): void {
    if (this.state.currentPanel) {
      this.state.currentPanel.dispose();
    }
    this.clearState();
  }

  // Feature-based view methods
  
  /**
   * Get the current feature panel
   */
  public static getCurrentFeaturePanel(): vscode.WebviewPanel | undefined {
    return this.featureState.currentPanel;
  }

  /**
   * Get the current feature ID
   */
  public static getCurrentFeatureId(): string | undefined {
    return this.featureState.currentFeatureId;
  }

  /**
   * Get the current feature findings
   */
  public static getCurrentFeatureFindings(): BaselineFinding[] | undefined {
    return this.featureState.currentFindings;
  }

  /**
   * Set the current feature panel
   */
  public static setCurrentFeaturePanel(panel: vscode.WebviewPanel | undefined): void {
    this.featureState.currentPanel = panel;
  }

  /**
   * Update feature state
   */
  public static updateFeatureState(
    panel: vscode.WebviewPanel | undefined, 
    featureId: string | undefined, 
    findings: BaselineFinding[] | undefined
  ): void {
    this.featureState.currentPanel = panel;
    this.featureState.currentFeatureId = featureId;
    this.featureState.currentFindings = findings;
  }

  /**
   * Check if a feature panel is currently active
   */
  public static hasActiveFeaturePanel(): boolean {
    return this.featureState.currentPanel !== undefined;
  }

  /**
   * Clear the feature state
   */
  public static clearFeatureState(): void {
    this.featureState.currentPanel = undefined;
    this.featureState.currentFeatureId = undefined;
    this.featureState.currentFindings = undefined;
  }

  /**
   * Dispose the current feature panel and clear state
   */
  public static disposeFeature(): void {
    if (this.featureState.currentPanel) {
      this.featureState.currentPanel.dispose();
    }
    this.clearFeatureState();
  }

  /**
   * Dispose all panels and clear all state
   */
  public static disposeAll(): void {
    this.dispose();
    this.disposeFeature();
  }
}