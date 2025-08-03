import { DatabaseService } from '../src/database.service';
import { createTestDatabaseFromExisting, cleanupTestDatabase } from './migrate-setup';

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

describe('DatabaseService - Comprehensive Tests', () => {
  let db: DatabaseService;

  beforeEach(async () => {
    // Create a unique isolated database instance for each test
    const testId = `comprehensive-${Math.random().toString(36).substr(2, 9)}`;
    db = await createTestDatabaseFromExisting(testId);
  });

  afterEach(async () => {
    if (db) {
      await cleanupTestDatabase(db);
    }
  });

  describe('Connection Management', () => {
    it('should connect and provide health check', async () => {
      const health = await db.healthCheck();
      expect(health.isHealthy).toBe(true);
      expect(health.schemaVersion).toBe('2.0.0');
      expect(health.connectionCount).toBeGreaterThanOrEqual(0);
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
    });
  });

  describe('Board Operations', () => {
    it('should create a board with columns', async () => {
      const result = await db.createBoard({
        name: 'Test Board',
        goal: 'Test project goal',
        columns: [
          { name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false },
          { name: 'In Progress', position: 1, wipLimit: 3, isDoneColumn: false },
          { name: 'Done', position: 2, wipLimit: 0, isDoneColumn: true }
        ],
        landingColumnPosition: 0
      });

      expect(result.boardId).toBeDefined();
      expect(result.landingColumnId).toBeDefined();
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
      const board = await db.getBoardById('non-existent-id');
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

    it('should get all boards', async () => {
      await db.createBoard({
        name: 'Board 1',
        goal: 'Goal 1',
        columns: [{ name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false }],
        landingColumnPosition: 0
      });

      await db.createBoard({
        name: 'Board 2',
        goal: 'Goal 2',
        columns: [{ name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false }],
        landingColumnPosition: 0
      });

      const allBoards = await db.getAllBoards();
      expect(allBoards).toHaveLength(2);
    });

    it('should update board', async () => {
      const { boardId } = await db.createBoard({
        name: 'Original Board',
        goal: 'Original goal',
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

    it('should delete board', async () => {
      const { boardId } = await db.createBoard({
        name: 'Board to Delete',
        goal: 'To be deleted',
        columns: [{ name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false }],
        landingColumnPosition: 0
      });

      const deleteCount = await db.deleteBoard(boardId);
      expect(deleteCount).toBe(1);

      const deletedBoard = await db.getBoardById(boardId);
      expect(deletedBoard).toBeNull();
    });
  });

  describe('Task Operations', () => {
    let boardId: string;
    let columnId: string;

    beforeEach(async () => {
      const result = await db.createBoard({
        name: 'Task Test Board',
        goal: 'For testing tasks',
        columns: [
          { name: 'To Do', position: 0, wipLimit: 3, isDoneColumn: false },
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
        content: 'Test task content',
        metadata: { priority: 'high', assignee: 'user1' }
      });

      expect(task).toMatchObject({
        id: expect.any(String),
        columnId,
        title: 'Test Task',
        content: 'Test task content',
        position: 0,
        metadata: { priority: 'high', assignee: 'user1' }
      });
    });

    it('should get task by ID', async () => {
      const createdTask = await db.createTask(columnId, {
        title: 'Retrievable Task',
        content: 'Task to retrieve'
      });

      const retrievedTask = await db.getTaskById(createdTask.id);
      expect(retrievedTask).toMatchObject({
        id: createdTask.id,
        title: 'Retrievable Task',
        content: 'Task to retrieve'
      });
    });

    it('should return null for non-existent task', async () => {
      const task = await db.getTaskById('non-existent-task-id');
      expect(task).toBeNull();
    });

    it('should update task', async () => {
      const task = await db.createTask(columnId, {
        title: 'Original Task',
        content: 'Original content'
      });

      const updatedTask = await db.updateTask(task.id, {
        title: 'Updated Task',
        content: 'Updated content',
        updateReason: 'User requested changes',
        metadata: { status: 'updated' }
      });

      expect(updatedTask).toMatchObject({
        id: task.id,
        title: 'Updated Task',
        content: 'Updated content',
        updateReason: 'User requested changes',
        metadata: { status: 'updated' }
      });
    });

    it('should delete task', async () => {
      const task = await db.createTask(columnId, {
        title: 'Task to Delete',
        content: 'Will be deleted'
      });

      const deleteCount = await db.deleteTask(task.id);
      expect(deleteCount).toBe(1);

      const deletedTask = await db.getTaskById(task.id);
      expect(deletedTask).toBeNull();
    });

    it('should move task between columns', async () => {
      const boardData = await db.getBoardWithColumnsAndTasks(boardId);
      const doneColumnId = boardData!.columns[1].id;

      const task = await db.createTask(columnId, {
        title: 'Movable Task',
        content: 'Task to move'
      });

      await db.moveTask(task.id, {
        targetColumnId: doneColumnId,
        updateReason: 'Task completed'
      });

      const movedTask = await db.getTaskById(task.id);
      expect(movedTask!.columnId).toBe(doneColumnId);
      expect(movedTask!.updateReason).toBe('Task completed');
    });

    it('should get tasks with filters', async () => {
      await db.createTask(columnId, {
        title: 'First Task',
        content: 'First task content'
      });

      await db.createTask(columnId, {
        title: 'Second Task',
        content: 'Second task content'
      });

      const allTasks = await db.getTasks({ columnId });
      expect(allTasks).toHaveLength(2);

      const filteredTasks = await db.getTasks({
        columnId,
        search: 'First',
        take: 1
      });
      expect(filteredTasks).toHaveLength(1);
      expect(filteredTasks[0].title).toBe('First Task');
    });
  });

  describe('WIP Limits and Business Logic', () => {
    let boardId: string;
    let limitedColumnId: string;

    beforeEach(async () => {
      const result = await db.createBoard({
        name: 'WIP Test Board',
        goal: 'Testing WIP limits',
        columns: [
          { name: 'Limited Column', position: 0, wipLimit: 2, isDoneColumn: false }
        ],
        landingColumnPosition: 0
      });
      boardId = result.boardId;

      const boardData = await db.getBoardWithColumnsAndTasks(boardId);
      limitedColumnId = boardData!.columns[0].id;
    });

    it('should respect WIP limits when creating tasks', async () => {
      // Create tasks up to limit
      await db.createTask(limitedColumnId, {
        title: 'Task 1',
        content: 'Content 1'
      });

      await db.createTask(limitedColumnId, {
        title: 'Task 2',
        content: 'Content 2'
      });

      // Third task should fail
      await expect(db.createTask(limitedColumnId, {
        title: 'Task 3',
        content: 'Content 3'
      })).rejects.toThrow('capacity');
    });

    it('should show column at capacity in board data', async () => {
      // Fill column to capacity
      await db.createTask(limitedColumnId, {
        title: 'Task 1',
        content: 'Content 1'
      });

      await db.createTask(limitedColumnId, {
        title: 'Task 2',
        content: 'Content 2'
      });

      const boardData = await db.getBoardWithColumnsAndTasks(boardId);
      const column = boardData!.columns[0];
      
      expect(column.isAtCapacity).toBe(true);
      expect(column.taskCount).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid board creation', async () => {
      await expect(db.createBoard({
        name: '',
        goal: 'Valid goal',
        columns: [],
        landingColumnPosition: 0
      })).rejects.toThrow();
    });

    it('should handle updating non-existent board', async () => {
      await expect(db.updateBoard('non-existent-id', {
        name: 'New Name'
      })).rejects.toThrow('not found');
    });

    it('should handle creating task in non-existent column', async () => {
      await expect(db.createTask('non-existent-column', {
        title: 'Test Task',
        content: 'Test content'
      })).rejects.toThrow('not found');
    });
  });

  describe('Data Integrity', () => {
    it('should handle concurrent operations safely', async () => {
      const { boardId } = await db.createBoard({
        name: 'Concurrent Test Board',
        goal: 'Testing concurrency',
        columns: [
          { name: 'Test Column', position: 0, wipLimit: 10, isDoneColumn: false }
        ],
        landingColumnPosition: 0
      });

      const boardData = await db.getBoardWithColumnsAndTasks(boardId);
      const columnId = boardData!.columns[0].id;

      // Create multiple tasks concurrently
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        db.createTask(columnId, {
          title: `Concurrent Task ${i}`,
          content: `Content ${i}`
        })
      );

      const results = await Promise.all(createPromises);
      expect(results).toHaveLength(5);
      
      // All tasks should have unique IDs
      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(5);
    });

    it('should maintain referential integrity on cascade delete', async () => {
      const { boardId } = await db.createBoard({
        name: 'Cascade Test Board',
        goal: 'Testing cascade deletes',
        columns: [
          { name: 'Test Column', position: 0, wipLimit: 5, isDoneColumn: false }
        ],
        landingColumnPosition: 0
      });

      const boardData = await db.getBoardWithColumnsAndTasks(boardId);
      const columnId = boardData!.columns[0].id;

      // Create tasks
      const task1 = await db.createTask(columnId, {
        title: 'Task 1',
        content: 'Content 1'
      });

      const task2 = await db.createTask(columnId, {
        title: 'Task 2',
        content: 'Content 2'
      });

      // Delete board should cascade delete columns and tasks
      await db.deleteBoard(boardId);

      // Tasks should be deleted
      const deletedTask1 = await db.getTaskById(task1.id);
      const deletedTask2 = await db.getTaskById(task2.id);
      
      expect(deletedTask1).toBeNull();
      expect(deletedTask2).toBeNull();
    });
  });
});