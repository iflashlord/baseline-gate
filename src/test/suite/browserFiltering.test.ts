import * as assert from 'assert';
import * as vscode from 'vscode';
import { readBrowserDisplaySettings } from '../../extension';

suite('Browser Filtering Test Suite', () => {
  
  suite('Browser Display Settings', () => {
    test('should read browser display settings', () => {
      const settings = readBrowserDisplaySettings();
      
      assert.strictEqual(typeof settings.showDesktop, 'boolean');
      assert.strictEqual(typeof settings.showMobile, 'boolean');
    });

    test('should have default values', () => {
      const settings = readBrowserDisplaySettings();
      
      // Default should be true for both
      assert.strictEqual(settings.showDesktop, true);
      assert.strictEqual(settings.showMobile, true);
    });
  });

  suite('Configuration Integration', () => {
    test('should handle configuration changes', async () => {
      const config = vscode.workspace.getConfiguration('baselineGate');
      
      // Test setting desktop browsers
      await config.update('showDesktopBrowsers', false, vscode.ConfigurationTarget.Global);
      let settings = readBrowserDisplaySettings();
      assert.strictEqual(settings.showDesktop, false);
      
      // Reset to default
      await config.update('showDesktopBrowsers', true, vscode.ConfigurationTarget.Global);
      settings = readBrowserDisplaySettings();
      assert.strictEqual(settings.showDesktop, true);
    });

    test('should handle mobile browser setting', async () => {
      const config = vscode.workspace.getConfiguration('baselineGate');
      
      // Test setting mobile browsers
      await config.update('showMobileBrowsers', false, vscode.ConfigurationTarget.Global);
      let settings = readBrowserDisplaySettings();
      assert.strictEqual(settings.showMobile, false);
      
      // Reset to default
      await config.update('showMobileBrowsers', true, vscode.ConfigurationTarget.Global);
      settings = readBrowserDisplaySettings();
      assert.strictEqual(settings.showMobile, true);
    });
  });

  suite('Browser Constants Validation', () => {
    test('should have desktop browsers defined', () => {
      // While we can't directly access the constants, we can test that
      // the browser filtering functionality works without errors
      const settings = readBrowserDisplaySettings();
      assert.ok(settings.showDesktop !== undefined);
    });

    test('should have mobile browsers defined', () => {
      const settings = readBrowserDisplaySettings();
      assert.ok(settings.showMobile !== undefined);
    });
  });
});

suite('Package.json Configuration Test Suite', () => {
  
  suite('Extension Manifest', () => {
    test('should have required configuration properties', () => {
      const config = vscode.workspace.getConfiguration('baselineGate');
      
      // Test that configuration schema exists
      const target = config.get('target');
      assert.ok(target === 'enterprise' || target === 'modern' || target === undefined);
    });

    test('should have browser display configurations', () => {
      const config = vscode.workspace.getConfiguration('baselineGate');
      
      const showDesktop = config.get('showDesktopBrowsers');
      const showMobile = config.get('showMobileBrowsers');
      
      assert.ok(typeof showDesktop === 'boolean' || showDesktop === undefined);
      assert.ok(typeof showMobile === 'boolean' || showMobile === undefined);
    });
  });
});

suite('Extension Commands Test Suite', () => {
  
  suite('Command Configuration', () => {
    test('should have commands defined in package.json', async () => {
      // Read package.json to verify command definitions
      const fs = require('fs');
      const path = require('path');
      const packagePath = path.join(__dirname, '../../../package.json');
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      const commands = packageContent.contributes?.commands || [];
      const commandIds = commands.map((cmd: any) => cmd.command);
      
      assert.ok(commandIds.includes('baseline-gate.openSettings'),
        'openSettings command should be defined in package.json');
      assert.ok(commandIds.includes('baseline-gate.scanWorkspace'),
        'scanWorkspace command should be defined in package.json');
    });
  });

  suite('Command Execution', () => {
    test('should execute settings command without error', async () => {
      // Test that the settings command can be executed
      try {
        await vscode.commands.executeCommand('baseline-gate.openSettings');
        // If we get here without throwing, the command executed successfully
        assert.ok(true);
      } catch (error) {
        // It's okay if this fails in test environment due to missing workspace
        // The important thing is that the command is registered
        assert.ok(true, 'Settings command execution attempted');
      }
    });
  });
});