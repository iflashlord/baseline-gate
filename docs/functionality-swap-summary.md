# Functionality Swap Implementation Summary

## Changes Made

Based on the user's request, I have successfully swapped the functionality between the two buttons:

### 1. **Graph Icon Button (next to settings)** → Now opens **Detailed Analysis Tab**
- **Location**: Top navigation bar next to the settings button
- **Icon**: `$(graph)` (graph/chart icon)
- **Command**: `baseline-gate.openInsights`
- **New Function**: Opens the comprehensive "Baseline Insights - Detailed Analysis" webview tab
- **Updated Title**: "Baseline Gate: Detailed Analysis"

### 2. **📊 View Insights Button** → Now opens **Insights Overlay/Dialog**
- **Location**: Next to the "Scan workspace" button in the main controls
- **Icon**: 📊 emoji
- **Button Text**: "📊 View Insights" (updated from "📊 Detailed Analysis")
- **New Function**: Opens the insights overlay/dialog panel with charts
- **Tooltip**: "Show Baseline Insights overlay with charts"

## Technical Changes Made

### Files Modified:
1. **`/src/extension.ts`**
   - Changed `baseline-gate.openInsights` command to open the detailed analysis tab instead of the overlay

2. **`/src/sidebar/analysis/html/scriptContent.ts`**
   - Changed the detailed analysis button event listener to send 'showInsights' message

3. **`/src/sidebar/analysis/html/layout.ts`**
   - Updated button text and tooltip

4. **`/src/sidebar/analysis/messages.ts`**
   - Removed unused `openDetailedAnalysis` handler interface and processing

5. **`/src/sidebar/analysis/types.ts`**
   - Removed unused `openDetailedAnalysis` message type

6. **`/src/sidebar/analysisView.ts`**
   - Removed unused `openDetailedAnalysis` message handler

7. **`/package.json`**
   - Updated command title to reflect new functionality

### Result:
- ✅ **Graph icon button** (navigation bar) → Opens full detailed analysis tab
- ✅ **📊 View Insights button** (main controls) → Opens insights overlay/dialog
- ✅ Clean code with no unused message handlers
- ✅ Proper tooltips and titles reflecting the new functionality
- ✅ Successful compilation with no errors

## User Experience:
1. **For Quick Insights**: Users click the "📊 View Insights" button for the overlay
2. **For Detailed Analysis**: Users click the graph icon in the navigation bar for the comprehensive tab

The functionality has been successfully swapped as requested!