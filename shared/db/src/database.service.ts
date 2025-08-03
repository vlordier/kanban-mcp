import { PrismaClient } from '@prisma/client';
// import { createLogger } from '@kanban-mcp/logging';
// import { 
//   DatabaseError, 
//   ValidationError, 
//   NotFoundError, 
//   BusinessLogicError,
//   ColumnCapacityFullError,
//   withRetry
// } from '@kanban-mcp/errors';

// Temporary error classes for standalone operation
class DatabaseError extends Error {
  constructor(operation: string, resource?: string, cause?: Error) {
    super(`Database error in ${operation}${resource ? ` on ${resource}` : ''}: ${cause?.message || 'Unknown error'}`);
    this.name = 'DatabaseError';
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

class BusinessLogicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

class ColumnCapacityFullError extends BusinessLogicError {
  constructor(columnName: string, wipLimit: number) {
    super(`Column "${columnName}" is at capacity (WIP limit: ${wipLimit})`);
    this.name = 'ColumnCapacityFullError';
  }
}

// Simple retry function
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i === maxRetries - 1) break;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
  throw lastError!;
}
import type {
  DatabaseConfig,
  Board,
  Column,
  Task,
  TaskSummary,
  ColumnWithTasks,
  BoardWithColumns,
  BoardCreateInput,
  BoardUpdateInput,
  TaskCreateInput,
  TaskUpdateInput,
  TaskMoveInput,
  BoardFilters,
  TaskFilters,
  DatabaseHealth,
  DatabaseMetrics,
  QueryOptions
} from './types.js';
import {
  DatabaseConfigSchema,
  BoardCreateSchema,
  BoardUpdateSchema,
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskMoveSchema
} from './types.js';

// Simple logger for standalone operation
const logger = {
  info: (message: string, meta?: any, tag?: string) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any, error?: Error, tag?: string) => console.error(`[ERROR] ${message}`, meta || '', error || ''),
  warn: (message: string, meta?: any, tag?: string) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any, tag?: string) => console.debug(`[DEBUG] ${message}`, meta || '')
};

export class DatabaseService {
  private prisma: PrismaClient;
  private config: DatabaseConfig;
  private startTime: Date;

  constructor(config: DatabaseConfig) {
    // Validate configuration
    const validatedConfig = DatabaseConfigSchema.parse(config);
    this.config = validatedConfig;
    this.startTime = new Date();

    // Initialize Prisma with configuration
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.url
        }
      },
      log: config.enableLogging ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Set up logging if enabled
    if (config.enableLogging) {
      this.setupLogging();
    }

    logger.info('Database service initialized', {
      provider: config.provider,
      maxConnections: config.maxConnections
    });
  }

  private setupLogging(): void {
    // Simplified logging without event handlers for now
    logger.info('Database logging enabled');
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database', {}, error as Error);
      throw new DatabaseError('connect', undefined, error as Error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection', {}, error as Error);
      throw new DatabaseError('disconnect', undefined, error as Error);
    }
  }

  async healthCheck(): Promise<DatabaseHealth> {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Get database info
      const dbInfo = await this.prisma.databaseInfo.findUnique({
        where: { id: 'singleton' }
      });

      const uptime = Date.now() - this.startTime.getTime();

      return {
        isHealthy: true,
        connectionCount: 1, // Prisma manages this internally
        lastMigration: dbInfo?.lastMigration || undefined,
        schemaVersion: dbInfo?.schemaVersion || 'unknown',
        uptime,
        errors: []
      };
    } catch (error) {
      logger.error('Database health check failed', {}, error as Error);
      return {
        isHealthy: false,
        connectionCount: 0,
        schemaVersion: 'unknown',
        uptime: Date.now() - this.startTime.getTime(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async getMetrics(): Promise<DatabaseMetrics> {
    try {
      const [
        totalBoards,
        totalColumns,
        totalTasks,
        boardsWithCounts
      ] = await Promise.all([
        this.prisma.board.count(),
        this.prisma.column.count(),
        this.prisma.task.count(),
        this.prisma.board.findMany({
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                columns: true
              }
            },
            columns: {
              select: {
                _count: {
                  select: {
                    tasks: true
                  }
                }
              }
            }
          }
        })
      ]);

      const averageColumnsPerBoard = totalBoards > 0 ? totalColumns / totalBoards : 0;
      const averageTasksPerBoard = totalBoards > 0 ? totalTasks / totalBoards : 0;

      // Find most active board
      let mostActiveBoard: { id: string; name: string; taskCount: number } | null = null;
      let maxTasks = 0;

      for (const board of boardsWithCounts) {
        const taskCount = board.columns.reduce((sum: number, col: any) => sum + col._count.tasks, 0);
        if (taskCount > maxTasks) {
          maxTasks = taskCount;
          mostActiveBoard = {
            id: board.id,
            name: board.name,
            taskCount
          };
        }
      }

      return {
        totalBoards,
        totalColumns,
        totalTasks,
        averageTasksPerBoard,
        averageColumnsPerBoard,
        mostActiveBoard
      };
    } catch (error) {
      logger.error('Failed to get database metrics', {}, error as Error);
      throw new DatabaseError('metrics', undefined, error as Error);
    }
  }

  // Board operations
  async createBoard(input: BoardCreateInput): Promise<{ boardId: string; landingColumnId: string | null }> {
    const validatedInput = BoardCreateSchema.parse(input);
    
    if (validatedInput.landingColumnPosition >= validatedInput.columns.length) {
      throw new ValidationError('Landing column position is out of bounds');
    }

    try {
      return await withRetry(async () => {
        const result = await this.prisma.$transaction(async (tx) => {
          // Create the board
          const board = await tx.board.create({
            data: {
              name: validatedInput.name,
              goal: validatedInput.goal,
            }
          });

          // Create columns
          const columnPromises = validatedInput.columns.map(async (col, index) => {
            return tx.column.create({
              data: {
                boardId: board.id,
                name: col.name,
                position: col.position,
                wipLimit: col.wipLimit,
                isDoneColumn: col.isDoneColumn,
              }
            });
          });

          const columns = await Promise.all(columnPromises);
          const landingColumn = columns[validatedInput.landingColumnPosition];

          // Update board with landing column
          await tx.board.update({
            where: { id: board.id },
            data: { landingColumnId: landingColumn.id }
          });

          return {
            boardId: board.id,
            landingColumnId: landingColumn.id
          };
        });

        logger.info('Board created successfully', {
          boardId: result.boardId,
          columnsCount: validatedInput.columns.length
        });

        return result;
      });
    } catch (error) {
      logger.error('Failed to create board', { input: validatedInput }, error as Error);
      throw new DatabaseError('createBoard', 'boards', error as Error);
    }
  }

  async getBoardById(boardId: string): Promise<Board | null> {
    try {
      const board = await this.prisma.board.findUnique({
        where: { id: boardId }
      });

      if (!board) {
        return null;
      }

      return {
        id: board.id,
        name: board.name,
        goal: board.goal,
        landingColumnId: board.landingColumnId,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt
      };
    } catch (error) {
      logger.error('Failed to get board', { boardId }, error as Error);
      throw new DatabaseError('getBoardById', 'boards', error as Error);
    }
  }

  async getBoardWithColumnsAndTasks(boardId: string): Promise<BoardWithColumns | null> {
    try {
      const boardData = await this.prisma.board.findUnique({
        where: { id: boardId },
        include: {
          columns: {
            include: {
              tasks: {
                select: {
                  id: true,
                  title: true,
                  position: true,
                  createdAt: true,
                  updatedAt: true,
                  updateReason: true
                },
                orderBy: { position: 'asc' }
              }
            },
            orderBy: { position: 'asc' }
          }
        }
      });

      if (!boardData) {
        return null;
      }

      const columns: ColumnWithTasks[] = boardData.columns.map(col => {
        const taskCount = col.tasks.length;
        const isAtCapacity = col.wipLimit > 0 && taskCount >= col.wipLimit;
        const isNearCapacity = col.wipLimit > 0 && taskCount >= col.wipLimit * 0.8;

        return {
          id: col.id,
          boardId: col.boardId,
          name: col.name,
          position: col.position,
          wipLimit: col.wipLimit,
          isDoneColumn: col.isDoneColumn,
          createdAt: col.createdAt,
          updatedAt: col.updatedAt,
          tasks: col.tasks,
          isLanding: col.id === boardData.landingColumnId,
          taskCount,
          isAtCapacity,
          isNearCapacity
        };
      });

      const totalTasks = columns.reduce((sum, col) => sum + col.taskCount, 0);

      return {
        id: boardData.id,
        name: boardData.name,
        goal: boardData.goal,
        landingColumnId: boardData.landingColumnId,
        createdAt: boardData.createdAt,
        updatedAt: boardData.updatedAt,
        columns,
        totalTasks,
        totalColumns: columns.length
      };
    } catch (error) {
      logger.error('Failed to get board with columns and tasks', { boardId }, error as Error);
      throw new DatabaseError('getBoardWithColumnsAndTasks', 'boards', error as Error);
    }
  }

  async getAllBoards(filters?: BoardFilters): Promise<Board[]> {
    try {
      const where: any = {};
      
      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search } },
          { goal: { contains: filters.search } }
        ];
      }

      if (filters?.createdAfter) {
        where.createdAt = { ...where.createdAt, gte: filters.createdAfter };
      }

      if (filters?.createdBefore) {
        where.createdAt = { ...where.createdAt, lte: filters.createdBefore };
      }

      const boards = await this.prisma.board.findMany({
        where,
        take: filters?.take,
        skip: filters?.skip,
        orderBy: filters?.orderBy || { createdAt: 'desc' }
      });

      return boards.map(board => ({
        id: board.id,
        name: board.name,
        goal: board.goal,
        landingColumnId: board.landingColumnId,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt
      }));
    } catch (error) {
      logger.error('Failed to get all boards', { filters }, error as Error);
      throw new DatabaseError('getAllBoards', 'boards', error as Error);
    }
  }

  async updateBoard(boardId: string, input: BoardUpdateInput): Promise<Board> {
    const validatedInput = BoardUpdateSchema.parse(input);

    try {
      const board = await this.prisma.board.update({
        where: { id: boardId },
        data: validatedInput
      });

      logger.info('Board updated successfully', { boardId, updates: validatedInput });

      return {
        id: board.id,
        name: board.name,
        goal: board.goal,
        landingColumnId: board.landingColumnId,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        throw new NotFoundError('Board', boardId);
      }
      logger.error('Failed to update board', { boardId, input: validatedInput }, error as Error);
      throw new DatabaseError('updateBoard', 'boards', error as Error);
    }
  }

  async deleteBoard(boardId: string): Promise<number> {
    try {
      // Prisma will handle cascading deletes based on schema
      const result = await this.prisma.board.delete({
        where: { id: boardId }
      });

      logger.info('Board deleted successfully', { boardId });
      return 1; // Always 1 if successful
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return 0;
      }
      logger.error('Failed to delete board', { boardId }, error as Error);
      throw new DatabaseError('deleteBoard', 'boards', error as Error);
    }
  }

  // Task operations
  async createTask(columnId: string, input: TaskCreateInput): Promise<Task> {
    const validatedInput = TaskCreateSchema.parse(input);

    try {
      return await withRetry(async () => {
        const result = await this.prisma.$transaction(async (tx) => {
          // Get column and check capacity
          const column = await tx.column.findUnique({
            where: { id: columnId },
            include: { _count: { select: { tasks: true } } }
          });

          if (!column) {
            throw new NotFoundError('Column', columnId);
          }

          if (column.wipLimit > 0 && column._count.tasks >= column.wipLimit) {
            throw new ColumnCapacityFullError(
              column.name,
              column.wipLimit
            );
          }

          // Create task at end of column
          const task = await tx.task.create({
            data: {
              columnId,
              title: validatedInput.title,
              content: validatedInput.content,
              position: column._count.tasks,
              metadata: validatedInput.metadata ? JSON.stringify(validatedInput.metadata) : null
            }
          });

          return task;
        });

        logger.info('Task created successfully', {
          taskId: result.id,
          columnId,
          title: result.title
        });

        return {
          id: result.id,
          columnId: result.columnId,
          title: result.title,
          content: result.content,
          position: result.position,
          updateReason: result.updateReason,
          metadata: result.metadata ? JSON.parse(result.metadata) : null,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        };
      });
    } catch (error) {
      if (error instanceof ColumnCapacityFullError) {
        throw error;
      }
      logger.error('Failed to create task', { columnId, input: validatedInput }, error as Error);
      throw new DatabaseError('createTask', 'tasks', error as Error);
    }
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId }
      });

      if (!task) {
        return null;
      }

      return {
        id: task.id,
        columnId: task.columnId,
        title: task.title,
        content: task.content,
        position: task.position,
        updateReason: task.updateReason,
        metadata: task.metadata ? JSON.parse(task.metadata) : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
    } catch (error) {
      logger.error('Failed to get task', { taskId }, error as Error);
      throw new DatabaseError('getTaskById', 'tasks', error as Error);
    }
  }

  async updateTask(taskId: string, input: TaskUpdateInput): Promise<Task> {
    const validatedInput = TaskUpdateSchema.parse(input);

    try {
      const updateData = {
        ...validatedInput,
        metadata: validatedInput.metadata ? JSON.stringify(validatedInput.metadata) : validatedInput.metadata
      };

      const task = await this.prisma.task.update({
        where: { id: taskId },
        data: updateData
      });

      logger.info('Task updated successfully', { taskId, updates: validatedInput });

      return {
        id: task.id,
        columnId: task.columnId,
        title: task.title,
        content: task.content,
        position: task.position,
        updateReason: task.updateReason,
        metadata: task.metadata ? JSON.parse(task.metadata) : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        throw new NotFoundError('Task', taskId);
      }
      logger.error('Failed to update task', { taskId, input: validatedInput }, error as Error);
      throw new DatabaseError('updateTask', 'tasks', error as Error);
    }
  }

  async moveTask(taskId: string, input: TaskMoveInput): Promise<void> {
    const validatedInput = TaskMoveSchema.parse(input);

    try {
      await withRetry(async () => {
        await this.prisma.$transaction(async (tx) => {
          // Get current task and target column
          const [task, targetColumn] = await Promise.all([
            tx.task.findUnique({ where: { id: taskId } }),
            tx.column.findUnique({
              where: { id: validatedInput.targetColumnId },
              include: { _count: { select: { tasks: true } } }
            })
          ]);

          if (!task) {
            throw new NotFoundError('Task', taskId);
          }

          if (!targetColumn) {
            throw new NotFoundError('Column', validatedInput.targetColumnId);
          }

          // Check if moving to different column and capacity
          if (task.columnId !== validatedInput.targetColumnId) {
            if (targetColumn.wipLimit > 0 && targetColumn._count.tasks >= targetColumn.wipLimit) {
              throw new ColumnCapacityFullError(
                targetColumn.name,
                targetColumn.wipLimit
              );
            }
          }

          // Update task position and column
          const newPosition = validatedInput.position ?? targetColumn._count.tasks;
          
          await tx.task.update({
            where: { id: taskId },
            data: {
              columnId: validatedInput.targetColumnId,
              position: newPosition,
              updateReason: validatedInput.updateReason
            }
          });
        });
      });

      logger.info('Task moved successfully', {
        taskId,
        targetColumnId: validatedInput.targetColumnId,
        updateReason: validatedInput.updateReason
      });
    } catch (error) {
      if (error instanceof ColumnCapacityFullError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to move task', { taskId, input: validatedInput }, error as Error);
      throw new DatabaseError('moveTask', 'tasks', error as Error);
    }
  }

  async deleteTask(taskId: string): Promise<number> {
    try {
      await this.prisma.task.delete({
        where: { id: taskId }
      });

      logger.info('Task deleted successfully', { taskId });
      return 1;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return 0;
      }
      logger.error('Failed to delete task', { taskId }, error as Error);
      throw new DatabaseError('deleteTask', 'tasks', error as Error);
    }
  }

  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    try {
      const where: any = {};

      if (filters?.boardId) {
        where.column = { boardId: filters.boardId };
      }

      if (filters?.columnId) {
        where.columnId = filters.columnId;
      }

      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search } },
          { content: { contains: filters.search } }
        ];
      }

      if (filters?.hasUpdateReason !== undefined) {
        where.updateReason = filters.hasUpdateReason ? { not: null } : null;
      }

      if (filters?.createdAfter) {
        where.createdAt = { ...where.createdAt, gte: filters.createdAfter };
      }

      if (filters?.createdBefore) {
        where.createdAt = { ...where.createdAt, lte: filters.createdBefore };
      }

      const tasks = await this.prisma.task.findMany({
        where,
        take: filters?.take,
        skip: filters?.skip,
        orderBy: filters?.orderBy || { position: 'asc' }
      });

      return tasks.map(task => ({
        id: task.id,
        columnId: task.columnId,
        title: task.title,
        content: task.content,
        position: task.position,
        updateReason: task.updateReason,
        metadata: task.metadata ? JSON.parse(task.metadata) : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
    } catch (error) {
      logger.error('Failed to get tasks', { filters }, error as Error);
      throw new DatabaseError('getTasks', 'tasks', error as Error);
    }
  }
}