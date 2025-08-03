import type {
  DatabaseConfig,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TaskMoveInput,
  TaskFilters
} from '../types.js';
import {
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskMoveSchema
} from '../types.js';
import { 
  DatabaseError, 
  TaskNotFoundError,
  ColumnNotFoundError, 
  ColumnCapacityFullError,
  ValidationError
} from '@kanban-mcp/errors';
import { logger, withRetry } from '../common/utils.js';
import { sanitizeInput, sanitizeObject } from '../common/sanitization.js';
import { BaseDatabaseService } from './base-database.service.js';

/**
 * Service responsible for task-related database operations
 */
export class TaskService extends BaseDatabaseService {
  constructor(config: DatabaseConfig) {
    super(config);
  }

  /**
   * Create a new task in a column
   */
  async createTask(columnId: string, input: TaskCreateInput): Promise<Task> {
    // Sanitize inputs
    const sanitizedInput = sanitizeObject(input, {
      title: 'title',
      content: 'content'
    } as any);

    const validatedInput = TaskCreateSchema.parse(sanitizedInput);

    try {
      return await withRetry(async () => {
        const result = await this.prisma.$transaction(async (tx) => {
          // Get column and check capacity
          const column = await tx.column.findUnique({
            where: { id: columnId },
            include: { _count: { select: { tasks: true } } }
          });

          if (!column) {
            throw new ColumnNotFoundError(columnId);
          }

          if (column.wipLimit > 0 && column._count.tasks >= column.wipLimit) {
            throw new ColumnCapacityFullError(
              column.name,
              column._count.tasks,
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

  /**
   * Get task by ID
   */
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

  /**
   * Update task
   */
  async updateTask(taskId: string, input: TaskUpdateInput): Promise<Task> {
    // Sanitize inputs
    const sanitizedInput = sanitizeObject(input, {
      title: 'title',
      content: 'content'
    } as any);

    const validatedInput = TaskUpdateSchema.parse(sanitizedInput);

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
        throw new TaskNotFoundError(taskId);
      }
      logger.error('Failed to update task', { taskId, updates: validatedInput }, error as Error);
      throw new DatabaseError('updateTask', 'tasks', error as Error);
    }
  }

  /**
   * Move task to different column or position
   */
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
            throw new TaskNotFoundError(taskId);
          }

          if (!targetColumn) {
            throw new ColumnNotFoundError(validatedInput.targetColumnId);
          }

          // Check if moving to different column and capacity
          if (task.columnId !== validatedInput.targetColumnId) {
            if (targetColumn.wipLimit > 0 && targetColumn._count.tasks >= targetColumn.wipLimit) {
              throw new ColumnCapacityFullError(
                targetColumn.name,
                targetColumn._count.tasks,
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
      if (error instanceof ColumnCapacityFullError || 
          error instanceof TaskNotFoundError || 
          error instanceof ColumnNotFoundError) {
        throw error;
      }
      logger.error('Failed to move task', { taskId, input: validatedInput }, error as Error);
      throw new DatabaseError('moveTask', 'tasks', error as Error);
    }
  }

  /**
   * Delete task
   */
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

  /**
   * Get tasks with optional filtering
   */
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