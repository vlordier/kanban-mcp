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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClient = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
class MCPClient {
    constructor() {
        const config = vscode.workspace.getConfiguration('kanban-mcp');
        this.mcpServerUrl = config.get('mcpServerUrl', 'http://localhost:3001');
        this.webServerUrl = config.get('webServerUrl', 'http://localhost:3000');
        this.webClient = axios_1.default.create({
            baseURL: this.webServerUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            }
        });
        // Add response interceptor for error handling
        this.webClient.interceptors.response.use(response => response, error => {
            console.error('API Error:', error);
            if (error.response?.status === 404) {
                throw new Error('Kanban server not found. Please check your server configuration.');
            }
            else if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Kanban server. Please ensure the server is running.');
            }
            throw error;
        });
    }
    async getBoards() {
        try {
            const response = await this.webClient.get('/api/v1/boards');
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch boards:', error);
            throw error;
        }
    }
    async getBoard(boardId) {
        try {
            const response = await this.webClient.get(`/api/v1/boards/${boardId}`);
            return response.data;
        }
        catch (error) {
            console.error(`Failed to fetch board ${boardId}:`, error);
            throw error;
        }
    }
    async createBoard(name, goal) {
        try {
            const response = await this.webClient.post('/api/v1/boards', {
                name,
                goal
            });
            return response.data;
        }
        catch (error) {
            console.error('Failed to create board:', error);
            throw error;
        }
    }
    async updateBoard(boardId, name, goal) {
        try {
            const response = await this.webClient.put(`/api/v1/boards/${boardId}`, {
                name,
                goal
            });
            return response.data;
        }
        catch (error) {
            console.error(`Failed to update board ${boardId}:`, error);
            throw error;
        }
    }
    async deleteBoard(boardId) {
        try {
            await this.webClient.delete(`/api/v1/boards/${boardId}`);
        }
        catch (error) {
            console.error(`Failed to delete board ${boardId}:`, error);
            throw error;
        }
    }
    async createTask(columnId, title, content) {
        try {
            const response = await this.webClient.post('/api/v1/tasks', {
                columnId,
                title,
                content
            });
            return response.data.task;
        }
        catch (error) {
            console.error('Failed to create task:', error);
            throw error;
        }
    }
    async updateTask(taskId, title, content) {
        try {
            const response = await this.webClient.put(`/api/v1/tasks/${taskId}`, {
                title,
                content
            });
            return response.data.task;
        }
        catch (error) {
            console.error(`Failed to update task ${taskId}:`, error);
            throw error;
        }
    }
    async moveTask(taskId, targetColumnId, reason) {
        try {
            await this.webClient.post(`/api/v1/tasks/${taskId}/move`, {
                targetColumnId,
                reason
            });
        }
        catch (error) {
            console.error(`Failed to move task ${taskId}:`, error);
            throw error;
        }
    }
    async deleteTask(taskId) {
        try {
            await this.webClient.delete(`/api/v1/tasks/${taskId}`);
        }
        catch (error) {
            console.error(`Failed to delete task ${taskId}:`, error);
            throw error;
        }
    }
    async checkServerHealth() {
        try {
            const response = await this.webClient.get('/health');
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    }
    getWebServerUrl() {
        return this.webServerUrl;
    }
    getMCPServerUrl() {
        return this.mcpServerUrl;
    }
}
exports.MCPClient = MCPClient;
//# sourceMappingURL=MCPClient.js.map