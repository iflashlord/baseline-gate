# 📖 User Guide Feature - Visual Guide

## What You'll See

### 1. **Book Icon in Sidebar** 📖
The new book icon appears in the BaselineGate sidebar title bar, between the Insights (📊) icon and the Settings (⚙️) icon.

**Location:** 
```
BaselineGate Sidebar > Title Bar > [History] [Insights] [📖 Book] [Settings]
```

### 2. **Settings Menu Option**
The User Guide is also accessible through the settings submenu:
```
Settings Icon (⚙️) > Dropdown Menu:
  ├─ Open Settings
  ├─ User Guide          ← NEW!
  └─ Reset to Factory Settings
```

### 3. **Command Palette**
You can also open the guide via the command palette:
```
Cmd/Ctrl+Shift+P → "Baseline Gate: User Guide"
```

---

## The Guide Interface

When you open the guide, you'll see a full-page webview panel with:

### Header Section
```
🚀 BaselineGate User Guide
────────────────────────────────
Welcome to BaselineGate! This guide will help you get started...
```

### Navigation Sections (Scroll or Jump To)

1. **⚡ Quick Start** - Get up and running in 4 easy steps
   - Action buttons: "Scan Workspace Now" and "Open Settings"
   
2. **✨ Key Features** - 6 feature cards showing:
   - 🎯 Hover Tooltips
   - 📊 Workspace Dashboard
   - 🤖 Gemini AI Assistant
   - 📈 Insights & Budgets
   - 🔍 Detailed Analysis
   - 💾 Workspace Storage

3. **🤖 Setting Up Gemini AI** - Complete walkthrough:
   - Step 1: Get API Key (with link)
   - Step 2: Configure Extension
   - Step 3: Choose Your Model
   - Step 4: Add Custom Prompts
   - Step 5: Start Using AI
   - 💡 Pro Tip box

4. **⚙️ Configuration Settings** - Full settings reference table:
   ```
   | Setting | Type | Default | Description |
   |---------|------|---------|-------------|
   | target  | string | enterprise | Target baseline cohort... |
   | ...     | ...    | ...        | ...                       |
   ```

5. **📊 Using the Dashboard** - How-to guides for:
   - Filtering & Sorting
   - Detail Panel
   - Insights Overlay

6. **⌨️ Common Commands** - List of all commands:
   ```
   • Baseline Gate: Scan Workspace – Analyze all JS/CSS files
   • Baseline Gate: Search Findings – Filter results
   • Baseline Gate: User Guide – This guide!
   • ...
   ```

7. **💼 Recommended Workflow** - 6-step best practices:
   ```
   1. Configure Your Target
   2. Set Budget Limits
   3. Run Initial Scan
   4. Triage Critical Issues
   5. Track Progress
   6. Export Reports
   ```

8. **🔧 Troubleshooting** - Common issues and fixes:
   - Hover tooltips not showing?
   - Gemini not working?
   - Missing browser support data?
   - Need to start fresh?

9. **📚 Resources** - External links:
   - GitHub Repository
   - What is Baseline?
   - Google AI Studio
   - MDN Web Docs

### Footer Element
- **Scroll to Top** button (↑) appears when scrolling down

---

## Interactive Elements

### Clickable Buttons
- **"Scan Workspace Now"** - Triggers workspace scan
- **"Open Settings"** - Opens BaselineGate settings
- **Scroll to Top** - Smooth scroll to page top

### External Links
All resource links open in your default browser:
- Google AI Studio (for API keys)
- GitHub repository
- Baseline documentation
- MDN Web Docs

### Visual Effects
- **Hover effects** on feature cards (slight lift)
- **Table row highlighting** when hovering over settings
- **Smooth scrolling** throughout
- **Responsive layout** adapts to panel width

---

## Theme Support

The guide automatically adapts to your VS Code theme:

### Colors Used
- `--vscode-foreground` - Main text
- `--vscode-descriptionForeground` - Secondary text
- `--vscode-button-background` - Action buttons
- `--vscode-editor-background` - Card backgrounds
- `--vscode-panel-border` - Borders and dividers
- `--vscode-textLink-foreground` - Links and accents

### Dark Theme
```
┌─────────────────────────────────────┐
│ 🚀 BaselineGate User Guide          │
│ (Dark background, light text)       │
│                                     │
│ ┌─────────────────┐                │
│ │  Feature Card   │ (Subtle lift)  │
│ │  🎯 Tooltips    │                │
│ └─────────────────┘                │
└─────────────────────────────────────┘
```

### Light Theme
```
┌─────────────────────────────────────┐
│ 🚀 BaselineGate User Guide          │
│ (Light background, dark text)       │
│                                     │
│ ┌─────────────────┐                │
│ │  Feature Card   │ (Subtle lift)  │
│ │  🎯 Tooltips    │                │
│ └─────────────────┘                │
└─────────────────────────────────────┘
```

---

## Content Highlights

### Emoji Usage
Strategic emojis make sections easy to scan:
- ⚡ Quick Start
- ✨ Key Features
- 🤖 Gemini AI
- ⚙️ Settings
- 📊 Dashboard
- ⌨️ Commands
- 💼 Workflow
- 🔧 Troubleshooting
- 📚 Resources

### Step-by-Step Guides
Numbered circles for each step:
```
①  Open Your Workspace
   Make sure you have a folder...

②  Run Your First Scan
   Click the "Scan workspace"...

③  Review Findings
   Browse the results...
```

### Settings Table Format
```
┌──────────────┬─────────┬───────────┬─────────────────┐
│ Setting      │ Type    │ Default   │ Description     │
├──────────────┼─────────┼───────────┼─────────────────┤
│ target       │ string  │ enterprise│ Target baseline │
│ geminiApiKey │ string  │ ""        │ [REQUIRED]      │
│ ...          │ ...     │ ...       │ ...             │
└──────────────┴─────────┴───────────┴─────────────────┘
```

### Badge System
- 🔴 **REQUIRED FOR AI** - Red badge for essential settings
- 🔵 **Optional** - Blue badge for optional settings

### Tip Boxes
```
┌─────────────────────────────────────┐
│ 💡 Pro Tip                          │
│ Conversations are saved per finding.│
│ Use "View Existing Suggestions"...  │
└─────────────────────────────────────┘
```

---

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Smooth scroll respects reduced motion preferences

### Screen Reader Support
- Semantic HTML structure (h1, h2, h3)
- Descriptive link text
- Proper heading hierarchy
- ARIA labels where needed

### Visual Accessibility
- High contrast mode compatible
- Respects system font size
- Clear visual hierarchy
- Sufficient color contrast

---

## File Size & Performance

### Metrics
- **HTML Size:** ~27KB (embedded in TypeScript)
- **Load Time:** Instant (no external resources)
- **Memory:** Minimal (single webview panel)
- **Scrolling:** Smooth (CSS transforms)

### No Dependencies
- No external CSS files
- No external JavaScript libraries
- No image assets
- All icons are emoji or VS Code codicons

---

## User Journey

### First-Time User
```
1. Install extension
2. See book icon (📖)
3. Click icon
4. Read Quick Start
5. Click "Scan Workspace Now"
6. Success! 🎉
```

### Gemini Setup User
```
1. Click book icon (📖)
2. Scroll to "Setting Up Gemini AI"
3. Click link to get API key
4. Follow 5-step guide
5. Click "Open Settings" button
6. Paste API key
7. Done! 🤖
```

### Troubleshooting User
```
1. Encounter issue
2. Click book icon (📖)
3. Scroll to "Troubleshooting"
4. Find relevant section
5. Apply fix
6. Problem solved! ✅
```

---

## Integration Points

### From Sidebar
```
BaselineGate Panel > Title Bar > Book Icon (📖) > Guide Opens
```

### From Settings Menu
```
BaselineGate Panel > Settings (⚙️) > User Guide > Guide Opens
```

### From Command Palette
```
Cmd/Ctrl+Shift+P > "User Guide" > Guide Opens
```

### From README
```
README mentions: "Click the book icon (📖)" > User clicks > Guide Opens
```

---

## Success Indicators

### Visual Confirmation
- Panel title changes to "BaselineGate User Guide"
- Content loads immediately
- All formatting is correct
- Buttons are clickable
- Links work

### Functional Confirmation
- Scan button triggers workspace scan
- Settings button opens settings
- External links open in browser
- Scroll to top button works
- Theme adapts correctly

---

## Future State

When the feature is enhanced:
- Search functionality within guide
- Table of contents with anchor links
- Collapsible sections
- Video tutorials
- Interactive demos
- Localization support

---

*This guide helps users understand what they'll see and how to use the new User Guide feature in BaselineGate.*
