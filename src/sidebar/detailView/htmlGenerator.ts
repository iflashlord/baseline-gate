import type { WebviewRenderContext } from "./types";
import type { FeatureWebviewRenderContext } from "./types";
import { renderDetailViewDocument, renderFeatureViewDocument } from "./html/document";

/**
 * Generates HTML content for detail view webviews
 */
export class DetailViewHtmlGenerator {
  /**
   * Generate complete webview HTML content for finding detail view
   */
  public static generateWebviewContent(
    context: WebviewRenderContext,
    detailHtml: string
  ): string {
    return renderDetailViewDocument(context, detailHtml);
  }

  /**
   * Generate complete webview HTML content for feature view
   */
  public static generateFeatureWebviewContent(
    context: FeatureWebviewRenderContext,
    detailHtml: string
  ): string {
    return renderFeatureViewDocument(context, detailHtml);
  }
}
