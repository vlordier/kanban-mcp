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
    constructor(context, mcpClient, embeddedServer) {
        this.context = context;
        this.mcpClient = mcpClient;
        this.embeddedServer = embeddedServer;
        this.panels = new Map();
        this.logger = vscode.window.createOutputChannel('Kanban Webview Debug');
        this.logger.appendLine('🖥️ KanbanWebviewProvider initialized');
    }
    showKanbanBoard(boardId, columnId) {
        const panelKey = boardId || 'main';
        this.logger.appendLine(`📋 showKanbanBoard called with boardId: ${boardId || 'none'}, columnId: ${columnId || 'none'}`);
        const existingPanel = this.panels.get(panelKey);
        if (existingPanel) {
            this.logger.appendLine('🗑️ Disposing existing panel to create fresh one');
            existingPanel.dispose(); // Force dispose to create new panel with updated code
            this.panels.delete(panelKey);
        }
        this.logger.appendLine('🖥️ Creating new webview panel...');
        const mediaPath = path.join(this.context.extensionPath, 'media');
        const mediaUri = vscode.Uri.file(mediaPath);
        this.logger.appendLine(`🔐 Setting localResourceRoots to: ${mediaPath}`);
        this.logger.appendLine(`🔐 Media URI: ${mediaUri.toString()}`);
        const panel = vscode.window.createWebviewPanel('kanbanBoard', boardId ? `Kanban Board - ${boardId}` : 'Kanban Board', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [mediaUri],
            enableCommandUris: true,
            enableFindWidget: true
        });
        this.logger.appendLine('✅ Webview panel created successfully');
        this.panels.set(panelKey, panel);
        // Handle panel disposal
        panel.onDidDispose(() => {
            this.logger.appendLine('🗑️ Webview panel disposed');
            this.panels.delete(panelKey);
        });
        // Set the webview's HTML content
        this.logger.appendLine('📄 Setting webview HTML content...');
        try {
            panel.webview.html = this.getWebviewContent(panel.webview, boardId, columnId);
            this.logger.appendLine('✅ Webview HTML content set successfully');
        }
        catch (error) {
            this.logger.appendLine(`❌ Failed to set webview HTML content: ${error}`);
        }
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async (message) => {
            this.logger.appendLine(`📥 Received message from webview: ${JSON.stringify(message)}`);
            console.log('📥 Received message from webview:', message);
            switch (message.type) {
                case 'showHealthStatus':
                    // Trigger health status display
                    vscode.commands.executeCommand('kanban-mcp.showHealthStatus');
                    break;
                case 'openExternal':
                    if (message.url) {
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                    }
                    break;
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
                case 'apiRequest':
                    // Handle API requests from webview
                    this.logger.appendLine(`🔄 Processing API request: ${message.method} ${message.endpoint}`);
                    console.log('🔄 Processing API request:', message.method, message.endpoint, message.data);
                    try {
                        let result;
                        const { method, endpoint, data: requestData } = message;
                        switch (method) {
                            case 'GET':
                                if (endpoint === '/boards') {
                                    const boards = this.embeddedServer.getBoards();
                                    // Convert to snake_case for web-ui compatibility
                                    result = boards.map(board => ({
                                        id: board.id,
                                        name: board.name,
                                        goal: board.goal,
                                        landing_column_id: null,
                                        created_at: board.createdAt,
                                        updated_at: board.updatedAt
                                    }));
                                }
                                else if (endpoint.match(/^\/boards\/(.+)$/)) {
                                    const boardId = endpoint.match(/^\/boards\/(.+)$/)?.[1];
                                    if (boardId) {
                                        const boardData = this.embeddedServer.getBoard(boardId);
                                        if (boardData) {
                                            // Convert board and tasks to snake_case for web-ui compatibility
                                            const webBoard = {
                                                id: boardData.board.id,
                                                name: boardData.board.name,
                                                goal: boardData.board.goal,
                                                landing_column_id: null,
                                                created_at: boardData.board.createdAt,
                                                updated_at: boardData.board.updatedAt
                                            };
                                            const webColumns = boardData.columns.map(column => {
                                                // Get tasks for this column from the embedded server
                                                const columnTasks = this.embeddedServer.exportData().tasks.filter(task => task.columnId === column.id);
                                                return {
                                                    id: column.id,
                                                    board_id: column.boardId,
                                                    name: column.name,
                                                    position: column.position,
                                                    wip_limit: 0,
                                                    is_done_column: 0,
                                                    tasks: columnTasks.map(task => ({
                                                        id: task.id,
                                                        title: task.title,
                                                        position: task.position,
                                                        created_at: task.createdAt,
                                                        updated_at: task.updatedAt,
                                                        update_reason: undefined
                                                    }))
                                                };
                                            });
                                            result = { board: webBoard, columns: webColumns };
                                        }
                                        else {
                                            result = null;
                                        }
                                    }
                                }
                                else if (endpoint.match(/^\/tasks\/(.+)$/)) {
                                    const taskId = endpoint.match(/^\/tasks\/(.+)$/)?.[1];
                                    if (taskId) {
                                        const task = this.embeddedServer.getTask(taskId);
                                        if (task) {
                                            // Convert to snake_case for web-ui compatibility
                                            result = {
                                                id: task.id,
                                                title: task.title,
                                                content: task.content,
                                                position: task.position,
                                                column_id: task.columnId,
                                                created_at: task.createdAt,
                                                updated_at: task.updatedAt
                                            };
                                        }
                                        else {
                                            result = null;
                                        }
                                    }
                                }
                                else if (endpoint === '/export') {
                                    const exportData = this.embeddedServer.exportData();
                                    // Convert to snake_case for web-ui compatibility
                                    const webExportData = {
                                        boards: exportData.boards.map(board => ({
                                            id: board.id,
                                            name: board.name,
                                            goal: board.goal,
                                            landing_column_id: null,
                                            created_at: board.createdAt,
                                            updated_at: board.updatedAt
                                        })),
                                        columns: exportData.columns.map(column => ({
                                            id: column.id,
                                            board_id: column.boardId,
                                            name: column.name,
                                            position: column.position,
                                            wip_limit: 0,
                                            is_done_column: 0
                                        })),
                                        tasks: exportData.tasks.map(task => ({
                                            id: task.id,
                                            title: task.title,
                                            content: task.content,
                                            position: task.position,
                                            column_id: task.columnId,
                                            created_at: task.createdAt,
                                            updated_at: task.updatedAt
                                        }))
                                    };
                                    result = JSON.stringify(webExportData, null, 2);
                                }
                                break;
                            case 'POST':
                                if (endpoint === '/boards') {
                                    const board = this.embeddedServer.createBoard(requestData.name, requestData.goal);
                                    // Convert to snake_case for web-ui compatibility
                                    result = {
                                        id: board.id,
                                        name: board.name,
                                        goal: board.goal,
                                        landing_column_id: null,
                                        created_at: board.createdAt,
                                        updated_at: board.updatedAt
                                    };
                                }
                                else if (endpoint === '/tasks') {
                                    const task = this.embeddedServer.createTask(requestData.columnId, requestData.title, requestData.content);
                                    if (task) {
                                        // Convert to snake_case for web-ui compatibility
                                        const webTask = {
                                            id: task.id,
                                            title: task.title,
                                            content: task.content,
                                            position: task.position,
                                            column_id: task.columnId,
                                            created_at: task.createdAt,
                                            updated_at: task.updatedAt
                                        };
                                        result = { task: webTask };
                                    }
                                    else {
                                        result = { task: null };
                                    }
                                }
                                else if (endpoint.match(/^\/tasks\/(.+)\/move$/)) {
                                    const taskId = endpoint.match(/^\/tasks\/(.+)\/move$/)?.[1];
                                    if (taskId) {
                                        const success = this.embeddedServer.moveTask(taskId, requestData.targetColumnId);
                                        result = { success };
                                    }
                                }
                                else if (endpoint === '/import') {
                                    // Convert from snake_case to camelCase for internal storage
                                    const serverData = {
                                        boards: requestData.boards.map((board) => ({
                                            id: board.id,
                                            name: board.name,
                                            goal: board.goal,
                                            createdAt: board.created_at || new Date().toISOString(),
                                            updatedAt: board.updated_at || new Date().toISOString()
                                        })),
                                        columns: requestData.columns.map((column) => ({
                                            id: column.id,
                                            name: column.name,
                                            position: column.position,
                                            boardId: column.board_id,
                                            tasks: []
                                        })),
                                        tasks: requestData.tasks.map((task) => ({
                                            id: task.id,
                                            title: task.title,
                                            content: task.content || '',
                                            position: task.position,
                                            columnId: task.column_id,
                                            createdAt: task.created_at || new Date().toISOString(),
                                            updatedAt: task.updated_at || new Date().toISOString()
                                        }))
                                    };
                                    const success = this.embeddedServer.importData(serverData);
                                    result = {
                                        success,
                                        message: success ? 'Database imported successfully' : 'Failed to import database',
                                        imported: success ? {
                                            boards: serverData.boards.length,
                                            columns: serverData.columns.length,
                                            tasks: serverData.tasks.length
                                        } : undefined
                                    };
                                }
                                else if (endpoint === '/export-to-file') {
                                    result = await this.handleFileSystemExport(requestData);
                                }
                                break;
                            case 'PUT':
                                if (endpoint.match(/^\/tasks\/(.+)$/)) {
                                    const taskId = endpoint.match(/^\/tasks\/(.+)$/)?.[1];
                                    if (taskId) {
                                        const task = this.embeddedServer.updateTask(taskId, requestData.title, requestData.content);
                                        if (task) {
                                            // Convert to snake_case for web-ui compatibility
                                            const webTask = {
                                                id: task.id,
                                                title: task.title,
                                                content: task.content,
                                                position: task.position,
                                                column_id: task.columnId,
                                                created_at: task.createdAt,
                                                updated_at: task.updatedAt
                                            };
                                            result = { task: webTask };
                                        }
                                        else {
                                            result = { task: null };
                                        }
                                    }
                                }
                                else if (endpoint.match(/^\/boards\/(.+)$/)) {
                                    const boardId = endpoint.match(/^\/boards\/(.+)$/)?.[1];
                                    if (boardId) {
                                        // For now, board updates aren't implemented in embedded server
                                        result = { success: false, error: 'Board updates not implemented' };
                                    }
                                }
                                break;
                            case 'DELETE':
                                if (endpoint.match(/^\/tasks\/(.+)$/)) {
                                    const taskId = endpoint.match(/^\/tasks\/(.+)$/)?.[1];
                                    if (taskId) {
                                        const success = this.embeddedServer.deleteTask(taskId);
                                        result = { success };
                                    }
                                }
                                else if (endpoint.match(/^\/boards\/(.+)$/)) {
                                    const boardId = endpoint.match(/^\/boards\/(.+)$/)?.[1];
                                    if (boardId) {
                                        const success = this.embeddedServer.deleteBoard(boardId);
                                        result = { success };
                                    }
                                }
                                break;
                        }
                        const response = {
                            type: 'apiResponse',
                            requestId: message.requestId,
                            success: true,
                            data: result
                        };
                        this.logger.appendLine(`📤 Sending success response: ${JSON.stringify(response)}`);
                        console.log('📤 Sending success response:', response);
                        panel.webview.postMessage(response);
                    }
                    catch (error) {
                        const errorResponse = {
                            type: 'apiResponse',
                            requestId: message.requestId,
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        };
                        this.logger.appendLine(`📤 Sending error response: ${JSON.stringify(errorResponse)}`);
                        console.log('📤 Sending error response:', errorResponse);
                        panel.webview.postMessage(errorResponse);
                    }
                    break;
            }
        }, undefined, this.context.subscriptions);
    }
    getWebviewContent(webview, boardId, columnId) {
        this.logger.appendLine('📄 getWebviewContent called');
        // Try to load the built React app from embedded media files
        const mediaPath = path.join(this.context.extensionPath, 'media');
        const indexPath = path.join(mediaPath, 'index.html');
        const debugPath = path.join(this.context.extensionPath, 'debug-webview.html');
        this.logger.appendLine(`📁 Media path: ${mediaPath}`);
        this.logger.appendLine(`📄 Index path: ${indexPath}`);
        this.logger.appendLine(`✅ Index file exists: ${fs.existsSync(indexPath)}`);
        // List all files in media directory for debugging
        try {
            const mediaFiles = fs.readdirSync(mediaPath);
            this.logger.appendLine(`📂 Media directory contents: ${JSON.stringify(mediaFiles)}`);
            // Also check assets subdirectory
            const assetsPath = path.join(mediaPath, 'assets');
            if (fs.existsSync(assetsPath)) {
                const assetsFiles = fs.readdirSync(assetsPath);
                this.logger.appendLine(`📂 Assets directory contents: ${JSON.stringify(assetsFiles)}`);
            }
        }
        catch (error) {
            this.logger.appendLine(`❌ Error reading media directory: ${error}`);
        }
        // Try to use the fixed React interface first
        if (fs.existsSync(indexPath)) {
            this.logger.appendLine('📖 Loading fixed React interface...');
            let html = fs.readFileSync(indexPath, 'utf8');
            this.logger.appendLine(`📄 Original HTML length: ${html.length} characters`);
            this.logger.appendLine(`📄 Original HTML preview: ${html.substring(0, 200)}...`);
            // Convert relative paths to webview URIs
            const mediaUri = webview.asWebviewUri(vscode.Uri.file(mediaPath));
            this.logger.appendLine(`🔗 Media URI: ${mediaUri}`);
            // Count and log path replacements - handle all asset path variations
            let replacementCount = 0;
            // Handle all possible asset path variations
            // 1. All src and href attributes starting with /assets/
            html = html.replace(/((?:src|href))="\/assets\/([^"]+)"/g, (match, attr, assetPath) => {
                replacementCount++;
                const newPath = `${attr}="${mediaUri}/assets/${assetPath}"`;
                this.logger.appendLine(`🔄 Path replacement ${replacementCount}: ${match} → ${newPath}`);
                return newPath;
            });
            // 2. Relative paths with ./ prefix
            html = html.replace(/((?:src|href))="\.\/assets\/([^"]+)"/g, (match, attr, assetPath) => {
                replacementCount++;
                const newPath = `${attr}="${mediaUri}/assets/${assetPath}"`;
                this.logger.appendLine(`🔄 Path replacement ${replacementCount}: ${match} → ${newPath}`);
                return newPath;
            });
            // 3. Paths starting with just "assets/" (no leading slash or dot)
            html = html.replace(/((?:src|href))="assets\/([^"]+)"/g, (match, attr, assetPath) => {
                replacementCount++;
                const newPath = `${attr}="${mediaUri}/assets/${assetPath}"`;
                this.logger.appendLine(`🔄 Path replacement ${replacementCount}: ${match} → ${newPath}`);
                return newPath;
            });
            this.logger.appendLine(`✅ Made ${replacementCount} path replacements`);
            // Inject VSCode API and board context with enhanced loading and error handling
            const webServerUrl = this.embeddedServer ? `http://localhost:${this.embeddedServer.getPort()}` : "http://localhost:3000";
            const scriptInjection = `
                <script>
                    console.log('🚀 VSCode Webview Script Injected');
                    window.vscode = acquireVsCodeApi();
                    window.initialBoardId = ${boardId ? `"${boardId}"` : 'null'};
                    window.initialColumnId = ${columnId ? `"${columnId}"` : 'null'};
                    
                    // Override API base URL to use our embedded server
                    window.API_BASE_URL = "${webServerUrl}";
                    console.log('🔗 API_BASE_URL set to:', window.API_BASE_URL);
                    console.log('🎯 Initial column ID:', window.initialColumnId);

                    // Apply VSCode theme variables dynamically
                    function applyVSCodeTheme() {
                        const body = document.body;
                        const computedStyle = getComputedStyle(body);
                        
                        // Get actual VSCode theme colors
                        const themeKind = body.getAttribute('data-vscode-theme-kind') || 'vscode-dark';
                        const themeName = body.getAttribute('data-vscode-theme-name') || 'Default Dark+';
                        
                        console.log('🎨 VSCode theme detected:', { themeKind, themeName });
                        
                        // Apply theme class to root for better CSS targeting
                        const root = document.documentElement;
                        root.setAttribute('data-vscode-theme-kind', themeKind);
                        root.setAttribute('data-vscode-theme-name', themeName);
                        
                        // Get VSCode editor font settings
                        const editorFontFamily = computedStyle.getPropertyValue('--vscode-editor-font-family').trim() || 
                                                computedStyle.getPropertyValue('--vscode-font-family').trim() || 
                                                'Segoe WPC, Segoe UI, system-ui, sans-serif';
                        const editorFontSize = computedStyle.getPropertyValue('--vscode-editor-font-size').trim() || 
                                              computedStyle.getPropertyValue('--vscode-font-size').trim() || 
                                              '13px';
                        
                        console.log('🔤 VSCode editor font detected:', { editorFontFamily, editorFontSize });
                        
                        // Set CSS custom properties from actual VSCode theme and editor settings
                        const cssVars = {
                            '--vscode-font-family': editorFontFamily,
                            '--vscode-font-size': editorFontSize,
                            '--vscode-editor-font-family': editorFontFamily,
                            '--vscode-editor-font-size': editorFontSize,
                            '--vscode-foreground': computedStyle.getPropertyValue('--vscode-foreground').trim(),
                            '--vscode-background': computedStyle.getPropertyValue('--vscode-background').trim(),
                            '--vscode-editor-background': computedStyle.getPropertyValue('--vscode-editor-background').trim(),
                            '--vscode-editor-foreground': computedStyle.getPropertyValue('--vscode-editor-foreground').trim(),
                            '--vscode-input-background': computedStyle.getPropertyValue('--vscode-input-background').trim(),
                            '--vscode-input-foreground': computedStyle.getPropertyValue('--vscode-input-foreground').trim(),
                            '--vscode-input-border': computedStyle.getPropertyValue('--vscode-input-border').trim(),
                            '--vscode-button-background': computedStyle.getPropertyValue('--vscode-button-background').trim(),
                            '--vscode-button-foreground': computedStyle.getPropertyValue('--vscode-button-foreground').trim(),
                            '--vscode-button-hoverBackground': computedStyle.getPropertyValue('--vscode-button-hoverBackground').trim(),
                            '--vscode-list-hoverBackground': computedStyle.getPropertyValue('--vscode-list-hoverBackground').trim(),
                            '--vscode-panel-border': computedStyle.getPropertyValue('--vscode-panel-border').trim(),
                            '--vscode-focusBorder': computedStyle.getPropertyValue('--vscode-focusBorder').trim(),
                        };
                        
                        // Apply the CSS variables to root
                        Object.entries(cssVars).forEach(([prop, value]) => {
                            if (value) {
                                root.style.setProperty(prop, value);
                                console.log(\`🎨 Set \${prop}: \${value}\`);
                            }
                        });
                        
                        // Update React app theme class
                        const appRoot = document.querySelector('#root');
                        if (appRoot) {
                            // Remove existing theme classes
                            appRoot.classList.remove('dark', 'light');
                            // Add appropriate theme class
                            if (themeKind.includes('light')) {
                                appRoot.classList.add('light');
                                body.classList.add('vscode-light');
                                body.classList.remove('vscode-dark');
                            } else {
                                appRoot.classList.add('dark');
                                body.classList.add('vscode-dark');
                                body.classList.remove('vscode-light');
                            }
                        }
                    }
                    
                    // Apply theme immediately and on changes
                    applyVSCodeTheme();
                    
                    // Listen for theme changes
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'attributes' && 
                                (mutation.attributeName === 'data-vscode-theme-kind' || 
                                 mutation.attributeName === 'data-vscode-theme-name')) {
                                console.log('🎨 VSCode theme changed, reapplying...');
                                applyVSCodeTheme();
                            }
                        });
                    });
                    
                    observer.observe(document.body, {
                        attributes: true,
                        attributeFilter: ['data-vscode-theme-kind', 'data-vscode-theme-name']
                    });

                    // Progressive loading state management
                    let loadingTimeout;
                    let retryCount = 0;
                    const maxRetries = 3;

                    // Show initial loading state
                    function showLoadingState() {
                        // Don't show loading state if React has already started mounting
                        const rootElement = document.querySelector('#root');
                        if (rootElement && rootElement.children.length > 0) {
                            console.log('🎯 React already mounted, skipping loading state');
                            return;
                        }
                        
                        // Ensure document.body exists before setting innerHTML
                        if (!document.body) {
                            console.warn('Document body not available, waiting for DOM ready');
                            if (document.readyState === 'loading') {
                                document.addEventListener('DOMContentLoaded', showLoadingState);
                                return;
                            } else {
                                // Fallback: create body if it doesn't exist
                                document.body = document.createElement('body');
                                document.documentElement.appendChild(document.body);
                            }
                        }
                        
                        // Don't show loading if React is already mounting or has mounted
                        if (rootElement && (rootElement.innerHTML.trim() || rootElement.children.length > 0)) {
                            console.log('🎯 Root element already has content, skipping loading state');
                            return;
                        }
                        
                        // Check if loading overlay already exists
                        if (document.getElementById('vscode-loading-overlay')) {
                            return;
                        }
                        
                        // Create non-destructive loading overlay that doesn't interfere with React
                        const loadingOverlay = document.createElement('div');
                        loadingOverlay.id = 'vscode-loading-overlay';
                        loadingOverlay.innerHTML = \`
                            <div style="
                                position: fixed;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                background: var(--vscode-editor-background);
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                z-index: 9999;
                                font-family: var(--vscode-font-family);
                                color: var(--vscode-foreground);
                            ">
                                <div style="
                                    width: 40px;
                                    height: 40px;
                                    border: 3px solid var(--vscode-progressBar-background);
                                    border-top: 3px solid var(--vscode-progressBar-foreground);
                                    border-radius: 50%;
                                    animation: spin 1s linear infinite;
                                    margin-bottom: 20px;
                                "></div>
                                <h3 style="margin: 0 0 10px 0;">Loading Kanban Board...</h3>
                                <p style="margin: 0; opacity: 0.7; font-size: 12px;">
                                    Connecting to server and loading your boards
                                </p>
                                <style>
                                    @keyframes spin {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                </style>
                            </div>
                        \`;
                        
                        // Append overlay without destroying existing DOM
                        document.body.appendChild(loadingOverlay);
                    }

                    // Enhanced error state with recovery options
                    function showErrorState(error, canRetry = true) {
                        const errorMessage = error?.message || 'An unexpected error occurred';
                        
                        // Ensure document.body exists
                        if (!document.body) {
                            console.warn('Document body not available for error state');
                            if (document.readyState === 'loading') {
                                document.addEventListener('DOMContentLoaded', () => showErrorState(error, canRetry));
                                return;
                            } else {
                                // Fallback: create body if it doesn't exist
                                document.body = document.createElement('body');
                                document.documentElement.appendChild(document.body);
                            }
                        }
                        
                        // Remove loading overlay if it exists
                        const loadingOverlay = document.getElementById('vscode-loading-overlay');
                        if (loadingOverlay) {
                            loadingOverlay.remove();
                        }
                        
                        // Check if error overlay already exists
                        if (document.getElementById('vscode-error-overlay')) {
                            return;
                        }
                        
                        // Create non-destructive error overlay
                        const errorOverlay = document.createElement('div');
                        errorOverlay.id = 'vscode-error-overlay';
                        errorOverlay.innerHTML = \`
                            <div style="
                                position: fixed;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                background: var(--vscode-editor-background);
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                z-index: 9999;
                                font-family: var(--vscode-font-family);
                                color: var(--vscode-foreground);
                                padding: 20px;
                                text-align: center;
                            ">
                                <div style="
                                    width: 60px;
                                    height: 60px;
                                    background: var(--vscode-inputValidation-errorBackground);
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    margin-bottom: 20px;
                                    border: 2px solid var(--vscode-inputValidation-errorBorder);
                                ">
                                    <span style="font-size: 24px;">⚠️</span>
                                </div>
                                <h3 style="margin: 0 0 10px 0; color: var(--vscode-errorForeground);">
                                    Failed to Load Kanban Board
                                </h3>
                                <p style="margin: 0 0 20px 0; opacity: 0.8; max-width: 400px;">
                                    \${errorMessage}
                                </p>
                                <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                                    \${canRetry && retryCount < maxRetries ? \`
                                        <button onclick="retryLoading()" style="
                                            background: var(--vscode-button-background);
                                            color: var(--vscode-button-foreground);
                                            border: none;
                                            padding: 8px 16px;
                                            border-radius: 4px;
                                            cursor: pointer;
                                            font-family: inherit;
                                        ">🔄 Retry (\${maxRetries - retryCount} left)</button>
                                    \` : ''}
                                    <button onclick="openInBrowser()" style="
                                        background: var(--vscode-button-secondaryBackground);
                                        color: var(--vscode-button-secondaryForeground);
                                        border: 1px solid var(--vscode-button-border);
                                        padding: 8px 16px;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-family: inherit;
                                    ">🌐 Open in Browser</button>
                                    <button onclick="showHealthStatus()" style="
                                        background: transparent;
                                        color: var(--vscode-foreground);
                                        border: 1px solid var(--vscode-button-border);
                                        padding: 8px 16px;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-family: inherit;
                                    ">📊 Check Server Status</button>
                                </div>
                            </div>
                        \`;
                        
                        // Append error overlay without destroying existing DOM
                        document.body.appendChild(errorOverlay);
                    }

                    // Retry loading function
                    window.retryLoading = function() {
                        retryCount++;
                        showLoadingState();
                        setTimeout(() => {
                            location.reload();
                        }, 1000);
                    };

                    // Open in browser function
                    window.openInBrowser = function() {
                        window.vscode.postMessage({
                            type: 'openExternal',
                            url: '${webServerUrl}${boardId ? `?board=${boardId}` : ''}'
                        });
                    };

                    // Show health status function
                    window.showHealthStatus = function() {
                        window.vscode.postMessage({ type: 'showHealthStatus' });
                    };

                    // Delay showing loading state to let React mount first
                    setTimeout(() => {
                        const rootElement = document.querySelector('#root');
                        if (!rootElement || rootElement.children.length === 0) {
                            showLoadingState();
                        } else {
                            console.log('🎯 React already mounted, no loading state needed');
                        }
                    }, 100);

                    // Set loading timeout
                    loadingTimeout = setTimeout(() => {
                        const loadingOverlay = document.getElementById('vscode-loading-overlay');
                        if (loadingOverlay) {
                            showErrorState(new Error('Loading timeout - the application took too long to start'));
                        }
                    }, 15000); // 15 second timeout

                    // Enhanced error handling
                    window.addEventListener('error', function(e) {
                        clearTimeout(loadingTimeout);
                        console.error('❌ JavaScript Error:', e.error, e.message, e.filename, e.lineno);
                        showErrorState(e.error || new Error(e.message || 'JavaScript error occurred'));
                    });

                    // Handle unhandled promise rejections
                    window.addEventListener('unhandledrejection', function(e) {
                        clearTimeout(loadingTimeout);
                        console.error('❌ Unhandled Promise Rejection:', e.reason);
                        showErrorState(e.reason || new Error('Network or server error'));
                    });

                    // Clear loading state when React app loads successfully
                    window.addEventListener('load', function() {
                        setTimeout(() => {
                            const loadingOverlay = document.getElementById('vscode-loading-overlay');
                            if (loadingOverlay) {
                                clearTimeout(loadingTimeout);
                                // If still showing loading after page load, something went wrong
                                showErrorState(new Error('React application failed to initialize'));
                            }
                        }, 3000);
                    });

                    // Monitor for successful React app initialization
                    const checkInterval = setInterval(() => {
                        const rootElement = document.querySelector('#root');
                        const hasReactContent = rootElement && (
                            rootElement.children.length > 0 || 
                            rootElement.innerHTML.trim().length > 0 ||
                            rootElement.hasAttribute('data-reactroot') ||
                            document.querySelector('[data-react-helmet]') ||
                            document.querySelector('.bg-white.vscode-compact')
                        );
                        
                        if (hasReactContent) {
                            console.log('✅ React app successfully initialized');
                            clearTimeout(loadingTimeout);
                            clearInterval(checkInterval);
                            // Remove loading overlay since React has mounted
                            const loadingOverlay = document.getElementById('vscode-loading-overlay');
                            if (loadingOverlay) {
                                console.log('🧹 Removing loading overlay since React is mounted');
                                loadingOverlay.remove();
                            }
                        } else {
                            console.log('⏳ Waiting for React app to initialize...', 
                                rootElement ? 'Root found but no children' : 'Root element not found');
                        }
                    }, 300); // Check every 300ms for faster response
                    
                    // Set up message passing infrastructure before React loads
                    window.vsCodeMessageHandlers = new Map();
                    
                    // Message listener for responses from extension
                    window.addEventListener('message', function(event) {
                        // Debug all incoming messages to understand the issue
                        console.debug('📨 Message received - Source:', event.source === window.parent ? 'parent' : (event.source === window ? 'self' : 'external'), 'Type:', event.data?.type, 'Data:', event.data);
                        
                        // Additional safety: only process known message types
                        const message = event.data;
                        if (!message || typeof message !== 'object') {
                            console.debug('🔇 Ignoring non-object message');
                            return;
                        }
                        
                        // Only handle our specific message types - but be more permissive for debugging
                        if (!['apiResponse', 'columnScroll', 'refresh'].includes(message.type)) {
                            console.debug('🔇 Ignoring unknown message type:', message.type);
                            return;
                        }
                        
                        console.log('📥 Received message from extension:', event.data);
                        
                        // Handle API responses
                        if (message.type === 'apiResponse' && message.requestId) {
                            const handler = window.vsCodeMessageHandlers.get(message.requestId);
                            if (handler) {
                                window.vsCodeMessageHandlers.delete(message.requestId);
                                if (message.success) {
                                    handler.resolve(message.data);
                                } else {
                                    handler.reject(new Error(message.error || 'Unknown error'));
                                }
                            }
                        }
                    });
                    
                    // Add message passing helpers with error handling
                    window.vsCodePostMessage = (type, data) => {
                        try {
                            console.log('📤 Sending message to VSCode:', type, data);
                            if (window.vscode && typeof window.vscode.postMessage === 'function') {
                                window.vscode.postMessage({ type, ...data });
                            } else {
                                console.error('❌ VSCode API not available for postMessage');
                            }
                        } catch (error) {
                            console.error('❌ Error sending message to VSCode:', error);
                        }
                    };
                    
                    // Enhanced API request function
                    let requestIdCounter = 0;
                    window.vsCodeApiRequest = function(method, endpoint, data) {
                        return new Promise((resolve, reject) => {
                            const requestId = 'req_' + (++requestIdCounter);
                            console.log('🔄 Making VSCode API request:', { requestId, method, endpoint, data });
                            
                            // Set timeout with proper cleanup
                            const timeoutId = setTimeout(() => {
                                if (window.vsCodeMessageHandlers.has(requestId)) {
                                    console.warn('⏰ Request timeout for:', requestId, 'Method:', method, 'Endpoint:', endpoint);
                                    window.vsCodeMessageHandlers.delete(requestId);
                                    reject(new Error('Request timeout after 15s: ' + method + ' ' + endpoint));
                                }
                            }, 15000); // Increased timeout to 15 seconds
                            
                            // Store the promise handlers with timeout cleanup
                            window.vsCodeMessageHandlers.set(requestId, { 
                                resolve: (data) => {
                                    clearTimeout(timeoutId);
                                    resolve(data);
                                }, 
                                reject: (error) => {
                                    clearTimeout(timeoutId);
                                    reject(error);
                                }
                            });
                            
                            // Send the request with error handling
                            try {
                                if (!window.vscode || typeof window.vscode.postMessage !== 'function') {
                                    throw new Error('VSCode API not available');
                                }
                                
                                window.vscode.postMessage({
                                    type: 'apiRequest',
                                    requestId,
                                    method,
                                    endpoint,
                                    data
                                });
                            } catch (error) {
                                clearTimeout(timeoutId);
                                window.vsCodeMessageHandlers.delete(requestId);
                                reject(new Error('Failed to send API request: ' + error.message));
                                return;
                            }
                        });
                    };
                    
                    // Log any JavaScript errors
                    window.addEventListener('error', function(e) {
                        console.error('❌ JavaScript Error:', e.error, e.message, e.filename, e.lineno);
                    });
                    
                    console.log('✅ VSCode webview setup complete');
                </script>
            `;
            this.logger.appendLine(`💉 Script injection length: ${scriptInjection.length} characters`);
            this.logger.appendLine(`🔗 WebServer URL in script: ${webServerUrl}`);
            const beforeInject = html.length;
            // Inject script at the very beginning of head to ensure it loads before React
            html = html.replace('<head>', `<head>${scriptInjection}`);
            const afterInject = html.length;
            this.logger.appendLine(`📄 HTML length after injection: ${afterInject} (added ${afterInject - beforeInject} chars)`);
            this.logger.appendLine(`📄 Final HTML preview: ${html.substring(0, 300)}...`);
            return html;
        }
        else {
            // Fallback to simple HTML interface if React interface not available
            const simplePath = path.join(this.context.extensionPath, 'simple-kanban.html');
            this.logger.appendLine(`📁 Simple path: ${simplePath}`);
            this.logger.appendLine(`✅ Simple file exists: ${fs.existsSync(simplePath)}`);
            if (fs.existsSync(simplePath)) {
                this.logger.appendLine('📖 Loading simple HTML interface as fallback...');
                let html = fs.readFileSync(simplePath, 'utf8');
                this.logger.appendLine(`📄 Simple HTML length: ${html.length} characters`);
                this.logger.appendLine(`📄 Simple HTML preview: ${html.substring(0, 200)}...`);
                this.logger.appendLine('✅ Returning simple HTML interface');
                return html;
            }
            else {
                // Final fallback to instruction page
                return this.getFallbackContent(webview, boardId);
            }
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
    async handleFileSystemExport(requestData) {
        try {
            // Get export data from embedded server
            const exportData = this.embeddedServer.exportData();
            // Convert to snake_case for web-ui compatibility
            const webExportData = {
                boards: exportData.boards.map(board => ({
                    id: board.id,
                    name: board.name,
                    goal: board.goal,
                    landing_column_id: null,
                    created_at: board.createdAt,
                    updated_at: board.updatedAt
                })),
                columns: exportData.columns.map(column => ({
                    id: column.id,
                    board_id: column.boardId,
                    name: column.name,
                    position: column.position,
                    wip_limit: 0,
                    is_done_column: 0
                })),
                tasks: exportData.tasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    content: task.content,
                    position: task.position,
                    column_id: task.columnId,
                    created_at: task.createdAt,
                    updated_at: task.updatedAt
                }))
            };
            // Show folder picker dialog
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: 'Select Export Folder',
                title: 'Choose where to export your Kanban data'
            });
            if (!folderUri || folderUri.length === 0) {
                return { success: false, message: 'Export cancelled by user' };
            }
            const baseFolder = folderUri[0].fsPath;
            // Create organized directory structure
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
            const exportDir = path.join(baseFolder, 'kanban-exports', `${dateStr}_${timeStr}`);
            // Create directory structure
            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir, { recursive: true });
            }
            // Prepare export files
            const files = [
                {
                    name: 'kanban-complete.json',
                    content: JSON.stringify(webExportData, null, 2),
                    description: 'Complete kanban database export'
                },
                {
                    name: 'boards.json',
                    content: JSON.stringify(webExportData.boards, null, 2),
                    description: 'Boards only'
                },
                {
                    name: 'tasks.json',
                    content: JSON.stringify(webExportData.tasks, null, 2),
                    description: 'Tasks only'
                },
                {
                    name: 'export-info.txt',
                    content: `Kanban Export Information\n` +
                        `========================\n` +
                        `Export Date: ${now.toISOString()}\n` +
                        `Total Boards: ${webExportData.boards.length}\n` +
                        `Total Columns: ${webExportData.columns.length}\n` +
                        `Total Tasks: ${webExportData.tasks.length}\n\n` +
                        `Files included:\n` +
                        `- kanban-complete.json: Complete database export\n` +
                        `- boards.json: Boards data only\n` +
                        `- tasks.json: Tasks data only\n` +
                        `- export-info.txt: This information file\n`,
                    description: 'Export metadata and information'
                }
            ];
            // Write all files
            const writtenFiles = [];
            for (const file of files) {
                const filePath = path.join(exportDir, file.name);
                fs.writeFileSync(filePath, file.content, 'utf8');
                writtenFiles.push({
                    name: file.name,
                    path: filePath,
                    size: Buffer.byteLength(file.content, 'utf8')
                });
            }
            // Show success message with option to reveal in explorer
            const result = await vscode.window.showInformationMessage(`Kanban data exported successfully to:\n${exportDir}`, 'Open Folder', 'OK');
            if (result === 'Open Folder') {
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(exportDir), { forceNewWindow: false });
            }
            this.logger.appendLine(`📁 Export completed: ${exportDir}`);
            this.logger.appendLine(`📊 Files written: ${writtenFiles.map(f => f.name).join(', ')}`);
            return {
                success: true,
                message: `Export completed successfully`,
                exportPath: exportDir,
                files: writtenFiles,
                stats: {
                    boards: webExportData.boards.length,
                    columns: webExportData.columns.length,
                    tasks: webExportData.tasks.length
                }
            };
        }
        catch (error) {
            this.logger.appendLine(`❌ Export error: ${error}`);
            console.error('File system export error:', error);
            return {
                success: false,
                message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
exports.KanbanWebviewProvider = KanbanWebviewProvider;
//# sourceMappingURL=KanbanWebviewProvider.js.map