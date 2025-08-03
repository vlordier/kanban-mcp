import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { KanbanWebviewProvider } from './webview/KanbanWebviewProvider';
import { KanbanTreeDataProvider } from './tree/KanbanTreeDataProvider';
import { MCPClient } from './mcp/MCPClient';

export function activate(context: vscode.ExtensionContext) {
    console.log('Kanban MCP extension is now active!');

    // Initialize MCP client
    const mcpClient = new MCPClient();
    
    // Initialize tree data provider for the sidebar
    const treeDataProvider = new KanbanTreeDataProvider(mcpClient);
    vscode.window.registerTreeDataProvider('kanban-boards', treeDataProvider);

    // Initialize webview provider
    const webviewProvider = new KanbanWebviewProvider(context, mcpClient);

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
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create board: ${error}`);
            }
        }
    });

    const refreshBoardsCommand = vscode.commands.registerCommand('kanban-mcp.refreshBoards', () => {
        treeDataProvider.refresh();
        vscode.window.showInformationMessage('Boards refreshed!');
    });

    // Register tree view commands
    const openBoardCommand = vscode.commands.registerCommand('kanban-mcp.openBoard', (boardId: string) => {
        webviewProvider.showKanbanBoard(boardId);
    });

    const deleteBoardCommand = vscode.commands.registerCommand('kanban-mcp.deleteBoard', async (boardId: string, boardName: string) => {
        const answer = await vscode.window.showWarningMessage(
            `Are you sure you want to delete board "${boardName}"?`,
            { modal: true },
            'Delete',
            'Cancel'
        );

        if (answer === 'Delete') {
            try {
                await mcpClient.deleteBoard(boardId);
                vscode.window.showInformationMessage(`Board "${boardName}" deleted successfully!`);
                treeDataProvider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to delete board: ${error}`);
            }
        }
    });

    // Add all disposables to context
    context.subscriptions.push(
        showKanbanBoardCommand,
        createBoardCommand,
        refreshBoardsCommand,
        openBoardCommand,
        deleteBoardCommand
    );

    // Auto-refresh setup
    const config = vscode.workspace.getConfiguration('kanban-mcp');
    if (config.get('autoRefresh', true)) {
        const refreshInterval = config.get('refreshInterval', 30000);
        setInterval(() => {
            treeDataProvider.refresh();
        }, refreshInterval);
    }
}

export function deactivate() {
    console.log('Kanban MCP extension is now deactivated!');
}