# Issue Grouping Implementation Summary

## Overview
I've implemented a feature to group multiple instances of the same baseline issue together while preserving all individual records. This helps reduce visual clutter while maintaining full visibility into all occurrences.

## Key Changes Made

### 1. Type Definitions (`src/sidebar/analysis/types.ts`)
- Added `IssueOccurrence` type for individual instances within a group
- Added `GroupedIssuePayload` type for grouped issue representation
- Updated `FileGroupPayload` to include both individual and grouped issues

### 2. Data Transformation (`src/sidebar/analysis/dataTransformation.ts`)
- Added `buildGroupedIssues()` function to group findings by feature + token combination
- Added `computeGroupId()` helper function for consistent group identification
- Updated `buildFilePayload()` to generate both individual and grouped issue data

### 3. UI Components (`src/sidebar/analysis/html.ts`)
- Added "Group similar issues" toggle checkbox in the filter controls
- Added comprehensive CSS styles for grouped issue display
- Modified `renderResults()` function to support both individual and grouped rendering modes
- Added interactive expand/collapse functionality for grouped issues
- Added proper accessibility attributes and keyboard navigation support

## Features

### Grouping Logic
- Issues are grouped by the combination of `feature.id` and `token`
- Groups are sorted by severity (blocked > warning > safe) then by feature name
- Each group shows a count badge indicating the number of occurrences

### Interactive UI
- Toggle between individual and grouped views with a checkbox
- Grouped issues can be expanded/collapsed to show individual occurrences
- Each occurrence shows location (line/column) and code snippet
- All existing actions (view details, open file, documentation) remain available
- Maintains selection state when switching between modes

### Visual Design
- Grouped issues have a distinctive header with feature name and count
- Individual occurrences are clearly organized within each group
- Color coding matches the severity levels (blocked/warning/safe)
- Smooth animations for expand/collapse interactions

## Usage
1. Run a baseline scan as usual
2. Toggle "Group similar issues" checkbox in the filter area
3. View grouped issues with counts and expandable occurrence lists
4. Click on individual occurrences or use the existing action buttons
5. Toggle back to individual view at any time

## Testing Files
Created test files to demonstrate the grouping:
- `examples/test-grouping.ts` - Multiple JavaScript API uses (clipboard, Promise.any, URL.canParse)
- `examples/test-grouping.css` - Multiple CSS feature uses (:has, text-wrap, container queries)

## Benefits
- **Reduced Clutter**: Similar issues are visually consolidated
- **Preserved Detail**: All individual occurrences remain accessible
- **Quick Overview**: Count badges show the scope of each issue type
- **Flexible Viewing**: Easy switching between grouped and individual modes
- **Maintained Functionality**: All existing features work in both modes

The implementation maintains full backward compatibility while adding the requested grouping functionality.