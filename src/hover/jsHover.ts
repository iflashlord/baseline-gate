import * as vscode from "vscode";
import { detectSymbolAtPosition } from "../core/detectors/detectJs";
import { resolveJsSymbolToFeatureId } from "../core/resolver";
import { getFeatureById } from "../core/baselineData";
import { scoreFeature } from "../core/scoring";
import { type Target } from "../core/targets";
import { buildFeatureHover } from "./render";

export function registerJsHover(
  context: vscode.ExtensionContext, 
  target: Target, 
  geminiProvider?: import('../gemini/geminiViewProvider').GeminiViewProvider
) {
  const assetsRoot = vscode.Uri.joinPath(context.extensionUri, "media", "baseline");
  const provider: vscode.HoverProvider = {
    provideHover(doc, position) {
      const offset = doc.offsetAt(position);
      const symbol = detectSymbolAtPosition(doc.getText(), offset);
      if (!symbol) {
        return;
      }

      const id = resolveJsSymbolToFeatureId(symbol);
      if (!id) {
        return;
      }

      const feature = getFeatureById(id);
      if (!feature) {
        return;
      }

      const verdict = scoreFeature(feature.support, target);
      
      // Create a potential finding ID based on file and symbol position
      const findingId = geminiProvider ? `${doc.uri.toString()}::${id}::${position.line}::${position.character}` : undefined;
      
      const md = buildFeatureHover(feature, verdict, target, { 
        assetsRoot,
        geminiProvider,
        findingId
      });
      return new vscode.Hover(md);
    }
  };

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      [
        { language: "javascript" },
        { language: "typescript" },
        { language: "javascriptreact" },
        { language: "typescriptreact" }
      ],
      provider
    )
  );
}
