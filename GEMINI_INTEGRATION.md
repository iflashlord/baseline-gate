# Gemini API Integration Guide

## Overview

This extension now includes AI-powered suggestions using Google's Gemini API to help you fix baseline compatibility issues.

## Setup

1. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Open VS Code Settings (Cmd/Ctrl + ,)
3. Search for "baselineGate.geminiApiKey"
4. Paste your API key in the setting

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