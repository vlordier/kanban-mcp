import { Page } from '@playwright/test';

export interface MockBoard {
  id: string;
  name: string;
  goal: string;
  landing_column_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockColumn {
  id: string;
  name: string;
  position: number;
  wipLimit: number;
  isLanding: boolean;
  tasks: MockTask[];
}

export interface MockTask {
  id: string;
  title: string;
  content?: string;
  position: number;
  column_id: string;
  created_at: string;
  updated_at: string;
}

export class MockApiServer {
  private boards: Map<string, MockBoard> = new Map();
  private columns: Map<string, MockColumn[]> = new Map();
  private tasks: Map<string, MockTask> = new Map();
  private nextId = 1;

  constructor() {
    // Initialize with default test data
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Default board
    const defaultBoard: MockBoard = {
      id: 'board-1',
      name: 'Test Board',
      goal: 'Default test board',
      landing_column_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.boards.set('board-1', defaultBoard);

    // Default columns
    const defaultColumns: MockColumn[] = [
      {
        id: 'col-1',
        name: 'To Do',
        position: 1,
        wipLimit: 5,
        isLanding: false,
        tasks: [],
      },
      {
        id: 'col-2',
        name: 'In Progress',
        position: 2,
        wipLimit: 3,
        isLanding: false,
        tasks: [],
      },
      {
        id: 'col-3',
        name: 'Done',
        position: 3,
        wipLimit: 0,
        isLanding: false,
        tasks: [],
      },
    ];
    this.columns.set('board-1', defaultColumns);
  }

  private generateId(): string {
    return `mock-${this.nextId++}`;
  }

  async setupRoutes(page: Page) {
    // Mock GET /api/boards
    await page.route('/api/boards', async route => {
      if (route.request().method() === 'GET') {
        const boards = Array.from(this.boards.values());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(boards),
        });
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const newBoard: MockBoard = {
          id: this.generateId(),
          name: body.name,
          goal: body.goal,
          landing_column_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.boards.set(newBoard.id, newBoard);

        // Create default columns for new board
        const defaultColumns: MockColumn[] = [
          {
            id: this.generateId(),
            name: 'To Do',
            position: 1,
            wipLimit: 5,
            isLanding: false,
            tasks: [],
          },
          {
            id: this.generateId(),
            name: 'In Progress',
            position: 2,
            wipLimit: 3,
            isLanding: false,
            tasks: [],
          },
          {
            id: this.generateId(),
            name: 'Done',
            position: 3,
            wipLimit: 0,
            isLanding: false,
            tasks: [],
          },
        ];
        this.columns.set(newBoard.id, defaultColumns);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newBoard),
        });
      }
    });

    // Mock GET /api/boards/:id
    await page.route('/api/boards/*', async route => {
      if (route.request().method() === 'GET') {
        const url = route.request().url();
        const boardId = url.split('/').pop();

        const board = this.boards.get(boardId!);
        const columns = this.columns.get(boardId!) || [];

        if (board) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ board, columns }),
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Board not found' }),
          });
        }
      } else if (route.request().method() === 'PUT') {
        const url = route.request().url();
        const boardId = url.split('/').pop();
        const body = route.request().postDataJSON();

        const board = this.boards.get(boardId!);
        if (board) {
          const updatedBoard = {
            ...board,
            name: body.name || board.name,
            goal: body.goal || board.goal,
            updated_at: new Date().toISOString(),
          };
          this.boards.set(boardId!, updatedBoard);

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(updatedBoard),
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Board not found' }),
          });
        }
      } else if (route.request().method() === 'DELETE') {
        const url = route.request().url();
        const boardId = url.split('/').pop();

        if (this.boards.has(boardId!)) {
          this.boards.delete(boardId!);
          this.columns.delete(boardId!);

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Board not found' }),
          });
        }
      }
    });

    // Mock task operations
    await page.route('/api/tasks/*', async route => {
      if (route.request().method() === 'GET') {
        const url = route.request().url();
        const taskId = url.split('/').pop();

        const task = this.tasks.get(taskId!);
        if (task) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(task),
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Task not found' }),
          });
        }
      }
    });

    // Mock task creation and movement
    await page.route('/api/columns/*/tasks', async route => {
      if (route.request().method() === 'POST') {
        const url = route.request().url();
        const columnId = url.split('/')[4]; // Extract column ID from URL
        const body = route.request().postDataJSON();

        const newTask: MockTask = {
          id: this.generateId(),
          title: body.title,
          content: body.content,
          position: body.position || 1,
          column_id: columnId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        this.tasks.set(newTask.id, newTask);

        // Add task to column
        for (const [boardId, columns] of this.columns.entries()) {
          const column = columns.find(c => c.id === columnId);
          if (column) {
            column.tasks.push(newTask);
            break;
          }
        }

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newTask),
        });
      }
    });

    // Mock task movement
    await page.route('/api/tasks/*/move', async route => {
      if (route.request().method() === 'PUT') {
        const url = route.request().url();
        const taskId = url.split('/')[4];
        const body = route.request().postDataJSON();

        // Simple mock response for task movement
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });
  }

  // Helper methods for test manipulation
  addBoard(board: Partial<MockBoard>): MockBoard {
    const newBoard: MockBoard = {
      id: this.generateId(),
      name: board.name || 'Test Board',
      goal: board.goal || 'Test Goal',
      landing_column_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...board,
    };
    this.boards.set(newBoard.id, newBoard);
    return newBoard;
  }

  clearAllData() {
    this.boards.clear();
    this.columns.clear();
    this.tasks.clear();
    this.nextId = 1;
  }

  reset() {
    this.clearAllData();
    this.initializeDefaultData();
  }
}
