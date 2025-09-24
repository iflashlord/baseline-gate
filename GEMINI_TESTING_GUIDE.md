# Testing Guide for Gemini Integration Fixes

## Issues Fixed

### 1. ✅ Clear All Button
**Problem**: Clear All button was not working due to outdated event handling.
**Solution**: Converted from `onclick="clearAll()"` to event delegation with `data-action="clear-all"`.

### 2. ✅ Search Functionality  
**Problem**: Search input was using unreliable `oninput` handler and had case sensitivity issues.
**Solution**: Implemented proper event delegation and fixed case preservation.

## How to Test

### Prerequisites
1. **Restart VS Code** completely after compiling the extension
2. **Enable Developer Tools**: Help → Toggle Developer Tools → Console tab
3. **Have some test data**: Create suggestions by using "Ask Gemini to Fix" on baseline issues

### Testing Clear All Functionality

1. **Create Test Suggestions**:
   - Open any CSS/JS file with baseline issues
   - Hover over issues and click "Ask Gemini to Fix" 
   - Create at least 2-3 suggestions

2. **Test Clear All**:
   - Open "Gemini AI Suggestions" view in sidebar
   - Click "Clear All" button
   - **Expected**: VS Code confirmation dialog appears 
   - Click "Clear All" to confirm
   - **Expected**: All suggestions disappear immediately
   - **Console**: Should show "Clearing all suggestions" message

3. **Test Clear All Cancellation**:
   - Create more suggestions
   - Click "Clear All" button
   - Click "Cancel" in the dialog
   - **Expected**: Suggestions remain unchanged

### Testing Search Functionality

1. **Create Diverse Test Suggestions**:
   - Create suggestions for different features (e.g., "container-query", "dialog", "grid")
   - Create suggestions for different files
   - Ensure you have at least 4-5 suggestions with different content

2. **Test Basic Search**:
   - Type in the search box (e.g., "container")
   - **Expected**: Results filter immediately as you type
   - **Expected**: Counter shows "X of Y suggestions"
   - **Console**: Should show search messages

3. **Test Search Cases**:
   - Search for "CONTAINER" (uppercase)
   - **Expected**: Should still find "container-query" suggestions
   - **Expected**: Input field preserves original case ("CONTAINER")

4. **Test Search by File Name**:
   - Type part of a filename (e.g., "test.css")
   - **Expected**: Shows only suggestions from that file

5. **Test Search by Content**:
   - Type part of an issue or suggestion text
   - **Expected**: Filters based on content

6. **Test No Results**:
   - Type something that doesn't match any suggestions (e.g., "xyz123")
   - **Expected**: Shows "No suggestions match 'xyz123'" with "Clear search" button
   - Click "Clear search" button
   - **Expected**: Search clears and all suggestions show again

7. **Test Clear Search**:
   - Type any search term
   - Click "Clear search" button (when visible)
   - **Expected**: Search box clears and all suggestions show

### Testing Individual Remove

1. **Test Remove Single Suggestion**:
   - Click the "✕" button on any suggestion
   - **Expected**: That suggestion disappears immediately
   - **Expected**: Search count updates if search is active
   - **Console**: Should show "Remove suggestion clicked" message

### Debugging Console Messages

You should see these messages in the Developer Console:

**For Search**:
```
Webview: Search input changed to: [your query]
Gemini webview received message: {type: "searchSuggestions", query: "[your query]"}
Searching suggestions with query: [your query]
Refreshing Gemini webview. Suggestions: X Filtered: Y Search query: [query]
```

**For Clear All**:
```
Webview: Clear all clicked
Gemini webview received message: {type: "clearAllSuggestions"}
Clearing all suggestions
Refreshing Gemini webview. Suggestions: 0 Filtered: 0 Search query: 
```

**For Remove Individual**:
```
Webview: Remove suggestion clicked for id: [suggestion-id]
Gemini webview received message: {type: "removeSuggestion", id: "[suggestion-id]"}
Removing suggestion: [suggestion-id]
Refreshing Gemini webview. Suggestions: X Filtered: Y Search query: [current query]
```

## Troubleshooting

### If Clear All Still Doesn't Work:
1. Check console for error messages
2. Verify the button has `class="clear-all-btn"` in the HTML (inspect element)
3. Ensure VS Code dialog appears - if not, there might be a permission issue
4. Try restarting VS Code extension host: Ctrl+Shift+P → "Developer: Reload Window"

### If Search Doesn't Work:
1. Check console for "Search input changed" messages
2. Verify input has `class="search-input"` in the HTML
3. Type slowly and check if each character triggers a search
4. Check if webview refreshes after each search (look for "Refreshing Gemini webview" message)

### General Issues:
1. **Extension Not Loading**: Check for compilation errors with `pnpm run compile`
2. **Webview Not Updating**: Try closing and reopening the Gemini view
3. **Messages Not Sending**: Check VS Code extension host isn't crashed

## Expected Behavior Summary

✅ **Clear All**: Shows confirmation dialog, clears all suggestions when confirmed  
✅ **Search**: Filters in real-time, preserves case, shows result count  
✅ **Remove Individual**: Removes single suggestions immediately  
✅ **Clear Search**: Resets search and shows all suggestions  
✅ **Case Insensitive**: Search works regardless of case  
✅ **Multi-field Search**: Searches across feature names, file names, issues, and suggestions  

Both the Clear All and Search functionality should now work reliably with proper event handling and user feedback.