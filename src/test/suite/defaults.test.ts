import * as assert from "assert";
import { DEFAULT_TARGET } from "../../config/defaults";

suite("config/defaults", () => {
  test("DEFAULT_TARGET should be enterprise", () => {
    assert.strictEqual(DEFAULT_TARGET, "enterprise");
  });

  test("DEFAULT_TARGET should be a valid target type", () => {
    const validTargets = ["modern", "enterprise"];
    assert.ok(validTargets.includes(DEFAULT_TARGET), `DEFAULT_TARGET should be one of: ${validTargets.join(", ")}`);
  });
});