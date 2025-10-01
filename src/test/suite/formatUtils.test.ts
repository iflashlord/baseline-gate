import * as assert from "assert";
import { 
  escapeMarkdown, 
  escapeHtml, 
  capitalize, 
  formatReleaseDate,
  dedupe,
  formatBaselineDates,
  formatTimestamp,
  getRelativePath,
  extractExtension
} from "../../utils/formatUtils";

suite("utils/formatUtils", () => {
  test("escapeMarkdown should escape special characters", () => {
    const input = "Test with *bold* and _italic_ and [link](url) and `code`";
    const result = escapeMarkdown(input);
    assert.ok(result.includes("\\*bold\\*"));
    assert.ok(result.includes("\\_italic\\_"));
    assert.ok(result.includes("\\[link\\]\\(url\\)"));
    assert.ok(result.includes("\\`code\\`"));
  });

  test("escapeMarkdown should escape angle brackets", () => {
    const input = "<script>alert('xss')</script>";
    const result = escapeMarkdown(input);
    assert.ok(result.includes("&lt;script&gt;"));
    assert.ok(result.includes("&lt;/script&gt;"));
  });

  test("escapeHtml should escape HTML special characters", () => {
    const input = '<script>alert("xss");</script>';
    const result = escapeHtml(input);
    assert.strictEqual(result, '&lt;script&gt;alert(&quot;xss&quot;);&lt;/script&gt;');
  });

  test("escapeHtml should escape ampersand", () => {
    const input = "Tom & Jerry";
    const result = escapeHtml(input);
    assert.strictEqual(result, "Tom &amp; Jerry");
  });

  test("escapeHtml should escape single quotes", () => {
    const input = "It's a test";
    const result = escapeHtml(input);
    assert.strictEqual(result, "It&#x27;s a test");
  });

  test("capitalize should capitalize first letter", () => {
    assert.strictEqual(capitalize("hello"), "Hello");
    assert.strictEqual(capitalize("WORLD"), "WORLD");
    assert.strictEqual(capitalize(""), "");
    assert.strictEqual(capitalize("a"), "A");
  });

  test("formatReleaseDate should format valid date strings", () => {
    const result = formatReleaseDate("2023-12-25");
    // Should be a formatted date, exact format may vary by locale
    assert.ok(result.includes("2023"));
    assert.ok(result.includes("Dec") || result.includes("12"));
  });

  test("formatReleaseDate should return original string for invalid dates", () => {
    const invalidDate = "not-a-date";
    const result = formatReleaseDate(invalidDate);
    assert.strictEqual(result, invalidDate);
  });

  test("formatReleaseDate should handle empty string", () => {
    const result = formatReleaseDate("");
    assert.strictEqual(result, "");
  });

  test("dedupe should remove duplicate items", () => {
    const input = ["apple", "banana", "apple", "cherry", "banana"];
    const result = dedupe(input);
    assert.deepStrictEqual(result, ["apple", "banana", "cherry"]);
  });

  test("dedupe should handle empty array", () => {
    const result = dedupe([]);
    assert.deepStrictEqual(result, []);
  });

  // Note: formatBaselineDates requires a complete BaselineFeature object
  // which has many required properties. This would need a more complex mock.
  // Consider adding a factory function for test BaselineFeature objects.

  test("formatTimestamp should format date object", () => {
    const date = new Date('2023-12-25T12:00:00Z');
    const result = formatTimestamp(date);
    assert.ok(result.includes("2023"));
    assert.ok(result.includes("12"));
  });

  test("getRelativePath should return relative path with workspace folder", () => {
    const uri = "/workspace/src/test.js";
    const workspaceFolder = "/workspace";
    const result = getRelativePath(uri, workspaceFolder);
    assert.strictEqual(result, "src/test.js");
  });

  test("getRelativePath should return filename without workspace folder", () => {
    const uri = "/some/path/test.js";
    const result = getRelativePath(uri);
    assert.strictEqual(result, "test.js");
  });

  test("extractExtension should extract file extension", () => {
    assert.strictEqual(extractExtension("test.js"), "js");
    assert.strictEqual(extractExtension("styles.css"), "css");
    assert.strictEqual(extractExtension("README.md"), "md");
    assert.strictEqual(extractExtension("no-extension"), "");
    assert.strictEqual(extractExtension(""), "");
  });
});