import * as vscode from "vscode";

export interface HoverRenderOptions {
  assetsRoot?: vscode.Uri;
  geminiProvider?: import('../../gemini/geminiViewProvider').GeminiViewProvider;
  findingId?: string; // Optional finding ID to check for existing suggestions
}