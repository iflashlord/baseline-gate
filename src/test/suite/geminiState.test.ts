import * as assert from "assert";
import * as vscode from "vscode";
import { 
  GEMINI_SUGGESTIONS_KEY, 
  GEMINI_SUGGESTIONS_FILE,
  initializeSuggestionState,
  parseStoredSuggestions,
  persistSuggestions
} from "../../gemini/state";

suite("gemini/state", () => {
  test("GEMINI_SUGGESTIONS_KEY should be correct", () => {
    assert.strictEqual(GEMINI_SUGGESTIONS_KEY, "geminiSuggestions");
  });

  test("GEMINI_SUGGESTIONS_FILE should be correct", () => {
    assert.strictEqual(GEMINI_SUGGESTIONS_FILE, "gemini-suggestions.json");
  });

  test("parseStoredSuggestions should return empty array for non-array input", () => {
    assert.deepStrictEqual(parseStoredSuggestions(null), []);
    assert.deepStrictEqual(parseStoredSuggestions(undefined), []);
    assert.deepStrictEqual(parseStoredSuggestions("string"), []);
    assert.deepStrictEqual(parseStoredSuggestions(123), []);
    assert.deepStrictEqual(parseStoredSuggestions({}), []);
  });

  test("parseStoredSuggestions should filter invalid entries", () => {
    const input = [
      null,
      undefined,
      "string",
      123,
      { id: "valid-1", issue: "Test issue", suggestion: "Test suggestion", status: "success", timestamp: new Date() },
      { id: "", issue: "Test", suggestion: "Test", status: "success" }, // Invalid: empty id
      { status: "success" }, // Invalid: missing id
      { id: "valid-2", issue: "Test issue 2", suggestion: "Test suggestion 2", status: "success", timestamp: "2023-01-01" }
    ];
    
    const result = parseStoredSuggestions(input);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].id, "valid-1");
    assert.strictEqual(result[1].id, "valid-2");
  });

  test("parseStoredSuggestions should normalize timestamp strings to Date objects", () => {
    const input = [
      { id: "test-1", issue: "Test issue", suggestion: "Test suggestion", status: "success", timestamp: "2023-01-01T12:00:00Z" }
    ];
    
    const result = parseStoredSuggestions(input);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].timestamp instanceof Date);
  });

  test("parseStoredSuggestions should preserve Date objects", () => {
    const date = new Date();
    const input = [
      { id: "test-1", issue: "Test issue", suggestion: "Test suggestion", status: "success", timestamp: date }
    ];
    
    const result = parseStoredSuggestions(input);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].timestamp, date);
  });

  test("parseStoredSuggestions should handle user messages with empty suggestion", () => {
    const input = [
      { id: "user-1", issue: "User question", suggestion: "", status: "user", timestamp: new Date() }
    ];
    
    const result = parseStoredSuggestions(input);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, "user-1");
    assert.strictEqual(result[0].status, "user");
  });

  test("initializeSuggestionState should initialize with empty state", () => {
    // Create a mock context for production mode
    const mockContext = {
      extensionMode: vscode.ExtensionMode.Production,
      workspaceState: {
        get: () => []
      }
    } as any;

    const state = initializeSuggestionState(mockContext);
    
    assert.deepStrictEqual(state.suggestions, []);
    assert.deepStrictEqual(state.filteredSuggestions, []);
    assert.strictEqual(state.searchQuery, "");
    assert.strictEqual(state.originalSearchQuery, "");
  });

  test("initializeSuggestionState should use workspace state in test mode", () => {
    const testSuggestions = [
      { id: "test-1", issue: "Test issue", suggestion: "Test suggestion", status: "success", timestamp: new Date() }
    ];
    
    const mockContext = {
      extensionMode: vscode.ExtensionMode.Test,
      workspaceState: {
        get: (key: string, defaultValue: any) => key === 'geminiSuggestions' ? testSuggestions : defaultValue
      }
    } as any;

    const state = initializeSuggestionState(mockContext);
    
    assert.strictEqual(state.suggestions.length, 1);
    assert.strictEqual(state.suggestions[0].id, "test-1");
    assert.strictEqual(state.filteredSuggestions.length, 1);
  });

  // Note: persistSuggestions requires complex mocking of storage functions
  // and is better tested through integration tests
});