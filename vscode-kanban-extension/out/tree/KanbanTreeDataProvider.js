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
                return boards.map(board => new KanbanTreeItem(board.name, board.id, 'board', vscode.TreeItemCollapsibleState.Collapsed, {
                    command: 'kanban-mcp.openBoard',
                    title: 'Open Board',
                    arguments: [board.id]
                }));
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to load boards: ${error}`);
                return [];
            }
        }
        else if (element.type === 'board') {
            // Board level - show columns
            try {
                const board = await this.mcpClient.getBoard(element.id);
                if (board.columns) {
                    return board.columns.map(column => new KanbanTreeItem(`${column.name} (${column.tasks?.length || 0})`, column.id, 'column', vscode.TreeItemCollapsibleState.Collapsed));
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
exports.KanbanTreeItem = KanbanTreeItem;
//# sourceMappingURL=KanbanTreeDataProvider.js.map