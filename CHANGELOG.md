# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Factory Reset Feature**: New "Reset BaselineGate to Factory Settings" command
  - Accessible via Command Palette
  - Available in Settings submenu in the sidebar
  - Removes .baseline-gate directory and all data
  - Resets all configuration settings to defaults
  - Requires user confirmation before executing
- **Settings Submenu**: Enhanced settings button in sidebar with dropdown menu
  - "Open Settings" - Opens VS Code settings for BaselineGate
  - "Reset to Factory Settings" - Performs complete factory reset

### Changed
- Settings button in sidebar now shows a submenu instead of directly opening settings
- Improved user experience for accessing settings and reset functionality

## [0.1.0] - 2025-10-03
### Added
- Baseline-aware hover providers for JavaScript, TypeScript, CSS, SCSS, and React variants, including browser support tables and fallback guidance.
- Activity bar **Baseline Gate** view container with analysis dashboard that summarises findings by severity, file, and feature.
- Detail view panel showcasing feature metadata, support matrices, documentation links, and remediation notes.
- Workspace scan command (`Baseline Gate: Scan Workspace`) with severity filtering, search, sorting, and persistent storage inside `.baseline-gate`.
- Gemini integration for AI-assisted fixes, including hover quick actions, detail view chat, full-page conversation view, and follow-up handling.
- Status bar indicator showing the active target (`enterprise` or `modern`) with quick access to settings.
- Rich command palette entries for searching findings, filtering severity, toggling sort order, clearing data, and opening configuration/insights.
- Initial documentation set: README, docs/ directory with implementation summaries, testing guides, and troubleshooting notes.
- VSCE packaging pipeline (Webpack build, VSCE packaging, GitHub Actions release workflow) and Marketplace assets (icon, banner, screenshots, badge).
- Comprehensive test suite covering detectors, resolvers, scoring, webview messaging, Gemini flows, and SVG-based UI rendering.

### Changed
- Set minimum VS Code engine requirement to `^1.104.0` and adopted MIT licensing.

### Fixed
- Ensured `pnpm test` runs linting, compilation, and the VS Code integration harness without warnings.

[0.1.0]: https://github.com/iflashlord/baseline-gate/releases/tag/v0.1.0
