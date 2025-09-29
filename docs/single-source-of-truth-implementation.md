# BaselineGate Single Source of Truth Implementation

## Overview
This implementation ensures that **`.baseline-gate` directory** is the **only source of truth** for all BaselineGate extension data. When this directory is removed, the extension will start completely fresh with no persisted data from previous sessions.

## Changes Made

### 1. Updated Storage Utilities (`src/utils/storage.ts`)
- **Added** `deleteStorageFile()` - Delete individual files from storage
- **Added** `storageDirectoryExists()` - Check if `.baseline-gate` directory exists
- **Added** `clearStorageDirectory()` - Remove entire `.baseline-gate` directory and all contents

### 2. Modified Gemini State Management (`src/gemini/state.ts`)
- **Removed** VS Code workspaceState persistence from `initializeSuggestionState()`
- **Updated** `persistSuggestions()` to only write to file storage (no more workspaceState)
- **Added** `clearSuggestionsFromStorage()` to delete Gemini data files

### 3. Updated GeminiViewProvider (`src/gemini/geminiViewProvider.ts`)
- **Modified** `clearAllSuggestions()` to use file storage cleanup
- **Added** import for `clearSuggestionsFromStorage`
- All suggestion persistence now goes through file storage only

### 4. Updated Analysis View (`src/sidebar/analysisView.ts`)
- **Removed** memento-based initialization in constructor
- **Updated** all persistence methods to only use file storage:
  - `restoreHistoryFromDisk()` - no longer syncs to workspaceState
  - `persistLatestScan()` - only writes to files
  - `recordScanHistory()` - only writes to files
- **Added** `clearAllData()` - Clear all extension data (scan results + Gemini suggestions)
- **Added** `isStorageDirectoryMissing()` - Check for fresh start condition
- **Converted** legacy memento methods to no-ops

### 5. Extension Commands (`src/extension.ts`)
- **Added** `baseline-gate.clearAllData` command for manual data clearing
- **Added** fresh start detection on activation
- **Added** informational message when starting fresh

### 6. Package Configuration (`package.json`)
- **Added** `baseline-gate.clearAllData` command definition
- **Cleaned up** redundant activation events
- **Fixed** missing icon for menu items

## Data Storage Structure

All data is now stored exclusively in:
```
<workspace>/.baseline-gate/
├── scan-history.json          # Scan history entries
├── latest-scan.json           # Most recent scan results  
└── gemini-suggestions.json    # All Gemini AI suggestions
```

## Fresh Start Behavior

1. **Missing Directory Detection**: Extension checks if `.baseline-gate` exists on startup
2. **Fresh Start Message**: Shows informational message when starting fresh
3. **Complete Reset**: Removing `.baseline-gate` directory resets everything:
   - All scan results
   - Scan history
   - Gemini suggestions
   - User preferences (stored in files)

## User Commands

### New Command: "Clear All BaselineGate Data"
- **Command ID**: `baseline-gate.clearAllData`
- **Function**: Removes entire `.baseline-gate` directory
- **Confirmation**: Shows modal warning before executing
- **Result**: Extension returns to fresh state

## Migration Notes

### What Changed
- **Before**: Data stored in both VS Code workspaceState AND `.baseline-gate` files
- **After**: Data stored ONLY in `.baseline-gate` files

### Backward Compatibility
- Extension will no longer read from old workspaceState storage
- Existing `.baseline-gate` files will continue to work
- Users with only workspaceState data will see fresh start behavior

## Benefits

1. **True Portability**: All data travels with the workspace
2. **Easy Cleanup**: Single directory removal resets everything
3. **Version Control Friendly**: Users can choose to commit/ignore `.baseline-gate`
4. **Consistent State**: No sync issues between file and memory storage
5. **Clear Data Ownership**: One source of truth for all extension data

## Testing Scenarios

1. **Fresh Workspace**: No `.baseline-gate` → Shows fresh start message
2. **Existing Data**: Has `.baseline-gate` → Loads previous data seamlessly  
3. **Manual Reset**: Use "Clear All Data" command → Returns to fresh state
4. **Directory Removal**: Delete `.baseline-gate` → Next startup treats as fresh
5. **Partial Data**: Missing individual files → Extension handles gracefully

This implementation ensures that removing the `.baseline-gate` directory is equivalent to a complete factory reset of the BaselineGate extension.