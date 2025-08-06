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
                if (boards.length === 0) {
                    // Return placeholder item when no boards exist
                    const placeholderItem = new KanbanTreeItem(
                        'No boards found',
                        'no-boards',
                        'board',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'kanban-mcp.createBoard',
                            title: 'Create First Board',
                            arguments: []
                        }
                    );
                    placeholderItem.contextValue = 'placeholder-no-boards';
                    return [placeholderItem];
                }
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
                // Return placeholder item for error state
                const errorItem = new KanbanTreeItem(
                    'Error loading boards',
                    'error-boards',
                    'board',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'kanban-mcp.refreshBoards',
                        title: 'Retry Loading Boards',
                        arguments: []
                    }
                );
                errorItem.contextValue = 'placeholder-error';
                return [errorItem];
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
                        vscode.TreeItemCollapsibleState.Collapsed,
                        {
                            command: 'kanban-mcp.openBoardToColumn',
                            title: 'Open Board at Column',
                            arguments: [element.id, column.id]
                        }
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

        // Set status-aware icons based on type
        switch (type) {
            case 'board':
                // Color-code boards based on overall completion
                const boardCompletion = this.calculateBoardCompletion();
                if (boardCompletion >= 0.8) {
                    this.iconPath = new vscode.ThemeIcon('project', new vscode.ThemeColor('charts.green'));
                } else if (boardCompletion >= 0.4) {
                    this.iconPath = new vscode.ThemeIcon('project', new vscode.ThemeColor('charts.yellow'));
                } else {
                    this.iconPath = new vscode.ThemeIcon('project', new vscode.ThemeColor('charts.blue'));
                }
                this.contextValue = 'board';
                break;
            case 'column':
                // Color-code columns based on their purpose and capacity
                const columnColor = this.getColumnStatusColor();
                this.iconPath = new vscode.ThemeIcon('list-unordered', columnColor);
                this.contextValue = 'column';
                break;
            case 'task':
                // Task status-aware icons
                const taskStatus = this.getTaskStatusIcon();
                this.iconPath = new vscode.ThemeIcon(taskStatus.icon, taskStatus.color);
                this.contextValue = 'task';
                this.tooltip = description;
                break;
        }
    }

    private calculateBoardCompletion(): number {
        // For boards, we need additional data - simplified for now
        return 0.5; // Default middle completion
    }

    private getColumnStatusColor(): vscode.ThemeColor {
        const columnName = this.label.toLowerCase();
        
        // Determine column type and capacity status
        if (columnName.includes('todo') || columnName.includes('backlog')) {
            return new vscode.ThemeColor('charts.gray');
        } else if (columnName.includes('progress') || columnName.includes('doing')) {
            // Check if column appears overloaded
            const taskCount = this.extractTaskCount();
            return taskCount > 5 
                ? new vscode.ThemeColor('charts.red')
                : new vscode.ThemeColor('charts.yellow');
        } else if (columnName.includes('review') || columnName.includes('testing')) {
            return new vscode.ThemeColor('charts.orange');
        } else if (columnName.includes('done') || columnName.includes('complete')) {
            return new vscode.ThemeColor('charts.green');
        }
        
        return new vscode.ThemeColor('charts.blue');
    }

    private getTaskStatusIcon(): { icon: string; color?: vscode.ThemeColor } {
        const description = this.description?.toLowerCase() || '';
        
        // Determine task urgency/status from content clues
        if (description.includes('urgent') || description.includes('critical')) {
            return { icon: 'error', color: new vscode.ThemeColor('errorForeground') };
        } else if (description.includes('blocked') || description.includes('waiting')) {
            return { icon: 'warning', color: new vscode.ThemeColor('problemsWarningIcon.foreground') };
        } else if (description.includes('review') || description.includes('testing')) {
            return { icon: 'eye', color: new vscode.ThemeColor('charts.orange') };
        } else if (description.includes('complete') || description.includes('done')) {
            return { icon: 'check', color: new vscode.ThemeColor('charts.green') };
        }
        
        return { icon: 'circle-outline', color: new vscode.ThemeColor('charts.blue') };
    }

    private extractTaskCount(): number {
        const match = this.label.match(/\((\d+)\)/);
        return match ? parseInt(match[1], 10) : 0;
    }
}