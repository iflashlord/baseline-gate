# Gemini API Integration Guide

## Overview

This extension now includes AI-powered suggestions using Google's Gemini API to help you fix baseline compatibility issues.

# Gemini AI Integration for BaselineGate

## Overview

This document describes the complete integration of Google's Gemini AI into the BaselineGate VS Code extension, providing AI-powered suggestions for web baseline compatibility issues.

## Features Implemented

### 1. Core Gemini API Integration
- **Service Layer**: `src/gemini/geminiService.ts`
  - Google Generative AI integration using `@google/generative-ai` package
  - API key configuration management
  - Error handling and user-friendly setup guidance
  - Custom prompt support for personalized AI responses

### 2. AI Suggestions Interface
- **View Provider**: `src/gemini/geminiViewProvider.ts`
  - Webview-based suggestions display with VS Code theme integration
  - Markdown rendering for rich AI response formatting
  - Search functionality for filtering suggestions history
  - File navigation with direct links to source files
  - Suggestion management (remove individual, clear all with confirmation)

### 3. Enhanced User Interface
- **Hover Integration**: AI suggestions available directly in hover tooltips
- **Sidebar Integration**: "Ask Gemini to Fix" buttons in detailed analysis view
- **Smart Button States**: Button text changes to "Ask Gemini Again" for repeated queries
- **Suggestion History**: Persistent storage of AI responses linked to specific findings

### 4. Advanced Features
- **Search Functionality**: Find specific suggestions using text search
- **File Linking**: Direct navigation to files and specific code locations
- **Custom Prompts**: User-configurable prompt templates
- **Contextual Information**: Feature names and file paths included in AI requests

## Configuration

### Required Settings
1. **Gemini API Key**: `baselineGate.geminiApiKey`
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Set in VS Code Settings: Extensions → BaselineGate → Gemini Api Key

### Optional Settings
2. **Custom Prompt**: `baselineGate.geminiCustomPrompt`
   - Add custom instructions to prepend to AI requests
   - Useful for specific coding standards or project requirements

## Usage

### Getting AI Suggestions
1. **From Hover Tooltips**: Hover over a baseline issue and click "Ask Gemini to Fix"
2. **From Analysis View**: Click "Ask Gemini to Fix" in the detailed issue view
3. **Repeated Queries**: Button changes to "Ask Gemini Again" for follow-up suggestions

### Managing Suggestions
1. **View All**: Open "Gemini AI Suggestions" view in the sidebar
2. **Search**: Use the search box to filter suggestions by content
3. **Navigate**: Click file links to jump directly to source code
4. **Remove**: Use the "✕" button to remove individual suggestions
5. **Clear All**: Use "Clear All" button (with confirmation dialog)

### Viewing Suggestions
- **Markdown Formatting**: AI responses are rendered with proper markdown
- **Linked to Findings**: Each suggestion links back to the original baseline issue
- **Persistent History**: Suggestions remain available until manually removed
- **Contextual Display**: Shows feature name, file name, and timestamp

## File Structure

```
src/gemini/
├── geminiService.ts      # Core AI service integration
└── geminiViewProvider.ts # UI provider for suggestions display

src/hover/
└── render.ts            # Enhanced with Gemini buttons

src/sidebar/
└── analysisView.ts      # Enhanced with Gemini integration

src/extension.ts         # Command registration and provider setup
package.json            # Configuration properties and commands
```

## Commands Added

- `baseline-gate.askGemini` - Request AI suggestion for a specific finding
- `baseline-gate.clearGeminiResults` - Clear all AI suggestions

## Error Handling

### Setup Errors
- Missing API key: Clear guidance with link to Google AI Studio
- Invalid API key: Helpful error message with troubleshooting steps

### Runtime Errors
- Network issues: Graceful error handling with retry suggestions
- API quota exceeded: Informative error messages
- Invalid responses: Fallback behavior with user notification

## Security Considerations

- **XSS Protection**: All HTML content is properly escaped
- **Secure Communication**: Messages between webview and extension are validated
- **API Key Storage**: Secure storage in VS Code settings (not in code)

## Performance Optimizations

- **Lazy Loading**: Webview content loads only when needed
- **Efficient Rendering**: Minimal DOM updates during search and filtering
- **State Management**: Efficient suggestion storage and retrieval

## Example Usage

When you encounter a CSS feature like `container-query-length` that's not widely supported, Gemini might suggest:

- Using feature detection with `@supports`
- Implementing fallback styles for older browsers  
- Considering progressive enhancement approaches
- Specific polyfill recommendations

The suggestions are tailored to your specific use case and the baseline compatibility requirements of your project.

## Troubleshooting

### Common Issues

1. **"Gemini API key is not configured"**
   - Solution: Set the API key in VS Code settings

2. **"Failed to get suggestion from Gemini"**
   - Check internet connection
   - Verify API key is valid
   - Check Google AI quota limits

3. **Suggestions not showing**
   - Ensure webview is properly loaded
   - Check browser console for errors
   - Restart VS Code if needed

### Debug Information

Enable detailed logging by:
1. Open VS Code Developer Tools (Help → Toggle Developer Tools)
2. Check Console tab for Gemini-related messages
3. Look for network requests to Google AI APIs

## Dependencies

- `@google/generative-ai`: ^0.21.0 - Core Google AI integration
- Standard VS Code API for UI and configuration

## Privacy

- Your code is not sent to Gemini - only the feature name and issue description
- Suggestions are stored locally in VS Code
- You can clear suggestions at any time

---

*This integration transforms BaselineGate from a static analysis tool into an intelligent assistant that provides actionable, AI-powered solutions for web baseline compatibility issues.*

## Usage

### From Hover Tooltips
- Hover over any JavaScript or CSS feature
- Click the "✨ Ask Gemini to Fix" button at the bottom of the tooltip
- Gemini will analyze the issue and provide a solution

### From Sidebar Analysis
- Run a workspace scan using "Baseline Gate: Scan Workspace"
- Click on any finding in the sidebar to view details
- Click the "✨ Ask Gemini to Fix" button in the details panel
- View suggestions in the new "Gemini Suggestions" tab

## Features

### AI-Powered Solutions
- Contextual analysis of baseline compatibility issues
- Enterprise-grade recommendations
- Browser support considerations
- Alternative implementation suggestions

### Suggestions Management
- All suggestions are saved in the workspace
- Remove individual suggestions or clear all
- Organized by timestamp and feature
- Includes original issue context

### Privacy & Security
- API key stored securely in VS Code settings
- No data is stored on external servers beyond the API call
- Full control over when and what to send to Gemini

## Example Issues Gemini Can Help With

- **Blocked Features**: "This CSS Grid feature is blocked for enterprise targets"
- **Browser Compatibility**: "Safari iOS doesn't support this JavaScript API"
- **Newer Features**: "This feature is newly available in baseline"
- **Discouraged Usage**: "This API is deprecated and discouraged"

## Error Handling

If you see errors:
- Check that your API key is correctly set
- Ensure you have internet connectivity
- Verify your API key has sufficient quota
- Check the console for detailed error messages

The extension will guide you through setup if the API key is missing or invalid.