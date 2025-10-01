import * as assert from "assert";
import { 
  DESKTOP_BROWSERS, 
  MOBILE_BROWSERS,
  extensionToVariant
} from "../../utils/browserUtils";

suite("utils/browserUtils", () => {
  test("DESKTOP_BROWSERS should contain expected browsers", () => {
    assert.strictEqual(DESKTOP_BROWSERS.length, 4);
    
    const browserKeys = DESKTOP_BROWSERS.map(b => b.key);
    assert.ok(browserKeys.includes("chrome"));
    assert.ok(browserKeys.includes("edge"));
    assert.ok(browserKeys.includes("firefox"));
    assert.ok(browserKeys.includes("safari"));
    
    const chromeEntry = DESKTOP_BROWSERS.find(b => b.key === "chrome");
    assert.strictEqual(chromeEntry?.label, "Chrome");
  });

  test("MOBILE_BROWSERS should contain expected browsers", () => {
    assert.strictEqual(MOBILE_BROWSERS.length, 3);
    
    const browserKeys = MOBILE_BROWSERS.map(b => b.key);
    assert.ok(browserKeys.includes("chrome_android"));
    assert.ok(browserKeys.includes("firefox_android"));
    assert.ok(browserKeys.includes("safari_ios"));
    
    const chromeAndroidEntry = MOBILE_BROWSERS.find(b => b.key === "chrome_android");
    assert.strictEqual(chromeAndroidEntry?.label, "Chrome Android");
  });

  test("extensionToVariant should map JavaScript extensions", () => {
    assert.strictEqual(extensionToVariant("js"), "js");
    assert.strictEqual(extensionToVariant("mjs"), "js");
    assert.strictEqual(extensionToVariant("cjs"), "js");
    assert.strictEqual(extensionToVariant("JS"), "js"); // Case insensitive
  });

  test("extensionToVariant should map TypeScript extensions", () => {
    assert.strictEqual(extensionToVariant("ts"), "ts");
    assert.strictEqual(extensionToVariant("tsx"), "tsx");
    assert.strictEqual(extensionToVariant("TS"), "ts"); // Case insensitive
  });

  test("extensionToVariant should map JSX extensions", () => {
    assert.strictEqual(extensionToVariant("jsx"), "jsx");
    assert.strictEqual(extensionToVariant("JSX"), "jsx"); // Case insensitive
  });

  test("extensionToVariant should map CSS extensions", () => {
    assert.strictEqual(extensionToVariant("css"), "css");
    assert.strictEqual(extensionToVariant("CSS"), "css"); // Case insensitive
  });

  test("extensionToVariant should map SCSS/SASS extensions", () => {
    assert.strictEqual(extensionToVariant("scss"), "scss");
    assert.strictEqual(extensionToVariant("sass"), "scss");
    assert.strictEqual(extensionToVariant("SCSS"), "scss"); // Case insensitive
  });

  test("extensionToVariant should return default for unknown extensions", () => {
    assert.strictEqual(extensionToVariant("html"), "default");
    assert.strictEqual(extensionToVariant("php"), "default");
    assert.strictEqual(extensionToVariant("unknown"), "default");
    assert.strictEqual(extensionToVariant(""), "default");
  });

  // Note: getFilteredBrowsers() requires mocking of extension settings
  // and is better tested through integration tests or by adding proper
  // mocking infrastructure
});