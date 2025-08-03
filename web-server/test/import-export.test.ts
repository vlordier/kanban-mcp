import Database from "better-sqlite3";
import { KanbanDB } from "@kanban-mcp/db";
import { WebServer } from "../src/web-server";

describe("Import/Export API Endpoints", () => {
  let db: Database.Database;
  let kanbanDb: KanbanDB;
  let webServer: WebServer;
  let serverInstance: any;

  beforeEach(async () => {
    // Create a new in-memory database for each test
    db = new Database(":memory:");
    
    // Start transaction
    db.prepare("BEGIN TRANSACTION").run();
    
    // Create a new KanbanDB instance with the in-memory database
    kanbanDb = new KanbanDB(db);
    
    // Create and start web server
    webServer = new WebServer(kanbanDb);
    serverInstance = webServer.getServer();
    await serverInstance.ready();
  });

  afterEach(async () => {
    // Close connections
    await webServer.close();
    
    // Only roll back if database is still open
    if (db.open) {
      db.prepare("ROLLBACK").run();
    }
    
    kanbanDb.close();
  });

  describe("GET /api/export", () => {
    it("should export empty database", async () => {
      const response = await serverInstance.inject({
        method: "GET",
        url: "/api/export",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(response.headers["content-disposition"]).toMatch(/attachment; filename="kanban-export-\d{4}-\d{2}-\d{2}\.json"/);
      
      const data = JSON.parse(response.payload);
      expect(data.boards).toEqual([]);
      expect(data.columns).toEqual([]);
      expect(data.tasks).toEqual([]);
    });

    it("should export database with data", async () => {
      // Create test data
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
        { name: "Done", position: 1, wipLimit: 0, isDoneColumn: true },
      ], 0);

      const columns = kanbanDb.getColumnsForBoard(boardId);
      const task = kanbanDb.addTaskToColumn(columns[0].id, "Test Task", "Test Content");

      const response = await serverInstance.inject({
        method: "GET",
        url: "/api/export",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
      
      const data = JSON.parse(response.payload);
      expect(data.boards.length).toBe(1);
      expect(data.columns.length).toBe(2);
      expect(data.tasks.length).toBe(1);

      expect(data.boards[0].name).toBe("Test Board");
      expect(data.boards[0].goal).toBe("Test Goal");
      expect(data.tasks[0].title).toBe("Test Task");
      expect(data.tasks[0].content).toBe("Test Content");
    });

    it("should include correct headers for file download", async () => {
      const response = await serverInstance.inject({
        method: "GET",
        url: "/api/export",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(response.headers["content-disposition"]).toContain("attachment");
      expect(response.headers["content-disposition"]).toContain("kanban-export-");
      expect(response.headers["content-disposition"]).toContain(".json");
    });

    it("should handle database errors gracefully", async () => {
      // Close the database to simulate an error
      kanbanDb.close();

      const response = await serverInstance.inject({
        method: "GET",
        url: "/api/export",
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.payload)).toEqual({
        error: "Failed to export database"
      });
    });
  });

  describe("POST /api/import", () => {
    it("should import empty database", async () => {
      // Add some initial data that should be cleared
      kanbanDb.createBoard("Initial Board", "Initial Goal", [
        { name: "Initial Column", position: 0, wipLimit: 3 },
      ], 0);

      const importData = {
        boards: [],
        columns: [],
        tasks: []
      };

      const response = await serverInstance.inject({
        method: "POST",
        url: "/api/import",
        payload: importData,
        headers: {
          "content-type": "application/json",
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Database imported successfully. Imported 0 boards, 0 columns, and 0 tasks.");

      // Verify database is empty
      const boards = kanbanDb.getAllBoards();
      expect(boards.length).toBe(0);
    });

    it("should import database with data", async () => {
      const importData = {
        boards: [{
          id: "import-board-id",
          name: "Imported Board",
          goal: "Imported Goal",
          landing_column_id: "import-column-id",
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-01T00:00:00.000Z"
        }],
        columns: [{
          id: "import-column-id",
          board_id: "import-board-id",
          name: "Imported Column",
          position: 0,
          wip_limit: 5,
          is_done_column: 0
        }],
        tasks: [{
          id: "import-task-id",
          column_id: "import-column-id",
          title: "Imported Task",
          content: "Imported Content",
          position: 0,
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-01T00:00:00.000Z",
          update_reason: "Import reason"
        }]
      };

      const response = await serverInstance.inject({
        method: "POST",
        url: "/api/import",
        payload: importData,
        headers: {
          "content-type": "application/json",
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Database imported successfully. Imported 1 boards, 1 columns, and 1 tasks.");

      // Verify imported data
      const board = kanbanDb.getBoardById("import-board-id");
      expect(board).toBeDefined();
      expect(board?.name).toBe("Imported Board");
      expect(board?.goal).toBe("Imported Goal");

      const task = kanbanDb.getTaskById("import-task-id");
      expect(task).toBeDefined();
      expect(task?.title).toBe("Imported Task");
      expect(task?.content).toBe("Imported Content");
      expect(task?.update_reason).toBe("Import reason");
    });

    it("should validate import data structure", async () => {
      const validTestCases = [
        {
          name: "missing boards",
          data: { columns: [], tasks: [] },
        },
        {
          name: "missing columns",
          data: { boards: [], tasks: [] },
        },
        {
          name: "missing tasks",
          data: { boards: [], columns: [] },
        },
        {
          name: "empty object",
          data: {},
        }
      ];

      for (const testCase of validTestCases) {
        const response = await serverInstance.inject({
          method: "POST",
          url: "/api/import",
          payload: testCase.data,
          headers: {
            "content-type": "application/json",
          },
        });

        expect(response.statusCode).toBe(400);
        const result = JSON.parse(response.payload);
        expect(result.error).toBe("Invalid data format. Must contain boards, columns, and tasks arrays.");
      }

      // Test null data separately as it causes a different error
      const nullResponse = await serverInstance.inject({
        method: "POST",
        url: "/api/import",
        payload: null,
        headers: {
          "content-type": "application/json",
        },
      });

      expect(nullResponse.statusCode).toBe(400);
      // Fastify returns a generic error for null payload
      expect(nullResponse.payload).toContain("Bad Request");
    });

    it("should handle invalid JSON", async () => {
      const response = await serverInstance.inject({
        method: "POST",
        url: "/api/import",
        payload: "invalid json",
        headers: {
          "content-type": "application/json",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should handle database import errors", async () => {
      // Close the database to simulate an error
      kanbanDb.close();

      const importData = {
        boards: [],
        columns: [],
        tasks: []
      };

      const response = await serverInstance.inject({
        method: "POST",
        url: "/api/import",
        payload: importData,
        headers: {
          "content-type": "application/json",
        },
      });

      expect(response.statusCode).toBe(500);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe("Failed to import database");
      expect(result.details).toBeDefined();
    });

    it("should replace existing data on import", async () => {
      // Create initial data
      const { boardId: initialBoardId } = kanbanDb.createBoard("Initial Board", "Initial Goal", [
        { name: "Initial Column", position: 0, wipLimit: 3 },
      ], 0);

      const initialColumns = kanbanDb.getColumnsForBoard(initialBoardId);
      kanbanDb.addTaskToColumn(initialColumns[0].id, "Initial Task", "Initial Content");

      // Verify initial data exists
      expect(kanbanDb.getAllBoards().length).toBe(1);

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

      const response = await serverInstance.inject({
        method: "POST",
        url: "/api/import",
        payload: importData,
        headers: {
          "content-type": "application/json",
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify old data is replaced
      const allBoards = kanbanDb.getAllBoards();
      expect(allBoards.length).toBe(1);
      expect(allBoards[0].id).toBe("new-board-id");
      expect(allBoards[0].name).toBe("New Board");

      // Verify original board no longer exists
      const originalBoard = kanbanDb.getBoardById(initialBoardId);
      expect(originalBoard).toBeUndefined();
    });

    it("should handle complex data with relationships", async () => {
      const importData = {
        boards: [
          {
            id: "board-1",
            name: "Board 1",
            goal: "Goal 1",
            landing_column_id: "col-1-1",
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z"
          },
          {
            id: "board-2",
            name: "Board 2",
            goal: "Goal 2",
            landing_column_id: "col-2-1",
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z"
          }
        ],
        columns: [
          {
            id: "col-1-1",
            board_id: "board-1",
            name: "Board 1 Col 1",
            position: 0,
            wip_limit: 3,
            is_done_column: 0
          },
          {
            id: "col-1-2",
            board_id: "board-1",
            name: "Board 1 Col 2",
            position: 1,
            wip_limit: 0,
            is_done_column: 1
          },
          {
            id: "col-2-1",
            board_id: "board-2",
            name: "Board 2 Col 1",
            position: 0,
            wip_limit: 5,
            is_done_column: 0
          }
        ],
        tasks: [
          {
            id: "task-1-1",
            column_id: "col-1-1",
            title: "Task 1",
            content: "Content 1",
            position: 0,
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z",
            update_reason: undefined
          },
          {
            id: "task-1-2",
            column_id: "col-1-2",
            title: "Task 2",
            content: "Content 2",
            position: 0,
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z",
            update_reason: "Moved to done"
          },
          {
            id: "task-2-1",
            column_id: "col-2-1",
            title: "Task 3",
            content: "Content 3",
            position: 0,
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z",
            update_reason: undefined
          }
        ]
      };

      const response = await serverInstance.inject({
        method: "POST",
        url: "/api/import",
        payload: importData,
        headers: {
          "content-type": "application/json",
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Database imported successfully. Imported 2 boards, 3 columns, and 3 tasks.");

      // Verify relationships are maintained
      const board1Data = kanbanDb.getBoardWithColumnsAndTasks("board-1");
      const board2Data = kanbanDb.getBoardWithColumnsAndTasks("board-2");

      expect(board1Data).toBeDefined();
      expect(board2Data).toBeDefined();
      
      expect(board1Data?.columns.length).toBe(2);
      expect(board2Data?.columns.length).toBe(1);

      // Check tasks are in correct columns
      const board1Col1Tasks = board1Data?.columns.find(col => col.id === "col-1-1")?.tasks;
      const board1Col2Tasks = board1Data?.columns.find(col => col.id === "col-1-2")?.tasks;
      const board2Col1Tasks = board2Data?.columns.find(col => col.id === "col-2-1")?.tasks;

      expect(board1Col1Tasks?.length).toBe(1);
      expect(board1Col2Tasks?.length).toBe(1);
      expect(board2Col1Tasks?.length).toBe(1);

      expect(board1Col1Tasks?.[0].title).toBe("Task 1");
      expect(board1Col2Tasks?.[0].title).toBe("Task 2");
      expect(board2Col1Tasks?.[0].title).toBe("Task 3");
    });
  });

  describe("Export/Import round trip", () => {
    it("should maintain data integrity through API export and import", async () => {
      // Create test data
      const { boardId } = kanbanDb.createBoard("Test Board", "Test Goal", [
        { name: "To Do", position: 0, wipLimit: 5 },
        { name: "In Progress", position: 1, wipLimit: 2 },
        { name: "Done", position: 2, wipLimit: 0, isDoneColumn: true },
      ], 0);

      const columns = kanbanDb.getColumnsForBoard(boardId);
      const task1 = kanbanDb.addTaskToColumn(columns[0].id, "Task 1", "Content 1");
      const task2 = kanbanDb.addTaskToColumn(columns[1].id, "Task 2", "Content 2");
      
      // Move task to add update reason
      kanbanDb.moveTask(task1.id, columns[2].id, "Completed");

      // Export data
      const exportResponse = await serverInstance.inject({
        method: "GET",
        url: "/api/export",
      });

      expect(exportResponse.statusCode).toBe(200);
      const exportedData = JSON.parse(exportResponse.payload);

      // Import the exported data
      const importResponse = await serverInstance.inject({
        method: "POST",
        url: "/api/import",
        payload: exportedData,
        headers: {
          "content-type": "application/json",
        },
      });

      expect(importResponse.statusCode).toBe(200);

      // Verify all data is preserved
      const importedBoard = kanbanDb.getBoardById(boardId);
      expect(importedBoard).toBeDefined();
      expect(importedBoard?.name).toBe("Test Board");
      expect(importedBoard?.goal).toBe("Test Goal");

      const importedColumns = kanbanDb.getColumnsForBoard(boardId);
      expect(importedColumns.length).toBe(3);

      const importedTask1 = kanbanDb.getTaskById(task1.id);
      const importedTask2 = kanbanDb.getTaskById(task2.id);

      expect(importedTask1?.title).toBe("Task 1");
      expect(importedTask1?.column_id).toBe(columns[2].id); // Should be in Done column
      expect(importedTask1?.update_reason).toBe("Completed");

      expect(importedTask2?.title).toBe("Task 2");
      expect(importedTask2?.column_id).toBe(columns[1].id); // Should be in In Progress column
    });
  });
});