import * as vscode from 'vscode';
import { MCPClient, Board, Column, Task } from '../mcp/MCPClient';

export class KanbanTreeDataProvider implements vscode.TreeDataProvider<KanbanTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<KanbanTreeItem | undefined | null | void> = new vscode.EventEmitter<KanbanTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<KanbanTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private mcpClient: MCPClient) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: KanbanTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: KanbanTreeItem): Promise<KanbanTreeItem[]> {
        if (!element) {
            // Root level - show boards
            try {
                const boards = await this.mcpClient.getBoards();
                return boards.map(board => new KanbanTreeItem(
                    board.name,
                    board.id,
                    'board',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    {
                        command: 'kanban-mcp.openBoard',
                        title: 'Open Board',
                        arguments: [board.id]
                    }
                ));
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load boards: ${error}`);
                return [];
            }
        } else if (element.type === 'board') {
            // Board level - show columns
            try {
                const board = await this.mcpClient.getBoard(element.id);
                if (board.columns) {
                    return board.columns.map(column => new KanbanTreeItem(
                        `${column.name} (${column.tasks?.length || 0})`,
                        column.id,
                        'column',
                        vscode.TreeItemCollapsibleState.Collapsed
                    ));
                }
                return [];
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load board details: ${error}`);
                return [];
            }
        } else if (element.type === 'column') {
            // Column level - show tasks
            try {
                const boards = await this.mcpClient.getBoards();
                for (const board of boards) {
                    if (board.columns) {
                        const column = board.columns.find(c => c.id === element.id);
                        if (column && column.tasks) {
                            return column.tasks.map(task => new KanbanTreeItem(
                                task.title,
                                task.id,
                                'task',
                                vscode.TreeItemCollapsibleState.None,
                                undefined,
                                task.content
                            ));
                        }
                    }
                }
                return [];
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load tasks: ${error}`);
                return [];
            }
        }

        return [];
    }
}

export class KanbanTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly type: 'board' | 'column' | 'task',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly description?: string
    ) {
        super(label, collapsibleState);

        this.id = id;
        this.description = description;
        this.contextValue = type;

        // Set icons based on type
        switch (type) {
            case 'board':
                this.iconPath = new vscode.ThemeIcon('project');
                this.contextValue = 'board';
                break;
            case 'column':
                this.iconPath = new vscode.ThemeIcon('list-unordered');
                this.contextValue = 'column';
                break;
            case 'task':
                this.iconPath = new vscode.ThemeIcon('circle-outline');
                this.contextValue = 'task';
                this.tooltip = description;
                break;
        }
    }
}