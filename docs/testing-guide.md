# Testing the BaselineGate Extension

## How to Test the Fullscreen Button

1. **Open the project in VS Code:**
   ```bash
   cd /Users/behrouz/Desktop/Hackathon/baseline-gate
   code .
   ```

2. **Run the extension in development mode:**
   - Press `F5` in VS Code (or Cmd+F5 on Mac)
   - This will open a new "Extension Development Host" window

3. **Look for the buttons:**
   - In the new window, open the Activity Bar (left side)
   - Click on the BaselineGate icon 
   - You should see the "Baseline Analysis" view
   - In the title bar of that view, you should see:
     - Settings button (gear icon)
     - Fullscreen button (window icon)

4. **Test the fullscreen button:**
   - Click the fullscreen button
   - You should see a notification message
   - The sidebar should toggle between normal and fullscreen

## Troubleshooting

If you don't see the buttons:

1. **Reload the extension development window:** Press `Ctrl+R` (Cmd+R on Mac)

2. **Check the console for errors:** Open Developer Tools (`Help > Toggle Developer Tools`)

3. **Make sure you have a workspace open** in the extension development window

4. **Try running a scan first:** The buttons might only appear after the extension is fully activated

## Current Button Icons

- Settings: `$(settings-gear)` 
- Fullscreen: `$(window)`

The fullscreen functionality should toggle the sidebar between normal and full screen mode with a visual notification.