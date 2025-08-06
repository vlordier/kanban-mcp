import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import Database from 'better-sqlite3';
import { KanbanDB } from '@kanban-mcp/db';
import path from 'path';

export class TestServer {
  private process: ChildProcess | null = null;
  private db: Database.Database | null = null;
  private kanbanDb: KanbanDB | null = null;
  private dbPath: string = '';

  async start(): Promise<void> {
    // Create a temporary database
    this.dbPath = path.join(__dirname, '../../temp', `test-${Date.now()}.db`);
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    
    this.db = new Database(this.dbPath);
    this.kanbanDb = new KanbanDB(this.db);

    // Set environment variable for web server to use our test database
    const env = {
      ...process.env,
      MCP_KANBAN_DB_FOLDER_PATH: path.dirname(this.dbPath),
    };

    // Start the web server
    const serverPath = path.join(__dirname, '../../../web-server/dist/index.js');
    this.process = spawn('node', [serverPath], {
      env,
      stdio: 'pipe',
    });

    // Wait for server to start
    await this.waitForServer();
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    if (this.kanbanDb) {
      this.kanbanDb.close();
      this.kanbanDb = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Clean up database file
    if (this.dbPath) {
      try {
        await fs.unlink(this.dbPath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  getDatabase(): KanbanDB {
    if (!this.kanbanDb) {
      throw new Error('Server not started');
    }
    return this.kanbanDb;
  }

  async seedTestData(): Promise<{ boardId: string; taskIds: string[] }> {
    const db = this.getDatabase();
    
    // Create a test board
    const { boardId } = db.createBoard('Test Board', 'Test board for E2E testing', [
      { name: 'To Do', position: 0, wipLimit: 5 },
      { name: 'In Progress', position: 1, wipLimit: 3 },
      { name: 'Done', position: 2, wipLimit: 0, isDoneColumn: true },
    ], 0);

    // Add some test tasks
    const columns = db.getColumnsForBoard(boardId);
    const task1 = db.addTaskToColumn(columns[0].id, 'Task 1', 'First test task');
    const task2 = db.addTaskToColumn(columns[0].id, 'Task 2', 'Second test task');
    const task3 = db.addTaskToColumn(columns[1].id, 'Task 3', 'Third test task');
    
    return {
      boardId,
      taskIds: [task1.id, task2.id, task3.id],
    };
  }

  private async waitForServer(): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch('http://localhost:8221/api/boards');
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      attempts++;
      // Exponential backoff for better server readiness detection
      const backoff = Math.min(1000 * Math.pow(1.5, attempts), 5000);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }

    throw new Error('Server failed to start within timeout');
  }
}