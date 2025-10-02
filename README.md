# BaselineGate for VS Code

BaselineGate surfaces Baseline browser support data directly inside VS Code so you can catch incompatible JavaScript and CSS features before shipping. Hover tooltips, an insights dashboard, and an AI-assisted detail view keep you informed and help you remediate issues without leaving the editor.

## Table of Contents
- [Key Features](#key-features)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [Using BaselineGate](#using-baselinegate)
- [Managing Data & Resets](#managing-data--resets)
- [Commands](#commands)
- [Configuration](#configuration)
- [Gemini AI Workflow](#gemini-ai-workflow)
- [Development](#development)
- [Testing](#testing)
- [Packaging & Release](#packaging--release)
- [Release Workflow](#release-workflow)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)
- [Limitations & Roadmap](#limitations--roadmap)
- [License](#license)

## Key Features
- **Baseline-aware hovers** – Detect Baseline-sensitive JS/CSS tokens and surface browser support tables, fallback tips, and quick Gemini entry points directly inside the editor.
- **Workspace triage dashboard** – Run scans, pin filters, search across findings, toggle grouping for similar issues, and keep severity-driven prioritisation front and centre.
- **Insights overlay & budgets** – Open the Insights panel on demand to review trend history, top offenders, and progress against blocked/warning/safe budgets configured for your team.
- **Detailed analysis view** – Launch a full-page dashboard with charts, sortable tables, and CSV/JSON export so you can share results beyond VS Code.
- **Gemini co-pilot** – Request AI remediation guidance, continue threaded conversations per feature, and switch to the full Gemini view for longer debugging sessions.
- **Status & storage guardrails** – Track the active target in the status bar, keep findings and chat history under `.baseline-gate/`, and reset everything safely with one confirmation.

## Screenshots
![Baseline analysis dashboard](media/screenshots/analysis-view.png)
![Finding detail with Gemini guidance](media/screenshots/detail-view.png)

## Getting Started
1. **Prerequisites**
   - VS Code `^1.104.0`
   - Node.js 18+
   - `pnpm` (recommended) or `npm`
2. **Install dependencies**
   ```bash
   pnpm install
   ```
3. **Launch the extension**
   - Open the **Run and Debug** view (`Ctrl`/`Cmd` + `Shift` + `D`).
   - Choose **Run Extension** and press **F5**. VS Code compiles with webpack watch mode and opens an Extension Development Host.

## Using BaselineGate
1. **📖 New to BaselineGate?** – Click the book icon (📖) in the sidebar or run `Baseline Gate: User Guide` to open an interactive, step-by-step guide covering all features, Gemini AI setup, configuration settings, and troubleshooting tips.
2. **Hover over APIs/selectors** – Type `Promise.any`, `URL.canParse`, `:has(...)`, or `@container` and hover to see Baseline badges with desktop/mobile breakdowns and quick links into Gemini.
3. **Run a workspace scan** – Execute `Baseline Gate: Scan Workspace` from the command palette. The analysis view updates counts, budgets, and the status bar target indicator.
4. **Triage findings** – Search by token or file, toggle severities, group similar issues, and switch between severity-first vs file order to focus remediation work.
5. **Open the Insights overlay** – Use the **Insights** button to review scan history, top feature groups, and how close you are to blocked/warning/safe budgets.
6. **Drill into details & Gemini** – Select any finding to open the detail panel with support matrices, code insights, and controls for **Fix with Gemini** or **Start Gemini Chat**.
7. **Launch the detailed analysis view** – Click the graph icon in the sidebar title bar or run `Baseline Gate: Detailed Analysis` for a full-page dashboard with charts, sortable tables, and export options.
8. **Manage settings & reset** – Use the settings menu to jump into VS Code settings or trigger the factory reset workflow that clears `.baseline-gate` data and restores defaults after confirmation.

## Managing Data & Resets
- **Workspace storage**: Scans, Gemini chats, filters, and settings snapshots live under `.baseline-gate/` so history travels with the repository.
- **Exports**: The detailed analysis view exports CSV/JSON reports to a location you choose (defaulting to your Downloads folder) so you can share findings outside VS Code.
- **Factory reset**: `Baseline Gate: Reset to Factory Settings` removes `.baseline-gate`, clears BaselineGate settings across scopes, and rebuilds the status bar target once complete.
- **Recover quickly**: After a reset or data clear, rerun a workspace scan to repopulate findings and rebuild charts.

## Commands
| Palette title | Command ID | Description |
| --- | --- | --- |
| `Baseline Gate: Scan Workspace` | `baseline-gate.scanWorkspace` | Analyse JS/CSS files for unsupported or risky features. |
| `Baseline Gate: Search Findings` | `baseline-gate.searchFindings` | Prompt for a token, feature, or filename filter and apply it across results. |
| `Baseline Gate: Filter by Severity` | `baseline-gate.configureSeverityFilter` | Choose which verdicts (blocked, needs review, safe) stay visible. |
| `Baseline Gate: Clear Filters` | `baseline-gate.clearFilters` | Reset search, severity filters, grouping, and sort order. |
| `Baseline Gate: Toggle Sort Order` | `baseline-gate.toggleSortOrder` | Swap between severity-first and file-order sorting. |
| `Baseline Gate: Open Settings` | `baseline-gate.openSettings` | Jump straight to the BaselineGate section in VS Code settings. |
| `Baseline Gate: User Guide` | `baseline-gate.openGuide` | Open the comprehensive user guide with step-by-step instructions and feature documentation. |
| `Baseline Gate: Detailed Analysis` | `baseline-gate.openInsights` | Open the full-page dashboard with charts, tables, and export actions. |
| `Start Gemini Chat` | `baseline-gate.startGeminiChat` | Begin a threaded AI conversation scoped to the selected finding or hover context. |
| `Fix with Gemini` | `baseline-gate.askGemini` | Send the current issue context to Gemini and append the response to the chat thread. |
| `Clear Result` | `baseline-gate.clearGeminiResults` | Remove the latest Gemini suggestion from the active thread. |
| `Baseline Gate: View Existing Suggestions` | `baseline-gate.showGeminiSuggestions` | Focus the dashboard on findings with Gemini conversations. |
| `Open Gemini Suggestions in Full View` | `baseline-gate.openGeminiFullView` | Expand Gemini threads into the dedicated notebook-style panel. |
| `Baseline Gate: Clear All BaselineGate Data` | `baseline-gate.clearAllData` | Delete stored findings, insights history, and Gemini transcripts under `.baseline-gate/`. |
| `Reset BaselineGate to Factory Settings` | `baseline-gate.resetToFactory` | Clear all stored data and remove BaselineGate settings from user and workspace scopes. |

## Configuration
Adjust BaselineGate under **Settings → Extensions → BaselineGate** or directly in `settings.json`.

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `baselineGate.target` | string (`modern`\|`enterprise`) | `enterprise` | Controls which Baseline cohort findings are scored against and updates the status bar indicator. |
| `baselineGate.showDesktopBrowsers` | boolean | `true` | Toggle desktop browser columns (Chrome, Edge, Firefox, Safari) in hovers and detail views. |
| `baselineGate.showMobileBrowsers` | boolean | `true` | Toggle mobile browser columns (Chrome Android, Firefox Android, Safari iOS). |
| `baselineGate.geminiApiKey` | string | `""` | Stores your Google Gemini API key to enable AI suggestions. |
| `baselineGate.geminiModel` | string | `"gemini-2.0-flash"` | Override the Gemini model ID if your key is scoped to a different release. |
| `baselineGate.geminiCustomPrompt` | string | `""` | Optional prefix appended to every Gemini request for custom guidance. |
| `baselineGate.blockedBudget` | number ≥ 0 | `0` | Defines how many blocked findings are acceptable before the budget card turns critical. |
| `baselineGate.warningBudget` | number ≥ 0 | `5` | Sets the tolerance for needs-review findings before the budget card warns. |
| `baselineGate.safeGoal` | number ≥ 0 | `10` | Target count of safe findings to visualise progress in insights dashboards. |

Budget settings drive the Insights overlay and detailed analysis view, helping teams track compatibility commitments at a glance.

## Gemini AI Workflow
1. Configure `baselineGate.geminiApiKey` plus any model or custom prompt overrides.
2. Use **Fix with Gemini** for quick remediation advice or **Start Gemini Chat** when you want a longer thread tied to the current finding.
3. BaselineGate sends feature metadata, severity, and recent code context alongside your prompt, then applies any custom prefix before calling Gemini.
4. Conversations persist per finding; **Baseline Gate: View Existing Suggestions** filters the dashboard to items with active threads, and **Clear Result** removes unwanted replies.
5. Open **Gemini Suggestions in Full View** for a dedicated panel that keeps historical prompts and responses visible while you iterate.

## Development
- **Compile once**: `pnpm run compile`
- **Watch mode**: `pnpm run watch`
- **Compile TypeScript tests**: `pnpm run compile-tests`
- **Lint**: `pnpm run lint`
- **Development host**: use the built-in **Run Extension** launch configuration (ships source maps).

## Testing
- `pnpm test` runs type-checking, webpack build, ESLint, and the VS Code integration harness. It passes with the committed configuration.
- Run only the compiled test suites via `pnpm exec node out/test/suite/index.js` after `pnpm run compile-tests` if you need quick iterations.
- The Testing view in VS Code exposes named run profiles for both extension execution and integration tests.

## Packaging & Release
- Create a VSIX locally with:
  ```bash
  pnpm exec vsce package --no-dependencies
  ```
- Release automation: see the [Release Workflow](#release-workflow) section for the CI pipelines that handle tagging, packaging, and publishing.

## Release Workflow
The repository automates releases through GitHub Actions. A typical release looks like this:

1. **Bump the version (that's it!)**
   - Run the **Bump Version** workflow in the **Actions** tab and choose `patch`, `minor`, or `major`.
   - The workflow commits the new version, tags it (`vX.Y.Z`), pushes to `main`, and immediately triggers the release pipeline.

2. **Continuous Integration**
   - The `CI` workflow (`.github/workflows/ci.yml`) runs on every push/PR to `main` and executes `pnpm exec eslint src --max-warnings 0` and `pnpm test`.

3. **Release automation**
   - `Release Extension` (`.github/workflows/release.yml`) runs automatically after the version bump or any manually-pushed `v*` tag.
   - You can also run it via **Run workflow** to rebuild an existing tag.
   - It installs dependencies, runs the full `pnpm test` under `xvfb-run`, packages the extension (`baseline-gate.vsix`), creates a GitHub Release, uploads the VSIX asset, and publishes to the Marketplace when `VSCE_PAT` is available.

4. **Manual verification (optional)**
   - Download the VSIX artifact from the GitHub Release and install it locally.
   - Confirm the Marketplace listing updates if publishing was enabled.

Secrets used by automation:
- `VSCE_PAT`: Visual Studio Marketplace Personal Access Token for publishing.

## Project Structure
- `src/extension.ts`: Activation entry point and command registration.
- `src/hover/`: JavaScript and CSS hover providers.
- `src/core/`: Baseline data loading, scoring, and resolution.
- `src/sidebar/analysis/`: Workspace scan dashboard assets.
- `src/sidebar/detailView/`: Finding detail panel, HTML generator, and state management.
- `src/gemini/`: Gemini provider, data transforms, and UI assets.
- `media/`: Icons and webview imagery (including status/baseline SVGs).
- `docs/`: Historical design notes, implementation summaries, and guides.

## Documentation
All supplementary documentation lives in the [`docs/`](docs) directory. Files are grouped by theme (Gemini, storage, UI, testing) and use kebab-case naming for easy discovery.

## Troubleshooting
- **No hover content**: Hover directly over the token (e.g., the `any` in `Promise.any`). The initial detector is position-sensitive.
- **Missing support columns**: Inspect `web-features/data.json` to confirm the data shape and adjust `src/core/baselineData.ts` if necessary.
- **Build errors on JSON imports**: Ensure `resolveJsonModule` remains enabled in `tsconfig.json`.
- **Extension does not compile during F5**: Confirm the **Run Extension** configuration is selected; it wires webpack watch mode automatically.
- **Test pipeline failures**: Run `pnpm exec eslint src --max-warnings 0` to surface remaining lint issues before re-running `pnpm test`.

## Limitations & Roadmap
- Hover detectors rely on heuristic string matching; migrating to TypeScript AST/PostCSS parsing will improve accuracy.
- Baseline feature maps are seeded with high-value APIs/selectors; expand to cover project-specific needs.
- Data normalisation follows the current `web-features` schema; monitor upstream changes and adjust resolvers when necessary.

## License
BaselineGate is released under the [MIT License](LICENSE).
