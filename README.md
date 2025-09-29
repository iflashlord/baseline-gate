BaselineGate (VS Code)

Shows Baseline support info for selected JS and CSS features directly in hover tooltips.

Current Status
- JS and CSS hover providers resolve to Baseline features and render browser support tables with fallback guidance.
- Mocha unit suites cover scoring, feature resolution, detectors, and markdown rendering. Run them with `pnpm run compile-tests` (compiles tests to `out/` and executes TypeScript type-checking).
- A GitHub Actions workflow (`.github/workflows/vsce-release.yml`) builds the webpack bundle, packages the VSIX with `vsce`, uploads it as an artifact, and optionally publishes when a `VSCE_PAT` secret is available.
- The full `pnpm test` flow runs compilation, linting, and the VS Code integration harness. It passes locally using the bundled configuration.

Quick Start
- Prereqs: Node 18+, VS Code 1.90+, pnpm recommended.
- Install deps: `pnpm install` (or `npm install` if you prefer npm)
- One-click run: Open the Run and Debug view (`View → Run` or `Ctrl/Cmd+Shift+D`), ensure `Run Extension` is selected, then press F5 or click `Run`. VS Code builds in watch mode and launches an Extension Development Host with the extension loaded.
- Manual build: `pnpm run compile` (webpack bundle)

- Develop & Test
- Run the extension: In Run and Debug (`Ctrl/Cmd+Shift+D`), choose `Run Extension`, then press F5 or click `Run`. Watch builds stay active, and breakpoints bind to TypeScript thanks to source maps.
- Run tests (debug): In the same view pick `Run Extension Tests` and launch it. VS Code spins up an Extension Development Host and executes the suites under `src/test/suite/*`.
- Run tests (Testing view): Open Testing (`View → Testing` or the beaker icon in the Activity Bar), locate the `baseline-gate` run profile, and start the tests. Results stream in the panel with rich asserts and diffing.
- Run unit tests (terminal): `pnpm run compile-tests` performs a type-check build of the tests; execute the compiled JavaScript with `pnpm exec node out/test/suite/index.js` if you need ad-hoc runs.
- `pnpm test` currently stops early because ESLint reports warnings (see Troubleshooting) and `.vscode-test` configuration is not yet committed. Add the config or pass `--config` to `vscode-test` once lint passes.
- Background compile: `pnpm run watch` and `pnpm run watch-tests` keep extension and tests compiling while you edit.

Try It
- Open a JS/TS file and type `Promise.any` or `URL.canParse` and hover.
- Open a CSS/SCSS file and type `:has(...)`, `@container`, or `text-wrap:` and hover.
- You should see a hover with a Baseline badge and support versions for Chrome/Firefox/Safari.
- Want ready-made snippets? Open the files under `examples/` and hover the highlighted APIs/selectors.

Configuration
- Setting: `baselineGate.target` → `"modern" | "enterprise"` (default: `"enterprise"`).
- Change at: VS Code Settings → Extensions → BaselineGate, or in `settings.json`.
- The status bar shows the active target: `Baseline: enterprise|modern`.

Implementing Baseline Features
- Start with the Baseline overview on web.dev: https://web.dev/articles/baseline-tools-web-features. It explains the Baseline definition, supported tooling, and the structure of the canonical feature dataset.
- We consume feature metadata directly from the published `web-features` npm package, which mirrors the dataset highlighted in the article. If you need to pin to a custom snapshot, script that export and update references in `src/core/baselineData.ts`.
- When adding new feature detectors or resolvers, map to the IDs published in the Baseline dataset so the hover badge stays aligned with the Baseline specification.
- Re-run `pnpm run compile` (or F5) after tweaking feature mappings to ensure the bundle refreshes.

How It Works
- Detection: Naive detectors extract nearby JS symbols and CSS tokens.
- Resolution: Tokens map to Baseline feature IDs in `src/core/resolver.ts`.
 - Data: Feature metadata is sourced from the `web-features` package (`web-features/data.json`).
- Scoring: `src/core/scoring.ts` compares support against target mins from `src/core/targets.ts`.

Common Tasks
- Develop with auto‑rebuild: `pnpm run watch` (F5 already uses this).
- Rebuild once: `pnpm run compile`.
- Add more features: extend maps in `src/core/resolver.ts` and patterns in `src/core/detectors/*`.

Debugging Tips
- If breakpoints don’t bind, make sure the `Run Extension` launch is selected; we ship full source maps in dev. Production builds use hidden source maps.
- For test debugging, set breakpoints in files under `src/test/suite` or the code under test in `src/**`. Use the `Run Extension Tests` launch.

Troubleshooting
- No hover appears: Ensure you hover exactly over the token (e.g., over `any` in `Promise.any`). The MVP detector is simple and positional.
- Missing support numbers: The data shape can vary across features. Inspect entries from `web-features/data.json` and adjust property paths in `src/core/baselineData.ts` if needed.
- Build errors about JSON imports: Ensure `tsconfig.json` has `"resolveJsonModule": true` (already set).
- Nothing compiles on F5: Ensure the `Run Extension` launch config is selected; it starts watch build.
- Test pipeline failures: run `pnpm run lint -- --max-warnings=0` to inspect remaining warnings before invoking the VS Code test runner. The bundled `.vscode-test` configuration is already committed.

Project Layout
- `src/extension.ts`: Activation and hover registration.
- `src/hover/*`: Hover providers for JS and CSS.
- `src/core/*`: Baseline loader, scoring, resolvers, and detectors.
- `src/config/defaults.ts`: Default target.
- `media/icon.png`: Extension icon placeholder.

Limitations (MVP)
- Detectors are regex/substring based; switch to TypeScript AST and PostCSS for fidelity.
- Feature ID maps are small seeds; expand with ~10–20 high‑value items to start.
- Data shape is normalized heuristically; strengthen once the exact schema subset is finalized.

Optional: Packaging
- `@vscode/vsce` is already listed as a dev dependency. Create a package locally with `pnpm exec vsce package --no-dependencies` (outputs a `.vsix`).
- CI: The `VSCE Package` workflow (`.github/workflows/vsce-release.yml`) runs on tag pushes (`v*`) or manual dispatch, producing a VSIX artifact and, if `VSCE_PAT` is set in repo secrets, publishing to the Marketplace.
