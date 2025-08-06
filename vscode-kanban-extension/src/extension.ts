import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { KanbanWebviewProvider } from './webview/KanbanWebviewProvider';
import { KanbanTreeDataProvider, KanbanTreeItem } from './tree/KanbanTreeDataProvider';
import { MCPClient } from './mcp/MCPClient';
import { EmbeddedServer } from './server/EmbeddedServer';
import { ErrorHandler } from './common/ErrorHandler';

let embeddedServer: EmbeddedServer | null = null;
let logger: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let healthCheckInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
    // Create dedicated output channel for debugging
    logger = vscode.window.createOutputChannel('Kanban MCP Debug');
    logger.show();
    logger.appendLine('🚀 Kanban MCP extension activation started...');
    console.log('🚀 Kanban MCP extension is now active!');

    // Start embedded server
    embeddedServer = new EmbeddedServer();
    let serverPort: number;
    try {
        logger.appendLine('⚙️ Starting embedded server...');
        serverPort = await embeddedServer.start();
        logger.appendLine(`✅ Embedded Kanban server started on port ${serverPort}`);
        console.log(`✅ Embedded Kanban server started on port ${serverPort}`);
        
        // Update configuration to use embedded server
        const config = vscode.workspace.getConfiguration('kanban-mcp');
        await config.update('webServerUrl', `http://localhost:${serverPort}`, vscode.ConfigurationTarget.Global);
        logger.appendLine(`🔧 Updated webServerUrl config to: http://localhost:${serverPort}`);
        
        vscode.window.showInformationMessage(`✅ Kanban server started on port ${serverPort}`);
    } catch (error) {
        logger.appendLine(`❌ Failed to start embedded server: ${error}`);
        console.error('❌ Failed to start embedded server:', error);
        vscode.window.showErrorMessage('❌ Failed to start Kanban server. Extension may not work properly.');
        return; // Exit early if server fails
    }

    // Create status bar item for health indicator
    logger.appendLine('📊 Creating health status bar item...');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'kanban-mcp.showHealthStatus';
    context.subscriptions.push(statusBarItem);
    statusBarItem.show();

    // Initialize error handler
    logger.appendLine('🛡️ Initializing error handler...');
    const errorHandler = ErrorHandler.getInstance(logger);
    
    // Initialize MCP client and configure it to use embedded server
    logger.appendLine('🔧 Initializing MCP client...');
    const mcpClient = new MCPClient();
    mcpClient.setErrorHandler(errorHandler);
    
    logger.appendLine(`🔧 Updating MCP client to use embedded server: http://localhost:${serverPort}`);
    mcpClient.updateConfiguration(`http://localhost:${serverPort}`);
    
    // Initialize tree data provider for the sidebar
    logger.appendLine('🌳 Initializing tree data provider...');
    const treeDataProvider = new KanbanTreeDataProvider(mcpClient);
    vscode.window.registerTreeDataProvider('kanban-boards', treeDataProvider);

    // Initialize webview provider
    logger.appendLine('🖥️ Initializing webview provider...');
    const webviewProvider = new KanbanWebviewProvider(context, mcpClient, embeddedServer);

    // Register commands
    logger.appendLine('⚙️ Registering commands...');
    const showKanbanBoardCommand = vscode.commands.registerCommand('kanban-mcp.showKanbanBoard', () => {
        logger.appendLine('📋 showKanbanBoard command triggered');
        console.log('📋 showKanbanBoard command triggered');
        try {
            webviewProvider.showKanbanBoard();
            logger.appendLine('✅ showKanbanBoard completed successfully');
        } catch (error) {
            logger.appendLine(`❌ showKanbanBoard failed: ${error}`);
            console.error('❌ showKanbanBoard failed:', error);
        }
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

    const openBoardToColumnCommand = vscode.commands.registerCommand('kanban-mcp.openBoardToColumn', (boardId: string, columnId: string) => {
        webviewProvider.showKanbanBoard(boardId, columnId);
    });

    const createTaskFromFileCommand = vscode.commands.registerCommand('kanban-mcp.createTaskFromFile', async (fileUri: vscode.Uri) => {
        if (!fileUri) {
            vscode.window.showErrorMessage('No file selected');
            return;
        }

        const fileName = path.basename(fileUri.fsPath);
        const relativePath = vscode.workspace.asRelativePath(fileUri);
        
        // Get boards for column selection
        try {
            const boards = await mcpClient.getBoards();
            if (boards.length === 0) {
                vscode.window.showInformationMessage('No boards found. Create a board first.');
                return;
            }

            // If only one board, use it directly, otherwise let user choose
            let selectedBoard = boards[0];
            if (boards.length > 1) {
                const boardChoice = await vscode.window.showQuickPick(
                    boards.map(board => ({ label: board.name, description: board.goal, board })),
                    { placeHolder: 'Select board for the new task' }
                );
                if (!boardChoice) {return;}
                selectedBoard = boardChoice.board;
            }

            // Get board details to show columns
            const boardDetails = await mcpClient.getBoard(selectedBoard.id);
            if (!boardDetails.columns || boardDetails.columns.length === 0) {
                vscode.window.showErrorMessage('No columns found in the selected board');
                return;
            }

            // Let user choose column
            const columnChoice = await vscode.window.showQuickPick(
                boardDetails.columns.map(col => ({ 
                    label: col.name, 
                    description: `${col.tasks?.length || 0} tasks`,
                    column: col 
                })),
                { placeHolder: 'Select column for the new task' }
            );
            if (!columnChoice) {return;}

            // Create task with file reference
            const taskTitle = `Work on ${fileName}`;
            const taskContent = `File: \`${relativePath}\`\n\nTask created from file in VSCode.\n\n## Notes\n- `;

            await mcpClient.createTask(columnChoice.column.id, taskTitle, taskContent);
            vscode.window.showInformationMessage(`Task "${taskTitle}" created in ${selectedBoard.name}/${columnChoice.column.name}`);
            treeDataProvider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create task from file: ${error}`);
        }
    });

    const quickCreateTaskCommand = vscode.commands.registerCommand('kanban-mcp.quickCreateTask', async () => {
        try {
            const boards = await mcpClient.getBoards();
            if (boards.length === 0) {
                vscode.window.showInformationMessage('No boards found. Create a board first.');
                return;
            }

            // Quick input for task title
            const taskTitle = await vscode.window.showInputBox({
                prompt: 'Enter task title',
                placeHolder: 'Fix authentication bug...',
                validateInput: (value) => value.trim() ? undefined : 'Task title is required'
            });
            if (!taskTitle) {return;}

            // Use first board and first column for quick creation
            const board = boards[0];
            const boardDetails = await mcpClient.getBoard(board.id);
            const firstColumn = boardDetails.columns?.[0];
            
            if (!firstColumn) {
                vscode.window.showErrorMessage('No columns found in board');
                return;
            }

            const taskContent = `Quick task created in VSCode.\n\nCreated: ${new Date().toLocaleString()}\n\n## Notes\n- `;
            
            await mcpClient.createTask(firstColumn.id, taskTitle, taskContent);
            vscode.window.showInformationMessage(`Task "${taskTitle}" created in ${board.name}/${firstColumn.name}`);
            treeDataProvider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create quick task: ${error}`);
        }
    });

    const deleteBoardCommand = vscode.commands.registerCommand('kanban-mcp.deleteBoard', async (treeItem: KanbanTreeItem) => {
        // Handle both direct call with parameters and context menu call with tree item
        let boardId: string;
        let boardName: string;
        
        if (treeItem && typeof treeItem === 'object' && 'id' in treeItem && 'label' in treeItem) {
            // Called from context menu with tree item
            boardId = treeItem.id;
            boardName = treeItem.label;
            
            // Prevent deletion of placeholder items
            if (boardId === 'no-boards' || boardId === 'error-boards') {
                vscode.window.showWarningMessage('This is not a real board that can be deleted.');
                return;
            }
        } else {
            // Fallback for direct calls (though this shouldn't happen in normal usage)
            vscode.window.showErrorMessage('Invalid board selection for deletion.');
            return;
        }

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

    // Health status command
    const showHealthStatusCommand = vscode.commands.registerCommand('kanban-mcp.showHealthStatus', async () => {
        const isHealthy = await checkServerHealth(mcpClient);
        const serverUrl = mcpClient.getWebServerUrl();
        
        if (isHealthy) {
            vscode.window.showInformationMessage(
                `✅ Kanban Server is healthy\nConnected to: ${serverUrl}`,
                'Test Connection'
            ).then(selection => {
                if (selection === 'Test Connection') {
                    testConnection(mcpClient);
                }
            });
        } else {
            vscode.window.showErrorMessage(
                `❌ Kanban Server is unreachable\nServer URL: ${serverUrl}\n\nPlease check if the server is running.`,
                'Retry Connection',
                'View Logs'
            ).then(selection => {
                if (selection === 'Retry Connection') {
                    updateHealthStatus(mcpClient);
                } else if (selection === 'View Logs') {
                    logger.show();
                }
            });
        }
    });

    // Function to check server health
    async function checkServerHealth(client: MCPClient): Promise<boolean> {
        try {
            const isHealthy = await client.checkServerHealth();
            logger.appendLine(`🏥 Health check result: ${isHealthy ? 'healthy' : 'unhealthy'}`);
            return isHealthy;
        } catch (error) {
            logger.appendLine(`🏥 Health check failed: ${error}`);
            return false;
        }
    }

    // Function to update health status in status bar
    async function updateHealthStatus(client: MCPClient) {
        const isHealthy = await checkServerHealth(client);
        const serverUrl = client.getWebServerUrl();
        
        if (isHealthy) {
            statusBarItem.text = '$(check) Kanban Connected';
            statusBarItem.tooltip = `✅ Kanban server is healthy\nServer: ${serverUrl}`;
            statusBarItem.backgroundColor = undefined;
        } else {
            statusBarItem.text = '$(error) Kanban Disconnected';
            statusBarItem.tooltip = `❌ Kanban server is unreachable\nServer: ${serverUrl}\nClick to retry connection`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
    }

    // Function to test connection with detailed feedback
    async function testConnection(client: MCPClient) {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Testing Kanban server connection...',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 25, message: 'Checking server health...' });
                const isHealthy = await client.checkServerHealth();
                
                progress.report({ increment: 25, message: 'Fetching boards...' });
                const boards = await client.getBoards();
                
                progress.report({ increment: 50, message: 'Connection test complete' });
                
                vscode.window.showInformationMessage(
                    `✅ Connection test successful!\n` +
                    `Server: ${client.getWebServerUrl()}\n` +
                    `Health: ${isHealthy ? 'Healthy' : 'Unhealthy'}\n` +
                    `Boards: ${boards.length} found`
                );
            } catch (error) {
                vscode.window.showErrorMessage(`❌ Connection test failed: ${error}`);
            }
        });
    }

    // Initial health check and periodic updates
    logger.appendLine('🏥 Starting initial health check...');
    await updateHealthStatus(mcpClient);
    
    // Set up periodic health checks every 30 seconds
    healthCheckInterval = setInterval(async () => {
        await updateHealthStatus(mcpClient);
    }, 30000);
    
    // Auto-trigger board display after 5 seconds to test new interface
    logger.appendLine('🔄 Setting up auto-trigger for board display...');
    setTimeout(() => {
        logger.appendLine('🎯 Auto-triggering showKanbanBoard for testing...');
        try {
            webviewProvider.showKanbanBoard();
            logger.appendLine('✅ Auto-trigger showKanbanBoard completed');
        } catch (error) {
            logger.appendLine(`❌ Auto-trigger showKanbanBoard failed: ${error}`);
        }
    }, 5000);
    
    // Create disposable for the health check interval
    const healthCheckDisposable = {
        dispose: () => {
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
                healthCheckInterval = undefined;
            }
        }
    };

    // Add all disposables to context
    context.subscriptions.push(
        showKanbanBoardCommand,
        createBoardCommand,
        refreshBoardsCommand,
        openBoardCommand,
        openBoardToColumnCommand,
        createTaskFromFileCommand,
        quickCreateTaskCommand,
        deleteBoardCommand,
        showHealthStatusCommand,
        healthCheckDisposable
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

export async function deactivate() {
    console.log('Kanban MCP extension is now deactivated!');
    
    // Clear health check interval
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }
    
    // Hide status bar item
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    
    // Stop embedded server
    if (embeddedServer) {
        try {
            await embeddedServer.stop();
            console.log('Embedded server stopped');
        } catch (error) {
            console.error('Error stopping embedded server:', error);
        }
    }
}