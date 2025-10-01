import * as assert from "assert";
import { 
  generateNonce, 
  sameSet, 
  normalizeToDate, 
  getFileName,
  highlightHtml
} from "../../utils/commonUtils";

suite("utils/commonUtils", () => {
  test("generateNonce should return 32-character string", () => {
    const nonce = generateNonce();
    assert.strictEqual(nonce.length, 32);
  });

  test("generateNonce should return different values", () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();
    assert.notStrictEqual(nonce1, nonce2);
  });

  test("generateNonce should contain only valid characters", () => {
    const nonce = generateNonce();
    const validChars = /^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]+$/;
    assert.ok(validChars.test(nonce));
  });

  test("sameSet should return true for identical sets", () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2, 3]);
    assert.ok(sameSet(set1, set2));
  });

  test("sameSet should return true for same sets in different order", () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([3, 1, 2]);
    assert.ok(sameSet(set1, set2));
  });

  test("sameSet should return false for different sets", () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2, 4]);
    assert.ok(!sameSet(set1, set2));
  });

  test("sameSet should return false for sets of different sizes", () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2]);
    assert.ok(!sameSet(set1, set2));
  });

  test("sameSet should return true for empty sets", () => {
    const set1 = new Set();
    const set2 = new Set();
    assert.ok(sameSet(set1, set2));
  });

  test("normalizeToDate should return Date object for string input", () => {
    const dateString = "2023-12-25";
    const result = normalizeToDate(dateString);
    assert.ok(result instanceof Date);
    assert.strictEqual(result.getFullYear(), 2023);
  });

  test("normalizeToDate should return same Date object for Date input", () => {
    const date = new Date("2023-12-25");
    const result = normalizeToDate(date);
    assert.strictEqual(result, date);
  });

  test("getFileName should extract filename from Unix path", () => {
    const path = "/path/to/file.txt";
    const result = getFileName(path);
    assert.strictEqual(result, "file.txt");
  });

  test("getFileName should extract filename from Windows path", () => {
    const path = "C:\\path\\to\\file.txt";
    const result = getFileName(path);
    assert.strictEqual(result, "file.txt");
  });

  test("getFileName should handle filename without path", () => {
    const path = "file.txt";
    const result = getFileName(path);
    assert.strictEqual(result, "file.txt");
  });

  test("getFileName should return original string if no filename found", () => {
    const path = "/path/to/";
    const result = getFileName(path);
    assert.strictEqual(result, path);
  });

  test("highlightHtml should highlight matching text", () => {
    const text = "Hello world";
    const highlight = "world";
    const result = highlightHtml(text, highlight);
    assert.ok(result.includes('<span class="highlight">world</span>'));
    assert.ok(result.includes("Hello"));
  });

  test("highlightHtml should use custom class name", () => {
    const text = "Hello world";
    const highlight = "world";
    const result = highlightHtml(text, highlight, "custom-highlight");
    assert.ok(result.includes('<span class="custom-highlight">world</span>'));
  });

  test("highlightHtml should handle empty highlight", () => {
    const text = "Hello world";
    const highlight = "";
    const result = highlightHtml(text, highlight);
    assert.strictEqual(result, text);
  });

  test("highlightHtml should handle whitespace-only highlight", () => {
    const text = "Hello world";
    const highlight = "   ";
    const result = highlightHtml(text, highlight);
    assert.strictEqual(result, text);
  });

  test("highlightHtml should be case insensitive", () => {
    const text = "Hello World";
    const highlight = "world";
    const result = highlightHtml(text, highlight);
    assert.ok(result.includes('<span class="highlight">World</span>'));
  });
});