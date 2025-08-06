import Database from "better-sqlite3";
import { ColumnCapacityFullError, KanbanDB } from "../src/db";

describe("KanbanDB", () => {
  let db: Database.Database;
  let kanbanDb: KanbanDB;

  beforeEach(() => {
    // Create a new in-memory database for each test
    db = new Database(":memory:");

    // Start transaction
    db.prepare("BEGIN TRANSACTION").run();

    // Create a new KanbanDB instance with the in-memory database
    kanbanDb = new KanbanDB(db);
  });

  afterEach(() => {
    // Roll back after each test
    db.prepare("ROLLBACK").run();

    // Close the database connection
    kanbanDb.close();
  });

  describe("createDBIfNotExists", () => {
    it("should create the database tables", () => {
      // This is implicitly tested by the constructor, but we can verify the tables exist
      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('boards', 'columns', 'tasks')
      `
        )
        .all();

      expect(tables.length).toBe(3);
    });
  });

  describe("createBoard", () => {
    it("should create a board with columns", () => {
      const boardName = "Test Board";
      const projectGoal = "Test Goal";
      const columns = [
        { name: "To Do", position: 0, wipLimit: 5 },
        { name: "In Progress", position: 1, wipLimit: 3 },
        { name: "Done", position: 2, wipLimit: 0, isDoneColumn: true },
      ];

      const result = kanbanDb.createBoard(boardName, projectGoal, columns, 0);

      // Verify board was created
      expect(result.boardId).toBeDefined();
      expect(result.landingColumnId).toBeDefined();

      // Get the board and verify its properties
      const board = kanbanDb.getBoardById(result.boardId);
      expect(board).toBeDefined();
      expect(board?.name).toBe(boardName);
      expect(board?.goal).toBe(projectGoal);
      expect(board?.landing_column_id).toBe(result.landingColumnId);

      // Get columns and verify they were created
      const boardColumns = kanbanDb.getColumnsForBoard(result.boardId);
      expect(boardColumns.length).toBe(3);

      // Verify column properties
      const todoColumn = boardColumns.find((col) => col.name === "To Do");
      const inProgressColumn = boardColumns.find(
        (col) => col.name === "In Progress"
      );
      const doneColumn = boardColumns.find((col) => col.name === "Done");

      expect(todoColumn).toBeDefined();
      expect(inProgressColumn).toBeDefined();
      expect(doneColumn).toBeDefined();

      expect(todoColumn?.position).toBe(0);
      expect(inProgressColumn?.position).toBe(1);
      expect(doneColumn?.position).toBe(2);

      expect(todoColumn?.wip_limit).toBe(5);
      expect(inProgressColumn?.wip_limit).toBe(3);
      expect(doneColumn?.wip_limit).toBe(0);

      expect(doneColumn?.is_done_column).toBe(1);
    });
  });

  describe("addTaskToColumn", () => {
    it("should add a task to a column", () => {
      // First create a board with columns
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
      ], 0);

      // Get the column ID
      const columns = kanbanDb.getColumnsForBoard(boardId);
      const columnId = columns[0].id;

      // Add a task to the column
      const taskTitle = "Test Task";
      const taskContent = "Test Content";
      const task = kanbanDb.addTaskToColumn(columnId, taskTitle, taskContent);

      // Verify task was created
      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe(taskTitle);
      expect(task.content).toBe(taskContent);
      expect(task.position).toBe(0);

      // Get the task and verify its properties
      const retrievedTask = kanbanDb.getTaskById(task.id);
      expect(retrievedTask).toBeDefined();
      expect(retrievedTask?.title).toBe(taskTitle);
      expect(retrievedTask?.content).toBe(taskContent);
      expect(retrievedTask?.position).toBe(0);

      // Get tasks for the column and verify
      const tasks = kanbanDb.getTasksForColumn(columnId);
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe(task.id);
      expect(tasks[0].title).toBe(taskTitle);
    });
  });

  describe("moveTask", () => {
    it("should move a task to another column", () => {
      // Create a board with two columns
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
        { name: "In Progress", position: 1, wipLimit: 3 },
      ], 0);

      // Get column IDs
      const columns = kanbanDb.getColumnsForBoard(boardId);
      const todoColumnId = columns[0].id;
      const inProgressColumnId = columns[1].id;

      // Add a task to the first column
      const task = kanbanDb.addTaskToColumn(
        todoColumnId,
        "Test Task",
        "Test Content"
      );

      // Move the task to the second column
      kanbanDb.moveTask(task.id, inProgressColumnId);

      // Verify the task was moved
      const todoTasks = kanbanDb.getTasksForColumn(todoColumnId);
      const inProgressTasks = kanbanDb.getTasksForColumn(inProgressColumnId);

      expect(todoTasks.length).toBe(0);
      expect(inProgressTasks.length).toBe(1);
      expect(inProgressTasks[0].id).toBe(task.id);

      // Verify the task's column_id was updated
      const updatedTask = kanbanDb.getTaskById(task.id);
      expect(updatedTask?.column_id).toBe(inProgressColumnId);
    });

    it("should set update_reason when provided", () => {
      // Create a board with two columns
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
        { name: "Done", position: 1, wipLimit: 0, isDoneColumn: true },
      ], 0);

      // Get column IDs
      const columns = kanbanDb.getColumnsForBoard(boardId);
      const todoColumnId = columns[0].id;
      const doneColumnId = columns[1].id;

      // Add a task to the first column
      const task = kanbanDb.addTaskToColumn(
        todoColumnId,
        "Test Task",
        "Test Content"
      );

      // Move the task to the done column with a reason
      const reason = "Task completed successfully";
      kanbanDb.moveTask(task.id, doneColumnId, reason);

      // Verify the task was moved
      const todoTasks = kanbanDb.getTasksForColumn(todoColumnId);
      const doneTasks = kanbanDb.getTasksForColumn(doneColumnId);

      expect(todoTasks.length).toBe(0);
      expect(doneTasks.length).toBe(1);
      expect(doneTasks[0].id).toBe(task.id);

      // Verify the task's column_id and update_reason were updated
      const updatedTask = kanbanDb.getTaskById(task.id);
      expect(updatedTask?.column_id).toBe(doneColumnId);
      expect(updatedTask?.update_reason).toBe(reason);
    });

    it("should throw an error if column is full", () => {
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 0 },
        { name: "In Progress", position: 1, wipLimit: 2 },
      ], 0);

      // Get column IDs
      const columns = kanbanDb.getColumnsForBoard(boardId);
      const todoColumnId = columns[0].id;
      const inProgressColumnId = columns[1].id;

      const task1 = kanbanDb.addTaskToColumn(
        todoColumnId,
        "Task 1",
        "Content 1"
      );
      const task2 = kanbanDb.addTaskToColumn(
        todoColumnId,
        "Task 2",
        "Content 2"
      );
      const task3 = kanbanDb.addTaskToColumn(
        todoColumnId,
        "Task 3",
        "Content 3"
      );

      kanbanDb.moveTask(task1.id, inProgressColumnId);
      kanbanDb.moveTask(task2.id, inProgressColumnId);

      // Try to move a task into the full column, expect error
      expect(() => {
        kanbanDb.moveTask(task3.id, inProgressColumnId);
      }).toThrow(ColumnCapacityFullError);
    });
  });

  describe("getBoardWithColumnsAndTasks", () => {
    it("should return a board with its columns and tasks", () => {
      // Create a board with columns
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
        { name: "In Progress", position: 1, wipLimit: 3 },
        { name: "Done", position: 2, wipLimit: 0, isDoneColumn: true },
      ], 0);

      // Get column IDs
      const columns = kanbanDb.getColumnsForBoard(boardId);
      const todoColumnId = columns[0].id;
      const inProgressColumnId = columns[1].id;

      // Add tasks to columns
      kanbanDb.addTaskToColumn(todoColumnId, "Task 1", "Content 1");
      kanbanDb.addTaskToColumn(todoColumnId, "Task 2", "Content 2");
      kanbanDb.addTaskToColumn(inProgressColumnId, "Task 3", "Content 3");

      // Get the board with columns and tasks
      const boardWithColumnsAndTasks =
        kanbanDb.getBoardWithColumnsAndTasks(boardId);

      // Verify the board
      expect(boardWithColumnsAndTasks).toBeDefined();
      expect(boardWithColumnsAndTasks?.board.id).toBe(boardId);
      expect(boardWithColumnsAndTasks?.board.name).toBe("Test Board");

      // Verify columns
      expect(boardWithColumnsAndTasks?.columns.length).toBe(3);

      // Verify tasks in columns
      const todoColumn = boardWithColumnsAndTasks?.columns.find(
        (col) => col.name === "To Do"
      );
      const inProgressColumn = boardWithColumnsAndTasks?.columns.find(
        (col) => col.name === "In Progress"
      );
      const doneColumn = boardWithColumnsAndTasks?.columns.find(
        (col) => col.name === "Done"
      );

      expect(todoColumn?.tasks.length).toBe(2);
      expect(inProgressColumn?.tasks.length).toBe(1);
      expect(doneColumn?.tasks.length).toBe(0);

      expect(todoColumn?.tasks[0].title).toBe("Task 1");
      expect(todoColumn?.tasks[1].title).toBe("Task 2");
      expect(inProgressColumn?.tasks[0].title).toBe("Task 3");
    });
  });

  describe("getAllBoards", () => {
    it("should return all boards", () => {
      // Create multiple boards
      kanbanDb.createBoard("Board 1", "Goal 1", [
        { name: "To Do", position: 0, wipLimit: 5 },
      ], 0);
      kanbanDb.createBoard("Board 2", "Goal 2", [
        { name: "To Do", position: 0, wipLimit: 5 },
      ], 0);

      // Get all boards
      const boards = kanbanDb.getAllBoards();

      // Verify boards
      expect(boards.length).toBeGreaterThanOrEqual(2);

      // Verify the boards contain the ones we created
      const board1 = boards.find((board) => board.name === "Board 1");
      const board2 = boards.find((board) => board.name === "Board 2");

      expect(board1).toBeDefined();
      expect(board2).toBeDefined();
      expect(board1?.goal).toBe("Goal 1");
      expect(board2?.goal).toBe("Goal 2");
    });
  });

  describe("deleteTask", () => {
    it("should delete a task", () => {
      // Create a board with columns
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
      ], 0);

      // Get the column ID
      const columns = kanbanDb.getColumnsForBoard(boardId);
      const columnId = columns[0].id;

      // Add a task to the column
      const task = kanbanDb.addTaskToColumn(
        columnId,
        "Test Task",
        "Test Content"
      );

      // Delete the task
      const changes = kanbanDb.deleteTask(task.id);
      expect(changes).toBe(1);

      // Verify the task was deleted
      const deletedTask = kanbanDb.getTaskById(task.id);
      expect(deletedTask).toBeUndefined();
    });

    it("should return 0 changes if task does not exist", () => {
      // Create a board with columns
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
      ], 0);

      // Delete the task
      const changes = kanbanDb.deleteTask("nonexistent-task-id");
      expect(changes).toBe(0);
    });
  });

  describe("updateTask", () => {
    it("should update a task's content", () => {
      // Create a board with columns
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
      ], 0);

      // Get the column ID
      const columns = kanbanDb.getColumnsForBoard(boardId);
      const columnId = columns[0].id;

      // Add a task to the column
      const task = kanbanDb.addTaskToColumn(
        columnId,
        "Test Task",
        "Original Content"
      );

      // Update the task content
      const newContent = "Updated Content";
      const updatedTask = kanbanDb.updateTask(task.id, newContent);

      // Verify the task was updated
      expect(updatedTask).toBeDefined();
      expect(updatedTask?.content).toBe(newContent);
      expect(updatedTask?.id).toBe(task.id);
      expect(updatedTask?.title).toBe(task.title);
      expect(updatedTask?.column_id).toBe(task.column_id);
      
      // Verify the task in the database was updated
      const retrievedTask = kanbanDb.getTaskById(task.id);
      expect(retrievedTask?.content).toBe(newContent);
    });

    it("should return undefined if task does not exist", () => {
      // Update a non-existent task
      const updatedTask = kanbanDb.updateTask("nonexistent-task-id", "New Content");
      expect(updatedTask).toBeUndefined();
    });
  });

  describe("deleteBoard", () => {
    it("should delete a board and all its related data", () => {
      // Create a board with columns
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
        { name: "In Progress", position: 1, wipLimit: 3 },
        { name: "Done", position: 2, wipLimit: 0, isDoneColumn: true },
      ], 0);

      // Get column IDs
      const columns = kanbanDb.getColumnsForBoard(boardId);
      const todoColumnId = columns[0].id;
      const inProgressColumnId = columns[1].id;

      // Add tasks to columns
      const task1 = kanbanDb.addTaskToColumn(todoColumnId, "Task 1", "Content 1");
      const task2 = kanbanDb.addTaskToColumn(todoColumnId, "Task 2", "Content 2");
      const task3 = kanbanDb.addTaskToColumn(inProgressColumnId, "Task 3", "Content 3");

      // Delete the board
      const changes = kanbanDb.deleteBoard(boardId);
      
      // Verify the board was deleted
      const deletedBoard = kanbanDb.getBoardById(boardId);
      expect(deletedBoard).toBeUndefined();
      
      // Verify columns were deleted
      const remainingColumns = kanbanDb.getColumnsForBoard(boardId);
      expect(remainingColumns.length).toBe(0);
      
      // Verify tasks were deleted
      const task1Exists = kanbanDb.getTaskById(task1.id);
      const task2Exists = kanbanDb.getTaskById(task2.id);
      const task3Exists = kanbanDb.getTaskById(task3.id);
      
      expect(task1Exists).toBeUndefined();
      expect(task2Exists).toBeUndefined();
      expect(task3Exists).toBeUndefined();
    });

    it("should return 0 changes if board does not exist", () => {
      // Delete a non-existent board
      const changes = kanbanDb.deleteBoard("nonexistent-board-id");
      expect(changes).toBe(0);
    });
  });

  describe("exportDatabase", () => {
    it("should export empty database", () => {
      const exportData = kanbanDb.exportDatabase();
      
      expect(exportData).toBeDefined();
      expect(exportData.boards).toEqual([]);
      expect(exportData.columns).toEqual([]);
      expect(exportData.tasks).toEqual([]);
    });

    it("should export database with data", () => {
      // Create test data
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
        { name: "In Progress", position: 1, wipLimit: 3 },
        { name: "Done", position: 2, wipLimit: 0, isDoneColumn: true },
      ], 0);

      // Get column IDs
      const columns = kanbanDb.getColumnsForBoard(boardId);
      const todoColumnId = columns[0].id;
      const inProgressColumnId = columns[1].id;

      // Add tasks
      const task1 = kanbanDb.addTaskToColumn(todoColumnId, "Task 1", "Content 1");
      const task2 = kanbanDb.addTaskToColumn(inProgressColumnId, "Task 2", "Content 2");

      // Export database
      const exportData = kanbanDb.exportDatabase();

      // Verify export structure
      expect(exportData).toBeDefined();
      expect(exportData.boards).toBeDefined();
      expect(exportData.columns).toBeDefined();
      expect(exportData.tasks).toBeDefined();

      // Verify board data
      expect(exportData.boards.length).toBe(1);
      expect(exportData.boards[0].id).toBe(boardId);
      expect(exportData.boards[0].name).toBe("Test Board");
      expect(exportData.boards[0].goal).toBe("Test Goal");

      // Verify column data
      expect(exportData.columns.length).toBe(3);
      const exportedColumns = exportData.columns.sort((a, b) => a.position - b.position);
      expect(exportedColumns[0].name).toBe("To Do");
      expect(exportedColumns[1].name).toBe("In Progress");
      expect(exportedColumns[2].name).toBe("Done");
      expect(exportedColumns[2].is_done_column).toBe(1);

      // Verify task data
      expect(exportData.tasks.length).toBe(2);
      const task1Export = exportData.tasks.find(t => t.title === "Task 1");
      const task2Export = exportData.tasks.find(t => t.title === "Task 2");
      expect(task1Export).toBeDefined();
      expect(task2Export).toBeDefined();
      expect(task1Export?.content).toBe("Content 1");
      expect(task2Export?.content).toBe("Content 2");
    });

    it("should export multiple boards with all relationships", () => {
      // Create multiple boards
      const { boardId: board1Id } = kanbanDb.createBoard("Board 1", "Goal 1", [
        { name: "Column A", position: 0, wipLimit: 2 },
      ], 0);

      const { boardId: board2Id } = kanbanDb.createBoard("Board 2", "Goal 2", [
        { name: "Column B", position: 0, wipLimit: 3 },
        { name: "Column C", position: 1, wipLimit: 0 },
      ], 0);

      // Add tasks
      const board1Columns = kanbanDb.getColumnsForBoard(board1Id);
      const board2Columns = kanbanDb.getColumnsForBoard(board2Id);

      kanbanDb.addTaskToColumn(board1Columns[0].id, "B1 Task 1", "B1 Content 1");
      kanbanDb.addTaskToColumn(board2Columns[0].id, "B2 Task 1", "B2 Content 1");
      kanbanDb.addTaskToColumn(board2Columns[1].id, "B2 Task 2", "B2 Content 2");

      // Export
      const exportData = kanbanDb.exportDatabase();

      // Verify export contains all data
      expect(exportData.boards.length).toBe(2);
      expect(exportData.columns.length).toBe(3);
      expect(exportData.tasks.length).toBe(3);

      // Verify board relationships
      const board1Tasks = exportData.tasks.filter(task => 
        exportData.columns.find(col => col.id === task.column_id)?.board_id === board1Id
      );
      const board2Tasks = exportData.tasks.filter(task => 
        exportData.columns.find(col => col.id === task.column_id)?.board_id === board2Id
      );

      expect(board1Tasks.length).toBe(1);
      expect(board2Tasks.length).toBe(2);
    });
  });

  describe("importDatabase", () => {
    it("should import empty database", () => {
      // First add some data to clear
      kanbanDb.createBoard("Temp Board", "Temp Goal", [
        { name: "Temp Column", position: 0, wipLimit: 5 },
      ], 0);

      // Import empty data
      const emptyData = {
        boards: [],
        columns: [],
        tasks: []
      };

      kanbanDb.importDatabase(emptyData);

      // Verify database is empty
      const boards = kanbanDb.getAllBoards();
      expect(boards.length).toBe(0);
    });

    it("should import database with data", () => {
      // Prepare import data
      const importData = {
        boards: [{
          id: "test-board-id",
          name: "Imported Board",
          goal: "Imported Goal",
          landing_column_id: "test-column-1",
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-01T00:00:00.000Z"
        }],
        columns: [
          {
            id: "test-column-1",
            board_id: "test-board-id",
            name: "Imported To Do",
            position: 0,
            wip_limit: 5,
            is_done_column: 0
          },
          {
            id: "test-column-2",
            board_id: "test-board-id",
            name: "Imported Done",
            position: 1,
            wip_limit: 0,
            is_done_column: 1
          }
        ],
        tasks: [
          {
            id: "test-task-1",
            column_id: "test-column-1",
            title: "Imported Task 1",
            content: "Imported Content 1",
            position: 0,
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z",
            update_reason: undefined
          },
          {
            id: "test-task-2",
            column_id: "test-column-2",
            title: "Imported Task 2",
            content: "Imported Content 2",
            position: 0,
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z",
            update_reason: "Import reason"
          }
        ]
      };

      // Import data
      kanbanDb.importDatabase(importData);

      // Verify imported board
      const board = kanbanDb.getBoardById("test-board-id");
      expect(board).toBeDefined();
      expect(board?.name).toBe("Imported Board");
      expect(board?.goal).toBe("Imported Goal");
      expect(board?.landing_column_id).toBe("test-column-1");

      // Verify imported columns
      const columns = kanbanDb.getColumnsForBoard("test-board-id");
      expect(columns.length).toBe(2);
      
      const todoColumn = columns.find(col => col.name === "Imported To Do");
      const doneColumn = columns.find(col => col.name === "Imported Done");
      
      expect(todoColumn).toBeDefined();
      expect(doneColumn).toBeDefined();
      expect(todoColumn?.wip_limit).toBe(5);
      expect(doneColumn?.is_done_column).toBe(1);

      // Verify imported tasks
      const task1 = kanbanDb.getTaskById("test-task-1");
      const task2 = kanbanDb.getTaskById("test-task-2");
      
      expect(task1).toBeDefined();
      expect(task2).toBeDefined();
      expect(task1?.title).toBe("Imported Task 1");
      expect(task1?.content).toBe("Imported Content 1");
      expect(task1?.update_reason).toBeNull();
      expect(task2?.title).toBe("Imported Task 2");
      expect(task2?.update_reason).toBe("Import reason");
    });

    it("should replace existing data when importing", () => {
      // Create initial data
      const { boardId } = kanbanDb.createBoard("Original Board", "Original Goal", [
        { name: "Original Column", position: 0, wipLimit: 3 },
      ], 0);

      const columns = kanbanDb.getColumnsForBoard(boardId);
      kanbanDb.addTaskToColumn(columns[0].id, "Original Task", "Original Content");

      // Verify initial data exists
      expect(kanbanDb.getAllBoards().length).toBe(1);
      expect(kanbanDb.getColumnsForBoard(boardId).length).toBe(1);

      // Import new data
      const importData = {
        boards: [{
          id: "new-board-id",
          name: "New Board",
          goal: "New Goal",
          landing_column_id: "new-column-id",
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-01T00:00:00.000Z"
        }],
        columns: [{
          id: "new-column-id",
          board_id: "new-board-id",
          name: "New Column",
          position: 0,
          wip_limit: 2,
          is_done_column: 0
        }],
        tasks: []
      };

      kanbanDb.importDatabase(importData);

      // Verify old data is replaced
      const allBoards = kanbanDb.getAllBoards();
      expect(allBoards.length).toBe(1);
      expect(allBoards[0].id).toBe("new-board-id");
      expect(allBoards[0].name).toBe("New Board");

      // Verify original board no longer exists
      const originalBoard = kanbanDb.getBoardById(boardId);
      expect(originalBoard).toBeUndefined();
    });

    it("should handle import with update_reason as null", () => {
      const importData = {
        boards: [{
          id: "test-board-id",
          name: "Test Board",
          goal: "Test Goal",
          landing_column_id: "test-column-id",
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-01T00:00:00.000Z"
        }],
        columns: [{
          id: "test-column-id",
          board_id: "test-board-id",
          name: "Test Column",
          position: 0,
          wip_limit: 0,
          is_done_column: 0
        }],
        tasks: [{
          id: "test-task-id",
          column_id: "test-column-id",
          title: "Test Task",
          content: "Test Content",
          position: 0,
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-01T00:00:00.000Z",
          update_reason: undefined
        }]
      };

      kanbanDb.importDatabase(importData);

      const task = kanbanDb.getTaskById("test-task-id");
      expect(task).toBeDefined();
      expect(task?.update_reason).toBeNull();
    });
  });

  describe("export/import round trip", () => {
    it("should maintain data integrity through export and import", () => {
      // Create complex test data
      const { boardId: board1Id } = kanbanDb.createBoard("Board 1", "Goal 1", [
        { name: "To Do", position: 0, wipLimit: 5 },
        { name: "In Progress", position: 1, wipLimit: 2 },
        { name: "Done", position: 2, wipLimit: 0, isDoneColumn: true },
      ], 1);

      const { boardId: board2Id } = kanbanDb.createBoard("Board 2", "Goal 2", [
        { name: "Backlog", position: 0, wipLimit: 0 },
        { name: "Active", position: 1, wipLimit: 1 },
      ], 0);

      // Add tasks with various properties
      const board1Columns = kanbanDb.getColumnsForBoard(board1Id);
      const board2Columns = kanbanDb.getColumnsForBoard(board2Id);

      const task1 = kanbanDb.addTaskToColumn(board1Columns[0].id, "Task 1", "Content 1");
      const task2 = kanbanDb.addTaskToColumn(board1Columns[1].id, "Task 2", "Content 2");
      const task3 = kanbanDb.addTaskToColumn(board2Columns[0].id, "Task 3", "Content 3");

      // Move a task to add update reason
      kanbanDb.moveTask(task1.id, board1Columns[2].id, "Completed successfully");

      // Export the database
      const exportData = kanbanDb.exportDatabase();

      // Clear and import
      kanbanDb.importDatabase({
        boards: [],
        columns: [],
        tasks: []
      });
      kanbanDb.importDatabase(exportData);

      // Verify all data is preserved
      const importedBoards = kanbanDb.getAllBoards();
      expect(importedBoards.length).toBe(2);

      const importedBoard1 = kanbanDb.getBoardById(board1Id);
      const importedBoard2 = kanbanDb.getBoardById(board2Id);

      expect(importedBoard1?.name).toBe("Board 1");
      expect(importedBoard1?.goal).toBe("Goal 1");
      expect(importedBoard2?.name).toBe("Board 2");
      expect(importedBoard2?.goal).toBe("Goal 2");

      // Verify columns
      const importedBoard1Columns = kanbanDb.getColumnsForBoard(board1Id);
      const importedBoard2Columns = kanbanDb.getColumnsForBoard(board2Id);

      expect(importedBoard1Columns.length).toBe(3);
      expect(importedBoard2Columns.length).toBe(2);

      // Verify tasks and their relationships
      const importedTask1 = kanbanDb.getTaskById(task1.id);
      const importedTask2 = kanbanDb.getTaskById(task2.id);
      const importedTask3 = kanbanDb.getTaskById(task3.id);

      expect(importedTask1?.title).toBe("Task 1");
      expect(importedTask1?.column_id).toBe(board1Columns[2].id); // Should be in Done column
      expect(importedTask1?.update_reason).toBe("Completed successfully");

      expect(importedTask2?.title).toBe("Task 2");
      expect(importedTask2?.column_id).toBe(board1Columns[1].id);

      expect(importedTask3?.title).toBe("Task 3");
      expect(importedTask3?.column_id).toBe(board2Columns[0].id);

      // Verify WIP limits and done column flags are preserved
      const doneColumn = importedBoard1Columns.find(col => col.is_done_column === 1);
      const inProgressColumn = importedBoard1Columns.find(col => col.name === "In Progress");

      expect(doneColumn).toBeDefined();
      expect(inProgressColumn?.wip_limit).toBe(2);
    });
  });
});
