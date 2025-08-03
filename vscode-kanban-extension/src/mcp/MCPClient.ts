import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

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

export class MCPClient {
    private webClient: AxiosInstance;
    private mcpServerUrl: string;
    private webServerUrl: string;

    constructor() {
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
        try {
            const response = await this.webClient.get('/api/v1/boards');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch boards:', error);
            throw error;
        }
    }

    async getBoard(boardId: string): Promise<Board> {
        try {
            const response = await this.webClient.get(`/api/v1/boards/${boardId}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch board ${boardId}:`, error);
            throw error;
        }
    }

    async createBoard(name: string, goal: string): Promise<Board> {
        try {
            const response = await this.webClient.post('/api/v1/boards', {
                name,
                goal
            });
            return response.data;
        } catch (error) {
            console.error('Failed to create board:', error);
            throw error;
        }
    }

    async updateBoard(boardId: string, name: string, goal: string): Promise<Board> {
        try {
            const response = await this.webClient.put(`/api/v1/boards/${boardId}`, {
                name,
                goal
            });
            return response.data;
        } catch (error) {
            console.error(`Failed to update board ${boardId}:`, error);
            throw error;
        }
    }

    async deleteBoard(boardId: string): Promise<void> {
        try {
            await this.webClient.delete(`/api/v1/boards/${boardId}`);
        } catch (error) {
            console.error(`Failed to delete board ${boardId}:`, error);
            throw error;
        }
    }

    async createTask(columnId: string, title: string, content: string): Promise<Task> {
        try {
            const response = await this.webClient.post('/api/v1/tasks', {
                columnId,
                title,
                content
            });
            return response.data.task;
        } catch (error) {
            console.error('Failed to create task:', error);
            throw error;
        }
    }

    async updateTask(taskId: string, title: string, content: string): Promise<Task> {
        try {
            const response = await this.webClient.put(`/api/v1/tasks/${taskId}`, {
                title,
                content
            });
            return response.data.task;
        } catch (error) {
            console.error(`Failed to update task ${taskId}:`, error);
            throw error;
        }
    }

    async moveTask(taskId: string, targetColumnId: string, reason?: string): Promise<void> {
        try {
            await this.webClient.post(`/api/v1/tasks/${taskId}/move`, {
                targetColumnId,
                reason
            });
        } catch (error) {
            console.error(`Failed to move task ${taskId}:`, error);
            throw error;
        }
    }

    async deleteTask(taskId: string): Promise<void> {
        try {
            await this.webClient.delete(`/api/v1/tasks/${taskId}`);
        } catch (error) {
            console.error(`Failed to delete task ${taskId}:`, error);
            throw error;
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

    getWebServerUrl(): string {
        return this.webServerUrl;
    }

    getMCPServerUrl(): string {
        return this.mcpServerUrl;
    }
}