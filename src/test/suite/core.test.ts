import * as assert from "assert";
import { scoreFeature } from "../../core/scoring";
import { resolveJsSymbolToFeatureId, resolveCssToFeatureId } from "../../core/resolver";
import { detectSymbolAtPosition } from "../../core/detectors/detectJs";
import { detectCssTokenAtPosition } from "../../core/detectors/detectCss";
import { getFeatureById } from "../../core/baselineData";

const v = (version: number) => ({ raw: version.toString(), version });

suite("core scoring", () => {
  test("returns safe when support meets the target", () => {
    const verdict = scoreFeature({ chrome: v(130), edge: v(130), firefox: v(130), safari: v(18) }, "modern");
    assert.strictEqual(verdict, "safe");
  });

  test("handles enterprise thresholds at boundary", () => {
    const verdict = scoreFeature({ chrome: v(114), edge: v(114), firefox: v(115), safari: v(16.4) }, "enterprise");
    assert.strictEqual(verdict, "safe");
  });

  test("returns warning when browser data is missing", () => {
    const verdict = scoreFeature({ chrome: v(130), firefox: v(130) }, "modern");
    assert.strictEqual(verdict, "warning");
  });

  test("returns blocked when a browser is below the target", () => {
    const verdict = scoreFeature({ chrome: v(110), edge: v(110), firefox: v(119), safari: v(17) }, "modern");
    assert.strictEqual(verdict, "blocked");
  });
});

suite("feature resolution", () => {
  test("resolves known JavaScript symbols", () => {
    assert.strictEqual(resolveJsSymbolToFeatureId("navigator.clipboard"), "async-clipboard");
    assert.strictEqual(resolveJsSymbolToFeatureId("URL.canParse"), "url-canparse");
    assert.strictEqual(resolveJsSymbolToFeatureId("Promise.any"), "promise-any");
    assert.strictEqual(resolveJsSymbolToFeatureId("unknown"), null);
  });

  test("resolves known CSS tokens", () => {
    assert.strictEqual(resolveCssToFeatureId(":has"), "has");
    assert.strictEqual(resolveCssToFeatureId("@container"), "container-queries");
    assert.strictEqual(resolveCssToFeatureId("text-wrap"), "text-wrap");
    assert.strictEqual(resolveCssToFeatureId("unknown"), null);
  });
});

suite("detectors", () => {
  test("detects symbols around the cursor location", () => {
    const source = "const result = navigator.clipboard.readText();";
    const offset = source.indexOf("clipboard") + 2;
    assert.strictEqual(detectSymbolAtPosition(source, offset), "navigator.clipboard");
  });

  test("detects Promise and URL helpers", () => {
    const promiseSource = "await Promise.any(tasks);";
    const promiseOffset = promiseSource.indexOf("Promise.any") + 3;
    assert.strictEqual(detectSymbolAtPosition(promiseSource, promiseOffset), "Promise.any");

    const urlSource = "if (URL.canParse(url)) { /* ... */ }";
    const urlOffset = urlSource.indexOf("URL.canParse") + 2;
    assert.strictEqual(detectSymbolAtPosition(urlSource, urlOffset), "URL.canParse");
  });

  test("detects css tokens within a small window", () => {
    const css = "main:has(article) { text-wrap: balance; }";
    const hasOffset = css.indexOf(":has") + 2;
    assert.strictEqual(detectCssTokenAtPosition(css, hasOffset), ":has");

    const wrapOffset = css.indexOf("text-wrap") + 1;
    assert.strictEqual(detectCssTokenAtPosition(css, wrapOffset), "text-wrap");
  });

  test("detects container queries token", () => {
    const css = "@container style(--card) { color: red; }";
    const offset = css.indexOf("@container") + 3;
    assert.strictEqual(detectCssTokenAtPosition(css, offset), "@container");
  });

  test("returns null when no known token surrounds the cursor", () => {
    const source = "const value = Math.random();";
    const offset = source.indexOf("Math") + 1;
    assert.strictEqual(detectSymbolAtPosition(source, offset), null);

    const css = "main { color: red; }";
    const cssOffset = css.indexOf("color") + 1;
    assert.strictEqual(detectCssTokenAtPosition(css, cssOffset), null);
  });
});

suite("baseline data", () => {
  test("loads known features from the dataset", () => {
    const feature = getFeatureById("async-clipboard");
    assert.ok(feature, "feature should be found");
    assert.strictEqual(feature?.id, "async-clipboard");
    assert.ok(feature?.name.length);
  });

  test("resolves moved entries", () => {
    const feature = getFeatureById("numeric-seperators");
    assert.ok(feature);
    assert.strictEqual(feature?.id, "numeric-separators");
    assert.strictEqual(feature?.baseline, "high");
    assert.match(feature?.docsUrl ?? "", /^https:\/\/tc39\.es/);
  });

  test("resolves split entries to the first valid target", () => {
    const feature = getFeatureById("single-color-gradients");
    assert.ok(feature);
    assert.strictEqual(feature?.id, "gradients");
  });

  test("returns null for unknown ids", () => {
    assert.strictEqual(getFeatureById("made-up-feature"), null);
  });

  test("features outside baseline are marked as null", () => {
    const feature = getFeatureById("accelerometer");
    assert.ok(feature);
    assert.strictEqual(feature?.baseline, null);
  });
});
