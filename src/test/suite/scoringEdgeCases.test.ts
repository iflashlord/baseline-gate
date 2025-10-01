import * as assert from "assert";
import { scoreFeature } from "../../core/scoring";

suite("core/scoring - additional edge cases", () => {
  const v = (version: number) => ({ raw: version.toString(), version });

  test("should handle partial browser support correctly", () => {
    // Only some browsers have data
    const supportMatrix = {
      chrome: v(120),
      edge: v(120),
      // firefox and safari missing
    };
    
    const verdict = scoreFeature(supportMatrix, "modern");
    assert.strictEqual(verdict, "warning", "Missing browser data should result in warning");
  });

  test("should handle zero version numbers", () => {
    const supportMatrix = {
      chrome: v(0),
      edge: v(120),
      firefox: v(120),
      safari: v(17)
    };
    
    const verdict = scoreFeature(supportMatrix, "modern");
    assert.strictEqual(verdict, "blocked", "Version 0 should be blocked");
  });

  test("should handle negative version numbers", () => {
    const supportMatrix = {
      chrome: v(-1),
      edge: v(120),
      firefox: v(120),
      safari: v(17)
    };
    
    const verdict = scoreFeature(supportMatrix, "modern");
    assert.strictEqual(verdict, "blocked", "Negative version should be blocked");
  });

  test("should handle decimal versions correctly", () => {
    const supportMatrix = {
      chrome: v(120.5),
      edge: v(120.1),
      firefox: v(120.9),
      safari: v(17.2)
    };
    
    const verdict = scoreFeature(supportMatrix, "modern");
    assert.strictEqual(verdict, "safe", "Decimal versions above threshold should be safe");
  });

  test("should handle exact threshold versions", () => {
    // Enterprise thresholds: chrome: 114, edge: 114, firefox: 115, safari: 16.4
    const supportMatrix = {
      chrome: v(114),
      edge: v(114),
      firefox: v(115),
      safari: v(16.4)
    };
    
    const verdict = scoreFeature(supportMatrix, "enterprise");
    assert.strictEqual(verdict, "safe", "Exact threshold versions should be safe");
  });

  test("should handle just below threshold versions", () => {
    const supportMatrix = {
      chrome: v(113.99),
      edge: v(114),
      firefox: v(115),
      safari: v(16.4)
    };
    
    const verdict = scoreFeature(supportMatrix, "enterprise");
    assert.strictEqual(verdict, "blocked", "Just below threshold should be blocked");
  });

  test("should handle mixed support scenarios", () => {
    const supportMatrix = {
      chrome: v(130), // Way above threshold
      edge: v(110),   // Below threshold
      firefox: v(125), // Above threshold
      safari: v(18)   // Above threshold
    };
    
    const verdict = scoreFeature(supportMatrix, "modern");
    assert.strictEqual(verdict, "blocked", "Any browser below threshold should block");
  });

  test("should handle empty support matrix", () => {
    const supportMatrix = {};
    
    const verdict = scoreFeature(supportMatrix, "modern");
    assert.strictEqual(verdict, "warning", "Empty support matrix should result in warning");
  });

  test("should handle support matrix with null/undefined values", () => {
    const supportMatrix = {
      chrome: v(120),
      edge: null as any,
      firefox: undefined as any,
      safari: v(17)
    };
    
    const verdict = scoreFeature(supportMatrix, "modern");
    assert.strictEqual(verdict, "warning", "Null/undefined browser data should result in warning");
  });

  test("should handle support matrix with invalid version objects", () => {
    const supportMatrix = {
      chrome: { raw: "120", version: 120 },
      edge: { raw: "invalid" }, // Missing version property
      firefox: { version: 120 }, // Missing raw property (but version is what matters)
      safari: { raw: "17", version: 17 }
    };
    
    const verdict = scoreFeature(supportMatrix, "modern");
    assert.strictEqual(verdict, "warning", "Invalid version objects should result in warning");
  });

  test("should handle very large version numbers", () => {
    const supportMatrix = {
      chrome: v(999999),
      edge: v(999999),
      firefox: v(999999),
      safari: v(999999)
    };
    
    const verdict = scoreFeature(supportMatrix, "modern");
    assert.strictEqual(verdict, "safe", "Very large versions should be safe");
  });
});