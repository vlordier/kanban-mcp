import { DatabaseService } from '../src/database.service';
import { createTestDatabaseFromExisting, cleanupTestDatabase } from './migrate-setup';
import { ZodError } from 'zod';
// import { ColumnCapacityFullError, NotFoundError, ValidationError } from '@kanban-mcp/errors';

// Temporary error classes for testing
class ColumnCapacityFullError extends Error {
  constructor(columnName: string, wipLimit: number) {
    super(`Column "${columnName}" is at capacity (WIP limit: ${wipLimit})`);
    this.name = 'ColumnCapacityFullError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(async () => {
    // Create isolated test database with proper schema from existing migrated database
    const testId = `service-${Math.random().toString(36).substr(2, 9)}`;
    db = await createTestDatabaseFromExisting(testId);
  });

  afterEach(async () => {
    if (db) {
      await cleanupTestDatabase(db);
    }
  });

  describe('Connection Management', () => {
    it('should connect and disconnect successfully', async () => {
      const health = await db.healthCheck();
      expect(health.isHealthy).toBe(true);
    });

    it('should provide database metrics', async () => {
      const metrics = await db.getMetrics();
      expect(metrics).toMatchObject({
        totalBoards: expect.any(Number),
        totalColumns: expect.any(Number),
        totalTasks: expect.any(Number),
        averageTasksPerBoard: expect.any(Number),
        averageColumnsPerBoard: expect.any(Number)
      });
      expect(metrics).toHaveProperty('mostActiveBoard');
    });
  });

  describe('Board Operations', () => {
    it('should create a board with columns', async () => {
      const result = await db.createBoard({
        name: 'Test Board',
        goal: 'Test goal',
        columns: [
          { name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false },
          { name: 'Done', position: 1, wipLimit: 0, isDoneColumn: true }
        ],
        landingColumnPosition: 0
      });

      expect(result.boardId).toBeDefined();
      expect(result.landingColumnId).toBeDefined();
    });

    it('should validate board creation input', async () => {
      await expect(db.createBoard({
        name: '',
        goal: 'Test goal',
        columns: [],
        landingColumnPosition: 0
      })).rejects.toThrow();
    });

    it('should get board by ID', async () => {
      const { boardId } = await db.createBoard({
        name: 'Test Board',
        goal: 'Test goal',
        columns: [
          { name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false }
        ],
        landingColumnPosition: 0
      });

      const board = await db.getBoardById(boardId);
      expect(board).toMatchObject({
        id: boardId,
        name: 'Test Board',
        goal: 'Test goal'
      });
    });

    it('should return null for non-existent board', async () => {
      const board = await db.getBoardById('non-existent');
      expect(board).toBeNull();
    });

    it('should get board with columns and tasks', async () => {
      const { boardId } = await db.createBoard({
        name: 'Test Board',
        goal: 'Test goal',
        columns: [
          { name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false },
          { name: 'Done', position: 1, wipLimit: 0, isDoneColumn: true }
        ],
        landingColumnPosition: 0
      });

      const boardWithData = await db.getBoardWithColumnsAndTasks(boardId);
      expect(boardWithData).toMatchObject({
        id: boardId,
        name: 'Test Board',
        columns: expect.arrayContaining([
          expect.objectContaining({
            name: 'To Do',
            isLanding: true,
            taskCount: 0,
            isAtCapacity: false
          }),
          expect.objectContaining({
            name: 'Done',
            isLanding: false,
            taskCount: 0,
            isAtCapacity: false
          })
        ]),
        totalTasks: 0,
        totalColumns: 2
      });
    });

    it('should get all boards with filtering', async () => {
      await db.createBoard({
        name: 'First Board',
        goal: 'First goal',
        columns: [{ name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false }],
        landingColumnPosition: 0
      });

      await db.createBoard({
        name: 'Second Board',
        goal: 'Second goal',
        columns: [{ name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false }],
        landingColumnPosition: 0
      });

      const allBoards = await db.getAllBoards();
      expect(allBoards).toHaveLength(2);

      const filteredBoards = await db.getAllBoards({ search: 'First' });
      expect(filteredBoards).toHaveLength(1);
      expect(filteredBoards[0].name).toBe('First Board');
    });

    it('should update board', async () => {
      const { boardId } = await db.createBoard({
        name: 'Test Board',
        goal: 'Test goal',
        columns: [{ name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false }],
        landingColumnPosition: 0
      });

      const updatedBoard = await db.updateBoard(boardId, {
        name: 'Updated Board',
        goal: 'Updated goal'
      });

      expect(updatedBoard).toMatchObject({
        id: boardId,
        name: 'Updated Board',
        goal: 'Updated goal'
      });
    });

    it('should throw NotFoundError when updating non-existent board', async () => {
      await expect(db.updateBoard('non-existent', { name: 'New Name' }))
        .rejects.toThrow('not found');
    });

    it('should delete board and return count', async () => {
      const { boardId } = await db.createBoard({
        name: 'Test Board',
        goal: 'Test goal',
        columns: [{ name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false }],
        landingColumnPosition: 0
      });

      const deleteCount = await db.deleteBoard(boardId);
      expect(deleteCount).toBe(1);

      const board = await db.getBoardById(boardId);
      expect(board).toBeNull();
    });

    it('should return 0 when deleting non-existent board', async () => {
      const deleteCount = await db.deleteBoard('non-existent');
      expect(deleteCount).toBe(0);
    });
  });

  describe('Task Operations', () => {
    let boardId: string;
    let columnId: string;

    beforeEach(async () => {
      const result = await db.createBoard({
        name: 'Test Board',
        goal: 'Test goal',
        columns: [
          { name: 'To Do', position: 0, wipLimit: 2, isDoneColumn: false },
          { name: 'Done', position: 1, wipLimit: 0, isDoneColumn: true }
        ],
        landingColumnPosition: 0
      });
      boardId = result.boardId;

      const boardData = await db.getBoardWithColumnsAndTasks(boardId);
      columnId = boardData!.columns[0].id;
    });

    it('should create a task', async () => {
      const task = await db.createTask(columnId, {
        title: 'Test Task',
        content: 'Test content',
        metadata: { priority: 'high' }
      });

      expect(task).toMatchObject({
        id: expect.any(String),
        columnId,
        title: 'Test Task',
        content: 'Test content',
        position: 0,
        metadata: { priority: 'high' }
      });
    });

    it('should validate task creation input', async () => {
      await expect(db.createTask(columnId, {
        title: '',
        content: 'Test content'
      })).rejects.toThrow();
    });

    it('should throw NotFoundError for non-existent column', async () => {
      await expect(db.createTask('non-existent', {
        title: 'Test Task',
        content: 'Test content'
      })).rejects.toThrow('not found');
    });

    it('should respect WIP limits', async () => {
      // Create tasks up to WIP limit
      await db.createTask(columnId, { title: 'Task 1', content: 'Content 1' });
      await db.createTask(columnId, { title: 'Task 2', content: 'Content 2' });

      // Third task should fail due to WIP limit of 2
      await expect(db.createTask(columnId, {
        title: 'Task 3',
        content: 'Content 3'
      })).rejects.toThrow('capacity');
    });

    it('should get task by ID', async () => {
      const createdTask = await db.createTask(columnId, {
        title: 'Test Task',
        content: 'Test content'
      });

      const retrievedTask = await db.getTaskById(createdTask.id);
      expect(retrievedTask).toMatchObject({
        id: createdTask.id,
        title: 'Test Task',
        content: 'Test content'
      });
    });

    it('should return null for non-existent task', async () => {
      const task = await db.getTaskById('non-existent');
      expect(task).toBeNull();
    });

    it('should update task', async () => {
      const createdTask = await db.createTask(columnId, {
        title: 'Test Task',
        content: 'Test content'
      });

      const updatedTask = await db.updateTask(createdTask.id, {
        title: 'Updated Task',
        content: 'Updated content',
        updateReason: 'User requested update'
      });

      expect(updatedTask).toMatchObject({
        id: createdTask.id,
        title: 'Updated Task',
        content: 'Updated content',
        updateReason: 'User requested update'
      });
    });

    it('should move task between columns', async () => {
      const boardData = await db.getBoardWithColumnsAndTasks(boardId);
      const doneColumnId = boardData!.columns[1].id;

      const task = await db.createTask(columnId, {
        title: 'Test Task',
        content: 'Test content'
      });

      await db.moveTask(task.id, {
        targetColumnId: doneColumnId,
        updateReason: 'Task completed'
      });

      const movedTask = await db.getTaskById(task.id);
      expect(movedTask!.columnId).toBe(doneColumnId);
      expect(movedTask!.updateReason).toBe('Task completed');
    });

    it('should respect WIP limits when moving tasks', async () => {
      // Fill up the target column to WIP limit
      await db.createTask(columnId, { title: 'Task 1', content: 'Content 1' });
      const task2 = await db.createTask(columnId, { title: 'Task 2', content: 'Content 2' });

      // Create another column with WIP limit 1
      const { boardId: newBoardId } = await db.createBoard({
        name: 'Another Board',
        goal: 'Another goal',
        columns: [{ name: 'Limited', position: 0, wipLimit: 1, isDoneColumn: false }],
        landingColumnPosition: 0
      });

      const newBoardData = await db.getBoardWithColumnsAndTasks(newBoardId);
      const limitedColumnId = newBoardData!.columns[0].id;

      // Add one task to the limited column
      await db.createTask(limitedColumnId, { title: 'Existing', content: 'Existing' });

      // Moving another task should fail
      await expect(db.moveTask(task2.id, {
        targetColumnId: limitedColumnId
      })).rejects.toThrow('capacity');
    });

    it('should delete task', async () => {
      const task = await db.createTask(columnId, {
        title: 'Test Task',
        content: 'Test content'
      });

      const deleteCount = await db.deleteTask(task.id);
      expect(deleteCount).toBe(1);

      const deletedTask = await db.getTaskById(task.id);
      expect(deletedTask).toBeNull();
    });

    it('should get tasks with filtering', async () => {
      await db.createTask(columnId, { title: 'First Task', content: 'First content' });
      await db.createTask(columnId, { title: 'Second Task', content: 'Second content' });

      const allTasks = await db.getTasks({ columnId });
      expect(allTasks).toHaveLength(2);

      const filteredTasks = await db.getTasks({ 
        columnId, 
        search: 'First' 
      });
      expect(filteredTasks).toHaveLength(1);
      expect(filteredTasks[0].title).toBe('First Task');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Close the database connection
      await db.disconnect();

      // Operations should fail gracefully after disconnect
      // Test that operations fail after disconnect
      await expect(db.getAllBoards()).rejects.toThrow();
    });

    it('should provide detailed error context', async () => {
      try {
        await db.createBoard({
          name: '',
          goal: 'Test',
          columns: [],
          landingColumnPosition: 0
        });
      } catch (error: any) {
        expect(error).toBeInstanceOf(ZodError);
        expect(error.message).toContain('name');
      }
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent board creation', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        db.createBoard({
          name: `Concurrent Board ${i}`,
          goal: `Goal ${i}`,
          columns: [{ name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false }],
          landingColumnPosition: 0
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(new Set(results.map(r => r.boardId)).size).toBe(5); // All unique IDs
    });

    it('should handle concurrent task operations', async () => {
      const { boardId } = await db.createBoard({
        name: 'Concurrent Test',
        goal: 'Test concurrent operations',
        columns: [{ name: 'To Do', position: 0, wipLimit: 10, isDoneColumn: false }],
        landingColumnPosition: 0
      });

      const boardData = await db.getBoardWithColumnsAndTasks(boardId);
      const columnId = boardData!.columns[0].id;

      const promises = Array.from({ length: 5 }, (_, i) =>
        db.createTask(columnId, {
          title: `Concurrent Task ${i}`,
          content: `Content ${i}`
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(new Set(results.map(r => r.id)).size).toBe(5); // All unique IDs
    });
  });
});