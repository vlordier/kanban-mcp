import { DatabaseService } from './database.service.js';
import type {
  Board,
  Column,
  Task,
  TaskSummary,
  ColumnWithTasks,
  BoardCreateInput,
  TaskCreateInput,
  TaskUpdateInput
} from './types.js';
// import { ColumnCapacityFullError } from '@kanban-mcp/errors';

class ColumnCapacityFullError extends Error {
  constructor(columnName: string, wipLimit: number) {
    super(`Column "${columnName}" is at capacity (WIP limit: ${wipLimit})`);
    this.name = 'ColumnCapacityFullError';
  }
}

/**
 * Legacy adapter to maintain compatibility with the original KanbanDB interface
 * This allows existing code to work without modifications while using the new database service
 */
export class KanbanDB {
  constructor(private databaseService: DatabaseService) {}

  async close(): Promise<void> {
    return this.databaseService.disconnect();
  }

  async createBoard(
    name: string,
    projectGoal: string,
    columns: Array<{
      name: string;
      position: number;
      wipLimit: number;
      isDoneColumn?: boolean;
    }>,
    landingColumnPosition: number
  ): Promise<{ boardId: string; landingColumnId: string | null }> {
    return this.databaseService.createBoard({
      name,
      goal: projectGoal,
      columns: columns.map(col => ({
        name: col.name,
        position: col.position,
        wipLimit: col.wipLimit,
        isDoneColumn: col.isDoneColumn || false
      })),
      landingColumnPosition
    });
  }

  async getBoardById(boardId: string): Promise<Board | undefined> {
    const board = await this.databaseService.getBoardById(boardId);
    return board || undefined;
  }

  async getColumnById(columnId: string): Promise<Column | undefined> {
    // Get column using the column service
    const column = await (this.databaseService as any).getColumnById(columnId);
    return column || undefined;
  }

  async getTaskById(taskId: string): Promise<Task | undefined> {
    const task = await this.databaseService.getTaskById(taskId);
    return task || undefined;
  }

  async countTasksInColumn(columnId: string): Promise<number> {
    const tasks = await this.databaseService.getTasks({ columnId });
    return tasks.length;
  }

  async addTaskToColumn(
    columnId: string,
    title: string,
    content: string
  ): Promise<Task> {
    return this.databaseService.createTask(columnId, { title, content });
  }

  async moveTask(taskId: string, targetColumnId: string, reason?: string): Promise<void> {
    return this.databaseService.moveTask(taskId, {
      targetColumnId,
      updateReason: reason
    });
  }

  async getColumnsForBoard(boardId: string): Promise<Column[]> {
    const boardWithColumns = await this.databaseService.getBoardWithColumnsAndTasks(boardId);
    if (!boardWithColumns) {
      return [];
    }
    
    return boardWithColumns.columns.map(col => ({
      id: col.id,
      boardId: col.boardId,
      name: col.name,
      position: col.position,
      wipLimit: col.wipLimit,
      isDoneColumn: col.isDoneColumn,
      createdAt: col.createdAt,
      updatedAt: col.updatedAt
    }));
  }

  async getTasksForColumn(columnId: string): Promise<TaskSummary[]> {
    const tasks = await this.databaseService.getTasks({ columnId });
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      position: task.position,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      updateReason: task.updateReason || undefined
    }));
  }

  async getBoardWithColumnsAndTasks(
    boardId: string
  ): Promise<{ board: Board; columns: ColumnWithTasks[] } | undefined> {
    const result = await this.databaseService.getBoardWithColumnsAndTasks(boardId);
    if (!result) {
      return undefined;
    }

    return {
      board: {
        id: result.id,
        name: result.name,
        goal: result.goal,
        landingColumnId: result.landingColumnId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      columns: result.columns.map(col => ({
        id: col.id,
        boardId: col.boardId,
        name: col.name,
        position: col.position,
        wipLimit: col.wipLimit,
        isDoneColumn: col.isDoneColumn,
        createdAt: col.createdAt,
        updatedAt: col.updatedAt,
        tasks: col.tasks,
        isLanding: col.isLanding,
        taskCount: col.taskCount,
        isAtCapacity: col.isAtCapacity,
        isNearCapacity: col.isNearCapacity
      }))
    };
  }

  async getAllBoards(): Promise<Board[]> {
    return this.databaseService.getAllBoards();
  }

  async updateTask(taskId: string, content: string): Promise<Task | undefined> {
    try {
      return await this.databaseService.updateTask(taskId, { content });
    } catch (error) {
      return undefined;
    }
  }

  async deleteTask(taskId: string): Promise<number> {
    return this.databaseService.deleteTask(taskId);
  }

  async deleteBoard(boardId: string): Promise<number> {
    return this.databaseService.deleteBoard(boardId);
  }

  // Import/Export methods (simplified implementations for compatibility)
  async exportDatabase(): Promise<any> {
    const boards = await this.getAllBoards();
    const result = { boards: [], columns: [], tasks: [] };
    
    for (const board of boards) {
      const boardWithData = await this.getBoardWithColumnsAndTasks(board.id);
      if (boardWithData) {
        result.boards.push(boardWithData.board);
        result.columns.push(...boardWithData.columns);
        for (const column of boardWithData.columns) {
          result.tasks.push(...column.tasks);
        }
      }
    }
    
    return result;
  }

  async importDatabase(data: any): Promise<void> {
    // Simplified implementation - would need proper transaction handling
    throw new Error('Import functionality requires proper transaction handling - not yet implemented');
  }

  // Additional helper methods for the legacy interface
  private generateUUID(): string {
    return crypto.randomUUID();
  }
}

// Export the legacy error for backward compatibility
export { ColumnCapacityFullError };

// Legacy types (re-export for compatibility)
export type {
  Board,
  Column,
  Task,
  TaskSummary,
  ColumnWithTasks
};

export interface ColumnDefinition {
  name: string;
  position: number;
  wipLimit: number;
  isDoneColumn?: boolean;
}