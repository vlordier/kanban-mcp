import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '../common/ErrorHandler';

export interface Board {
    id: string;
    name: string;
    goal: string;
    createdAt: string;
    updatedAt: string;
    columns?: Column[];
}

export interface Column {
    id: string;
    name: string;
    position: number;
    boardId: string;
    tasks?: Task[];
}

export interface Task {
    id: string;
    title: string;
    content: string;
    position: number;
    columnId: string;
    createdAt: string;
    updatedAt: string;
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
    ttl?: number; // Default TTL in milliseconds
}

class SimpleCache {
    private cache = new Map<string, CacheEntry<any>>();
    private defaultTTL = 30000; // 30 seconds default

    set<T>(key: string, data: T, options: CacheOptions = {}): void {
        const ttl = options.ttl || this.defaultTTL;
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    invalidate(pattern: string): void {
        const keys = Array.from(this.cache.keys());
        keys.forEach(key => {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        });
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }

    getStats(): { totalEntries: number; keys: string[] } {
        return {
            totalEntries: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

export class MCPClient {
    private webClient!: AxiosInstance;
    private mcpServerUrl!: string;
    private webServerUrl!: string;
    private cache = new SimpleCache();
    private errorHandler?: ErrorHandler;

    constructor() {
        this.initializeConfiguration();
    }

    setErrorHandler(errorHandler: ErrorHandler): void {
        this.errorHandler = errorHandler;
    }

    private initializeConfiguration() {
        const config = vscode.workspace.getConfiguration('kanban-mcp');
        this.mcpServerUrl = config.get('mcpServerUrl', 'http://localhost:3001');
        this.webServerUrl = config.get('webServerUrl', 'http://localhost:3000');
        
        this.webClient = axios.create({
            baseURL: this.webServerUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // Add response interceptor for error handling
        this.webClient.interceptors.response.use(
            response => response,
            error => {
                console.error('API Error:', error);
                if (error.response?.status === 404) {
                    throw new Error('Kanban server not found. Please check your server configuration.');
                } else if (error.code === 'ECONNREFUSED') {
                    throw new Error('Cannot connect to Kanban server. Please ensure the server is running.');
                }
                throw error;
            }
        );
    }

    async getBoards(): Promise<Board[]> {
        const cacheKey = 'boards';
        
        // Try to get from cache first
        const cachedBoards = this.cache.get<Board[]>(cacheKey);
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
        } catch (error) {
            const kanbanError = this.errorHandler?.handleError(error as Error, {
                operation: 'getBoards',
                cacheKey
            }) || error;
            throw kanbanError;
        }
    }

    async getBoard(boardId: string): Promise<Board> {
        const cacheKey = `board:${boardId}`;
        
        // Try to get from cache first
        const cachedBoard = this.cache.get<Board>(cacheKey);
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
        } catch (error) {
            const kanbanError = this.errorHandler?.handleError(error as Error, {
                operation: 'getBoard',
                boardId,
                cacheKey
            }) || error;
            throw kanbanError;
        }
    }

    async createBoard(name: string, goal: string): Promise<Board> {
        try {
            const response = await this.webClient.post('/api/boards', {
                name,
                goal
            });
            
            // Invalidate boards cache since a new board was created
            this.cache.invalidate('boards');
            console.log('♻️ Invalidated boards cache after creation');
            
            return response.data;
        } catch (error) {
            const kanbanError = this.errorHandler?.handleError(error as Error, {
                operation: 'createBoard',
                name,
                goal
            }) || error;
            throw kanbanError;
        }
    }

    async updateBoard(boardId: string, name: string, goal: string): Promise<Board> {
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
        } catch (error) {
            const kanbanError = this.errorHandler?.handleError(error as Error, {
                operation: 'updateBoard',
                boardId,
                name,
                goal
            }) || error;
            throw kanbanError;
        }
    }

    async deleteBoard(boardId: string): Promise<void> {
        try {
            await this.webClient.delete(`/api/boards/${boardId}`);
            
            // Invalidate both boards cache and specific board cache
            this.cache.invalidate('boards');
            this.cache.invalidate(`board:${boardId}`);
            console.log(`♻️ Invalidated caches after deleting board ${boardId}`);
        } catch (error) {
            const kanbanError = this.errorHandler?.handleError(error as Error, {
                operation: 'deleteBoard',
                boardId
            }) || error;
            throw kanbanError;
        }
    }

    async createTask(columnId: string, title: string, content: string): Promise<Task> {
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
        } catch (error) {
            const kanbanError = this.errorHandler?.handleError(error as Error, {
                operation: 'createTask',
                columnId,
                title,
                content
            }) || error;
            throw kanbanError;
        }
    }

    async updateTask(taskId: string, title: string, content: string): Promise<Task> {
        try {
            const response = await this.webClient.put(`/api/tasks/${taskId}`, {
                title,
                content
            });
            
            // Invalidate board caches since tasks affect board state
            this.cache.invalidate('board:');
            console.log(`♻️ Invalidated board caches after updating task ${taskId}`);
            
            return response.data.task;
        } catch (error) {
            const kanbanError = this.errorHandler?.handleError(error as Error, {
                operation: 'updateTask',
                taskId,
                title,
                content
            }) || error;
            throw kanbanError;
        }
    }

    async moveTask(taskId: string, targetColumnId: string, reason?: string): Promise<void> {
        try {
            await this.webClient.post(`/api/tasks/${taskId}/move`, {
                targetColumnId,
                reason
            });
            
            // Invalidate board caches since task movement affects board state
            this.cache.invalidate('board:');
            console.log(`♻️ Invalidated board caches after moving task ${taskId}`);
        } catch (error) {
            const kanbanError = this.errorHandler?.handleError(error as Error, {
                operation: 'moveTask',
                taskId,
                targetColumnId,
                reason
            }) || error;
            throw kanbanError;
        }
    }

    async deleteTask(taskId: string): Promise<void> {
        try {
            await this.webClient.delete(`/api/tasks/${taskId}`);
            
            // Invalidate board caches since task deletion affects board state
            this.cache.invalidate('board:');
            console.log(`♻️ Invalidated board caches after deleting task ${taskId}`);
        } catch (error) {
            const kanbanError = this.errorHandler?.handleError(error as Error, {
                operation: 'deleteTask',
                taskId
            }) || error;
            throw kanbanError;
        }
    }

    async checkServerHealth(): Promise<boolean> {
        try {
            const response = await this.webClient.get('/health');
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    updateConfiguration(webServerUrl?: string, mcpServerUrl?: string): void {
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
        this.webClient = axios.create({
            baseURL: this.webServerUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // Re-add response interceptor for error handling
        this.webClient.interceptors.response.use(
            response => response,
            error => {
                console.error('API Error:', error);
                if (error.response?.status === 404) {
                    throw new Error('Kanban server not found. Please check your server configuration.');
                } else if (error.code === 'ECONNREFUSED') {
                    throw new Error('Cannot connect to Kanban server. Please ensure the server is running.');
                }
                throw error;
            }
        );
        
        console.log(`MCPClient configuration updated: webServerUrl=${this.webServerUrl}`);
    }

    getWebServerUrl(): string {
        return this.webServerUrl;
    }

    getMCPServerUrl(): string {
        return this.mcpServerUrl;
    }

    getCacheStats(): { totalEntries: number; keys: string[] } {
        return this.cache.getStats();
    }

    clearCache(): void {
        this.cache.clear();
        console.log('♻️ Manually cleared all caches');
    }
}