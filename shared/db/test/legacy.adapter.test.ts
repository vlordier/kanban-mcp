import { KanbanDB } from '../src/legacy-adapter';
import { createTestDatabaseFromExisting, cleanupTestDatabase } from './migrate-setup';

describe('Legacy Adapter (KanbanDB)', () => {
  let legacyDb: KanbanDB;

  beforeEach(async () => {
    // Create isolated test database for each test
    const testId = `legacy-${Math.random().toString(36).substr(2, 9)}`;
    const dbService = await createTestDatabaseFromExisting(testId);
    legacyDb = new KanbanDB(dbService);
  });

  afterEach(async () => {
    if (legacyDb) {
      const dbService = (legacyDb as any).dbService;
      await cleanupTestDatabase(dbService);
    }
  });

  describe('Board Operations', () => {
    it('should create board with legacy interface', async () => {
      const result = await legacyDb.createBoard(
        'Legacy Test Board',
        'Testing legacy board creation',
        [
          { name: 'To Do', position: 0, wipLimit: 5, isDoneColumn: false },
          { name: 'Done', position: 1, wipLimit: 0, isDoneColumn: true }
        ],
        0
      );

      expect(result.boardId).toBeDefined();
      expect(result.landingColumnId).toBeDefined();
    });

    it('should get board by ID', async () => {
      const { boardId } = await legacyDb.createBoard(
        'Test Board',
        'Test Goal',
        [{ name: 'To Do', position: 0, wipLimit: 5 }],
        0
      );

      const board = await legacyDb.getBoardById(boardId);
      expect(board).toMatchObject({
        id: boardId,
        name: 'Test Board',
        goal: 'Test Goal'
      });
    });

    it('should get all boards', async () => {
      await legacyDb.createBoard('Board 1', 'Goal 1', [
        { name: 'To Do', position: 0, wipLimit: 5 }
      ], 0);

      await legacyDb.createBoard('Board 2', 'Goal 2', [
        { name: 'To Do', position: 0, wipLimit: 5 }
      ], 0);

      const boards = await legacyDb.getAllBoards();
      expect(boards).toHaveLength(2);
    });

    it('should get board with columns and tasks', async () => {
      const { boardId } = await legacyDb.createBoard(
        'Full Board Test',
        'Testing full board structure',
        [
          { name: 'To Do', position: 0, wipLimit: 5 },
          { name: 'Done', position: 1, wipLimit: 0, isDoneColumn: true }
        ],
        0
      );

      const result = await legacyDb.getBoardWithColumnsAndTasks(boardId);
      expect(result).toBeDefined();
      expect(result!.board).toMatchObject({
        id: boardId,
        name: 'Full Board Test'
      });
      expect(result!.columns).toHaveLength(2);
    });

    it('should delete board', async () => {
      const { boardId } = await legacyDb.createBoard(
        'Board to Delete',
        'Will be deleted',
        [{ name: 'To Do', position: 0, wipLimit: 5 }],
        0
      );

      const deleteCount = await legacyDb.deleteBoard(boardId);
      expect(deleteCount).toBe(1);

      const deletedBoard = await legacyDb.getBoardById(boardId);
      expect(deletedBoard).toBeUndefined();
    });
  });

  describe('Column Operations', () => {
    let boardId: string;

    beforeEach(async () => {
      const result = await legacyDb.createBoard(
        'Column Test Board',
        'For testing columns',
        [
          { name: 'To Do', position: 0, wipLimit: 5 },
          { name: 'In Progress', position: 1, wipLimit: 3 },
          { name: 'Done', position: 2, wipLimit: 0, isDoneColumn: true }
        ],
        0
      );
      boardId = result.boardId;
    });

    it('should get columns for board', async () => {
      const columns = await legacyDb.getColumnsForBoard(boardId);
      expect(columns).toHaveLength(3);
      expect(columns[0]).toMatchObject({
        name: 'To Do',
        position: 0,
        wipLimit: 5
      });
    });

    it('should return empty array for non-existent board', async () => {
      const columns = await legacyDb.getColumnsForBoard('non-existent');
      expect(columns).toEqual([]);
    });
  });

  describe('Task Operations', () => {
    let boardId: string;
    let columnId: string;

    beforeEach(async () => {
      const result = await legacyDb.createBoard(
        'Task Test Board',
        'For testing tasks',
        [
          { name: 'To Do', position: 0, wipLimit: 5 },
          { name: 'Done', position: 1, wipLimit: 0, isDoneColumn: true }
        ],
        0
      );
      boardId = result.boardId;

      const columns = await legacyDb.getColumnsForBoard(boardId);
      columnId = columns[0].id;
    });

    it('should add task to column', async () => {
      const task = await legacyDb.addTaskToColumn(
        columnId,
        'Legacy Task',
        'Task created through legacy interface'
      );

      expect(task).toMatchObject({
        id: expect.any(String),
        columnId,
        title: 'Legacy Task',
        content: 'Task created through legacy interface'
      });
    });

    it('should get task by ID', async () => {
      const createdTask = await legacyDb.addTaskToColumn(
        columnId,
        'Retrievable Task',
        'Task to retrieve'
      );

      const retrievedTask = await legacyDb.getTaskById(createdTask.id);
      expect(retrievedTask).toMatchObject({
        id: createdTask.id,
        title: 'Retrievable Task'
      });
    });

    it('should return undefined for non-existent task', async () => {
      const task = await legacyDb.getTaskById('non-existent');
      expect(task).toBeUndefined();
    });

    it('should count tasks in column', async () => {
      const initialCount = await legacyDb.countTasksInColumn(columnId);
      expect(initialCount).toBe(0);

      await legacyDb.addTaskToColumn(columnId, 'Task 1', 'Content 1');
      await legacyDb.addTaskToColumn(columnId, 'Task 2', 'Content 2');

      const finalCount = await legacyDb.countTasksInColumn(columnId);
      expect(finalCount).toBe(2);
    });

    it('should get tasks for column', async () => {
      await legacyDb.addTaskToColumn(columnId, 'Task 1', 'Content 1');
      await legacyDb.addTaskToColumn(columnId, 'Task 2', 'Content 2');

      const tasks = await legacyDb.getTasksForColumn(columnId);
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        position: expect.any(Number)
      });
    });

    it('should move task between columns', async () => {
      const columns = await legacyDb.getColumnsForBoard(boardId);
      const doneColumnId = columns[1].id;

      const task = await legacyDb.addTaskToColumn(
        columnId,
        'Movable Task',
        'Task to move'
      );

      await legacyDb.moveTask(task.id, doneColumnId, 'Task completed');

      const movedTask = await legacyDb.getTaskById(task.id);
      expect(movedTask!.columnId).toBe(doneColumnId);
    });

    it('should update task', async () => {
      const task = await legacyDb.addTaskToColumn(
        columnId,
        'Original Task',
        'Original content'
      );

      const updatedTask = await legacyDb.updateTask(task.id, 'Updated content');
      expect(updatedTask).toMatchObject({
        id: task.id,
        content: 'Updated content'
      });
    });

    it('should delete task', async () => {
      const task = await legacyDb.addTaskToColumn(
        columnId,
        'Task to Delete',
        'Will be deleted'
      );

      const deleteCount = await legacyDb.deleteTask(task.id);
      expect(deleteCount).toBe(1);

      const deletedTask = await legacyDb.getTaskById(task.id);
      expect(deletedTask).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle deprecated methods gracefully', async () => {
      await expect(legacyDb.getColumnById('any-id')).rejects.toThrow('deprecated');
    });

    it('should return undefined for failed updates', async () => {
      const result = await legacyDb.updateTask('non-existent', 'new content');
      expect(result).toBeUndefined();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain same interface as original KanbanDB', async () => {
      // Verify all expected methods exist
      expect(typeof legacyDb.createBoard).toBe('function');
      expect(typeof legacyDb.getBoardById).toBe('function');
      expect(typeof legacyDb.getAllBoards).toBe('function');
      expect(typeof legacyDb.addTaskToColumn).toBe('function');
      expect(typeof legacyDb.getTaskById).toBe('function');
      expect(typeof legacyDb.moveTask).toBe('function');
      expect(typeof legacyDb.updateTask).toBe('function');
      expect(typeof legacyDb.deleteTask).toBe('function');
      expect(typeof legacyDb.close).toBe('function');
    });

    it('should work with existing code patterns', async () => {
      // Simulate existing code usage pattern
      const { boardId } = await legacyDb.createBoard(
        'Legacy Workflow',
        'Simulating existing usage',
        [{ name: 'Backlog', position: 0, wipLimit: 10 }],
        0
      );

      const board = await legacyDb.getBoardById(boardId);
      expect(board).toBeDefined();

      const columns = await legacyDb.getColumnsForBoard(boardId);
      const task = await legacyDb.addTaskToColumn(
        columns[0].id,
        'Legacy Task',
        'Created with legacy API'
      );

      const taskCount = await legacyDb.countTasksInColumn(columns[0].id);
      expect(taskCount).toBe(1);

      await legacyDb.deleteTask(task.id);
      await legacyDb.deleteBoard(boardId);
    });
  });
});