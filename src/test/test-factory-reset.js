// Test file for factory reset functionality
// This file is just for manual testing - can be deleted after verification

console.log('Factory Reset Test');

const vscode = require('vscode');

// Test the factory reset command
async function testFactoryReset() {
  try {
    // Execute the factory reset command
    await vscode.commands.executeCommand('baseline-gate.resetToFactory');
    console.log('Factory reset command executed successfully');
  } catch (error) {
    console.error('Factory reset command failed:', error);
  }
}

// Test configuration values after reset
function testConfigurationDefaults() {
  const config = vscode.workspace.getConfiguration('baselineGate');
  
  const tests = [
    { key: 'target', expected: 'enterprise' },
    { key: 'showDesktopBrowsers', expected: true },
    { key: 'showMobileBrowsers', expected: true },
    { key: 'geminiApiKey', expected: '' },
    { key: 'geminiModel', expected: 'gemini-2.0-flash' },
    { key: 'geminiCustomPrompt', expected: '' },
    { key: 'blockedBudget', expected: 0 },
    { key: 'warningBudget', expected: 5 },
    { key: 'safeGoal', expected: 10 }
  ];

  tests.forEach(test => {
    const actual = config.get(test.key);
    const passed = actual === test.expected;
    console.log(`Config ${test.key}: ${passed ? 'PASS' : 'FAIL'} (expected: ${test.expected}, actual: ${actual})`);
  });
}

module.exports = {
  testFactoryReset,
  testConfigurationDefaults
};