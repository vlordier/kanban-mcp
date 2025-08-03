import { DatabaseFactory, KanbanDB } from '../src/index';

describe('Database Concurrency Tests', () => {
  let databaseService: any;
  let kanbanDb: KanbanDB;

  beforeEach(async () => {
    // Create a new in-memory database for each test
    databaseService = await DatabaseFactory.createLegacyDatabase({
      provider: 'sqlite',
      url: 'file::memory:?cache=shared',
    });

    kanbanDb = new KanbanDB(databaseService);
  });

  afterEach(async () => {
    await kanbanDb.close();
  });

  describe('Concurrent Board Operations', () => {
    it('should handle concurrent board creation without data corruption', async () => {
      const boardCreationPromises = Array(20).fill(0).map((_, i) => 
        kanbanDb.createBoard(
          `Concurrent Board ${i}`,
          `Concurrency test board number ${i}`,
          [
            { name: 'To Do', position: 0, wipLimit: 0, isDoneColumn: false },
            { name: 'Done', position: 1, wipLimit: 0, isDoneColumn: true }
          ],
          0
        )
      );

      const results = await Promise.all(boardCreationPromises);

      // All operations should succeed
      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result.boardId).toBeDefined();
        expect(typeof result.boardId).toBe('string');
      });

      // Verify all boards were created
      const allBoards = await kanbanDb.getAllBoards();
      expect(allBoards.length).toBe(20);

      // Verify no duplicate IDs
      const boardIds = allBoards.map(board => board.id);
      const uniqueIds = new Set(boardIds);
      expect(uniqueIds.size).toBe(20);

      // Verify all boards have correct structure
      for (const board of allBoards) {
        expect(board.name).toMatch(/^Concurrent Board \d+$/);
        expect(board.goal).toMatch(/^Concurrency test board number \d+$/);
        
        // Check that board has associated columns
        const boardWithDetails = await kanbanDb.getBoardWithColumnsAndTasks(board.id);
        expect(boardWithDetails).toBeDefined();
        expect(boardWithDetails!.columns).toHaveLength(2);
      }
    });

    it('should handle concurrent board deletion safely', async () => {
      // First create multiple boards
      const boardCreationPromises = Array(10).fill(0).map((_, i) => 
        kanbanDb.createBoard(
          `Delete Test Board ${i}`,
          `Board for deletion testing ${i}`,
          [{ name: 'To Do', position: 0, wipLimit: 0, isDoneColumn: false }],
          0
        )
      );

      const createResults = await Promise.all(boardCreationPromises);
      const boardIds = createResults.map(result => result.boardId);

      // Attempt concurrent deletion
      const deletionPromises = boardIds.map(boardId => 
        kanbanDb.deleteBoard(boardId).catch(error => ({ error, boardId }))
      );

      const deleteResults = await Promise.all(deletionPromises);

      // All deletions should either succeed or fail gracefully
      let successfulDeletes = 0;
      let failedDeletes = 0;

      deleteResults.forEach(result => {
        if (typeof result === 'number') {
          // Successful deletion returns number of changes
          successfulDeletes++;
          expect(result).toBeGreaterThan(0);
        } else if (result && result.error) {
          // Failed deletion
          failedDeletes++;
        }
      });

      // Should have some successful deletes
      expect(successfulDeletes).toBeGreaterThan(0);

      // Verify database integrity
      const remainingBoards = await kanbanDb.getAllBoards();
      expect(remainingBoards.length).toBe(failedDeletes);

      // Verify no orphaned data
      for (const board of remainingBoards) {
        const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(board.id);
        expect(boardDetails).toBeDefined();
        expect(boardDetails!.columns).toBeDefined();
      }
    });
  });

  describe('Concurrent Task Operations', () => {
    let testBoardId: string;
    let testColumnId: string;

    beforeEach(async () => {
      // Create a test board for task operations
      const { boardId } = await kanbanDb.createBoard(
        'Concurrency Test Board',
        'Board for testing concurrent task operations',
        [
          { name: 'To Do', position: 0, wipLimit: 0, isDoneColumn: false },
          { name: 'In Progress', position: 1, wipLimit: 5, isDoneColumn: false },
          { name: 'Done', position: 2, wipLimit: 0, isDoneColumn: true }
        ],
        0
      );

      testBoardId = boardId;
      const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(boardId);
      testColumnId = boardDetails!.columns[0].id;
    });

    it('should handle concurrent task creation without data corruption', async () => {
      const taskCreationPromises = Array(30).fill(0).map((_, i) => 
        kanbanDb.addTaskToColumn(
          testColumnId,
          `Concurrent Task ${i}`,
          `Content for concurrent task ${i}`
        )
      );

      const results = await Promise.all(taskCreationPromises);

      // All operations should succeed
      expect(results).toHaveLength(30);
      results.forEach(result => {
        expect(result.id).toBeDefined();
        expect(typeof result.id).toBe('string');
        expect(result.columnId).toBe(testColumnId);
      });

      // Verify all tasks were created
      const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(testBoardId);
      const toDoColumn = boardDetails!.columns.find(c => c.id === testColumnId);
      expect(toDoColumn!.tasks).toHaveLength(30);

      // Verify no duplicate task IDs
      const taskIds = toDoColumn!.tasks.map(task => task.id);
      const uniqueIds = new Set(taskIds);
      expect(uniqueIds.size).toBe(30);

      // Verify correct positioning
      const positions = toDoColumn!.tasks.map(task => task.position).sort((a, b) => a - b);
      expect(positions).toEqual(Array.from({ length: 30 }, (_, i) => i));
    });

    it('should handle concurrent task moves without data corruption', async () => {
      // First create some tasks
      const tasks = await Promise.all(
        Array(10).fill(0).map((_, i) => 
          kanbanDb.addTaskToColumn(
            testColumnId,
            `Move Test Task ${i}`,
            `Content for move test task ${i}`
          )
        )
      );

      const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(testBoardId);
      const inProgressColumnId = boardDetails!.columns.find(c => c.name === 'In Progress')!.id;
      const doneColumnId = boardDetails!.columns.find(c => c.name === 'Done')!.id;

      // Simulate concurrent moves to different columns
      const movePromises = tasks.map((task, i) => {
        const targetColumnId = i % 2 === 0 ? inProgressColumnId : doneColumnId;
        const reason = `Moved to ${i % 2 === 0 ? 'In Progress' : 'Done'} concurrently`;
        
        return kanbanDb.moveTask(task.id, targetColumnId, reason)
          .catch(error => ({ error, taskId: task.id }));
      });

      const moveResults = await Promise.all(movePromises);

      // Count successful moves
      let successfulMoves = 0;
      let failedMoves = 0;

      moveResults.forEach(result => {
        if (result && result.error) {
          failedMoves++;
        } else {
          successfulMoves++;
        }
      });

      // Should have some successful moves
      expect(successfulMoves).toBeGreaterThan(0);

      // Verify each task is in exactly one column
      const finalBoardDetails = await kanbanDb.getBoardWithColumnsAndTasks(testBoardId);
      
      let totalTasks = 0;
      const allTaskIds = new Set();

      finalBoardDetails!.columns.forEach(column => {
        totalTasks += column.tasks.length;
        column.tasks.forEach(task => {
          expect(allTaskIds.has(task.id)).toBe(false); // No duplicates
          allTaskIds.add(task.id);
        });
      });

      expect(totalTasks).toBe(10); // All tasks should still exist
      expect(allTaskIds.size).toBe(10); // No duplicated tasks
    });

    it('should respect WIP limits under concurrent operations', async () => {
      // Get the In Progress column with WIP limit of 5
      const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(testBoardId);
      const inProgressColumn = boardDetails!.columns.find(c => c.name === 'In Progress')!;
      expect(inProgressColumn.wipLimit).toBe(5);

      // Create tasks in To Do column first
      const tasks = await Promise.all(
        Array(10).fill(0).map((_, i) => 
          kanbanDb.addTaskToColumn(
            testColumnId,
            `WIP Test Task ${i}`,
            `Content for WIP test task ${i}`
          )
        )
      );

      // Attempt to move all tasks to In Progress column concurrently
      const movePromises = tasks.map(task => 
        kanbanDb.moveTask(task.id, inProgressColumn.id, 'Testing WIP limits')
          .catch(error => ({ error: error.message, taskId: task.id }))
      );

      const moveResults = await Promise.all(movePromises);

      // Count successful and failed moves
      let successfulMoves = 0;
      let wipLimitErrors = 0;

      moveResults.forEach(result => {
        if (result && result.error) {
          if (result.error.includes('WIP limit') || result.error.includes('capacity')) {
            wipLimitErrors++;
          }
        } else {
          successfulMoves++;
        }
      });

      // Should only allow 5 successful moves due to WIP limit
      expect(successfulMoves).toBeLessThanOrEqual(5);
      expect(wipLimitErrors).toBeGreaterThan(0);

      // Verify final state respects WIP limit
      const finalBoardDetails = await kanbanDb.getBoardWithColumnsAndTasks(testBoardId);
      const finalInProgressColumn = finalBoardDetails!.columns.find(c => c.name === 'In Progress')!;
      expect(finalInProgressColumn.tasks.length).toBeLessThanOrEqual(5);

      // Verify total task count is preserved
      let totalFinalTasks = 0;
      finalBoardDetails!.columns.forEach(column => {
        totalFinalTasks += column.tasks.length;
      });
      expect(totalFinalTasks).toBe(10);
    });
  });

  describe('Connection Pool Stress Testing', () => {
    it('should maintain data integrity under connection pool stress', async () => {
      const operations = Array(100).fill(0).map((_, i) => async () => {
        try {
          // Mix of different operations to stress connection pool
          if (i % 4 === 0) {
            // Create board
            const result = await kanbanDb.createBoard(
              `Stress Test Board ${i}`,
              `Concurrency stress test ${i}`,
              [
                { name: 'To Do', position: 0, wipLimit: 0, isDoneColumn: false }
              ],
              0
            );
            return { type: 'board', id: result.boardId };
          } else if (i % 4 === 1) {
            // Get all boards
            const boards = await kanbanDb.getAllBoards();
            return { type: 'read', count: boards.length };
          } else if (i % 4 === 2) {
            // Create board and add task
            const { boardId } = await kanbanDb.createBoard(
              `Task Board ${i}`,
              `Board for task ${i}`,
              [{ name: 'To Do', position: 0, wipLimit: 0, isDoneColumn: false }],
              0
            );
            
            const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(boardId);
            const columnId = boardDetails!.columns[0].id;
            
            const task = await kanbanDb.addTaskToColumn(
              columnId,
              `Stress Task ${i}`,
              `Stress test task content ${i}`
            );
            
            return { type: 'board_with_task', boardId, taskId: task.id };
          } else {
            // Get board details
            const boards = await kanbanDb.getAllBoards();
            if (boards.length > 0) {
              const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(boards[0].id);
              return { type: 'board_details', columns: boardDetails!.columns.length };
            } else {
              return { type: 'board_details', columns: 0 };
            }
          }
        } catch (error) {
          return { type: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      // Execute all operations concurrently
      const results = await Promise.all(operations.map(op => op()));

      // Analyze results
      const operationTypes = {
        board: 0,
        read: 0,
        board_with_task: 0,
        board_details: 0,
        error: 0
      };

      results.forEach(result => {
        operationTypes[result.type as keyof typeof operationTypes]++;
      });

      // Should have minimal errors
      expect(operationTypes.error).toBeLessThan(5); // Allow for some connection contention
      
      // Should have executed all operation types
      expect(operationTypes.board).toBeGreaterThan(20);
      expect(operationTypes.read).toBeGreaterThan(20);
      expect(operationTypes.board_with_task).toBeGreaterThan(20);
      expect(operationTypes.board_details).toBeGreaterThan(20);

      // Verify database integrity after stress test
      const finalBoards = await kanbanDb.getAllBoards();
      expect(finalBoards.length).toBeGreaterThan(0);

      // Verify each board has valid structure
      for (const board of finalBoards.slice(0, 5)) { // Check first 5 boards
        const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(board.id);
        expect(boardDetails).toBeDefined();
        expect(boardDetails!.board).toBeDefined();
        expect(boardDetails!.columns).toBeDefined();
        expect(Array.isArray(boardDetails!.columns)).toBe(true);
      }

      console.log('Connection Pool Stress Test Results:', operationTypes);
    });

    it('should handle database connection failures gracefully', async () => {
      // Create some initial data
      const { boardId } = await kanbanDb.createBoard(
        'Resilience Test Board',
        'Testing connection resilience',
        [{ name: 'To Do', position: 0, wipLimit: 0, isDoneColumn: false }],
        0
      );

      // Simulate connection issues by closing and reopening database
      await kanbanDb.close();

      // Recreate database connection
      databaseService = await DatabaseFactory.createLegacyDatabase({
        provider: 'sqlite',
        url: 'file::memory:?cache=shared',
      });
      kanbanDb = new KanbanDB(databaseService);

      // Since we're using in-memory database, data will be lost after close
      // In real scenarios with persistent database, we'd test reconnection
      
      // Verify we can continue operations after reconnection
      const { boardId: newBoardId } = await kanbanDb.createBoard(
        'Recovery Test Board',
        'Testing recovery after connection issues',
        [{ name: 'To Do', position: 0, wipLimit: 0, isDoneColumn: false }],
        0
      );

      expect(newBoardId).toBeDefined();
      
      const boards = await kanbanDb.getAllBoards();
      expect(boards.length).toBe(1);
      expect(boards[0].name).toBe('Recovery Test Board');
    });
  });

  describe('Race Condition Prevention', () => {
    it('should prevent task position conflicts in concurrent operations', async () => {
      // Create board and column
      const { boardId } = await kanbanDb.createBoard(
        'Position Race Test',
        'Testing position race conditions',
        [{ name: 'To Do', position: 0, wipLimit: 0, isDoneColumn: false }],
        0
      );

      const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(boardId);
      const columnId = boardDetails!.columns[0].id;

      // Create tasks concurrently - each should get unique positions
      const taskPromises = Array(20).fill(0).map((_, i) => 
        kanbanDb.addTaskToColumn(
          columnId,
          `Position Test Task ${i}`,
          `Testing position assignment ${i}`
        )
      );

      const tasks = await Promise.all(taskPromises);

      // Verify all tasks have unique positions
      const positions = tasks.map(task => task.position).sort((a, b) => a - b);
      const expectedPositions = Array.from({ length: 20 }, (_, i) => i);
      
      expect(positions).toEqual(expectedPositions);

      // Verify database state is consistent
      const finalBoardDetails = await kanbanDb.getBoardWithColumnsAndTasks(boardId);
      const column = finalBoardDetails!.columns[0];
      
      expect(column.tasks.length).toBe(20);
      
      const dbPositions = column.tasks.map(task => task.position).sort((a, b) => a - b);
      expect(dbPositions).toEqual(expectedPositions);
    });

    it('should handle concurrent updates to the same task safely', async () => {
      // Create a test task
      const { boardId } = await kanbanDb.createBoard(
        'Update Race Test',
        'Testing concurrent updates',
        [
          { name: 'To Do', position: 0, wipLimit: 0, isDoneColumn: false },
          { name: 'Done', position: 1, wipLimit: 0, isDoneColumn: true }
        ],
        0
      );

      const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(boardId);
      const toDoColumnId = boardDetails!.columns[0].id;
      const doneColumnId = boardDetails!.columns[1].id;

      const task = await kanbanDb.addTaskToColumn(
        toDoColumnId,
        'Concurrent Update Test Task',
        'Original content'
      );

      // Attempt concurrent updates
      const updatePromises = [
        kanbanDb.updateTask(task.id, 'Updated content 1'),
        kanbanDb.updateTask(task.id, 'Updated content 2'),
        kanbanDb.moveTask(task.id, doneColumnId, 'Moving to done'),
        kanbanDb.updateTask(task.id, 'Updated content 3')
      ];

      const results = await Promise.allSettled(updatePromises);

      // At least some operations should succeed
      const successfulUpdates = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulUpdates).toBeGreaterThan(0);

      // Verify task is in consistent state
      const finalTask = await kanbanDb.getTaskById(task.id);
      expect(finalTask).toBeDefined();
      expect(finalTask!.id).toBe(task.id);
      expect(finalTask!.title).toBe('Concurrent Update Test Task');
      
      // Content should be one of the updated values
      const possibleContents = [
        'Original content',
        'Updated content 1',
        'Updated content 2', 
        'Updated content 3'
      ];
      expect(possibleContents).toContain(finalTask!.content);

      // Task should be in either To Do or Done column
      expect([toDoColumnId, doneColumnId]).toContain(finalTask!.columnId);
    });
  });

  describe('Data Consistency Verification', () => {
    it('should maintain referential integrity under concurrent operations', async () => {
      // Create multiple boards with tasks concurrently
      const createOperations = Array(10).fill(0).map(async (_, i) => {
        const { boardId } = await kanbanDb.createBoard(
          `Integrity Test Board ${i}`,
          `Testing referential integrity ${i}`,
          [
            { name: 'To Do', position: 0, wipLimit: 0, isDoneColumn: false },
            { name: 'Done', position: 1, wipLimit: 0, isDoneColumn: true }
          ],
          0
        );

        const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(boardId);
        const columnId = boardDetails!.columns[0].id;

        // Add multiple tasks to each board
        const tasks = await Promise.all(
          Array(3).fill(0).map((_, j) => 
            kanbanDb.addTaskToColumn(
              columnId,
              `Task ${j} for Board ${i}`,
              `Content for task ${j} in board ${i}`
            )
          )
        );

        return { boardId, columnId, tasks };
      });

      const results = await Promise.all(createOperations);

      // Verify all operations succeeded
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result.boardId).toBeDefined();
        expect(result.columnId).toBeDefined();
        expect(result.tasks.length).toBe(3);
      });

      // Verify referential integrity
      const allBoards = await kanbanDb.getAllBoards();
      expect(allBoards.length).toBe(10);

      for (const board of allBoards) {
        const boardDetails = await kanbanDb.getBoardWithColumnsAndTasks(board.id);
        expect(boardDetails).toBeDefined();
        
        // Each board should have 2 columns
        expect(boardDetails!.columns.length).toBe(2);
        
        // First column should have 3 tasks
        const toDoColumn = boardDetails!.columns.find(c => c.name === 'To Do');
        expect(toDoColumn).toBeDefined();
        expect(toDoColumn!.tasks.length).toBe(3);
        
        // Verify all tasks reference correct column
        toDoColumn!.tasks.forEach(task => {
          expect(task.columnId).toBe(toDoColumn!.id);
        });

        // Verify landing column reference
        expect(board.landingColumnId).toBe(toDoColumn!.id);
      }

      // Test export to verify complete data integrity
      const exportData = await kanbanDb.exportDatabase();
      
      expect(exportData.boards.length).toBe(10);
      expect(exportData.columns.length).toBe(20); // 2 columns per board
      expect(exportData.tasks.length).toBe(30); // 3 tasks per board

      // Verify all foreign key relationships
      exportData.tasks.forEach(task => {
        const column = exportData.columns.find(c => c.id === task.column_id);
        expect(column).toBeDefined();
        
        const board = exportData.boards.find(b => b.id === column!.board_id);
        expect(board).toBeDefined();
      });

      exportData.columns.forEach(column => {
        const board = exportData.boards.find(b => b.id === column.board_id);
        expect(board).toBeDefined();
      });

      exportData.boards.forEach(board => {
        if (board.landing_column_id) {
          const landingColumn = exportData.columns.find(c => c.id === board.landing_column_id);
          expect(landingColumn).toBeDefined();
          expect(landingColumn!.board_id).toBe(board.id);
        }
      });
    });
  });
});