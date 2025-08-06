import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";

const SCHEMA_VERSION = 3;

export class ColumnCapacityFullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ColumnCapacityFullError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ColumnCapacityFullError);
    }
  }
}

export interface Board {
  id: string;
  name: string;
  goal: string;
  landing_column_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  wip_limit: number;
  is_done_column: number;
}

export interface Task {
  id: string;
  column_id: string;
  title: string;
  content: string;
  position: number;
  created_at: string;
  updated_at: string;
  update_reason?: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  updateReason?: string;
}

export interface ColumnWithTasks {
  id: string;
  name: string;
  position: number;
  wipLimit: number;
  isLanding: boolean;
  tasks: TaskSummary[];
}

export interface ColumnDefinition {
  name: string;
  position: number;
  wipLimit: number;
  isDoneColumn?: boolean;
}

export class KanbanDB {
  constructor(private db: Database.Database) {
    // Configure SQLite for better performance and safety
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('temp_store = MEMORY');
    
    this.createSchemaIfNotExists();
  }

  /**
   * Execute a function within a database transaction
   * Automatically handles rollback on error and commit on success
   */
  public withTransaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  public close(): void {
    this.db.close();
  }

  public createBoard(
    name: string,
    projectGoal: string,
    columns: ColumnDefinition[],
    landingColumnPosition: number
  ): { boardId: string; landingColumnId: string | null } {
    if (columns.length === 0) {
      throw new Error("At least one column is required to create a board");
    }

    if (landingColumnPosition < 0 || landingColumnPosition >= columns.length) {
      throw new Error(
        `Landing column position ${landingColumnPosition} is out of bounds for the provided columns`
      );
    }

    const boardId = this.generateUUID();
    const now = new Date().toISOString();
    let landingColumnId: string | null = null;

    const transaction = this.db.transaction(() => {
      // Insert the new board into the database (without landing column for now)
      const insertBoardStmt = this.db.prepare<
        [string, string, string, string, string]
      >(`
        INSERT INTO boards (id, name, goal, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertBoardStmt.run(boardId, name, projectGoal, now, now);

      const insertColumnStmt = this.db.prepare<
        [string, string, string, number, number, number]
      >(`
        INSERT INTO columns (id, board_id, name, position, wip_limit, is_done_column)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const column of columns) {
        const columnId = this.generateUUID();
        insertColumnStmt.run(
          columnId,
          boardId,
          column.name,
          column.position,
          column.wipLimit,
          column.isDoneColumn ? 1 : 0
        );

        if (column.position === landingColumnPosition) {
          landingColumnId = columnId;
        }
      }

      // Update the board with the landing column ID
      const updateBoardStmt = this.db.prepare<[string | null, string]>(`
        UPDATE boards
        SET landing_column_id = ?
        WHERE id = ?
      `);

      updateBoardStmt.run(landingColumnId, boardId);
    });

    // Execute the transaction
    transaction();

    return { boardId, landingColumnId };
  }

  public getBoardById(boardId: string): Board | undefined {
    const findBoardStmt = this.db.prepare<[string], Board>(`
      SELECT id, name, goal, landing_column_id, created_at, updated_at 
      FROM boards 
      WHERE id = ?
    `);

    return findBoardStmt.get(boardId);
  }

  public getColumnById(columnId: string): Column | undefined {
    const findColumnStmt = this.db.prepare<[string], Column>(`
      SELECT id, board_id, name, position, wip_limit, is_done_column
      FROM columns 
      WHERE id = ?
    `);

    return findColumnStmt.get(columnId);
  }

  public getTaskById(taskId: string): Task | undefined {
    const findTaskStmt = this.db.prepare<[string], Task>(`
      SELECT id, column_id, title, content, position, created_at, updated_at, update_reason
      FROM tasks 
      WHERE id = ?
    `);

    return findTaskStmt.get(taskId);
  }

  public countTasksInColumn(columnId: string): number {
    const countTasksStmt = this.db.prepare<[string], { count: number }>(`
      SELECT COUNT(*) as count FROM tasks
      WHERE column_id = ?
    `);

    const countResult = countTasksStmt.get(columnId);
    return countResult ? countResult.count : 0;
  }

  public addTaskToColumn(
    columnId: string,
    title: string,
    content: string
  ): Task {
    // Get the column
    const column = this.getColumnById(columnId);
    if (!column) {
      throw new Error(`Column with ID ${columnId} not found`);
    }

    // Count existing tasks in the column
    const taskCount = this.countTasksInColumn(columnId);

    // Check if the column is full (WIP limit reached)
    if (column.wip_limit > 0 && taskCount >= column.wip_limit) {
      throw new ColumnCapacityFullError(`Cannot add task to "${column.name}" column. The column has reached its capacity (WIP limit) of ${column.wip_limit}.`);
    }

    const now = new Date().toISOString();
    const taskId = this.generateUUID();
    const position = taskCount;

    const insertTaskStmt = this.db.prepare<
      [string, string, string, string, number, string, string]
    >(`
      INSERT INTO tasks (id, column_id, title, content, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertTaskStmt.run(taskId, columnId, title, content, position, now, now);

    return {
      id: taskId,
      column_id: columnId,
      title,
      content,
      position,
      created_at: now,
      updated_at: now,
    };
  }

  public moveTask(taskId: string, targetColumnId: string, reason?: string): void {
    // Get the target column
    const targetColumn = this.getColumnById(targetColumnId);
    if (!targetColumn) {
      throw new Error(`Target column with ID ${targetColumnId} not found`);
    }

    // Count existing tasks in the target column
    const taskCount = this.countTasksInColumn(targetColumnId);

    // Check if the target column is full (WIP limit reached)
    if (targetColumn.wip_limit > 0 && taskCount >= targetColumn.wip_limit) {
      throw new ColumnCapacityFullError(`Cannot move task to "${targetColumn.name}" column. The column has reached its capacity limit of ${targetColumn.wip_limit}.`);
    }

    const now = new Date().toISOString();
    const position = taskCount;

    const updateTaskStmt = this.db.prepare<[string, number, string, string | null, string]>(`
      UPDATE tasks
      SET column_id = ?, position = ?, updated_at = ?, update_reason = ?
      WHERE id = ?
    `);

    updateTaskStmt.run(targetColumnId, position, now, reason || null, taskId);
  }

  public getColumnsForBoard(boardId: string): Column[] {
    const findColumnsStmt = this.db.prepare<[string], Column>(`
      SELECT id, board_id, name, position, wip_limit, is_done_column
      FROM columns
      WHERE board_id = ?
      ORDER BY position ASC
    `);

    return findColumnsStmt.all(boardId);
  }

  public getTasksForColumn(columnId: string): TaskSummary[] {
    const findTasksStmt = this.db.prepare<
      [string],
      {
        id: string;
        title: string;
        position: number;
        created_at: string;
        updated_at: string;
        update_reason?: string;
      }
    >(`
      SELECT id, title, position, created_at, updated_at, update_reason
      FROM tasks
      WHERE column_id = ?
      ORDER BY position ASC
    `);

    const tasks = findTasksStmt.all(columnId);

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      position: task.position,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      updateReason: task.update_reason,
    }));
  }

  public getBoardWithColumnsAndTasks(
    boardId: string
  ): { board: Board; columns: ColumnWithTasks[] } | undefined {
    const board = this.getBoardById(boardId);

    if (!board) {
      return undefined;
    }

    const columns = this.getColumnsForBoard(boardId);
    const columnsWithTasks: ColumnWithTasks[] = [];

    for (const column of columns) {
      const tasks = this.getTasksForColumn(column.id);

      columnsWithTasks.push({
        id: column.id,
        name: column.name,
        position: column.position,
        wipLimit: column.wip_limit,
        isLanding: column.id === board.landing_column_id,
        tasks,
      });
    }

    return { board, columns: columnsWithTasks };
  }

  public getAllBoards(): Board[] {
    const findBoardsStmt = this.db.prepare<[], Board>(`
      SELECT id, name, goal, landing_column_id, created_at, updated_at
      FROM boards
      ORDER BY created_at DESC
    `);

    return findBoardsStmt.all();
  }

  public updateTask(taskId: string, content: string): Task | undefined {
    // Get the task
    const task = this.getTaskById(taskId);
    if (!task) {
      return undefined;
    }

    const now = new Date().toISOString();

    const updateTaskStmt = this.db.prepare<[string, string, string]>(`
      UPDATE tasks
      SET content = ?, updated_at = ?
      WHERE id = ?
    `);

    updateTaskStmt.run(content, now, taskId);

    // Return the updated task
    return {
      ...task,
      content,
      updated_at: now
    };
  }

  public deleteTask(taskId: string): number {
    const deleteTaskStmt = this.db.prepare<[string]>(`
      DELETE FROM tasks
      WHERE id = ?
    `);

    const res = deleteTaskStmt.run(taskId);
    return res.changes;
  }

  public deleteBoard(boardId: string): number {
    // Use a transaction to ensure all related data is deleted
    const transaction = this.db.transaction(() => {
      // First, get all columns for this board
      const columns = this.getColumnsForBoard(boardId);
      
      // Delete all tasks in each column
      const deleteTasksStmt = this.db.prepare<[string]>(`
        DELETE FROM tasks
        WHERE column_id = ?
      `);
      
      for (const column of columns) {
        deleteTasksStmt.run(column.id);
      }
      
      // Delete all columns for this board
      const deleteColumnsStmt = this.db.prepare<[string]>(`
        DELETE FROM columns
        WHERE board_id = ?
      `);
      
      deleteColumnsStmt.run(boardId);
      
      // Finally, delete the board itself
      const deleteBoardStmt = this.db.prepare<[string]>(`
        DELETE FROM boards
        WHERE id = ?
      `);
      
      return deleteBoardStmt.run(boardId);
    });
    
    // Execute the transaction and return the number of changes
    const result = transaction();
    return result.changes;
  }

  public exportDatabase(): { boards: Board[]; columns: Column[]; tasks: Task[] } {
    const boards = this.getAllBoards();
    
    const columnsStmt = this.db.prepare<[], Column>(`
      SELECT id, board_id, name, position, wip_limit, is_done_column
      FROM columns
      ORDER BY board_id, position
    `);
    const columns = columnsStmt.all();
    
    const tasksStmt = this.db.prepare<[], Task>(`
      SELECT id, column_id, title, content, position, created_at, updated_at, update_reason
      FROM tasks
      ORDER BY column_id, position
    `);
    const tasks = tasksStmt.all();
    
    return { boards, columns, tasks };
  }

  public importDatabase(data: { boards: Board[]; columns: Column[]; tasks: Task[] }): void {
    // Data is already validated at the API layer with Zod schemas
    // Only validate referential integrity here
    const boardIds = new Set(data.boards.map(b => b.id));
    const columnIds = new Set(data.columns.map(c => c.id));

    // Check that all columns reference valid boards
    for (const column of data.columns) {
      if (!boardIds.has(column.board_id)) {
        throw new Error(`Column "${column.name}" references non-existent board ID: ${column.board_id}`);
      }
    }

    // Check that all tasks reference valid columns
    for (const task of data.tasks) {
      if (!columnIds.has(task.column_id)) {
        throw new Error(`Task "${task.title}" references non-existent column ID: ${task.column_id}`);
      }
    }

    // Check that landing column IDs are valid
    for (const board of data.boards) {
      if (board.landing_column_id && !columnIds.has(board.landing_column_id)) {
        throw new Error(`Board "${board.name}" references non-existent landing column ID: ${board.landing_column_id}`);
      }
    }

    const transaction = this.db.transaction(() => {
      // Clear existing data
      this.db.exec(`DELETE FROM tasks`);
      this.db.exec(`DELETE FROM columns`);
      this.db.exec(`DELETE FROM boards`);
      
      // Insert boards
      const insertBoardStmt = this.db.prepare<[string, string, string, string | null, string, string]>(`
        INSERT INTO boards (id, name, goal, landing_column_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const board of data.boards) {
        insertBoardStmt.run(
          board.id,
          board.name,
          board.goal,
          board.landing_column_id,
          board.created_at,
          board.updated_at
        );
      }
      
      // Insert columns
      const insertColumnStmt = this.db.prepare<[string, string, string, number, number, number]>(`
        INSERT INTO columns (id, board_id, name, position, wip_limit, is_done_column)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const column of data.columns) {
        insertColumnStmt.run(
          column.id,
          column.board_id,
          column.name,
          column.position,
          column.wip_limit,
          column.is_done_column
        );
      }
      
      // Insert tasks
      const insertTaskStmt = this.db.prepare<[string, string, string, string, number, string, string, string | null]>(`
        INSERT INTO tasks (id, column_id, title, content, position, created_at, updated_at, update_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const task of data.tasks) {
        insertTaskStmt.run(
          task.id,
          task.column_id,
          task.title,
          task.content,
          task.position,
          task.created_at,
          task.updated_at,
          task.update_reason || null
        );
      }
    });
    
    transaction();
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }

  private createSchemaIfNotExists(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        goal TEXT NOT NULL,
        landing_column_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS columns (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL,
        wip_limit INTEGER NOT NULL,
        is_done_column INTEGER DEFAULT 0,
        FOREIGN KEY (board_id) REFERENCES boards(id)
      );
      
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        column_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_reason TEXT,
        metadata TEXT,
        FOREIGN KEY (column_id) REFERENCES columns(id)
      );
    `);
  }
}

export function createDBInstance(folderPath: string): Database.Database {
  const dbFilePath = folderPath + `/kanban_${SCHEMA_VERSION}.db`;

  // Create the folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Create the database instance
  const dbOptions: Database.Options = {
    //verbose: console.error,
  };
  const db = new Database(dbFilePath, dbOptions);
  db.pragma("journal_mode = WAL");

  return db;
}
