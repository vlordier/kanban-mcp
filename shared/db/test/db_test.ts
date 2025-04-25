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

      const result = kanbanDb.createBoard(boardName, projectGoal, columns);

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
      ]);

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
      ]);

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
      ]);

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
      ]);

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
      ]);

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
      ]);
      kanbanDb.createBoard("Board 2", "Goal 2", [
        { name: "To Do", position: 0, wipLimit: 5 },
      ]);

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
      ]);

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
      ]);

      // Delete the task
      const changes = kanbanDb.deleteTask("nonexistent-task-id");
      expect(changes).toBe(0);
    });
  });
});
