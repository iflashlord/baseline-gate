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
}