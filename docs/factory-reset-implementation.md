# Factory Reset Feature Implementation

## Overview
Added a new configuration action that resets BaselineGate to factory settings, removing all data and configuration customizations.

## Command Details

### Command ID
`baseline-gate.resetToFactory`

### Command Title
"Reset BaselineGate to Factory Settings"

## What the Factory Reset Does

1. **Removes .baseline-gate directory** - Clears all stored data including:
   - Scan results (`latest-scan.json`)
   - Scan history (`scan-history.json`) 
   - Gemini suggestions (`gemini-suggestions.json`)

2. **Resets all configuration settings** to their default values:
   - `baselineGate.target`: `"enterprise"`
   - `baselineGate.showDesktopBrowsers`: `true`
   - `baselineGate.showMobileBrowsers`: `true`
   - `baselineGate.geminiApiKey`: `""` (empty)
   - `baselineGate.geminiModel`: `"gemini-2.0-flash"`
   - `baselineGate.geminiCustomPrompt`: `""` (empty)
   - `baselineGate.blockedBudget`: `0`
   - `baselineGate.warningBudget`: `5`
   - `baselineGate.safeGoal`: `10`

3. **Clears caches** - Removes all in-memory state and cached data

4. **Updates UI** - Refreshes the status bar and extension state

## User Experience

### Confirmation Dialog
- Shows a detailed modal warning before executing
- Lists exactly what will be reset/removed
- Requires explicit user confirmation
- Can be cancelled safely

### Warning Message Content
```
This will reset BaselineGate to factory settings:

• Remove .baseline-gate directory and all data
• Reset all configuration settings to defaults  
• Clear all caches and preferences

This action cannot be undone.
```

### Success Message
After successful reset, shows:
```
BaselineGate has been reset to factory settings. All data and configurations have been cleared.
```

### Error Handling
If the reset fails partially, shows:
```
Failed to reset to factory settings. Some settings may not have been cleared properly.
```

## Access Methods

1. **Command Palette**: Search for "Reset BaselineGate to Factory Settings"
2. **Quick Access**: Available alongside other BaselineGate commands

## Technical Implementation

### Files Modified
- `package.json`: Added command definition
- `src/extension.ts`: Implemented the factory reset logic

### Configuration Reset Strategy
- Resets workspace-level settings to defaults
- Removes user-level and global-level overrides (sets to `undefined`)
- This ensures clean slate regardless of where settings were configured

### Data Clearing Strategy
- Uses existing `analysisProvider.clearAllData()` method
- Leverages the single-source-of-truth `.baseline-gate` directory approach
- Ensures all extension data is properly cleared

## Testing Scenarios

1. **Fresh Workspace Test**: Verify factory reset works when no data exists
2. **Data Persistence Test**: Create data, reset, verify complete removal
3. **Configuration Reset Test**: Modify settings, reset, verify defaults restored
4. **Partial Failure Test**: Verify graceful handling if some operations fail
5. **Cancellation Test**: Verify no changes occur when user cancels

## Benefits

- **Complete Reset**: Unlike "Clear All Data", this also resets configuration
- **User Safety**: Requires explicit confirmation before executing
- **Comprehensive**: Handles all aspects of extension state
- **Reliable**: Uses existing, tested data clearing mechanisms
- **Transparent**: Clear communication about what will be affected