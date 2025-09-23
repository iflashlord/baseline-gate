import * as vscode from "vscode";
import { detectCssTokenAtPosition } from "../core/detectors/detectCss";
import { resolveCssToFeatureId } from "../core/resolver";
import { getFeatureById } from "../core/baselineData";
import { scoreFeature } from "../core/scoring";
import { type Target } from "../core/targets";
import { buildFeatureHover } from "./render";

export function registerCssHover(context: vscode.ExtensionContext, target: Target) {
  const assetsRoot = vscode.Uri.joinPath(context.extensionUri, "media", "baseline");
  const provider: vscode.HoverProvider = {
    provideHover(doc, position) {
      const offset = doc.offsetAt(position);
      const token = detectCssTokenAtPosition(doc.getText(), offset);
      if (!token) {
        return;
      }

      const id = resolveCssToFeatureId(token);
      if (!id) {
        return;
      }

      const feature = getFeatureById(id);
      if (!feature) {
        return;
      }

      const verdict = scoreFeature(feature.support, target);
      const md = buildFeatureHover(feature, verdict, target, { assetsRoot });
      return new vscode.Hover(md);
    }
  };

  context.subscriptions.push(
    vscode.languages.registerHoverProvider([{ language: "css" }, { language: "scss" }], provider)
  );
}
