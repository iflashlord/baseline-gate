import * as assert from "assert";
import { STORAGE_DIR_NAME } from "../../utils/storage";

suite("utils/storage", () => {
  test("STORAGE_DIR_NAME should be correct", () => {
    assert.strictEqual(STORAGE_DIR_NAME, '.baseline-gate');
  });

  // Note: Other storage functions require complex mocking of vscode.workspace
  // and vscode.Uri which would require additional testing infrastructure.
  // These functions are better tested through integration tests or by adding
  // a mocking library like sinon to the project dependencies.
});