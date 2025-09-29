# Testing Guide: Single Source of Truth Implementation

## How to Test the Implementation

### 1. Fresh Start Test
1. **Setup**: Open VS Code with the BaselineGate extension enabled
2. **Action**: Open a workspace that doesn't have a `.baseline-gate` directory
3. **Expected Result**: Should see message "BaselineGate: Starting fresh. All data will be stored in the .baseline-gate directory in your workspace."

### 2. Data Storage Test
1. **Action**: Run "Baseline Gate: Scan Workspace" command
2. **Expected Result**: 
   - Creates `.baseline-gate/` directory in workspace root
   - Creates `latest-scan.json` file with scan results
   - Creates `scan-history.json` file with scan history

### 3. Gemini Integration Test
1. **Action**: Use any Gemini suggestion feature (hover tooltip, sidebar)
2. **Expected Result**: 
   - Creates `.baseline-gate/gemini-suggestions.json` file
   - Suggestions persist only in this file, not in VS Code's internal storage

### 4. Clear All Data Test
1. **Action**: Run "Clear All BaselineGate Data" command
2. **Expected Result**:
   - Shows confirmation dialog
   - After confirmation, removes entire `.baseline-gate/` directory
   - All data is lost (scan results, history, Gemini suggestions)
   - Next operation creates fresh `.baseline-gate/` directory

### 5. Manual Directory Removal Test
1. **Setup**: Have some scan data and Gemini suggestions stored
2. **Action**: Manually delete `.baseline-gate/` directory from file system
3. **Action**: Restart VS Code or reload window
4. **Expected Result**:
   - Extension treats as fresh start
   - Shows "Starting fresh" message
   - No previous data is loaded
   - First scan creates new `.baseline-gate/` directory

### 6. Data Persistence Test
1. **Setup**: Generate some scan results and Gemini suggestions
2. **Action**: Close VS Code completely
3. **Action**: Reopen VS Code and the same workspace
4. **Expected Result**:
   - All previous scan results are restored
   - All previous Gemini suggestions are restored
   - No "starting fresh" message (since directory exists)

### 7. Command Palette Test
1. **Action**: Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. **Action**: Type "BaselineGate"
3. **Expected Result**: Should see "Clear All BaselineGate Data" command available

## File Structure Verification

After running scans and using Gemini features, verify this structure:

\`\`\`
<workspace-root>/
└── .baseline-gate/
    ├── latest-scan.json      # Most recent scan results
    ├── scan-history.json     # Historical scan entries
    └── gemini-suggestions.json  # All AI suggestions
\`\`\`

## Expected Behavior Changes

### Before Implementation
- Data stored in VS Code's workspaceState (invisible to user)
- Data also stored in `.baseline-gate/` files
- Removing directory didn't clear all data (workspaceState remained)

### After Implementation  
- Data stored ONLY in `.baseline-gate/` files
- No workspaceState usage
- Removing directory completely resets extension
- True "single source of truth" behavior

## Troubleshooting

If tests fail:

1. **Check Console**: Open Developer Tools (Help > Toggle Developer Tools) and check for errors
2. **Check Files**: Verify `.baseline-gate/` directory and JSON files are created/deleted as expected
3. **Reload Window**: Use "Developer: Reload Window" command to reset extension state
4. **Check Permissions**: Ensure workspace has write permissions for creating directories

## Success Criteria

✅ Fresh workspace shows "starting fresh" message  
✅ All data files are created in `.baseline-gate/` directory  
✅ Manual directory deletion resets extension completely  
✅ "Clear All Data" command works with confirmation  
✅ Data persists across VS Code restarts  
✅ No data stored in VS Code's internal storage (workspaceState)  