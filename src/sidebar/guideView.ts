import * as vscode from "vscode";

export class BaselineGuideViewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.ViewColumn.One;

    // If we already have a panel, show it
    if (BaselineGuideViewProvider.currentPanel) {
      BaselineGuideViewProvider.currentPanel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      "baselineGuideView",
      "BaselineGate User Guide",
      column,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true,
      }
    );

    BaselineGuideViewProvider.currentPanel = panel;

    // Set the webview's initial html content
    panel.webview.html = this._getHtmlForWebview(panel.webview, extensionUri);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "openSettings":
          void vscode.commands.executeCommand("baseline-gate.openSettings");
          break;
        case "scanWorkspace":
          void vscode.commands.executeCommand("baseline-gate.scanWorkspace");
          break;
        case "openExternalLink":
          void vscode.env.openExternal(vscode.Uri.parse(data.url));
          break;
      }
    });

    // Reset when the current panel is closed
    panel.onDidDispose(
      () => {
        BaselineGuideViewProvider.currentPanel = undefined;
      },
      null,
      []
    );
  }

  private static _getHtmlForWebview(webview: vscode.Webview, _extensionUri: vscode.Uri): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>BaselineGate Guide</title>
    <style>
        body {
            padding: 20px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            line-height: 1.6;
        }

        h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--vscode-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }

        h2 {
            font-size: 18px;
            font-weight: 600;
            margin-top: 30px;
            margin-bottom: 15px;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        h3 {
            font-size: 16px;
            font-weight: 600;
            margin-top: 20px;
            margin-bottom: 10px;
            color: var(--vscode-descriptionForeground);
        }

        .intro {
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding: 15px;
            margin-bottom: 25px;
            border-radius: 4px;
        }

        .intro p {
            margin: 0;
        }

        .section {
            margin-bottom: 30px;
        }

        .step-list {
            counter-reset: step;
            list-style: none;
            padding-left: 0;
        }

        .step-list li {
            counter-increment: step;
            margin-bottom: 20px;
            padding-left: 45px;
            position: relative;
        }

        .step-list li::before {
            content: counter(step);
            position: absolute;
            left: 0;
            top: 0;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 14px;
        }

        .step-title {
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 5px;
            font-size: 15px;
        }

        .step-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }

        .code-inline {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            color: var(--vscode-textPreformat-foreground);
        }

        .action-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-family: var(--vscode-font-family);
            margin-top: 8px;
            transition: background 0.2s;
        }

        .action-button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .action-button:active {
            transform: translateY(1px);
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }

        .feature-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 15px;
            transition: transform 0.2s, border-color 0.2s;
        }

        .feature-card:hover {
            transform: translateY(-2px);
            border-color: var(--vscode-focusBorder);
        }

        .feature-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }

        .feature-title {
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 5px;
            font-size: 14px;
        }

        .feature-desc {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            line-height: 1.4;
        }

        .settings-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 13px;
        }

        .settings-table th,
        .settings-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .settings-table th {
            background: var(--vscode-editor-background);
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .settings-table td {
            color: var(--vscode-descriptionForeground);
        }

        .settings-table tr:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge-required {
            background: var(--vscode-errorBadge-background);
            color: var(--vscode-errorBadge-foreground);
        }

        .badge-optional {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .tip-box {
            background: var(--vscode-editorHoverWidget-background);
            border: 1px solid var(--vscode-editorHoverWidget-border);
            border-radius: 4px;
            padding: 12px;
            margin-top: 10px;
        }

        .tip-title {
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .tip-content {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }

        .emoji {
            font-size: 18px;
        }

        a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        .command-list {
            list-style: none;
            padding-left: 0;
        }

        .command-list li {
            padding: 8px 12px;
            background: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-focusBorder);
            margin-bottom: 8px;
            border-radius: 3px;
        }

        .command-name {
            font-family: var(--vscode-editor-font-family);
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .scroll-top {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            font-size: 20px;
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .scroll-top.visible {
            display: flex;
        }

        .scroll-top:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <h1>🚀 BaselineGate User Guide</h1>

    <div class="intro">
        <p><strong>Welcome to BaselineGate!</strong> This guide will help you get started with detecting browser compatibility issues, using AI-powered suggestions, and managing your baseline budgets effectively.</p>
    </div>

    <!-- Quick Start -->
    <div class="section">
        <h2><span class="emoji">⚡</span> Quick Start</h2>
        <ol class="step-list">
            <li>
                <div class="step-title">Open Your Workspace</div>
                <div class="step-description">Make sure you have a folder or workspace open in VS Code containing JavaScript, TypeScript, or CSS files.</div>
            </li>
            <li>
                <div class="step-title">Run Your First Scan</div>
                <div class="step-description">Click the "Scan workspace" button in the BaselineGate panel or run the command from the palette.</div>
                <button class="action-button" data-action="scan">Scan Workspace Now</button>
            </li>
            <li>
                <div class="step-title">Review Findings</div>
                <div class="step-description">Browse the results, filter by severity (Blocked, Needs Review, Safe), and click on any finding to see detailed browser support information.</div>
            </li>
            <li>
                <div class="step-title">Hover for Quick Info</div>
                <div class="step-description">In your code editor, hover over APIs like <span class="code-inline">Promise.any</span> or CSS selectors like <span class="code-inline">:has()</span> to see instant compatibility badges.</div>
            </li>
        </ol>
    </div>

    <!-- Key Features -->
    <div class="section">
        <h2><span class="emoji">✨</span> Key Features</h2>
        <div class="feature-grid">
            <div class="feature-card">
                <div class="feature-icon">🎯</div>
                <div class="feature-title">Hover Tooltips</div>
                <div class="feature-desc">Instant browser support data for JS APIs and CSS features directly in your editor</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <div class="feature-title">Workspace Dashboard</div>
                <div class="feature-desc">Comprehensive triage view with filtering, grouping, and severity prioritization</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🤖</div>
                <div class="feature-title">Gemini AI Assistant</div>
                <div class="feature-desc">Get AI-powered remediation guidance and fallback suggestions for compatibility issues</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">📈</div>
                <div class="feature-title">Insights & Budgets</div>
                <div class="feature-desc">Track trends, top offenders, and progress against your compatibility budgets</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🔍</div>
                <div class="feature-title">Detailed Analysis</div>
                <div class="feature-desc">Full-page dashboard with charts, sortable tables, and CSV/JSON export</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">💾</div>
                <div class="feature-title">Workspace Storage</div>
                <div class="feature-desc">All data stored in <span class="code-inline">.baseline-gate/</span> travels with your repository</div>
            </div>
        </div>
    </div>

    <!-- Setting Up Gemini AI -->
    <div class="section">
        <h2><span class="emoji">🤖</span> Setting Up Gemini AI</h2>
        <p>BaselineGate integrates with Google's Gemini AI to provide intelligent suggestions for fixing compatibility issues.</p>
        
        <ol class="step-list">
            <li>
                <div class="step-title">Get Your API Key</div>
                <div class="step-description">Visit <a href="#" data-link="https://makersuite.google.com/app/apikey">Google AI Studio</a> and generate a free API key.</div>
            </li>
            <li>
                <div class="step-title">Configure the Extension</div>
                <div class="step-description">Open BaselineGate settings and paste your API key into the <span class="code-inline">baselineGate.geminiApiKey</span> field.</div>
                <button class="action-button" data-action="settings">Open Settings</button>
            </li>
            <li>
                <div class="step-title">Choose Your Model (Optional)</div>
                <div class="step-description">The default model is <span class="code-inline">gemini-2.0-flash</span>. Change <span class="code-inline">baselineGate.geminiModel</span> if needed.</div>
            </li>
            <li>
                <div class="step-title">Add Custom Prompts (Optional)</div>
                <div class="step-description">Use <span class="code-inline">baselineGate.geminiCustomPrompt</span> to add custom instructions to all AI requests.</div>
            </li>
            <li>
                <div class="step-title">Start Using AI Features</div>
                <div class="step-description">Click "Fix with Gemini" on any finding or start a threaded chat for iterative debugging.</div>
            </li>
        </ol>

        <div class="tip-box">
            <div class="tip-title"><span class="emoji">💡</span> Pro Tip</div>
            <div class="tip-content">
                Conversations are saved per finding. Use "View Existing Suggestions" to filter the dashboard and see all items with AI chat history.
            </div>
        </div>
    </div>

    <!-- Configuration Settings -->
    <div class="section">
        <h2><span class="emoji">⚙️</span> Configuration Settings</h2>
        <p>Customize BaselineGate behavior under <strong>Settings → Extensions → BaselineGate</strong>:</p>

        <table class="settings-table">
            <thead>
                <tr>
                    <th>Setting</th>
                    <th>Type</th>
                    <th>Default</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><span class="code-inline">target</span></td>
                    <td>string</td>
                    <td>enterprise</td>
                    <td>Target baseline cohort: <strong>modern</strong> (latest browsers) or <strong>enterprise</strong> (wider support)</td>
                </tr>
                <tr>
                    <td><span class="code-inline">showDesktopBrowsers</span></td>
                    <td>boolean</td>
                    <td>true</td>
                    <td>Show desktop browser columns (Chrome, Edge, Firefox, Safari)</td>
                </tr>
                <tr>
                    <td><span class="code-inline">showMobileBrowsers</span></td>
                    <td>boolean</td>
                    <td>true</td>
                    <td>Show mobile browser columns (Chrome Android, Firefox Android, Safari iOS)</td>
                </tr>
                <tr>
                    <td><span class="code-inline">geminiApiKey</span> <span class="badge badge-required">Required for AI</span></td>
                    <td>string</td>
                    <td>""</td>
                    <td>Your Google Gemini API key for AI suggestions</td>
                </tr>
                <tr>
                    <td><span class="code-inline">geminiModel</span> <span class="badge badge-optional">Optional</span></td>
                    <td>string</td>
                    <td>gemini-2.0-flash</td>
                    <td>Gemini model ID to use for requests</td>
                </tr>
                <tr>
                    <td><span class="code-inline">geminiCustomPrompt</span> <span class="badge badge-optional">Optional</span></td>
                    <td>string</td>
                    <td>""</td>
                    <td>Custom prompt prefix for all AI requests</td>
                </tr>
                <tr>
                    <td><span class="code-inline">blockedBudget</span></td>
                    <td>number</td>
                    <td>0</td>
                    <td>Maximum tolerated blocked findings</td>
                </tr>
                <tr>
                    <td><span class="code-inline">warningBudget</span></td>
                    <td>number</td>
                    <td>5</td>
                    <td>Maximum tolerated needs-review findings</td>
                </tr>
                <tr>
                    <td><span class="code-inline">safeGoal</span></td>
                    <td>number</td>
                    <td>10</td>
                    <td>Target number of safe findings</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Using the Dashboard -->
    <div class="section">
        <h2><span class="emoji">📊</span> Using the Dashboard</h2>
        
        <h3>Filtering & Sorting</h3>
        <ul>
            <li><strong>Search:</strong> Type feature names, tokens, or filenames in the search box</li>
            <li><strong>Severity Filter:</strong> Toggle Blocked, Needs Review, and Safe checkboxes</li>
            <li><strong>Sort Order:</strong> Choose between "Severity (blocked first)" or "File path"</li>
            <li><strong>Group Similar:</strong> Enable to collapse duplicate issues across files</li>
        </ul>

        <h3>Detail Panel</h3>
        <p>Click any finding to open the detail panel on the right:</p>
        <ul>
            <li>View full browser support matrix</li>
            <li>See code snippet and file location</li>
            <li>Access MDN documentation links</li>
            <li>Use "Fix with Gemini" or "Start Gemini Chat"</li>
        </ul>

        <h3>Insights Overlay</h3>
        <p>Click the <strong>Insights</strong> button to view:</p>
        <ul>
            <li><strong>Trend History:</strong> Visualize scan results over time</li>
            <li><strong>Feature Group Focus:</strong> See which feature groups have the most issues</li>
            <li><strong>Baseline Budgets:</strong> Track progress against your configured limits</li>
        </ul>

        <div class="tip-box">
            <div class="tip-title"><span class="emoji">🎯</span> Quick Tip</div>
            <div class="tip-content">
                Use <span class="code-inline">Cmd/Ctrl+Shift+P</span> to open the command palette and access all BaselineGate commands quickly.
            </div>
        </div>
    </div>

    <!-- Common Commands -->
    <div class="section">
        <h2><span class="emoji">⌨️</span> Common Commands</h2>
        <ul class="command-list">
            <li><span class="command-name">Baseline Gate: Scan Workspace</span> – Analyze all JS/CSS files for compatibility issues</li>
            <li><span class="command-name">Baseline Gate: Search Findings</span> – Filter results by feature, token, or filename</li>
            <li><span class="command-name">Baseline Gate: Filter by Severity</span> – Choose which severity levels to display</li>
            <li><span class="command-name">Baseline Gate: Clear Filters</span> – Reset all filters to default state</li>
            <li><span class="command-name">Baseline Gate: Detailed Analysis</span> – Open full-page dashboard with charts</li>
            <li><span class="command-name">Baseline Gate: View Existing Suggestions</span> – Show findings with Gemini conversations</li>
            <li><span class="command-name">Baseline Gate: Open Settings</span> – Jump to BaselineGate settings</li>
            <li><span class="command-name">Reset BaselineGate to Factory Settings</span> – Clear all data and reset configuration</li>
        </ul>
    </div>

    <!-- Workflow Tips -->
    <div class="section">
        <h2><span class="emoji">💼</span> Recommended Workflow</h2>
        <ol class="step-list">
            <li>
                <div class="step-title">Configure Your Target</div>
                <div class="step-description">Set <span class="code-inline">baselineGate.target</span> to match your audience (modern or enterprise)</div>
            </li>
            <li>
                <div class="step-title">Set Budget Limits</div>
                <div class="step-description">Define acceptable thresholds for blocked and warning findings</div>
            </li>
            <li>
                <div class="step-title">Run Initial Scan</div>
                <div class="step-description">Get a baseline measurement of your current compatibility status</div>
            </li>
            <li>
                <div class="step-title">Triage Critical Issues</div>
                <div class="step-description">Focus on blocked findings first, use Gemini for remediation ideas</div>
            </li>
            <li>
                <div class="step-title">Track Progress</div>
                <div class="step-description">Regular scans build history in the Insights overlay</div>
            </li>
            <li>
                <div class="step-title">Export Reports</div>
                <div class="step-description">Use Detailed Analysis view to export CSV/JSON for team sharing</div>
            </li>
        </ol>
    </div>

    <!-- Troubleshooting -->
    <div class="section">
        <h2><span class="emoji">🔧</span> Troubleshooting</h2>
        
        <h3>Hover Tooltips Not Showing?</h3>
        <ul>
            <li>Make sure you're hovering directly over the token (e.g., the <span class="code-inline">any</span> in <span class="code-inline">Promise.any</span>)</li>
            <li>Check that your file type is supported (JS, TS, CSS, SCSS)</li>
        </ul>

        <h3>Gemini Not Working?</h3>
        <ul>
            <li>Verify your API key is correctly configured in settings</li>
            <li>Check your internet connection</li>
            <li>Ensure the model ID matches your API key permissions</li>
        </ul>

        <h3>Missing Browser Support Data?</h3>
        <ul>
            <li>Make sure <span class="code-inline">showDesktopBrowsers</span> and <span class="code-inline">showMobileBrowsers</span> are enabled</li>
            <li>Some features may have incomplete data in the web-features dataset</li>
        </ul>

        <h3>Need to Start Fresh?</h3>
        <ul>
            <li>Use <strong>Reset BaselineGate to Factory Settings</strong> to clear all data and configuration</li>
            <li>This removes the <span class="code-inline">.baseline-gate/</span> directory and resets all settings</li>
        </ul>
    </div>

    <!-- Resources -->
    <div class="section">
        <h2><span class="emoji">📚</span> Resources</h2>
        <ul>
            <li><a href="#" data-link="https://github.com/iflashlord/baseline-gate">GitHub Repository</a> – Report issues and contribute</li>
            <li><a href="#" data-link="https://web.dev/baseline/">What is Baseline?</a> – Learn about browser compatibility standards</li>
            <li><a href="#" data-link="https://makersuite.google.com/app/apikey">Google AI Studio</a> – Get your Gemini API key</li>
            <li><a href="#" data-link="https://developer.mozilla.org/en-US/docs/Web">MDN Web Docs</a> – Detailed feature documentation</li>
        </ul>
    </div>

    <button class="scroll-top" data-scroll-top>↑</button>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        // Handle action buttons
        document.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                if (action === 'scan') {
                    vscode.postMessage({ type: 'scanWorkspace' });
                } else if (action === 'settings') {
                    vscode.postMessage({ type: 'openSettings' });
                }
            });
        });

        // Handle external links
        document.querySelectorAll('[data-link]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = e.target.getAttribute('data-link');
                vscode.postMessage({ type: 'openExternalLink', url });
            });
        });

        // Scroll to top button
        const scrollTopBtn = document.querySelector('[data-scroll-top]');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        });

        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
