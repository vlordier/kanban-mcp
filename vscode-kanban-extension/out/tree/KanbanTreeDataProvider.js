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
exports.KanbanTreeItem = exports.KanbanTreeDataProvider = void 0;
const vscode = __importStar(require("vscode"));
class KanbanTreeDataProvider {
    constructor(mcpClient) {
        this.mcpClient = mcpClient;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show boards
            try {
                const boards = await this.mcpClient.getBoards();
                if (boards.length === 0) {
                    // Return placeholder item when no boards exist
                    const placeholderItem = new KanbanTreeItem('No boards found', 'no-boards', 'board', vscode.TreeItemCollapsibleState.None, {
                        command: 'kanban-mcp.createBoard',
                        title: 'Create First Board',
                        arguments: []
                    });
                    placeholderItem.contextValue = 'placeholder-no-boards';
                    return [placeholderItem];
                }
                return boards.map(board => new KanbanTreeItem(board.name, board.id, 'board', vscode.TreeItemCollapsibleState.Collapsed, {
                    command: 'kanban-mcp.openBoard',
                    title: 'Open Board',
                    arguments: [board.id]
                }));
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to load boards: ${error}`);
                // Return placeholder item for error state
                const errorItem = new KanbanTreeItem('Error loading boards', 'error-boards', 'board', vscode.TreeItemCollapsibleState.None, {
                    command: 'kanban-mcp.refreshBoards',
                    title: 'Retry Loading Boards',
                    arguments: []
                });
                errorItem.contextValue = 'placeholder-error';
                return [errorItem];
            }
        }
        else if (element.type === 'board') {
            // Board level - show columns
            try {
                const board = await this.mcpClient.getBoard(element.id);
                if (board.columns) {
                    return board.columns.map(column => new KanbanTreeItem(`${column.name} (${column.tasks?.length || 0})`, column.id, 'column', vscode.TreeItemCollapsibleState.Collapsed, {
                        command: 'kanban-mcp.openBoardToColumn',
                        title: 'Open Board at Column',
                        arguments: [element.id, column.id]
                    }));
                }
                return [];
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to load board details: ${error}`);
                return [];
            }
        }
        else if (element.type === 'column') {
            // Column level - show tasks
            try {
                const boards = await this.mcpClient.getBoards();
                for (const board of boards) {
                    if (board.columns) {
                        const column = board.columns.find(c => c.id === element.id);
                        if (column && column.tasks) {
                            return column.tasks.map(task => new KanbanTreeItem(task.title, task.id, 'task', vscode.TreeItemCollapsibleState.None, undefined, task.content));
                        }
                    }
                }
                return [];
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to load tasks: ${error}`);
                return [];
            }
        }
        return [];
    }
}
exports.KanbanTreeDataProvider = KanbanTreeDataProvider;
class KanbanTreeItem extends vscode.TreeItem {
    constructor(label, id, type, collapsibleState, command, description) {
        super(label, collapsibleState);
        this.label = label;
        this.id = id;
        this.type = type;
        this.collapsibleState = collapsibleState;
        this.command = command;
        this.description = description;
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
                }
                else if (boardCompletion >= 0.4) {
                    this.iconPath = new vscode.ThemeIcon('project', new vscode.ThemeColor('charts.yellow'));
                }
                else {
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
    calculateBoardCompletion() {
        // For boards, we need additional data - simplified for now
        return 0.5; // Default middle completion
    }
    getColumnStatusColor() {
        const columnName = this.label.toLowerCase();
        // Determine column type and capacity status
        if (columnName.includes('todo') || columnName.includes('backlog')) {
            return new vscode.ThemeColor('charts.gray');
        }
        else if (columnName.includes('progress') || columnName.includes('doing')) {
            // Check if column appears overloaded
            const taskCount = this.extractTaskCount();
            return taskCount > 5
                ? new vscode.ThemeColor('charts.red')
                : new vscode.ThemeColor('charts.yellow');
        }
        else if (columnName.includes('review') || columnName.includes('testing')) {
            return new vscode.ThemeColor('charts.orange');
        }
        else if (columnName.includes('done') || columnName.includes('complete')) {
            return new vscode.ThemeColor('charts.green');
        }
        return new vscode.ThemeColor('charts.blue');
    }
    getTaskStatusIcon() {
        const description = this.description?.toLowerCase() || '';
        // Determine task urgency/status from content clues
        if (description.includes('urgent') || description.includes('critical')) {
            return { icon: 'error', color: new vscode.ThemeColor('errorForeground') };
        }
        else if (description.includes('blocked') || description.includes('waiting')) {
            return { icon: 'warning', color: new vscode.ThemeColor('problemsWarningIcon.foreground') };
        }
        else if (description.includes('review') || description.includes('testing')) {
            return { icon: 'eye', color: new vscode.ThemeColor('charts.orange') };
        }
        else if (description.includes('complete') || description.includes('done')) {
            return { icon: 'check', color: new vscode.ThemeColor('charts.green') };
        }
        return { icon: 'circle-outline', color: new vscode.ThemeColor('charts.blue') };
    }
    extractTaskCount() {
        const match = this.label.match(/\((\d+)\)/);
        return match ? parseInt(match[1], 10) : 0;
    }
}
exports.KanbanTreeItem = KanbanTreeItem;
//# sourceMappingURL=KanbanTreeDataProvider.js.map