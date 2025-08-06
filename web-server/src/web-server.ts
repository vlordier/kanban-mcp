import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import path from "path";
import { z } from "zod";
import { KanbanDB, ColumnCapacityFullError, Board, Column, Task } from "@kanban-mcp/db";

// Validation schemas
const BoardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  goal: z.string().min(1).max(1000),
  landing_column_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

const ColumnSchema = z.object({
  id: z.string().uuid(),
  board_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  position: z.number().int().min(0),
  wip_limit: z.number().int().min(0),
  is_done_column: z.number().int().min(0).max(1)
});

const TaskSchema = z.object({
  id: z.string().uuid(),
  column_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  position: z.number().int().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  update_reason: z.string().nullable().optional()
});

const ImportDataSchema = z.object({
  boards: z.array(BoardSchema),
  columns: z.array(ColumnSchema),
  tasks: z.array(TaskSchema)
});

const CreateBoardSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  goal: z.string().min(1).max(1000).trim()
});

const UpdateTaskSchema = z.object({
  content: z.string().min(1)
});

const CreateTaskSchema = z.object({
  columnId: z.string().uuid(),
  title: z.string().min(1).max(255).trim(),
  content: z.string().min(1)
});

const MoveTaskSchema = z.object({
  targetColumnId: z.string().uuid(),
  reason: z.string().optional()
});

/**
 * WebServer class that handles the web server functionality
 */
class WebServer {
  private server: FastifyInstance;
  private kanbanDB: KanbanDB;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  /**
   * Check rate limit for a client IP
   * @param ip Client IP address
   * @param endpoint Endpoint name for rate limiting
   * @param limit Maximum requests per window
   * @param windowMs Window duration in milliseconds
   * @returns true if request should be allowed, false if rate limited
   */
  private checkRateLimit(ip: string, endpoint: string, limit: number = 10, windowMs: number = 60000): boolean {
    const key = `${ip}-${endpoint}`;
    const now = Date.now();
    const rateLimit = this.rateLimitMap.get(key);

    if (!rateLimit || now > rateLimit.resetTime) {
      // Reset window
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (rateLimit.count >= limit) {
      return false;
    }

    rateLimit.count++;
    return true;
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, rateLimit] of this.rateLimitMap.entries()) {
      if (now > rateLimit.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  /**
   * Creates a new WebServer instance
   * @param kanbanDB The KanbanDB instance to use
   */
  constructor(kanbanDB: KanbanDB) {
    this.kanbanDB = kanbanDB;

    // Create Fastify instance with structured logging
    this.server = Fastify({
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV === 'development' ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        } : undefined
      }
    });

    // Register CORS plugin with localhost-only configuration
    this.server.register(fastifyCors, {
      origin: ["http://localhost:8221", "http://127.0.0.1:8221"],
      methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
      credentials: true,
    });

    this.setupErrorHandlers();
    this.setupStaticFiles();
    this.setupRoutes();

    // Clean up rate limit entries every 5 minutes
    setInterval(() => this.cleanupRateLimits(), 5 * 60 * 1000);
  }

  /**
   * Sets up error handlers
   */
  private setupErrorHandlers(): void {
    // Global error handler
    this.server.setErrorHandler((error, request, reply) => {
      const errorId = crypto.randomUUID();
      
      // Log error with context
      request.log.error({
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
          statusCode: error.statusCode
        },
        errorId,
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      }, 'Request error occurred');

      // Send structured error response
      const statusCode = error.statusCode || 500;
      
      if (statusCode >= 500) {
        // Don't expose internal errors to client
        reply.code(500).send({
          error: 'Internal Server Error',
          errorId,
          timestamp: new Date().toISOString()
        });
      } else {
        // Client errors can be exposed
        reply.code(statusCode).send({
          error: error.message || 'Bad Request',
          errorId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Request validation error handler
    this.server.setSchemaErrorFormatter((errors, dataVar) => {
      return new Error(`Validation error in ${dataVar}: ${errors.map(e => e.message).join(', ')}`);
    });
  }

  /**
   * Sets up the API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.server.get("/health", async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "unknown",
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        checks: {
          database: { status: "unknown", responseTime: 0, errorMessage: undefined as string | undefined },
          memory: { status: "healthy", usage: process.memoryUsage() },
          rateLimiter: { status: "healthy", activeEntries: this.rateLimitMap.size }
        }
      };

      // Check database health
      try {
        const dbStartTime = Date.now();
        this.kanbanDB.getAllBoards(); // Simple query to test connection
        health.checks.database = {
          status: "healthy",
          responseTime: Date.now() - dbStartTime,
          errorMessage: undefined
        };
      } catch (error) {
        health.status = "unhealthy";
        health.checks.database = {
          status: "unhealthy",
          responseTime: Date.now() - startTime,
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        };
        return reply.code(503).send(health);
      }

      // Check memory usage
      const memUsage = process.memoryUsage();
      const memThreshold = 1024 * 1024 * 1024; // 1GB
      if (memUsage.heapUsed > memThreshold) {
        health.checks.memory.status = "warning";
        if (memUsage.heapUsed > memThreshold * 1.5) {
          health.status = "degraded";
        }
      }

      const responseTime = Date.now() - startTime;
      reply.header('X-Response-Time', `${responseTime}ms`);
      
      return reply.code(health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503).send(health);
    });

    // API Routes
    // Get all boards
    this.server.get(
      "/api/v1/boards",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const boards = this.kanbanDB.getAllBoards();
          return reply.code(200).send(boards);
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Create a new board
    this.server.post(
      "/api/v1/boards",
      async (
        request: FastifyRequest<{
          Body: { name: string; goal: string };
        }>,
        reply: FastifyReply
      ) => {
        try {
          const validation = CreateBoardSchema.safeParse(request.body);
          if (!validation.success) {
            return reply.code(400).send({
              error: "Validation failed",
              details: validation.error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message
              }))
            });
          }
          
          const { name, goal } = validation.data;
          
          // Create default columns
          const columns = [
            { name: "On Hold", position: 0, wipLimit: 0 },
            { name: "To Do", position: 1, wipLimit: 0 },
            { name: "In Progress", position: 2, wipLimit: 3 },
            { name: "Done", position: 3, wipLimit: 0, isDoneColumn: true },
          ];
          
          const landingColPos = 1; // The "To Do" column
          const { boardId } = this.kanbanDB.createBoard(name, goal, columns, landingColPos);
          
          return reply.code(201).send({ 
            success: true,
            message: "Board created successfully",
            boardId
          });
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Get a specific board with its columns and tasks
    this.server.get(
      "/api/v1/boards/:boardId",
      async (
        request: FastifyRequest<{ Params: { boardId: string } }>,
        reply: FastifyReply
      ) => {
        try {
          const { boardId } = request.params;
          const boardData = this.kanbanDB.getBoardWithColumnsAndTasks(boardId);

          if (!boardData) {
            return reply.code(404).send({ error: "Board not found" });
          }

          return reply.code(200).send(boardData);
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Delete a board and all its related data
    this.server.delete(
      "/api/v1/boards/:boardId",
      async (
        request: FastifyRequest<{ Params: { boardId: string } }>,
        reply: FastifyReply
      ) => {
        try {
          const { boardId } = request.params;
          
          // Check if board exists
          const board = this.kanbanDB.getBoardById(boardId);
          if (!board) {
            return reply.code(404).send({ error: "Board not found" });
          }
          
          // Delete the board and all related data
          const changes = this.kanbanDB.deleteBoard(boardId);
          
          return reply.code(200).send({ 
            success: true,
            message: "Board deleted successfully",
            boardId,
            changes
          });
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Get the task full info and content
    this.server.get(
      "/api/v1/tasks/:taskId",
      async (
        request: FastifyRequest<{ Params: { taskId: string } }>,
        reply: FastifyReply
      ) => {
        try {
          const { taskId } = request.params;
          const task = this.kanbanDB.getTaskById(taskId);

          if (!task) {
            return reply.code(404).send({ error: "Task not found" });
          }

          return reply.code(200).send(task);
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Update a task's content
    this.server.put(
      "/api/v1/tasks/:taskId",
      async (
        request: FastifyRequest<{
          Params: { taskId: string };
          Body: { content: string };
        }>,
        reply: FastifyReply
      ) => {
        try {
          const { taskId } = request.params;
          const { content } = request.body as { content: string };
          
          // Check if task exists
          const task = this.kanbanDB.getTaskById(taskId);
          if (!task) {
            return reply.code(404).send({ error: "Task not found" });
          }
          
          // Update the task
          const updatedTask = this.kanbanDB.updateTask(taskId, content);
          
          // Return success response
          return reply.code(200).send({ 
            success: true,
            message: "Task updated successfully",
            task: updatedTask
          });
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Create a new task
    this.server.post(
      "/api/v1/tasks",
      async (
        request: FastifyRequest<{
          Body: { columnId: string; title: string; content: string };
        }>,
        reply: FastifyReply
      ) => {
        try {
          const { columnId, title, content } = request.body as { 
            columnId: string; 
            title: string; 
            content: string; 
          };
          
          if (!columnId || !title || !content) {
            return reply.code(400).send({ error: "Column ID, title, and content are required" });
          }
          
          // Check if column exists
          const column = this.kanbanDB.getColumnById(columnId);
          if (!column) {
            return reply.code(404).send({ error: "Column not found" });
          }
          
          try {
            // Create the task
            const task = this.kanbanDB.addTaskToColumn(columnId, title, content);
            
            return reply.code(201).send({ 
              success: true,
              message: "Task created successfully",
              task
            });
          } catch (error) {
            // Handle WIP limit error
            if (error instanceof ColumnCapacityFullError) {
              return reply.code(422).send({ 
                error: "Column capacity full",
                message: (error as Error).message
              });
            }
            throw error;
          }
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Delete a task
    this.server.delete(
      "/api/v1/tasks/:taskId",
      async (
        request: FastifyRequest<{ Params: { taskId: string } }>,
        reply: FastifyReply
      ) => {
        try {
          const { taskId } = request.params;
          
          // Check if task exists
          const task = this.kanbanDB.getTaskById(taskId);
          if (!task) {
            return reply.code(404).send({ error: "Task not found" });
          }
          
          // Delete the task
          const changes = this.kanbanDB.deleteTask(taskId);
          
          return reply.code(200).send({ 
            success: true,
            message: "Task deleted successfully",
            taskId,
            changes
          });
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Move a task to a different column
    this.server.post(
      "/api/v1/tasks/:taskId/move",
      async (
        request: FastifyRequest<{
          Params: { taskId: string };
          Body: { targetColumnId: string; reason?: string };
        }>,
        reply: FastifyReply
      ) => {
        try {
          const { taskId } = request.params;
          const { targetColumnId, reason } = request.body as { targetColumnId: string; reason?: string };
          
          // Check if task exists
          const task = this.kanbanDB.getTaskById(taskId);
          if (!task) {
            return reply.code(404).send({ error: "Task not found" });
          }
          
          // Check if target column exists
          const targetColumn = this.kanbanDB.getColumnById(targetColumnId);
          if (!targetColumn) {
            return reply.code(404).send({ error: "Target column not found" });
          }
          
          try {
            // Move the task
            this.kanbanDB.moveTask(taskId, targetColumnId, reason);
            
            // Return success response
            return reply.code(200).send({ 
              success: true,
              message: "Task moved successfully",
              taskId,
              sourceColumnId: task.column_id,
              targetColumnId
            });
          } catch (error) {
            // Handle WIP limit error
            if (error instanceof ColumnCapacityFullError) {
              return reply.code(422).send({ 
                error: "Column capacity full",
                message: (error as Error).message
              });
            }
            throw error;
          }
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Export database
    this.server.get(
      "/api/v1/export",
      async (request: FastifyRequest, reply: FastifyReply) => {
        // Apply rate limiting - 5 exports per minute
        const clientIp = request.ip;
        if (!this.checkRateLimit(clientIp, 'export', 5, 60000)) {
          return reply.code(429).send({
            error: "Too Many Requests",
            message: "Export rate limit exceeded. Please wait before trying again."
          });
        }

        try {
          const rawData = this.kanbanDB.exportDatabase();
          
          // Transform data to handle null -> undefined conversion for TypeScript
          const data = {
            boards: rawData.boards,
            columns: rawData.columns,
            tasks: rawData.tasks.map(task => ({
              ...task,
              update_reason: task.update_reason || undefined
            }))
          };
          
          // Set headers for file download
          reply.header('Content-Type', 'application/json');
          reply.header('Content-Disposition', `attachment; filename="kanban-export-${new Date().toISOString().split('T')[0]}.json"`);
          
          return reply.code(200).send(data);
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Failed to export database" });
        }
      }
    );

    // Import database
    this.server.post(
      "/api/v1/import",
      async (
        request: FastifyRequest<{
          Body: { boards: Board[]; columns: Column[]; tasks: Task[] };
        }>,
        reply: FastifyReply
      ) => {
        // Apply rate limiting - 3 imports per minute (stricter than export) - skip during tests
        if (process.env.NODE_ENV !== 'test') {
          const clientIp = request.ip;
          if (!this.checkRateLimit(clientIp, 'import', 3, 60000)) {
            return reply.code(429).send({
              error: "Too Many Requests",
              message: "Import rate limit exceeded. Please wait before trying again."
            });
          }
        }

        try {
          // Strict validation with Zod
          const validation = ImportDataSchema.safeParse(request.body);
          if (!validation.success) {
            return reply.code(400).send({
              error: "Validation failed",
              details: validation.error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message,
                code: issue.code
              }))
            });
          }
          
          const data = validation.data;
          
          // Validate file size (check JSON string size)
          const dataSize = JSON.stringify(data).length;
          const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
          
          if (dataSize > maxSizeBytes) {
            return reply.code(413).send({
              error: "Import file too large",
              message: `File size (${Math.round(dataSize / 1024 / 1024 * 100) / 100}MB) exceeds maximum allowed size of ${maxSizeBytes / 1024 / 1024}MB`
            });
          }
          
          // Transform data to handle undefined -> null conversion for database
          const dbData = {
            boards: data.boards,
            columns: data.columns,
            tasks: data.tasks.map(task => ({
              ...task,
              update_reason: task.update_reason || undefined
            }))
          };
          
          // Import the data
          this.kanbanDB.importDatabase(dbData);
          
          return reply.code(200).send({ 
            success: true,
            message: `Database imported successfully. Imported ${data.boards.length} boards, ${data.columns.length} columns, and ${data.tasks.length} tasks.`
          });
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ 
            error: "Failed to import database",
            details: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    );

    // handle 404 by redirecting to /
    this.server.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
      reply.redirect("/");
    });
  }

  /**
   * Sets up the static file serving
   */
  private setupStaticFiles(): void {
    // Skip static file serving during tests
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Serve static files for the React app, but exclude API routes
    const distPath = path.join(__dirname, "../../../web-ui/dist");
    if (require('fs').existsSync(distPath)) {
      this.server.register(fastifyStatic, {
        root: distPath,
        prefix: "/",
        decorateReply: false,
        // Don't serve static files for API routes
        setHeaders: (res, path) => {
          if (path.includes('/api/')) {
            return false;
          }
        }
      });
      
      // Handle SPA routing - serve index.html for non-API routes
      this.server.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api/')) {
          reply.code(404).send({ error: 'API route not found' });
        } else {
          reply.sendFile('index.html');
        }
      });
    }
  }

  /**
   * Starts the web server
   */
  async start(): Promise<void> {
    try {
      await this.server.listen({ port: 8221, host: "localhost" });
      console.log(`Server is running at http://localhost:8221`);
    } catch (err) {
      this.server.log.error(err);
      process.exit(1);
    }
  }

  /**
   * Closes the web server
   */
  async close(): Promise<void> {
    await this.server.close();
  }

  /**
   * Gets the server instance
   */
  getServer(): FastifyInstance {
    return this.server;
  }
}

// Create a function to start the web server
const start = async (kanbanDB: KanbanDB): Promise<WebServer> => {
  const webServer = new WebServer(kanbanDB);
  await webServer.start();
  return webServer;
};

// Export the WebServer class and start function
export { WebServer, start };
