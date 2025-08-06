import type {
  DatabaseConfig,
  Column
} from '../types.js';
import { DatabaseError, NotFoundError } from '../common/errors.js';
import { logger } from '../common/utils.js';
import { BaseDatabaseService } from './base-database.service.js';

/**
 * Service responsible for column-related database operations
 */
export class ColumnService extends BaseDatabaseService {
  constructor(config: DatabaseConfig) {
    super(config);
  }

  /**
   * Get column by ID
   */
  async getColumnById(columnId: string): Promise<Column | null> {
    try {
      const column = await this.prisma.column.findUnique({
        where: { id: columnId }
      });

      if (!column) {
        return null;
      }

      return {
        id: column.id,
        boardId: column.boardId,
        name: column.name,
        position: column.position,
        wipLimit: column.wipLimit,
        isDoneColumn: column.isDoneColumn,
        createdAt: column.createdAt,
        updatedAt: column.updatedAt
      };
    } catch (error) {
      logger.error('Failed to get column', { columnId }, error as Error);
      throw new DatabaseError('getColumnById', 'columns', error as Error);
    }
  }

  /**
   * Get all columns for a board
   */
  async getColumnsByBoardId(boardId: string): Promise<Column[]> {
    try {
      const columns = await this.prisma.column.findMany({
        where: { boardId },
        orderBy: { position: 'asc' }
      });

      return columns.map(column => ({
        id: column.id,
        boardId: column.boardId,
        name: column.name,
        position: column.position,
        wipLimit: column.wipLimit,
        isDoneColumn: column.isDoneColumn,
        createdAt: column.createdAt,
        updatedAt: column.updatedAt
      }));
    } catch (error) {
      logger.error('Failed to get columns for board', { boardId }, error as Error);
      throw new DatabaseError('getColumnsByBoardId', 'columns', error as Error);
    }
  }

  /**
   * Update column properties
   */
  async updateColumn(columnId: string, input: Partial<Pick<Column, 'name' | 'wipLimit' | 'isDoneColumn'>>): Promise<Column> {
    try {
      const column = await this.prisma.column.update({
        where: { id: columnId },
        data: input
      });

      logger.info('Column updated successfully', { columnId, updates: input });

      return {
        id: column.id,
        boardId: column.boardId,
        name: column.name,
        position: column.position,
        wipLimit: column.wipLimit,
        isDoneColumn: column.isDoneColumn,
        createdAt: column.createdAt,
        updatedAt: column.updatedAt
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        throw new NotFoundError('Column', columnId);
      }
      logger.error('Failed to update column', { columnId, input }, error as Error);
      throw new DatabaseError('updateColumn', 'columns', error as Error);
    }
  }

  /**
   * Delete column (will also delete all tasks in the column)
   */
  async deleteColumn(columnId: string): Promise<number> {
    try {
      // Prisma will handle cascading deletes based on schema
      const result = await this.prisma.column.delete({
        where: { id: columnId }
      });

      logger.info('Column deleted successfully', { columnId });
      return 1; // Always 1 if successful
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return 0;
      }
      logger.error('Failed to delete column', { columnId }, error as Error);
      throw new DatabaseError('deleteColumn', 'columns', error as Error);
    }
  }

  /**
   * Reorder columns within a board
   */
  async reorderColumns(boardId: string, columnOrders: { columnId: string; position: number }[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Update each column's position
        const updatePromises = columnOrders.map(({ columnId, position }) =>
          tx.column.update({
            where: { id: columnId, boardId }, // Ensure column belongs to the board
            data: { position }
          })
        );

        await Promise.all(updatePromises);
      });

      logger.info('Columns reordered successfully', { boardId, columnOrders });
    } catch (error) {
      logger.error('Failed to reorder columns', { boardId, columnOrders }, error as Error);
      throw new DatabaseError('reorderColumns', 'columns', error as Error);
    }
  }

  /**
   * Get column task count and capacity status
   */
  async getColumnStatus(columnId: string): Promise<{
    taskCount: number;
    isAtCapacity: boolean;
    isNearCapacity: boolean;
    availableCapacity: number;
  } | null> {
    try {
      const column = await this.prisma.column.findUnique({
        where: { id: columnId },
        include: {
          _count: {
            select: { tasks: true }
          }
        }
      });

      if (!column) {
        return null;
      }

      const taskCount = column._count.tasks;
      const isAtCapacity = column.wipLimit > 0 && taskCount >= column.wipLimit;
      const isNearCapacity = column.wipLimit > 0 && taskCount >= column.wipLimit * 0.8;
      const availableCapacity = column.wipLimit > 0 ? Math.max(0, column.wipLimit - taskCount) : Infinity;

      return {
        taskCount,
        isAtCapacity,
        isNearCapacity,
        availableCapacity: availableCapacity === Infinity ? -1 : availableCapacity // -1 indicates unlimited
      };
    } catch (error) {
      logger.error('Failed to get column status', { columnId }, error as Error);
      throw new DatabaseError('getColumnStatus', 'columns', error as Error);
    }
  }
}