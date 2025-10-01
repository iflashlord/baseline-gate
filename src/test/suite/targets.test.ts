import * as assert from "assert";
import { TARGET_MIN } from "../../core/targets";

suite("core/targets", () => {
  test("TARGET_MIN should have modern and enterprise targets", () => {
    assert.ok("modern" in TARGET_MIN);
    assert.ok("enterprise" in TARGET_MIN);
  });

  test("modern target should have expected browser versions", () => {
    const modern = TARGET_MIN.modern;
    assert.strictEqual(modern.chrome, 120);
    assert.strictEqual(modern.edge, 120);
    assert.strictEqual(modern.firefox, 120);
    assert.strictEqual(modern.safari, 17);
  });

  test("enterprise target should have expected browser versions", () => {
    const enterprise = TARGET_MIN.enterprise;
    assert.strictEqual(enterprise.chrome, 114);
    assert.strictEqual(enterprise.edge, 114);
    assert.strictEqual(enterprise.firefox, 115);
    assert.strictEqual(enterprise.safari, 16.4);
  });

  test("enterprise versions should be lower than modern versions", () => {
    const modern = TARGET_MIN.modern;
    const enterprise = TARGET_MIN.enterprise;
    
    assert.ok(enterprise.chrome! < modern.chrome!);
    assert.ok(enterprise.edge! < modern.edge!);
    assert.ok(enterprise.firefox! < modern.firefox!);
    assert.ok(enterprise.safari! < modern.safari!);
  });

  test("targets should contain all major browsers", () => {
    const expectedBrowsers = ["chrome", "edge", "firefox", "safari"];
    
    for (const target of ["modern", "enterprise"] as const) {
      const targetData = TARGET_MIN[target];
      for (const browser of expectedBrowsers) {
        assert.ok(browser in targetData, `${browser} should be in ${target} target`);
        assert.ok(typeof targetData[browser as keyof typeof targetData] === "number", 
          `${browser} version should be a number in ${target} target`);
      }
    }
  });
});