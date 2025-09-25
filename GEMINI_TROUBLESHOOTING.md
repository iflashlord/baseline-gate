# Gemini Integration Troubleshooting Guide

## Issue: Search, Clear All, and Remove Suggestion Functions Not Working

### Fixed Issues

I've identified and fixed several critical issues that were preventing the search, clear all, and remove suggestion functionality from working properly:

### 🔧 **1. HTML Event Handler Issues**

**Problem**: The onclick handlers in the HTML were vulnerable to breaking when suggestion IDs, file paths, or finding IDs contained special characters (quotes, apostrophes, etc.).

**Solution**: Replaced inline onclick handlers with data attributes and event delegation:

**Before:**
```html
<button onclick="removeSuggestion('${suggestion.id}')">✕</button>
```

**After:**  
```html
<button class="remove-btn" data-suggestion-id="${escapeHtml(suggestion.id)}">✕</button>
```

### 🔧 **2. Webview Message Handling**

**Problem**: JavaScript functions weren't properly communicating with the VS Code extension backend.

**Solution**: Implemented proper event delegation with detailed logging:

```javascript
document.addEventListener('click', function(event) {
    const target = event.target;
    
    if (target.classList.contains('remove-btn')) {
        const suggestionId = target.getAttribute('data-suggestion-id');
        if (suggestionId) {
            vscode.postMessage({
                type: 'removeSuggestion',
                id: suggestionId
            });
        }
    }
    // ... similar for other actions
});
```

### 🔧 **3. Search Input Event Handling**

**Problem**: The search input was using `this.value` which doesn't work reliably in webview context.

**Solution**: Changed to `event.target.value`:

**Before:**
```html
<input oninput="searchSuggestions(this.value)">
```

**After:**
```html
<input oninput="searchSuggestions(event.target.value)">
```

### 🔧 **4. Clear All Confirmation Dialog**

**Problem**: Using browser `confirm()` in webview context, which might not work properly.

**Solution**: Moved confirmation dialog to VS Code native UI:

- Removed `confirm()` from webview JavaScript
- Confirmation now shows as VS Code modal dialog
- Better user experience with proper VS Code styling

### 🔧 **5. Enhanced Debugging**

Added comprehensive logging to help identify issues:

**Extension side:**
```typescript
webviewView.webview.onDidReceiveMessage(data => {
    console.log('Gemini webview received message:', data);
    // ... handle messages
});
```

**Webview side:**
```javascript
console.log('Webview: Remove suggestion clicked for id:', suggestionId);
```

## Testing the Fixes

### How to Test:

1. **Restart VS Code** after compilation to ensure the new extension code loads
2. **Open Developer Console** (Help → Toggle Developer Tools) to see debug messages
3. **Test each function:**
   - Search: Type in the search box and watch for console messages
   - Remove: Click the ✕ button on any suggestion
   - Clear All: Click "Clear All" button and confirm in the dialog

### Expected Behavior:

- **Search**: Should filter suggestions in real-time as you type
- **Remove**: Individual suggestions should disappear immediately
- **Clear All**: Should show confirmation dialog, then clear all suggestions
- **Console**: Should show detailed logging of all actions

### If Issues Persist:

1. **Check the Console**: Look for JavaScript errors in VS Code Developer Tools
2. **Verify API Key**: Ensure Gemini API key is properly configured
3. **Restart Extension Host**: Use Ctrl+Shift+P → "Developer: Reload Window"
4. **Check Webview**: The webview should refresh automatically after each action

## File Changes Made:

- `src/gemini/geminiViewProvider.ts`: 
  - Fixed event handling with data attributes
  - Added comprehensive logging
  - Improved error handling
  - Enhanced webview refresh mechanism

The extension should now work correctly with all search, remove, and clear all functionality properly operational.

## Next Steps:

1. Test the extension with the new fixes
2. Remove debug logging once functionality is confirmed working
3. Consider adding unit tests for the webview functionality

## Issue: 404 Model Not Found When Calling Gemini

### Symptoms
- Error message includes `Publisher Model ... gemini-2.0-flash was not found`
- VS Code notification shows "Failed to get suggestion from Gemini"

### Quick Fix
1. Open VS Code Settings → Extensions → BaselineGate
2. Set **Gemini Model** (`baselineGate.geminiModel`) to a version your API key can access, for example `gemini-2.0-flash`
3. Re-run "Ask Gemini to Fix"

If the error persists, verify that your Google AI key has access to the requested model version or upgrade your access as described in the Google documentation.
