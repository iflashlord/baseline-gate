import * as assert from "assert";
import { 
  escapeRegExp,
  buildSearchPatterns,
  highlightText,
  highlightHtml,
  formatTimestamp,
  getNonce,
  escapeHtml,
  normalizeToDate,
  getFileName
} from "../../gemini/utils";

suite("gemini/utils", () => {
  test("escapeRegExp should escape special regex characters", () => {
    const input = "Hello [world] (test) $100 ^start *any .dot? +plus |or {}braces";
    const result = escapeRegExp(input);
    // Should escape all special regex characters
    assert.ok(result.includes("\\[world\\]"));
    assert.ok(result.includes("\\(test\\)"));
    assert.ok(result.includes("\\$100"));
    assert.ok(result.includes("\\^start"));
    assert.ok(result.includes("\\*any"));
    assert.ok(result.includes("\\.dot\\?"));
    assert.ok(result.includes("\\+plus"));
    assert.ok(result.includes("\\|or"));
    assert.ok(result.includes("\\{\\}braces"));
  });

  test("buildSearchPatterns should create regex patterns from query", () => {
    const patterns = buildSearchPatterns("hello world");
    assert.strictEqual(patterns.length, 2);
    
    // Should be case insensitive
    assert.ok(patterns[0].test("Hello"));
    assert.ok(patterns[1].test("WORLD"));
  });

  test("buildSearchPatterns should handle empty query", () => {
    assert.deepStrictEqual(buildSearchPatterns(""), []);
    assert.deepStrictEqual(buildSearchPatterns("   "), []);
    assert.deepStrictEqual(buildSearchPatterns(undefined), []);
  });

  test("buildSearchPatterns should remove duplicate terms", () => {
    const patterns = buildSearchPatterns("hello hello world hello");
    assert.strictEqual(patterns.length, 2); // Only unique terms
  });

  test("buildSearchPatterns should handle special characters in query", () => {
    const patterns = buildSearchPatterns("test.js [bracket]");
    assert.strictEqual(patterns.length, 2);
    
    // Should match literally, not as regex
    assert.ok(patterns[0].test("test.js"));
    assert.ok(!patterns[0].test("testXjs")); // . should not match any character
  });

  test("highlightText should highlight matching terms", () => {
    const result = highlightText("Hello world", "world");
    assert.ok(result.includes("<mark>world</mark>"));
    assert.ok(result.includes("Hello"));
  });

  test("highlightText should escape HTML in input", () => {
    const result = highlightText("<script>alert('xss')</script>", "script");
    // Should have escaped HTML
    assert.ok(result.includes("&lt;") && result.includes("&gt;"));
    // Should highlight the word "script" within the escaped content
    assert.ok(result.includes("<mark>script</mark>"));
  });

  test("highlightText should handle multiple terms", () => {
    const result = highlightText("Hello beautiful world", "hello world");
    assert.ok(result.includes("<mark>Hello</mark>"));
    assert.ok(result.includes("<mark>world</mark>"));
    assert.ok(result.includes("beautiful")); // Unchanged
  });

  test("highlightText should handle empty query", () => {
    const text = "Hello world";
    const result = highlightText(text, "");
    assert.strictEqual(result, escapeHtml(text));
  });

  test("highlightHtml should highlight within HTML content", () => {
    const html = "<p>Hello world</p><div>Another world</div>";
    const result = highlightHtml(html, "world");
    
    assert.ok(result.includes("<p>Hello <mark>world</mark></p>"));
    assert.ok(result.includes("<div>Another <mark>world</mark></div>"));
  });

  test("highlightHtml should not highlight HTML tags", () => {
    const html = "<div class='world'>Content</div>";
    const result = highlightHtml(html, "world");
    
    // Should not highlight in the class attribute
    assert.ok(result.includes("class='world'"));
    // Should highlight in content (if any matching text was there)
  });

  test("highlightHtml should handle empty query", () => {
    const html = "<p>Hello world</p>";
    const result = highlightHtml(html, "");
    assert.strictEqual(result, html);
  });

  test("formatTimestamp should format valid date", () => {
    const date = new Date('2023-12-25T12:00:00Z');
    const result = formatTimestamp(date);
    
    assert.ok(result.display.includes("2023"));
    assert.strictEqual(result.iso, "2023-12-25T12:00:00.000Z");
  });

  test("formatTimestamp should format date string", () => {
    const result = formatTimestamp("2023-12-25T12:00:00Z");
    
    assert.ok(result.display.includes("2023"));
    assert.strictEqual(result.iso, "2023-12-25T12:00:00.000Z");
  });

  test("formatTimestamp should handle invalid date", () => {
    const result = formatTimestamp("invalid-date");
    
    assert.strictEqual(result.display, "Unknown date");
    assert.strictEqual(result.iso, "");
  });

  test("re-exported utility functions should work", () => {
    // Test getNonce (alias for generateNonce)
    const nonce = getNonce();
    assert.strictEqual(nonce.length, 32);
    
    // Test escapeHtml
    const escaped = escapeHtml("<script>");
    assert.strictEqual(escaped, "&lt;script&gt;");
    
    // Test normalizeToDate
    const date = normalizeToDate("2023-01-01");
    assert.ok(date instanceof Date);
    
    // Test getFileName
    const filename = getFileName("/path/to/file.txt");
    assert.strictEqual(filename, "file.txt");
  });
});