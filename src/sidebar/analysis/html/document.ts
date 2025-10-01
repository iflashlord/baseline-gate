import * as vscode from "vscode";

import { generateNonce } from "../utils";
import { getAnalysisViewStyles } from "./styles";
import { getAnalysisViewBody } from "./layout";
import { getAnalysisViewScript } from "./scriptContent";

export function renderAnalysisWebviewHtml(webview: vscode.Webview): string {
  const nonce = generateNonce();
  const styles = indent(getAnalysisViewStyles(), 6);
  const body = indent(getAnalysisViewBody(), 4);
  const script = indent(getAnalysisViewScript(), 6);

  return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
${styles}
    </style>
  </head>
  <body>
${body}
    <script nonce="${nonce}">
${script}
    </script>
  </body>
</html>`;
}

function indent(content: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return content
    .split("\n")
    .map((line) => (line.length > 0 ? `${prefix}${line}` : ""))
    .join("\n");
}
