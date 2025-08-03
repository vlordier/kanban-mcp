"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KanbanWebviewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class KanbanWebviewProvider {
    constructor(context, mcpClient) {
        this.context = context;
        this.mcpClient = mcpClient;
        this.panels = new Map();
    }
    showKanbanBoard(boardId) {
        const panelKey = boardId || 'main';
        const existingPanel = this.panels.get(panelKey);
        if (existingPanel) {
            existingPanel.reveal(vscode.ViewColumn.One);
            return;
        }
        const panel = vscode.window.createWebviewPanel('kanbanBoard', boardId ? `Kanban Board - ${boardId}` : 'Kanban Board', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
                vscode.Uri.file(path.join(this.context.extensionPath, '..', 'web-ui', 'dist'))
            ]
        });
        this.panels.set(panelKey, panel);
        // Handle panel disposal
        panel.onDidDispose(() => {
            this.panels.delete(panelKey);
        });
        // Set the webview's HTML content
        panel.webview.html = this.getWebviewContent(panel.webview, boardId);
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'createBoard':
                    try {
                        await this.mcpClient.createBoard(message.name, message.goal);
                        panel.webview.postMessage({
                            type: 'boardCreated',
                            success: true
                        });
                    }
                    catch (error) {
                        panel.webview.postMessage({
                            type: 'boardCreated',
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                    break;
                case 'createTask':
                    try {
                        await this.mcpClient.createTask(message.columnId, message.title, message.content);
                        panel.webview.postMessage({
                            type: 'taskCreated',
                            success: true
                        });
                    }
                    catch (error) {
                        panel.webview.postMessage({
                            type: 'taskCreated',
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                    break;
                case 'moveTask':
                    try {
                        await this.mcpClient.moveTask(message.taskId, message.targetColumnId, message.reason);
                        panel.webview.postMessage({
                            type: 'taskMoved',
                            success: true
                        });
                    }
                    catch (error) {
                        panel.webview.postMessage({
                            type: 'taskMoved',
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                    break;
                case 'openExternal':
                    if (message.url) {
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                    }
                    break;
            }
        }, undefined, this.context.subscriptions);
    }
    getWebviewContent(webview, boardId) {
        // Try to load the built React app first
        const webUiDistPath = path.join(this.context.extensionPath, '..', 'web-ui', 'dist');
        const indexPath = path.join(webUiDistPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            // Convert relative paths to webview URIs
            const distUri = webview.asWebviewUri(vscode.Uri.file(webUiDistPath));
            html = html.replace(/(src|href)="\.\/([^"]+)"/g, (_, attr, src) => `${attr}="${distUri}/${src}"`);
            // Inject VSCode API and board context
            const scriptInjection = `
                <script>
                    window.vscode = acquireVsCodeApi();
                    window.initialBoardId = ${boardId ? `"${boardId}"` : 'null'};
                    
                    // Override API base URL to use the web server
                    window.API_BASE_URL = "${this.mcpClient.getWebServerUrl()}";
                    
                    // Add message passing helpers
                    window.vsCodePostMessage = (type, data) => {
                        window.vscode.postMessage({ type, ...data });
                    };
                </script>
            `;
            html = html.replace('</head>', `${scriptInjection}</head>`);
            return html;
        }
        else {
            // Fallback to a simple HTML page with instructions
            return this.getFallbackContent(webview, boardId);
        }
    }
    getFallbackContent(webview, boardId) {
        const webServerUrl = this.mcpClient.getWebServerUrl();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kanban MCP</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            max-width: 600px;
            text-align: center;
        }
        .error-message {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .info-message {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 15px;
            margin: 20px 0;
        }
        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
            text-decoration: none;
            display: inline-block;
        }
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        iframe {
            width: 100%;
            height: 80vh;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        .instructions {
            text-align: left;
            margin: 20px 0;
        }
        .instructions h3 {
            color: var(--vscode-textPreformat-foreground);
        }
        .instructions code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Kanban MCP Extension</h1>
        
        <div class="info-message">
            <strong>Web UI Not Built Yet</strong><br>
            The React web UI needs to be built before it can be embedded in this webview.
        </div>

        <div class="instructions">
            <h3>To set up the full Kanban experience:</h3>
            <ol>
                <li>Build the web UI:
                    <pre><code>cd ../web-ui && npm run build</code></pre>
                </li>
                <li>Start the Kanban web server:
                    <pre><code>cd ../web-server && npm run dev</code></pre>
                </li>
                <li>Reload this webview panel</li>
            </ol>
        </div>

        <div class="info-message">
            <strong>Quick Access:</strong><br>
            You can also open the Kanban board directly in your browser:
        </div>

        <button class="button" onclick="openInBrowser()">
            🌐 Open in Browser
        </button>

        <div id="iframe-container" style="display: none;">
            <h3>Kanban Board (Direct Web Access)</h3>
            <iframe src="${webServerUrl}${boardId ? `?board=${boardId}` : ''}" 
                    title="Kanban Board"></iframe>
        </div>

        <button class="button" onclick="toggleIframe()" id="iframe-toggle">
            📱 Show Embedded View
        </button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function openInBrowser() {
            vscode.postMessage({
                type: 'openExternal',
                url: '${webServerUrl}${boardId ? `?board=${boardId}` : ''}'
            });
        }

        function toggleIframe() {
            const container = document.getElementById('iframe-container');
            const button = document.getElementById('iframe-toggle');
            
            if (container.style.display === 'none') {
                container.style.display = 'block';
                button.textContent = '🔼 Hide Embedded View';
            } else {
                container.style.display = 'none';
                button.textContent = '📱 Show Embedded View';
            }
        }

        // Check if web server is accessible
        fetch('${webServerUrl}/health')
            .then(response => {
                if (response.ok) {
                    document.getElementById('iframe-toggle').style.display = 'inline-block';
                }
            })
            .catch(error => {
                console.log('Web server not accessible:', error);
            });
    </script>
</body>
</html>`;
    }
}
exports.KanbanWebviewProvider = KanbanWebviewProvider;
//# sourceMappingURL=KanbanWebviewProvider.js.map