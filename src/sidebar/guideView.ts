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

  private static _getSvgIcon(name: string, className: string = 'icon-svg'): string {
    const icons: Record<string, string> = {
      rocket: '<path d="M8 1l6 6-2 2-2-2-3 3v3l-2 2-1-4-4-1 2-2h3l3-3-2-2 6-6z" fill="currentColor"/><circle cx="11" cy="5" r="1" fill="currentColor"/>',
      zap: '<path d="M11 1L5.5 9.5h3L7 15l5.5-8.5h-3L11 1z" stroke="currentColor" stroke-width="0.5" fill="currentColor"/>',
      sparkle: '<path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11l-1.5-3.5L3 6l3.5-1.5L8 1zm4 9l.75 1.75L14 12l-1.25.25L12 14l-.75-1.75L10 12l1.25-.25L12 10z"/>',
      target: '<circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="8" cy="8" r="1.5"/>',
      graph: '<path d="M1.5 14h13v1h-13v-1zM3 12h2v2H3v-2zm3-4h2v6H6V8zm3-4h2v10H9V4zm3 2h2v8h-2V6z"/>',
      hubot: '<path d="M8.5 1h-1C7.225 1 7 1.225 7 1.5v1a.5.5 0 0 1-1 0v-1C6 .675 6.675 0 7.5 0h1c.825 0 1.5.675 1.5 1.5v1a.5.5 0 0 1-1 0v-1c0-.275-.225-.5-.5-.5zM13 5h-1V4c0-1.103-.897-2-2-2H6c-1.103 0-2 .897-2 2v1H3c-.55 0-1 .45-1 1v7c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V6c0-.55-.45-1-1-1zm-3 0H6V4c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v1z"/><circle cx="6" cy="9" r="1"/><circle cx="10" cy="9" r="1"/><path d="M6 11h4v1H6z"/>',
      graphLine: '<path d="M1 14h14v1H1v-1zm1-2l2.5-2.5L7 12l3-4 2.5 2L15 7v7H2v-2z" stroke="currentColor" stroke-width="0.5"/>',
      search: '<circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      database: '<ellipse cx="8" cy="3" rx="6" ry="2" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2 3v10c0 1.1 2.7 2 6 2s6-.9 6-2V3" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2 7c0 1.1 2.7 2 6 2s6-.9 6-2M2 11c0 1.1 2.7 2 6 2s6-.9 6-2" fill="none" stroke="currentColor" stroke-width="1"/>',
      lightbulb: '<path d="M8 1a4.5 4.5 0 0 0-1.5 8.742V11.5h3V9.742A4.5 4.5 0 0 0 8 1zm1 11h-2v1h2v-1zm0 2h-2v1h2v-1z"/>',
      settingsGear: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracurrentColorerCarrier" stroke-linecurrentcolorap="round" stroke-linejoin="round"></g><g id="SVGRepo_icurrentColoronCarrier"> <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecurrentcolorap="round" stroke-linejoin="round"></path> <path d="M2 12.8799V11.1199C2 10.0799 2.85 9.21994 3.9 9.21994C5.71 9.21994 6.45 7.93994 5.54 6.36994C5.02 5.46994 5.33 4.29994 6.24 3.77994L7.97 2.78994C8.76 2.31994 9.78 2.59994 10.25 3.38994L10.36 3.57994C11.26 5.14994 12.74 5.14994 13.65 3.57994L13.76 3.38994C14.23 2.59994 15.25 2.31994 16.04 2.78994L17.77 3.77994C18.68 4.29994 18.99 5.46994 18.47 6.36994C17.56 7.93994 18.3 9.21994 20.11 9.21994C21.15 9.21994 22.01 10.0699 22.01 11.1199V12.8799C22.01 13.9199 21.16 14.7799 20.11 14.7799C18.3 14.7799 17.56 16.0599 18.47 17.6299C18.99 18.5399 18.68 19.6999 17.77 20.2199L16.04 21.2099C15.25 21.6799 14.23 21.3999 13.76 20.6099L13.65 20.4199C12.75 18.8499 11.27 18.8499 10.36 20.4199L10.25 20.6099C9.78 21.3999 8.76 21.6799 7.97 21.2099L6.24 20.2199C5.33 19.6999 5.02 18.5299 5.54 17.6299C6.45 16.0599 5.71 14.7799 3.9 14.7799C2.85 14.7799 2 13.9199 2 12.8799Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecurrentcolorap="round" stroke-linejoin="round"></path> </g></svg>',
      keyboard: '<rect x="1" y="3" width="14" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1"/><rect x="3" y="5" width="1.5" height="1.5" fill="currentColor"/><rect x="5" y="5" width="1.5" height="1.5" fill="currentColor"/><rect x="7" y="5" width="1.5" height="1.5" fill="currentColor"/><rect x="9" y="5" width="1.5" height="1.5" fill="currentColor"/><rect x="11" y="5" width="1.5" height="1.5" fill="currentColor"/><rect x="3" y="7" width="1.5" height="1.5" fill="currentColor"/><rect x="5" y="7" width="1.5" height="1.5" fill="currentColor"/><rect x="7" y="7" width="1.5" height="1.5" fill="currentColor"/><rect x="9" y="7" width="1.5" height="1.5" fill="currentColor"/><rect x="11" y="7" width="1.5" height="1.5" fill="currentColor"/><rect x="4" y="9.5" width="8" height="1.5" fill="currentColor" rx="0.5"/>',
      briefcase: '<rect x="2" y="5" width="12" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1"/><path d="M5 5V3.5C5 2.67 5.67 2 6.5 2h3c.83 0 1.5.67 1.5 1.5V5" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2 8h12" stroke="currentColor" stroke-width="1"/>',
      tools: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill="none" stroke="currentColor" stroke-width="2" d="M1,5 C1,3.00000024 2,1 3,1 C3,1 5,5 5,5 L7,5 C7,5 9,1 9,1 C10,1 11,3.00000006 11,5 C11,7.25400025 10,9.0000003 8,10 L8,21 C8,22 8,23 6,23 C4,23 4,22 4,21 L4,10 C2,9.0000003 1,7.25400042 1,5 Z M19,12 L19,18 M17,18 L18,23 L20,23 L21,18 L17,18 Z M14,12 L24,12 L14,12 Z M21,12 L21,3 C21,1.895 20.105,1 19,1 C17.895,1 17,1.895 17,3 L17,12"></path> </g></svg>',
      userGuide: '<svg fill="currentColor" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 427.773 427.773" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M421.504,357.406l-34.771-34.771c-3.839-3.836-8.771-5.905-13.789-6.222l-11.812-11.81 c17.547-27.896,14.189-65.271-10.076-89.535c-28.166-28.167-73.993-28.166-102.162,0c-28.162,28.166-28.162,73.995,0.004,102.161 c24.265,24.266,61.64,27.622,89.531,10.076l11.813,11.81c0.313,5.021,2.385,9.953,6.223,13.79l34.771,34.771 c8.358,8.359,21.909,8.357,30.27,0C429.861,379.318,429.863,365.766,421.504,357.406z M335.924,302.096 c-19.82,19.819-52.07,19.819-71.892,0c-19.819-19.82-19.819-52.069,0-71.891c19.818-19.82,52.066-19.82,71.892,0.001 C355.742,250.026,355.742,282.276,335.924,302.096z"></path> <path d="M236.812,204.111c16.552-16.55,38.584-25.665,62.041-25.665s45.49,9.114,62.041,25.665 c14.13,14.128,23.068,32.854,25.173,52.733c1.618,15.289-0.81,30.8-7.021,44.875l0.211,0.211 c6.553,1.604,12.537,4.972,17.312,9.744l3.432,3.433V75.095c0-3.779-1.871-7.315-5-9.44 c-30.646-20.82-65.452-31.827-100.669-31.827c-32.813,0-65.27,9.561-94.332,27.711c-29.072-18.15-61.537-27.711-94.35-27.711 c-35.207,0-70.014,11.006-100.652,31.827C1.871,67.781,0,71.317,0,75.095v267.551c0,4.229,2.336,8.11,6.074,10.091 c3.738,1.979,8.258,1.728,11.758-0.647c26.836-18.235,57.207-27.879,87.822-27.879c30.617,0,60.994,9.644,87.84,27.881 c1.922,1.311,4.164,1.974,6.408,1.974c0.012,0,0.025-0.002,0.039-0.002c2.301,0.03,4.6-0.634,6.566-1.974 c11.48-7.801,23.611-14.016,36.129-18.59c-2.004-1.677-3.953-3.438-5.821-5.308C202.603,293.983,202.603,238.32,236.812,204.111z M233.032,110.767c21.408-14.636,50.663-16.821,66.198-16.821c15.534,0,44.791,2.186,66.198,16.821 c5.271,3.603,6.621,10.794,3.021,16.063c-3.603,5.269-10.797,6.621-16.064,3.019c-11.887-8.127-31.262-12.789-53.153-12.789 c-21.893,0-41.269,4.661-53.154,12.789c-1.994,1.363-4.266,2.018-6.512,2.018c-3.689,0-7.313-1.761-9.554-5.036 C226.411,121.562,227.764,114.37,233.032,110.767z M233.032,160.767c21.408-14.636,50.663-16.821,66.198-16.821 c15.534,0,44.791,2.186,66.198,16.821c5.271,3.603,6.621,10.794,3.021,16.063c-3.603,5.269-10.797,6.621-16.064,3.019 c-11.887-8.127-31.262-12.789-53.153-12.789c-21.893,0-41.269,4.661-53.154,12.789c-1.994,1.363-4.266,2.018-6.512,2.018 c-3.689,0-7.313-1.761-9.554-5.036C226.411,171.562,227.764,164.37,233.032,160.767z M169.986,276.831 c-3.602,5.27-10.795,6.621-16.064,3.02c-11.887-8.128-31.262-12.789-53.154-12.789s-41.268,4.661-53.154,12.789 c-1.994,1.362-4.266,2.019-6.512,2.019c-3.689,0-7.313-1.761-9.553-5.036c-3.602-5.27-2.25-12.461,3.02-16.062 c21.408-14.638,50.664-16.821,66.199-16.821s44.791,2.187,66.199,16.821C172.236,264.37,173.587,271.562,169.986,276.831z M169.986,226.831c-3.602,5.27-10.795,6.621-16.064,3.02c-11.887-8.128-31.262-12.789-53.154-12.789s-41.268,4.661-53.154,12.789 c-1.994,1.362-4.266,2.019-6.512,2.019c-3.689,0-7.313-1.761-9.553-5.036c-3.602-5.27-2.25-12.461,3.02-16.063 c21.408-14.636,50.664-16.821,66.199-16.821s44.791,2.186,66.199,16.821C172.236,214.37,173.587,221.562,169.986,226.831z M169.986,176.831c-3.602,5.269-10.795,6.621-16.064,3.019c-11.887-8.127-31.262-12.789-53.154-12.789 S59.5,171.722,47.614,179.85c-1.994,1.363-4.266,2.018-6.512,2.018c-3.689,0-7.313-1.761-9.553-5.036 c-3.602-5.269-2.25-12.461,3.02-16.063c21.408-14.636,50.664-16.821,66.199-16.821s44.791,2.186,66.199,16.821 C172.236,164.37,173.587,171.562,169.986,176.831z M169.986,126.831c-3.602,5.269-10.795,6.621-16.064,3.019 c-11.887-8.127-31.262-12.789-53.154-12.789S59.5,121.722,47.614,129.85c-1.994,1.363-4.266,2.018-6.512,2.018 c-3.689,0-7.313-1.761-9.553-5.036c-3.602-5.269-2.25-12.461,3.02-16.063c21.408-14.636,50.664-16.821,66.199-16.821 s44.791,2.186,66.199,16.821C172.236,114.37,173.587,121.562,169.986,126.831z"></path> </g> </g> </g> </g></svg>',
      library: '<path d="M2 2h1v12H2V2zm2 0h1.5v12H4V2zm3.5 0h1v12h-1V2zm3 0h1v12h-1V2zm2.5 0h1.5v12H13V2z" fill="currentColor"/><path d="M2 2h12M2 14h12" stroke="currentColor" stroke-width="0.5"/>'
    };
    
    const pathData = icons[name] || '';
    return `<svg class="${className}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">${pathData}</svg>`;
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

        .icon-svg {
            display: inline-block;
            width: 16px;
            height: 16px;
            vertical-align: middle;
            fill: currentColor;
            flex-shrink: 0;
        }

        h1 .icon-svg {
            width: 24px;
            height: 24px;
            margin-right: 8px;
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

        h2 .icon-svg {
            width: 18px;
            height: 18px;
        }

        .feature-icon .icon-svg {
            width: 28px;
            height: 28px;
        }

        .tip-title .icon-svg {
            width: 16px;
            height: 16px;
            margin-right: 6px;
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
    <h1>${this._getSvgIcon('userGuide')} BaselineGate User Guide</h1>

    <div class="intro">
        <p><strong>Welcome to BaselineGate!</strong> This guide will help you get started with detecting browser compatibility issues, using AI-powered suggestions, and managing your baseline budgets effectively.</p>
    </div>

    <!-- Quick Start -->
    <div class="section">
        <h2>${this._getSvgIcon('zap')} Quick Start</h2>
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
        <h2>${this._getSvgIcon('sparkle')} Key Features</h2>
        <div class="feature-grid">
            <div class="feature-card">
                <div class="feature-icon">${this._getSvgIcon('target')}</div>
                <div class="feature-title">Hover Tooltips</div>
                <div class="feature-desc">Instant browser support data for JS APIs and CSS features directly in your editor</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">${this._getSvgIcon('graph')}</div>
                <div class="feature-title">Workspace Dashboard</div>
                <div class="feature-desc">Comprehensive triage view with filtering, grouping, and severity prioritization</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">${this._getSvgIcon('sparkle')}</div>
                <div class="feature-title">Gemini AI Assistant</div>
                <div class="feature-desc">Get AI-powered remediation guidance and fallback suggestions for compatibility issues</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">${this._getSvgIcon('graphLine')}</div>
                <div class="feature-title">Insights & Budgets</div>
                <div class="feature-desc">Track trends, top offenders, and progress against your compatibility budgets</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">${this._getSvgIcon('search')}</div>
                <div class="feature-title">Detailed Analysis</div>
                <div class="feature-desc">Full-page dashboard with charts, sortable tables, and CSV/JSON export</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">${this._getSvgIcon('database')}</div>
                <div class="feature-title">Workspace Storage</div>
                <div class="feature-desc">All data stored in <span class="code-inline">.baseline-gate/</span> travels with your repository</div>
            </div>
        </div>
    </div>

    <!-- Setting Up Gemini AI -->
    <div class="section">
        <h2>${this._getSvgIcon('hubot')} Setting Up Gemini AI</h2>
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
            <div class="tip-title">${this._getSvgIcon('lightbulb')} Pro Tip</div>
            <div class="tip-content">
                Conversations are saved per finding. Use "View Existing Suggestions" to filter the dashboard and see all items with AI chat history.
            </div>
        </div>
    </div>

    <!-- Configuration Settings -->
    <div class="section">
        <h2>${this._getSvgIcon('settingsGear')} Configuration Settings</h2>
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
        <h2>${this._getSvgIcon('graph')} Using the Dashboard</h2>
        
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
            <div class="tip-title">${this._getSvgIcon('target')} Quick Tip</div>
            <div class="tip-content">
                Use <span class="code-inline">Cmd/Ctrl+Shift+P</span> to open the command palette and access all BaselineGate commands quickly.
            </div>
        </div>
    </div>

    <!-- Common Commands -->
    <div class="section">
        <h2>${this._getSvgIcon('keyboard')} Common Commands</h2>
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
        <h2>${this._getSvgIcon('briefcase')} Recommended Workflow</h2>
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
        <h2>${this._getSvgIcon('tools')} Troubleshooting</h2>
        
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
        <h2>${this._getSvgIcon('library')} Resources</h2>
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
