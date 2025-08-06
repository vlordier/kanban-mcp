import type {
  DatabaseConfig,
  Board,
  BoardWithColumns,
  BoardCreateInput,
  BoardUpdateInput,
  BoardFilters,
  ColumnWithTasks
} from '../types.js';
import {
  BoardCreateSchema,
  BoardUpdateSchema
} from '../types.js';
import { 
  DatabaseError, 
  ValidationError, 
  BoardNotFoundError,
  createValidationError
} from '@kanban-mcp/errors';
import { logger, withRetry } from '../common/utils.js';
import { sanitizeInput, sanitizeObject } from '../common/sanitization.js';
import { BaseDatabaseService } from './base-database.service.js';

/**
 * Service responsible for board-related database operations
 */
export class BoardService extends BaseDatabaseService {
  constructor(config: DatabaseConfig) {
    super(config);
  }

  /**
   * Create a new board with columns
   */
  async createBoard(input: BoardCreateInput): Promise<{ boardId: string; landingColumnId: string | null }> {
    // First sanitize inputs
    const sanitizedInput = {
      ...input,
      name: sanitizeInput(input.name, 'title'),
      goal: sanitizeInput(input.goal, 'goal'),
      columns: input.columns.map(col => ({
        ...col,
        name: sanitizeInput(col.name, 'columnName')
      }))
    };

    const validatedInput = BoardCreateSchema.parse(sanitizedInput);
    
    if (validatedInput.landingColumnPosition >= validatedInput.columns.length) {
      throw createValidationError('landingColumnPosition', validatedInput.landingColumnPosition, 'must be within bounds of columns array');
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
      logger.error('Failed to create board', { 
        boardName: validatedInput.name,
        columnsCount: validatedInput.columns.length 
      }, error as Error);
      
      if (error instanceof ValidationError) {
        throw error; // Re-throw validation errors as-is
      }
      
      throw new DatabaseError('createBoard', 'boards', error as Error);
    }
  }

  /**
   * Get board by ID
   */
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

  /**
   * Get board with all columns and tasks
   */
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

  /**
   * Get all boards with optional filtering
   */
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

  /**
   * Update board
   */
  async updateBoard(boardId: string, input: BoardUpdateInput): Promise<Board> {
    // Sanitize inputs
    const sanitizedInput = sanitizeObject(input, {
      name: 'title',
      goal: 'goal'
    } as any);

    const validatedInput = BoardUpdateSchema.parse(sanitizedInput);

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
        throw new BoardNotFoundError(boardId);
      }
      logger.error('Failed to update board', { boardId, updates: validatedInput }, error as Error);
      throw new DatabaseError('updateBoard', 'boards', error as Error);
    }
  }

  /**
   * Delete board (will cascade delete columns and tasks)
   */
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
}