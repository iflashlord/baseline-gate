import * as vscode from "vscode";

import type { BaselineFinding } from "../../workspaceScanner";
import type { Target } from "../../../core/targets";
import { DetailViewUtils } from "../utils";
import type {
  HtmlGenerationOptions,
  WebviewRenderContext,
  FeatureWebviewRenderContext
} from "../types";
import {
  buildDetailViewBody,
  buildFeatureViewBody
} from "./body";
import {
  getDetailViewStyles,
  getDetailViewFeatureStyles
} from "./styles";
import { getDetailViewScript } from "./scriptContent";

export function renderDetailViewDocument(
  context: WebviewRenderContext,
  detailHtml: string
): string {
  const nonce = DetailViewUtils.generateNonce();
  const relativePath = vscode.workspace.asRelativePath(context.finding.uri, false);

  const options: HtmlGenerationOptions = {
    nonce,
    relativePath,
    detailHtml,
    geminiContext: context.geminiContext
  };

  return buildHtmlDocument(options, context.finding, context.target, context.webview);
}

export function renderFeatureViewDocument(
  context: FeatureWebviewRenderContext,
  detailHtml: string
): string {
  const nonce = DetailViewUtils.generateNonce();
  const featureName = context.findings[0]?.feature?.name || context.featureId;

  const options: HtmlGenerationOptions = {
    nonce,
    relativePath: `Feature: ${featureName}`,
    detailHtml
  };

  return buildFeatureHtmlDocument(options, context, context.webview);
}

function buildHtmlDocument(
  options: HtmlGenerationOptions,
  finding: BaselineFinding,
  target: Target,
  webview: vscode.Webview
): string {
  const { nonce, relativePath, detailHtml, geminiContext } = options;
  const styles = indent(getDetailViewStyles(), 4);
  const body = indent(
    buildDetailViewBody(detailHtml, finding, relativePath, target, geminiContext),
    4
  );
  const script = indent(getDetailViewScript(), 8);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    ${generateHtmlHead(nonce, webview, finding)}
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

function buildFeatureHtmlDocument(
  options: HtmlGenerationOptions,
  context: FeatureWebviewRenderContext,
  webview: vscode.Webview
): string {
  const { nonce, detailHtml } = options;
  const finding = context.findings[0];
  const styles = indent(getDetailViewStyles(), 4);
  const featureStyles = indent(getDetailViewFeatureStyles(), 4);
  const body = indent(buildFeatureViewBody(detailHtml), 4);
  const script = indent(getDetailViewScript(), 8);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    ${finding ? generateHtmlHead(nonce, webview, finding) : generateFallbackHead(nonce, webview)}
    <style>
${styles}
    </style>
    <style>
${featureStyles}
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

function generateHtmlHead(
  nonce: string,
  webview: vscode.Webview,
  finding: BaselineFinding
): string {
  return `
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Baseline Issue: ${DetailViewUtils.escapeHtml(finding.feature.name)}</title>`;
}

function generateFallbackHead(
  nonce: string,
  webview: vscode.Webview
): string {
  return `
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Baseline Feature</title>`;
}

function indent(content: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return content
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : ""))
    .join("\n");
}
