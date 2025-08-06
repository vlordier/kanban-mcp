import * as vscode from 'vscode';
import * as http from 'http';
import * as url from 'url';

export interface Board {
    id: string;
    name: string;
    goal: string;
    createdAt: string;
    updatedAt: string;
}

export interface Column {
    id: string;
    name: string;
    position: number;
    boardId: string;
    tasks: Task[];
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

export class EmbeddedServer {
    private server: http.Server | null = null;
    private port: number = 0;
    private boards: Board[] = [];
    private columns: Column[] = [];
    private tasks: Task[] = [];

    constructor() {
        this.initializeDefaultData();
    }

    private initializeDefaultData() {
        // Default board
        const defaultBoard: Board = {
            id: 'board-1',
            name: 'Getting Started',
            goal: 'Learn how to use the Kanban board',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.boards.push(defaultBoard);

        // Default columns
        const defaultColumns: Column[] = [
            {
                id: 'col-1',
                name: 'To Do',
                position: 1,
                boardId: 'board-1',
                tasks: []
            },
            {
                id: 'col-2',
                name: 'In Progress',
                position: 2,
                boardId: 'board-1',
                tasks: []
            },
            {
                id: 'col-3',
                name: 'Done',
                position: 3,
                boardId: 'board-1',
                tasks: []
            }
        ];
        this.columns.push(...defaultColumns);

        // Default tasks
        const defaultTasks: Task[] = [
            {
                id: 'task-1',
                title: 'Welcome to Kanban!',
                content: 'This is your first task. You can edit, move, and delete tasks.',
                position: 1,
                columnId: 'col-1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'task-2',
                title: 'Create a new board',
                content: 'Try creating your own board for your project.',
                position: 2,
                columnId: 'col-1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        this.tasks.push(...defaultTasks);
        this.columns[0].tasks = defaultTasks;
    }

    async start(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });

            this.server.listen(0, 'localhost', () => {
                const address = this.server!.address();
                if (address && typeof address === 'object') {
                    this.port = address.port;
                    console.log(`Embedded Kanban server started on port ${this.port}`);
                    resolve(this.port);
                } else {
                    reject(new Error('Failed to get server address'));
                }
            });

            this.server.on('error', (error) => {
                reject(error);
            });
        });
    }

    stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('Embedded Kanban server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    getPort(): number {
        return this.port;
    }

    // Public API methods for direct access
    public getBoards(): Board[] {
        return this.boards;
    }

    public getBoard(boardId: string): { board: Board; columns: Column[] } | null {
        const board = this.boards.find(b => b.id === boardId);
        if (!board) {
            return null;
        }
        const columns = this.columns.filter(c => c.boardId === boardId);
        return { board, columns };
    }

    public getTask(taskId: string): Task | null {
        return this.tasks.find(t => t.id === taskId) || null;
    }

    public createBoard(name: string, goal: string = ''): Board {
        const board: Board = {
            id: `board-${Date.now()}`,
            name: name.trim() || 'Untitled Board',
            goal: goal.trim() || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.boards.push(board);

        // Create default columns
        const defaultColumns = [
            { name: 'To Do', position: 0 },
            { name: 'In Progress', position: 1 },
            { name: 'Done', position: 2 }
        ];

        defaultColumns.forEach(col => {
            const column: Column = {
                id: `col-${Date.now()}-${col.position}`,
                name: col.name,
                position: col.position,
                boardId: board.id,
                tasks: []
            };
            this.columns.push(column);
        });

        return board;
    }

    public deleteBoard(boardId: string): boolean {
        const boardIndex = this.boards.findIndex(b => b.id === boardId);
        if (boardIndex === -1) {
            return false;
        }

        // Remove board
        this.boards.splice(boardIndex, 1);

        // Remove associated columns and tasks
        const columnIds = this.columns.filter(c => c.boardId === boardId).map(c => c.id);
        this.columns = this.columns.filter(c => c.boardId !== boardId);
        this.tasks = this.tasks.filter(t => !columnIds.includes(t.columnId));

        return true;
    }

    public createTask(columnId: string, title: string, content: string = ''): Task | null {
        const column = this.columns.find(c => c.id === columnId);
        if (!column) {
            return null;
        }

        const task: Task = {
            id: `task-${Date.now()}`,
            title: title.trim() || 'Untitled Task',
            content: content.trim() || '',
            position: this.tasks.filter(t => t.columnId === columnId).length,
            columnId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.tasks.push(task);
        return task;
    }

    public updateTask(taskId: string, title?: string, content?: string): Task | null {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            return null;
        }

        if (title !== undefined) {
            task.title = title.trim() || task.title || 'Untitled Task';
        }
        if (content !== undefined) {
            task.content = content.trim();
        }
        task.updatedAt = new Date().toISOString();
        return task;
    }

    public deleteTask(taskId: string): boolean {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            return false;
        }

        this.tasks.splice(taskIndex, 1);
        return true;
    }

    public moveTask(taskId: string, targetColumnId: string): boolean {
        const task = this.tasks.find(t => t.id === taskId);
        const targetColumn = this.columns.find(c => c.id === targetColumnId);
        
        if (!task || !targetColumn) {
            return false;
        }

        task.columnId = targetColumnId;
        task.updatedAt = new Date().toISOString();
        return true;
    }

    public exportData(): { boards: Board[]; columns: Column[]; tasks: Task[] } {
        return {
            boards: this.boards,
            columns: this.columns,
            tasks: this.tasks
        };
    }

    public importData(data: { boards: Board[]; columns: Column[]; tasks: Task[] }): boolean {
        try {
            // Validate data structure
            if (!Array.isArray(data.boards) || !Array.isArray(data.columns) || !Array.isArray(data.tasks)) {
                return false;
            }

            // Replace current data
            this.boards = data.boards;
            this.columns = data.columns;
            this.tasks = data.tasks;
            
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    }

    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        // Enable CORS with restricted origins for security
        const origin = req.headers.origin;
        const allowedOrigins = [
            'vscode-webview://',
            'http://localhost:3000',
            'http://localhost:8221'
        ];
        
        // Check if origin starts with any allowed pattern
        const isAllowedOrigin = allowedOrigins.some(allowed => 
            origin && (origin.startsWith(allowed) || origin === allowed)
        );
        
        if (isAllowedOrigin) {
            res.setHeader('Access-Control-Allow-Origin', origin!);
        }
        
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname || '';
        const method = req.method || 'GET';

        try {
            if (pathname === '/health' && method === 'GET') {
                this.handleHealthCheck(res);
            } else if (pathname === '/api/boards' && method === 'GET') {
                this.handleGetBoards(res);
            } else if (pathname.match(/^\/api\/boards\/[^/]+$/) && method === 'GET') {
                const boardId = pathname.split('/').pop()!;
                this.handleGetBoard(boardId, res);
            } else if (pathname === '/api/boards' && method === 'POST') {
                this.handleCreateBoard(req, res);
            } else if (pathname.match(/^\/api\/boards\/[^/]+$/) && method === 'DELETE') {
                const boardId = pathname.split('/').pop()!;
                this.handleDeleteBoard(boardId, res);
            } else if (pathname === '/api/tasks' && method === 'POST') {
                this.handleCreateTask(req, res);
            } else if (pathname.match(/^\/api\/tasks\/[^/]+$/) && method === 'GET') {
                const taskId = pathname.split('/').pop()!;
                this.handleGetTask(taskId, res);
            } else if (pathname.match(/^\/api\/tasks\/[^/]+$/) && method === 'PUT') {
                const taskId = pathname.split('/').pop()!;
                this.handleUpdateTask(taskId, req, res);
            } else if (pathname.match(/^\/api\/tasks\/[^/]+$/) && method === 'DELETE') {
                const taskId = pathname.split('/').pop()!;
                this.handleDeleteTask(taskId, res);
            } else if (pathname.match(/^\/api\/tasks\/[^/]+\/move$/) && method === 'POST') {
                const taskId = pathname.split('/')[3];
                this.handleMoveTask(taskId, req, res);
            } else if (pathname === '/api/export' && method === 'GET') {
                this.handleExportDatabase(res);
            } else if (pathname === '/api/import' && method === 'POST') {
                this.handleImportDatabase(req, res);
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error) {
            console.error('Server error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }

    private handleHealthCheck(res: http.ServerResponse) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok',
            timestamp: new Date().toISOString(),
            boards: this.boards.length,
            columns: this.columns.length,
            tasks: this.tasks.length
        }));
    }

    private handleGetBoards(res: http.ServerResponse) {
        // Convert to snake_case for web-ui compatibility
        const webBoards = this.boards.map(board => ({
            id: board.id,
            name: board.name,
            goal: board.goal,
            landing_column_id: null, // Default value, can be enhanced later
            created_at: board.createdAt,
            updated_at: board.updatedAt
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(webBoards));
    }

    private handleGetBoard(boardId: string, res: http.ServerResponse) {
        const board = this.boards.find(b => b.id === boardId);
        if (!board) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Board not found' }));
            return;
        }

        // Convert board to snake_case
        const webBoard = {
            id: board.id,
            name: board.name,
            goal: board.goal,
            landing_column_id: null, // Default value
            created_at: board.createdAt,
            updated_at: board.updatedAt
        };

        // Convert columns and tasks to snake_case
        const boardColumns = this.columns
            .filter(c => c.boardId === boardId)
            .map(column => ({
                id: column.id,
                board_id: column.boardId,
                name: column.name,
                position: column.position,
                wip_limit: 0, // Default value
                is_done_column: 0, // Default value
                tasks: this.tasks.filter(t => t.columnId === column.id).map(task => ({
                    id: task.id,
                    title: task.title,
                    content: task.content,
                    position: task.position,
                    column_id: task.columnId,
                    created_at: task.createdAt,
                    updated_at: task.updatedAt
                }))
            }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ board: webBoard, columns: boardColumns }));
    }

    private handleGetTask(taskId: string, res: http.ServerResponse) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Task not found' }));
            return;
        }

        // Convert to snake_case for web-ui compatibility
        const webTask = {
            id: task.id,
            title: task.title,
            content: task.content,
            position: task.position,
            column_id: task.columnId,
            created_at: task.createdAt,
            updated_at: task.updatedAt
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(webTask));
    }

    private handleCreateBoard(req: http.IncomingMessage, res: http.ServerResponse) {
        let body = '';
        const maxBodySize = 1024 * 10; // 10KB limit
        
        req.on('data', chunk => {
            body += chunk;
            if (body.length > maxBodySize) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request body too large' }));
                req.destroy();
                return;
            }
        });
        req.on('end', () => {
            try {
                // Input validation and sanitization
                const data = JSON.parse(body);
                
                if (!data || typeof data !== 'object') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid request body' }));
                    return;
                }
                
                const { name, goal } = data;
                
                if (!name || typeof name !== 'string' || name.trim().length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid or missing board name' }));
                    return;
                }
                
                if (typeof goal !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid board goal' }));
                    return;
                }
                
                // Sanitize inputs with proper defaults
                const sanitizedName = name.trim().substring(0, 100) || 'Untitled Board';
                const sanitizedGoal = (goal || '').trim().substring(0, 500);
                
                const newBoard: Board = {
                    id: `board-${Date.now()}`,
                    name: sanitizedName,
                    goal: sanitizedGoal,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                this.boards.push(newBoard);

                // Create default columns for new board
                const defaultColumns: Column[] = [
                    {
                        id: `col-${Date.now()}-1`,
                        name: 'To Do',
                        position: 1,
                        boardId: newBoard.id,
                        tasks: []
                    },
                    {
                        id: `col-${Date.now()}-2`,
                        name: 'In Progress',
                        position: 2,
                        boardId: newBoard.id,
                        tasks: []
                    },
                    {
                        id: `col-${Date.now()}-3`,
                        name: 'Done',
                        position: 3,
                        boardId: newBoard.id,
                        tasks: []
                    }
                ];
                this.columns.push(...defaultColumns);

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Board created successfully',
                    boardId: newBoard.id,
                    board: {
                        id: newBoard.id,
                        name: newBoard.name,
                        goal: newBoard.goal,
                        landing_column_id: null,
                        created_at: newBoard.createdAt,
                        updated_at: newBoard.updatedAt
                    }
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }

    private handleDeleteBoard(boardId: string, res: http.ServerResponse) {
        const boardIndex = this.boards.findIndex(b => b.id === boardId);
        if (boardIndex === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Board not found' }));
            return;
        }

        // Remove board, its columns, and tasks
        this.boards.splice(boardIndex, 1);
        this.columns = this.columns.filter(c => c.boardId !== boardId);
        this.tasks = this.tasks.filter(t => !this.columns.some(c => c.id === t.columnId && c.boardId === boardId));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: true, 
            message: 'Board deleted successfully',
            boardId 
        }));
    }

    private handleCreateTask(req: http.IncomingMessage, res: http.ServerResponse) {
        let body = '';
        const maxBodySize = 1024 * 20; // 20KB limit for tasks (larger content)
        
        req.on('data', chunk => {
            body += chunk;
            if (body.length > maxBodySize) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request body too large' }));
                req.destroy();
                return;
            }
        });
        req.on('end', () => {
            try {
                // Input validation and sanitization
                const data = JSON.parse(body);
                
                if (!data || typeof data !== 'object') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid request body' }));
                    return;
                }
                
                const { columnId, title, content } = data;
                
                if (!columnId || typeof columnId !== 'string' || columnId.trim().length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid or missing column ID' }));
                    return;
                }
                
                if (!title || typeof title !== 'string' || title.trim().length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid or missing task title' }));
                    return;
                }
                
                if (typeof content !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid task content' }));
                    return;
                }
                
                // Verify column exists
                const targetColumn = this.columns.find(c => c.id === columnId.trim());
                if (!targetColumn) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Column not found' }));
                    return;
                }
                
                // Sanitize inputs with proper defaults
                const sanitizedTitle = title.trim().substring(0, 200) || 'Untitled Task';
                const sanitizedContent = (content || '').trim().substring(0, 5000);
                
                const newTask: Task = {
                    id: `task-${Date.now()}`,
                    title: sanitizedTitle,
                    content: sanitizedContent,
                    position: this.tasks.filter(t => t.columnId === columnId).length + 1,
                    columnId: columnId.trim(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                this.tasks.push(newTask);

                // Update column tasks
                const columnToUpdate = this.columns.find(c => c.id === columnId);
                if (columnToUpdate) {
                    columnToUpdate.tasks.push(newTask);
                }

                // Convert to snake_case for web-ui compatibility
                const webTask = {
                    id: newTask.id,
                    title: newTask.title,
                    content: newTask.content,
                    position: newTask.position,
                    column_id: newTask.columnId,
                    created_at: newTask.createdAt,
                    updated_at: newTask.updatedAt
                };

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Task created successfully',
                    task: webTask 
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }

    private handleUpdateTask(taskId: string, req: http.IncomingMessage, res: http.ServerResponse) {
        let body = '';
        const maxBodySize = 1024 * 20; // 20KB limit for task updates
        
        req.on('data', chunk => {
            body += chunk;
            if (body.length > maxBodySize) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request body too large' }));
                req.destroy();
                return;
            }
        });
        req.on('end', () => {
            try {
                // Input validation and sanitization
                const updates = JSON.parse(body);
                
                if (!updates || typeof updates !== 'object') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid request body' }));
                    return;
                }
                
                const taskIndex = this.tasks.findIndex(t => t.id === taskId);
                
                if (taskIndex === -1) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Task not found' }));
                    return;
                }
                
                // Validate and sanitize update fields
                const sanitizedUpdates: Partial<Task> = {};
                
                if (updates.title !== undefined) {
                    if (typeof updates.title !== 'string') {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid task title' }));
                        return;
                    }
                    const trimmedTitle = updates.title.trim().substring(0, 200);
                    sanitizedUpdates.title = trimmedTitle || 'Untitled Task';
                }
                
                if (updates.content !== undefined) {
                    if (typeof updates.content !== 'string') {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid task content' }));
                        return;
                    }
                    sanitizedUpdates.content = (updates.content || '').trim().substring(0, 5000);
                }
                
                if (updates.columnId !== undefined) {
                    if (typeof updates.columnId !== 'string' || !this.columns.find(c => c.id === updates.columnId)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid column ID' }));
                        return;
                    }
                    sanitizedUpdates.columnId = updates.columnId.trim();
                }

                this.tasks[taskIndex] = {
                    ...this.tasks[taskIndex],
                    ...sanitizedUpdates,
                    updatedAt: new Date().toISOString()
                };

                // Convert to snake_case for web-ui compatibility
                const webTask = {
                    id: this.tasks[taskIndex].id,
                    title: this.tasks[taskIndex].title,
                    content: this.tasks[taskIndex].content,
                    position: this.tasks[taskIndex].position,
                    column_id: this.tasks[taskIndex].columnId,
                    created_at: this.tasks[taskIndex].createdAt,
                    updated_at: this.tasks[taskIndex].updatedAt
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Task updated successfully',
                    task: webTask 
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }

    private handleDeleteTask(taskId: string, res: http.ServerResponse) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Task not found' }));
            return;
        }

        const task = this.tasks[taskIndex];
        this.tasks.splice(taskIndex, 1);

        // Remove from column
        const column = this.columns.find(c => c.id === task.columnId);
        if (column) {
            column.tasks = column.tasks.filter(t => t.id !== taskId);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: true, 
            message: 'Task deleted successfully',
            taskId 
        }));
    }

    private handleMoveTask(taskId: string, req: http.IncomingMessage, res: http.ServerResponse) {
        let body = '';
        const maxBodySize = 1024 * 1; // 1KB limit for move operations (small payload)
        
        req.on('data', chunk => {
            body += chunk;
            if (body.length > maxBodySize) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request body too large' }));
                req.destroy();
                return;
            }
        });
        req.on('end', () => {
            try {
                // Input validation and sanitization
                const data = JSON.parse(body);
                
                if (!data || typeof data !== 'object') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid request body' }));
                    return;
                }
                
                const { targetColumnId } = data;
                
                if (!targetColumnId || typeof targetColumnId !== 'string' || targetColumnId.trim().length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid or missing target column ID' }));
                    return;
                }
                
                const taskIndex = this.tasks.findIndex(t => t.id === taskId);
                
                if (taskIndex === -1) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Task not found' }));
                    return;
                }
                
                // Verify target column exists
                const validTargetColumn = this.columns.find(c => c.id === targetColumnId.trim());
                if (!validTargetColumn) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Target column not found' }));
                    return;
                }

                const task = this.tasks[taskIndex];
                const sourceColumnId = task.columnId;

                // Update task column
                this.tasks[taskIndex].columnId = targetColumnId.trim();
                this.tasks[taskIndex].updatedAt = new Date().toISOString();

                // Update columns
                const sourceColumn = this.columns.find(c => c.id === sourceColumnId);
                const destinationColumn = this.columns.find(c => c.id === targetColumnId);

                if (sourceColumn) {
                    sourceColumn.tasks = sourceColumn.tasks.filter(t => t.id !== taskId);
                }
                if (destinationColumn) {
                    destinationColumn.tasks.push(this.tasks[taskIndex]);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Task moved successfully',
                    taskId,
                    sourceColumnId,
                    targetColumnId 
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }

    private handleExportDatabase(res: http.ServerResponse) {
        try {
            const exportData = this.exportData();
            
            // Convert to snake_case for web-ui compatibility
            const webExportData = {
                boards: exportData.boards.map(board => ({
                    id: board.id,
                    name: board.name,
                    goal: board.goal,
                    landing_column_id: null,
                    created_at: board.createdAt,
                    updated_at: board.updatedAt
                })),
                columns: exportData.columns.map(column => ({
                    id: column.id,
                    board_id: column.boardId,
                    name: column.name,
                    position: column.position,
                    wip_limit: 0,
                    is_done_column: 0
                })),
                tasks: exportData.tasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    content: task.content,
                    position: task.position,
                    column_id: task.columnId,
                    created_at: task.createdAt,
                    updated_at: task.updatedAt
                }))
            };

            const jsonData = JSON.stringify(webExportData, null, 2);
            
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Disposition': 'attachment; filename="kanban-export.json"'
            });
            res.end(jsonData);
        } catch (error) {
            console.error('Export error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to export database' }));
        }
    }

    private handleImportDatabase(req: http.IncomingMessage, res: http.ServerResponse) {
        let body = '';
        const maxBodySize = 1024 * 1024 * 5; // 5MB limit for import
        
        req.on('data', chunk => {
            body += chunk;
            if (body.length > maxBodySize) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Import file too large' }));
                req.destroy();
                return;
            }
        });
        
        req.on('end', () => {
            try {
                const importData = JSON.parse(body);
                
                // Validate structure
                if (!importData.boards || !importData.columns || !importData.tasks) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid import data structure' }));
                    return;
                }
                
                // Convert from snake_case to camelCase for internal storage
                const serverData = {
                    boards: importData.boards.map((board: any) => ({
                        id: board.id,
                        name: board.name,
                        goal: board.goal,
                        createdAt: board.created_at || new Date().toISOString(),
                        updatedAt: board.updated_at || new Date().toISOString()
                    })),
                    columns: importData.columns.map((column: any) => ({
                        id: column.id,
                        name: column.name,
                        position: column.position,
                        boardId: column.board_id,
                        tasks: []
                    })),
                    tasks: importData.tasks.map((task: any) => ({
                        id: task.id,
                        title: task.title,
                        content: task.content || '',
                        position: task.position,
                        columnId: task.column_id,
                        createdAt: task.created_at || new Date().toISOString(),
                        updatedAt: task.updated_at || new Date().toISOString()
                    }))
                };
                
                const success = this.importData(serverData);
                
                if (success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: 'Database imported successfully',
                        imported: {
                            boards: serverData.boards.length,
                            columns: serverData.columns.length,
                            tasks: serverData.tasks.length
                        }
                    }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to import database' }));
                }
            } catch (error) {
                console.error('Import error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON format' }));
            }
        });
    }
}