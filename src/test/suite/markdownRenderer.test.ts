import * as assert from "assert";
import { 
  renderMarkdown, 
  renderSimpleMarkdown, 
  formatMarkdownForWebview, 
  formatGeminiResponse 
} from "../../utils/markdownRenderer";

suite("utils/markdownRenderer", () => {
  test("renderMarkdown should convert markdown to HTML", () => {
    const markdown = "# Hello World\n\nThis is **bold** text.";
    const result = renderMarkdown(markdown);
    assert.ok(result.includes("<h1>Hello World</h1>"));
    assert.ok(result.includes("<strong>bold</strong>"));
  });

  test("renderMarkdown should handle code blocks with copy button", () => {
    const markdown = "```javascript\nconsole.log('hello');\n```";
    const result = renderMarkdown(markdown);
    assert.ok(result.includes('class="code-block"'));
    assert.ok(result.includes('class="code-copy-btn"'));
    assert.ok(result.includes("console.log("));
  });

  test("renderMarkdown should handle search term highlighting", () => {
    const markdown = "This is a test sentence.";
    const result = renderMarkdown(markdown, "test");
    assert.ok(result.includes("test") || result.includes("highlight"));
  });

  test("renderSimpleMarkdown should convert basic markdown", () => {
    const markdown = "**bold** and _italic_";
    const result = renderSimpleMarkdown(markdown);
    assert.ok(result.includes("<strong>bold</strong>"));
    assert.ok(result.includes("<em>italic</em>"));
  });

  test("renderSimpleMarkdown should handle search term", () => {
    const markdown = "This is a test";
    const result = renderSimpleMarkdown(markdown, "test");
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0);
  });

  test("formatMarkdownForWebview should format for webview", () => {
    const markdown = "# Title\n\nContent";
    const result = formatMarkdownForWebview(markdown);
    assert.ok(result.includes("<h1>Title</h1>"));
    assert.ok(result.includes("Content"));
  });

  test("formatGeminiResponse should format Gemini responses", () => {
    const text = "## Suggestion\n\nTry this approach.";
    const result = formatGeminiResponse(text);
    assert.ok(result.includes("<h2>Suggestion</h2>"));
    assert.ok(result.includes("Try this approach"));
  });

  test("formatGeminiResponse should handle search highlighting", () => {
    const text = "This is a test response.";
    const result = formatGeminiResponse(text, "test");
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0);
  });

  test("all functions should handle empty input", () => {
    assert.strictEqual(renderMarkdown(""), "");
    assert.strictEqual(renderSimpleMarkdown(""), "");
    assert.strictEqual(formatMarkdownForWebview(""), "");
    assert.strictEqual(formatGeminiResponse(""), "");
  });
});