# BaselineGate Developer Handbook

This guide consolidates the information developers need to maintain and extend the BaselineGate VS Code extension.

## Core Experience
- **Analysis sidebar** (`src/sidebar/analysisView.ts`, `src/sidebar/analysis/html/*`): main findings list with severity filtering, grouped issue handling, Gemini entry points, and focus management fixes (group headers stay open, keyboard navigation works).
- **Detail view** (`src/sidebar/detailView/*`): rich finding inspector with SVG iconography, markdown-rendered Gemini chat, in-panel search, and cleaned action set.
- **Detailed analysis dashboard** (`src/sidebar/detailedAnalysisView.ts`): full-screen insights tab opened via `openDetailedAnalysis` message and command `baseline-gate.openInsights`. Provides summary cards, charts, refreshed exports, and budget awareness.
- **Gemini surfaces** (`src/gemini/*`): suggestion service (`geminiService.ts`), full view webview (`geminiFullPageHtml.ts`, `geminiFullViewProvider.ts`), conversation state (`state.ts`), and chat integrations across detail/analysis views.
- **Interactive guide** (`src/sidebar/guideView.ts`): user-facing documentation panel accessible from the analysis title bar, settings submenu, and command palette.
- **Hover providers** (`src/hover/render/index.ts` and related): show compatibility context, reuse Gemini service, and respect browser visibility settings.
- **Markdown renderer** (`src/utils/markdownRenderer.ts`): single point for sanitised markdown-to-HTML conversion with copy buttons and search term highlighting.

## Data & Persistence
- `.baseline-gate/` directory is the single source of truth: `latest-scan.json`, `scan-history.json`, and `gemini-suggestions.json` are the only persisted artefacts (`src/utils/storage.ts`, `src/gemini/state.ts`, `src/sidebar/analysisView.ts`).
- Stored scan format version `2` (`StoredScanPayload`, `StoredIssuePayload`) precomputes `verdictLabel`, `featureName`, positions, and docs URLs to minimise transformation work (`src/sidebar/analysis/dataTransformation.ts`). Legacy version `1` is still read for backwards compatibility.
- Gemini state only persists through the storage helpers; there is no remaining dependency on VS Code mementos. Clearing the directory fully resets the extension state.

## Commands & Entry Points
| Command | Purpose |
| --- | --- |
| `baseline-gate.scanWorkspace` | Run the baseline analysis scan. |
| `baseline-gate.searchFindings` / `baseline-gate.clearFilters` / `baseline-gate.toggleSortOrder` | Manage finding list interactions. |
| `baseline-gate.openInsights` | Show the detailed analysis dashboard. |
| `baseline-gate.openGuide` | Open the in-extension user guide. |
| `baseline-gate.openGeminiFullView` / `baseline-gate.askGemini` / `baseline-gate.showGeminiSuggestions` | Gemini suggestion entry points. |
| `baseline-gate.startGeminiChat` | Launch Gemini chat panel from analysis results. |
| `baseline-gate.clearGeminiResults` | Remove stored Gemini suggestions for the active finding. |
| `baseline-gate.clearAllData` | Wipe stored scan history while keeping configuration. |
| `baseline-gate.resetToFactory` | Remove `.baseline-gate` and revert all BaselineGate settings to defaults. |
| `baseline-gate.openSettings` | Focus BaselineGate configuration in VS Code settings. |

The analysis title bar hosts quick icons for Gemini history, insights, guide, and a settings submenu (`package.json` menus configuration).

## Configuration Surface
Key settings (all under the `baselineGate` section):
- `target`, `blockedBudget`, `warningBudget`, `safeGoal` – analysis targets and thresholds.
- `showDesktopBrowsers`, `showMobileBrowsers` – filter support matrices across sidebar and hovers (`src/extension.ts`, `src/hover/render/index.ts`).
- `geminiApiKey`, `geminiModel`, `geminiCustomPrompt` – Gemini integration controls (`src/gemini/geminiService.ts`).

Factory reset clears all of the above back to their defaults and restores a fresh `.baseline-gate` directory (`src/extension.ts`).

## UI & UX Highlights
- Grouped issues stay expanded across clicks and keyboard navigation thanks to explicit event isolation and ARIA-friendly toggles (`src/sidebar/analysis/html.ts`).
- Detail view cards, tables, and chat bubbles use inline SVGs for severity badges, avatars, and controls (`src/sidebar/detailView/htmlGenerator.ts`).
- Gemini full page adopts a single-column layout, gradient card accents, copy-enabled code blocks, and full metadata search covering finding IDs, file names, and tags (`src/gemini/geminiFullPageHtml.ts`, `src/gemini/state.ts`).
- Detailed analysis exports default to `~/Downloads`, snapshot summary/budget metadata, and deduplicate findings prior to CSV/JSON generation (`src/sidebar/detailedAnalysisView.ts`).
- The guide panel and quick-start sections provide onboarding, shortcuts, and settings references while reusing extension commands for actionable buttons (`src/sidebar/guideView.ts`).

## Manual Testing Checklist
Run these flows after impactful changes:
1. **Fresh workspace** – open a repo without `.baseline-gate`, confirm “Starting fresh” toast, then run a scan (`baseline-gate.scanWorkspace`).
2. **Storage integrity** – inspect `.baseline-gate` contents after scans and Gemini interactions; verify `latest-scan.json` uses version `2` and new findings append to `scan-history.json`.
3. **Gemini suggestions** – request a suggestion from the analysis view, review detail-view chat history rendering, and open the full-page Gemini view to test search, file navigation, and retry flows.
4. **Detailed analysis dashboard** – trigger the 📊 button, verify summary cards, charts, refresh behaviour, and CSV/JSON exports land in Downloads with correct metadata.
5. **Grouping & focus** – enable “Group similar issues”, expand a group, interact with occurrences (mouse + keyboard) and ensure state persistence.
6. **Factory reset** – modify settings, generate data, run `baseline-gate.resetToFactory`, confirm settings return to defaults and `.baseline-gate` is recreated on next scan.
7. **Browser filters** – toggle `showDesktopBrowsers`/`showMobileBrowsers` and confirm both sidebar tables and hover support matrices update in real time.

## Troubleshooting & Recovery
- Use `baseline-gate.clearAllData` to wipe scan history while keeping user settings; this simply removes storage files.
- Use `baseline-gate.resetToFactory` for a full reset (storage + settings). A confirmation dialog details affected items (`src/extension.ts`).
- Gemini issues commonly stem from missing API keys, quota errors, or network failures; surfaced via `showError` flows in `src/gemini/geminiService.ts` and UI messages in chat/full view panels.
- Markdown rendering is centralised; if output looks wrong, check `src/utils/markdownRenderer.ts` before hotfixing individual views.

## Development Workflow
1. Install dependencies: `pnpm install` (repository uses pnpm workbench scripts).
2. Local build options:
   - `pnpm run compile` / `pnpm run watch` for webpack bundles.
   - `pnpm run compile-tests` + `pnpm run watch-tests` for TypeScript compilation during test work.
3. Lint: `pnpm run lint` (ESLint with `@typescript-eslint`).
4. Tests: `pnpm test` (73 VS Code integration/unit tests via `@vscode/test-cli`).
5. Package: `pnpm run package` or `pnpm run vscode:prepublish` before release; output goes to `baseline-gate.vsix`.

Launch the extension in VS Code with `F5` (Extension Development Host). The activity bar should display the Baseline Gate icon; verify title bar buttons (history, insights, guide, settings) align with expectations.

## Adding New Work
- Reuse the existing storage helpers and data types when persisting findings; update `StoredIssuePayload` if new fields are required and bump the storage version.
- Extend Gemini features through `geminiService.ts` for network calls and `geminiFullPageHtml.ts` / `detailView` utilities for UI additions.
- Any new markdown output should flow through `markdownRenderer.ts` to preserve sanitisation and code block tooling.
- Keep commands declared in `package.json` in sync with actual implementation and add them to the settings submenu or analysis title bar if user-facing.

Refer to module-level README comments and TypeScript definitions within the relevant `src/` directories for deeper context once you dive into individual features.
