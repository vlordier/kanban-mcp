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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const KanbanWebviewProvider_1 = require("./webview/KanbanWebviewProvider");
const KanbanTreeDataProvider_1 = require("./tree/KanbanTreeDataProvider");
const MCPClient_1 = require("./mcp/MCPClient");
function activate(context) {
    console.log('Kanban MCP extension is now active!');
    // Initialize MCP client
    const mcpClient = new MCPClient_1.MCPClient();
    // Initialize tree data provider for the sidebar
    const treeDataProvider = new KanbanTreeDataProvider_1.KanbanTreeDataProvider(mcpClient);
    vscode.window.registerTreeDataProvider('kanban-boards', treeDataProvider);
    // Initialize webview provider
    const webviewProvider = new KanbanWebviewProvider_1.KanbanWebviewProvider(context, mcpClient);
    // Register commands
    const showKanbanBoardCommand = vscode.commands.registerCommand('kanban-mcp.showKanbanBoard', () => {
        webviewProvider.showKanbanBoard();
    });
    const createBoardCommand = vscode.commands.registerCommand('kanban-mcp.createBoard', async () => {
        const boardName = await vscode.window.showInputBox({
            prompt: 'Enter board name',
            placeHolder: 'My Kanban Board'
        });
        if (boardName) {
            const boardGoal = await vscode.window.showInputBox({
                prompt: 'Enter board goal/description',
                placeHolder: 'Track project tasks and progress'
            });
            try {
                await mcpClient.createBoard(boardName, boardGoal || '');
                vscode.window.showInformationMessage(`Board "${boardName}" created successfully!`);
                treeDataProvider.refresh();
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to create board: ${error}`);
            }
        }
    });
    const refreshBoardsCommand = vscode.commands.registerCommand('kanban-mcp.refreshBoards', () => {
        treeDataProvider.refresh();
        vscode.window.showInformationMessage('Boards refreshed!');
    });
    // Register tree view commands
    const openBoardCommand = vscode.commands.registerCommand('kanban-mcp.openBoard', (boardId) => {
        webviewProvider.showKanbanBoard(boardId);
    });
    const deleteBoardCommand = vscode.commands.registerCommand('kanban-mcp.deleteBoard', async (boardId, boardName) => {
        const answer = await vscode.window.showWarningMessage(`Are you sure you want to delete board "${boardName}"?`, { modal: true }, 'Delete', 'Cancel');
        if (answer === 'Delete') {
            try {
                await mcpClient.deleteBoard(boardId);
                vscode.window.showInformationMessage(`Board "${boardName}" deleted successfully!`);
                treeDataProvider.refresh();
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to delete board: ${error}`);
            }
        }
    });
    // Add all disposables to context
    context.subscriptions.push(showKanbanBoardCommand, createBoardCommand, refreshBoardsCommand, openBoardCommand, deleteBoardCommand);
    // Auto-refresh setup
    const config = vscode.workspace.getConfiguration('kanban-mcp');
    if (config.get('autoRefresh', true)) {
        const refreshInterval = config.get('refreshInterval', 30000);
        setInterval(() => {
            treeDataProvider.refresh();
        }, refreshInterval);
    }
}
exports.activate = activate;
function deactivate() {
    console.log('Kanban MCP extension is now deactivated!');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map