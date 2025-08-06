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
class SimpleCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 30000; // 30 seconds default
    }
    set(key, data, options = {}) {
        const ttl = options.ttl || this.defaultTTL;
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    invalidate(pattern) {
        const keys = Array.from(this.cache.keys());
        keys.forEach(key => {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        });
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
    getStats() {
        return {
            totalEntries: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}
class MCPClient {
    constructor() {
        this.cache = new SimpleCache();
        this.initializeConfiguration();
    }
    setErrorHandler(errorHandler) {
        this.errorHandler = errorHandler;
    }
    initializeConfiguration() {
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
        const cacheKey = 'boards';
        // Try to get from cache first
        const cachedBoards = this.cache.get(cacheKey);
        if (cachedBoards) {
            return cachedBoards;
        }
        try {
            console.log('🌐 Fetching boards from API');
            const response = await this.webClient.get('/api/boards');
            const boards = response.data;
            // Cache the result for 1 minute
            this.cache.set(cacheKey, boards, { ttl: 60000 });
            return boards;
        }
        catch (error) {
            const kanbanError = this.errorHandler?.handleError(error, {
                operation: 'getBoards',
                cacheKey
            }) || error;
            throw kanbanError;
        }
    }
    async getBoard(boardId) {
        const cacheKey = `board:${boardId}`;
        // Try to get from cache first
        const cachedBoard = this.cache.get(cacheKey);
        if (cachedBoard) {
            return cachedBoard;
        }
        try {
            console.log(`🌐 Fetching board ${boardId} from API`);
            const response = await this.webClient.get(`/api/boards/${boardId}`);
            const board = response.data;
            // Cache the result for 2 minutes (longer than boards list)
            this.cache.set(cacheKey, board, { ttl: 120000 });
            return board;
        }
        catch (error) {
            const kanbanError = this.errorHandler?.handleError(error, {
                operation: 'getBoard',
                boardId,
                cacheKey
            }) || error;
            throw kanbanError;
        }
    }
    async createBoard(name, goal) {
        try {
            const response = await this.webClient.post('/api/boards', {
                name,
                goal
            });
            // Invalidate boards cache since a new board was created
            this.cache.invalidate('boards');
            console.log('♻️ Invalidated boards cache after creation');
            return response.data;
        }
        catch (error) {
            const kanbanError = this.errorHandler?.handleError(error, {
                operation: 'createBoard',
                name,
                goal
            }) || error;
            throw kanbanError;
        }
    }
    async updateBoard(boardId, name, goal) {
        try {
            const response = await this.webClient.put(`/api/boards/${boardId}`, {
                name,
                goal
            });
            // Invalidate both boards cache and specific board cache
            this.cache.invalidate('boards');
            this.cache.invalidate(`board:${boardId}`);
            console.log(`♻️ Invalidated caches after updating board ${boardId}`);
            return response.data;
        }
        catch (error) {
            const kanbanError = this.errorHandler?.handleError(error, {
                operation: 'updateBoard',
                boardId,
                name,
                goal
            }) || error;
            throw kanbanError;
        }
    }
    async deleteBoard(boardId) {
        try {
            await this.webClient.delete(`/api/boards/${boardId}`);
            // Invalidate both boards cache and specific board cache
            this.cache.invalidate('boards');
            this.cache.invalidate(`board:${boardId}`);
            console.log(`♻️ Invalidated caches after deleting board ${boardId}`);
        }
        catch (error) {
            const kanbanError = this.errorHandler?.handleError(error, {
                operation: 'deleteBoard',
                boardId
            }) || error;
            throw kanbanError;
        }
    }
    async createTask(columnId, title, content) {
        try {
            const response = await this.webClient.post('/api/tasks', {
                columnId,
                title,
                content
            });
            // Invalidate board caches since tasks affect board state
            this.cache.invalidate('board:');
            console.log('♻️ Invalidated board caches after creating task');
            return response.data.task;
        }
        catch (error) {
            const kanbanError = this.errorHandler?.handleError(error, {
                operation: 'createTask',
                columnId,
                title,
                content
            }) || error;
            throw kanbanError;
        }
    }
    async updateTask(taskId, title, content) {
        try {
            const response = await this.webClient.put(`/api/tasks/${taskId}`, {
                title,
                content
            });
            // Invalidate board caches since tasks affect board state
            this.cache.invalidate('board:');
            console.log(`♻️ Invalidated board caches after updating task ${taskId}`);
            return response.data.task;
        }
        catch (error) {
            const kanbanError = this.errorHandler?.handleError(error, {
                operation: 'updateTask',
                taskId,
                title,
                content
            }) || error;
            throw kanbanError;
        }
    }
    async moveTask(taskId, targetColumnId, reason) {
        try {
            await this.webClient.post(`/api/tasks/${taskId}/move`, {
                targetColumnId,
                reason
            });
            // Invalidate board caches since task movement affects board state
            this.cache.invalidate('board:');
            console.log(`♻️ Invalidated board caches after moving task ${taskId}`);
        }
        catch (error) {
            const kanbanError = this.errorHandler?.handleError(error, {
                operation: 'moveTask',
                taskId,
                targetColumnId,
                reason
            }) || error;
            throw kanbanError;
        }
    }
    async deleteTask(taskId) {
        try {
            await this.webClient.delete(`/api/tasks/${taskId}`);
            // Invalidate board caches since task deletion affects board state
            this.cache.invalidate('board:');
            console.log(`♻️ Invalidated board caches after deleting task ${taskId}`);
        }
        catch (error) {
            const kanbanError = this.errorHandler?.handleError(error, {
                operation: 'deleteTask',
                taskId
            }) || error;
            throw kanbanError;
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
    updateConfiguration(webServerUrl, mcpServerUrl) {
        if (webServerUrl) {
            this.webServerUrl = webServerUrl;
        }
        if (mcpServerUrl) {
            this.mcpServerUrl = mcpServerUrl;
        }
        // Clear cache when configuration changes since we're connecting to a different server
        this.cache.clear();
        console.log('♻️ Cleared all caches due to configuration change');
        // Recreate axios client with new base URL
        this.webClient = axios_1.default.create({
            baseURL: this.webServerUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            }
        });
        // Re-add response interceptor for error handling
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
        console.log(`MCPClient configuration updated: webServerUrl=${this.webServerUrl}`);
    }
    getWebServerUrl() {
        return this.webServerUrl;
    }
    getMCPServerUrl() {
        return this.mcpServerUrl;
    }
    getCacheStats() {
        return this.cache.getStats();
    }
    clearCache() {
        this.cache.clear();
        console.log('♻️ Manually cleared all caches');
    }
}
exports.MCPClient = MCPClient;
//# sourceMappingURL=MCPClient.js.map