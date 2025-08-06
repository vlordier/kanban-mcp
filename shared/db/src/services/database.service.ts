import type {
  DatabaseConfig,
  Board,
  Column,
  Task,
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
  DatabaseMetrics
} from '../types.js';

import { BoardService } from './board.service.js';
import { TaskService } from './task.service.js';
import { ColumnService } from './column.service.js';
import { BaseDatabaseService } from './base-database.service.js';

/**
 * Main database service that composes all specialized services
 * Provides a unified interface for database operations
 */
export class DatabaseService extends BaseDatabaseService {
  private boardService: BoardService;
  private taskService: TaskService;
  private columnService: ColumnService;

  constructor(config: DatabaseConfig) {
    super(config);
    
    // Initialize specialized services with shared Prisma instance
    this.boardService = new BoardService(config);
    this.taskService = new TaskService(config);
    this.columnService = new ColumnService(config);
    
    // Share the Prisma instance across all services
    (this.boardService as any).prisma = this.prisma;
    (this.taskService as any).prisma = this.prisma;
    (this.columnService as any).prisma = this.prisma;
  }

  // Override connection methods to ensure all services use the same connection
  async connect(): Promise<void> {
    await super.connect();
    // All services share the same Prisma instance, so only need to connect once
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
    // All services share the same connection
  }

  // Board operations - delegate to BoardService
  async createBoard(input: BoardCreateInput): Promise<{ boardId: string; landingColumnId: string | null }> {
    return this.boardService.createBoard(input);
  }

  async getBoardById(boardId: string): Promise<Board | null> {
    return this.boardService.getBoardById(boardId);
  }

  async getBoardWithColumnsAndTasks(boardId: string): Promise<BoardWithColumns | null> {
    return this.boardService.getBoardWithColumnsAndTasks(boardId);
  }

  async getAllBoards(filters?: BoardFilters): Promise<Board[]> {
    return this.boardService.getAllBoards(filters);
  }

  async updateBoard(boardId: string, input: BoardUpdateInput): Promise<Board> {
    return this.boardService.updateBoard(boardId, input);
  }

  async deleteBoard(boardId: string): Promise<number> {
    return this.boardService.deleteBoard(boardId);
  }

  // Task operations - delegate to TaskService
  async createTask(columnId: string, input: TaskCreateInput): Promise<Task> {
    return this.taskService.createTask(columnId, input);
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    return this.taskService.getTaskById(taskId);
  }

  async updateTask(taskId: string, input: TaskUpdateInput): Promise<Task> {
    return this.taskService.updateTask(taskId, input);
  }

  async moveTask(taskId: string, input: TaskMoveInput): Promise<void> {
    return this.taskService.moveTask(taskId, input);
  }

  async deleteTask(taskId: string): Promise<number> {
    return this.taskService.deleteTask(taskId);
  }

  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    return this.taskService.getTasks(filters);
  }

  // Column operations - delegate to ColumnService
  async getColumnById(columnId: string): Promise<Column | null> {
    return this.columnService.getColumnById(columnId);
  }

  async getColumnsByBoardId(boardId: string): Promise<Column[]> {
    return this.columnService.getColumnsByBoardId(boardId);
  }

  async updateColumn(columnId: string, input: Partial<Pick<Column, 'name' | 'wipLimit' | 'isDoneColumn'>>): Promise<Column> {
    return this.columnService.updateColumn(columnId, input);
  }

  async deleteColumn(columnId: string): Promise<number> {
    return this.columnService.deleteColumn(columnId);
  }

  async reorderColumns(boardId: string, columnOrders: { columnId: string; position: number }[]): Promise<void> {
    return this.columnService.reorderColumns(boardId, columnOrders);
  }

  async getColumnStatus(columnId: string): Promise<{
    taskCount: number;
    isAtCapacity: boolean;
    isNearCapacity: boolean;
    availableCapacity: number;
  } | null> {
    return this.columnService.getColumnStatus(columnId);
  }

  // Health and metrics are handled by the base service
  // healthCheck() and getMetrics() are inherited from BaseDatabaseService
}