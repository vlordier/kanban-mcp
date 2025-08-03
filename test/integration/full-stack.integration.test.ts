import { DatabaseFactory, KanbanDB } from '@kanban-mcp/db';
import { WebServer } from '../../web-server/src/web-server';
import { AuthService } from '../../web-server/src/auth/auth.service';

describe('Full Stack Integration Tests', () => {
  let databaseService: any;
  let kanbanDb: KanbanDB;
  let webServer: WebServer;
  let serverInstance: any;
  let authService: AuthService;

  beforeEach(async () => {
    // Create a new in-memory database for each test
    databaseService = await DatabaseFactory.createLegacyDatabase({
      provider: 'sqlite',
      url: 'file::memory:?cache=shared',
    });

    kanbanDb = new KanbanDB(databaseService);
    webServer = new WebServer(kanbanDb);
    serverInstance = webServer.getServer();
    await serverInstance.ready();

    authService = new AuthService();
  });

  afterEach(async () => {
    await webServer.close();
    await kanbanDb.close();
  });

  describe('Complete Board Management Workflow', () => {
    it('should complete full board creation and management workflow', async () => {
      // 1. Authenticate user
      const { tokens, user } = await authService.authenticate('admin@example.com', 'demo123');

      expect(user).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      // 2. Create board via API
      const boardResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'Integration Test Board', goal: 'Full stack workflow testing' }
      });

      expect(boardResponse.statusCode).toBe(201);
      const boardBody = JSON.parse(boardResponse.payload);
      expect(boardBody.success).toBe(true);
      expect(boardBody.boardId).toBeDefined();
      
      const boardId = boardBody.boardId;

      // 3. Verify board in database directly
      const dbBoard = await kanbanDb.getBoardById(boardId);
      expect(dbBoard).toBeDefined();
      expect(dbBoard!.name).toBe('Integration Test Board');
      expect(dbBoard!.goal).toBe('Full stack workflow testing');

      // 4. Verify board accessible via API
      const fetchResponse = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${boardId}`,
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        }
      });

      expect(fetchResponse.statusCode).toBe(200);
      const fetchedBoard = JSON.parse(fetchResponse.payload);
      expect(fetchedBoard.name).toBe('Integration Test Board');
      expect(fetchedBoard.goal).toBe('Full stack workflow testing');
      expect(fetchedBoard.columns).toBeDefined();
      expect(fetchedBoard.columns.length).toBe(4); // Default columns

      // 5. Verify board appears in listing
      const listResponse = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        }
      });

      expect(listResponse.statusCode).toBe(200);
      const boards = JSON.parse(listResponse.payload);
      expect(Array.isArray(boards)).toBe(true);
      expect(boards.find((b: any) => b.id === boardId)).toBeDefined();
    });

    it('should complete full task management workflow', async () => {
      // 1. Setup: Create board and authenticate
      const { tokens } = await authService.authenticate('admin@example.com', 'demo123');

      const boardResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'Task Workflow Board', goal: 'Testing task operations' }
      });

      const boardBody = JSON.parse(boardResponse.payload);
      const boardId = boardBody.boardId;

      // Get board details to find column IDs
      const boardDetailsResponse = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${boardId}`,
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        }
      });

      const boardDetails = JSON.parse(boardDetailsResponse.payload);
      const todoColumnId = boardDetails.columns.find((c: any) => c.name === 'To Do').id;
      const inProgressColumnId = boardDetails.columns.find((c: any) => c.name === 'In Progress').id;
      const doneColumnId = boardDetails.columns.find((c: any) => c.name === 'Done').id;

      // 2. Create task via API
      const taskResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: {
          columnId: todoColumnId,
          title: 'Integration Test Task',
          content: 'This task tests the full integration workflow'
        }
      });

      expect(taskResponse.statusCode).toBe(201);
      const taskBody = JSON.parse(taskResponse.payload);
      expect(taskBody.success).toBe(true);
      expect(taskBody.task).toBeDefined();
      
      const taskId = taskBody.task.id;

      // 3. Verify task in database
      const dbTask = await kanbanDb.getTaskById(taskId);
      expect(dbTask).toBeDefined();
      expect(dbTask!.title).toBe('Integration Test Task');
      expect(dbTask!.columnId).toBe(todoColumnId);

      // 4. Move task to In Progress
      const moveResponse = await serverInstance.inject({
        method: 'POST',
        url: `/api/v1/tasks/${taskId}/move`,
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: {
          targetColumnId: inProgressColumnId,
          reason: 'Starting work on integration test'
        }
      });

      expect(moveResponse.statusCode).toBe(200);
      const moveBody = JSON.parse(moveResponse.payload);
      expect(moveBody.success).toBe(true);

      // 5. Verify task moved in database
      const movedTask = await kanbanDb.getTaskById(taskId);
      expect(movedTask!.columnId).toBe(inProgressColumnId);
      expect(movedTask!.updateReason).toBe('Starting work on integration test');

      // 6. Update task content
      const updateResponse = await serverInstance.inject({
        method: 'PUT',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: {
          content: 'Updated task content for integration testing'
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      const updateBody = JSON.parse(updateResponse.payload);
      expect(updateBody.success).toBe(true);

      // 7. Move task to Done
      const completeResponse = await serverInstance.inject({
        method: 'POST',
        url: `/api/v1/tasks/${taskId}/move`,
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: {
          targetColumnId: doneColumnId,
          reason: 'Integration test completed successfully'
        }
      });

      expect(completeResponse.statusCode).toBe(200);

      // 8. Verify final state
      const finalTask = await kanbanDb.getTaskById(taskId);
      expect(finalTask!.columnId).toBe(doneColumnId);
      expect(finalTask!.content).toBe('Updated task content for integration testing');
      expect(finalTask!.updateReason).toBe('Integration test completed successfully');

      // 9. Verify task appears in board view
      const finalBoardView = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${boardId}`,
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        }
      });

      const finalBoard = JSON.parse(finalBoardView.payload);
      const doneColumn = finalBoard.columns.find((c: any) => c.name === 'Done');
      expect(doneColumn.tasks.find((t: any) => t.id === taskId)).toBeDefined();
    });
  });

  describe('Authentication Integration Tests', () => {
    it('should handle complete authentication lifecycle', async () => {
      // 1. Login
      const loginResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: { email: 'admin@example.com', password: 'demo123' }
      });

      expect(loginResponse.statusCode).toBe(200);
      const loginBody = JSON.parse(loginResponse.payload);
      expect(loginBody.success).toBe(true);
      expect(loginBody.tokens).toBeDefined();
      expect(loginBody.user).toBeDefined();

      const { accessToken, refreshToken } = loginBody.tokens;

      // 2. Use access token for protected resource
      const protectedResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'Auth Test Board', goal: 'Testing authentication' }
      });

      expect(protectedResponse.statusCode).toBe(201);

      // 3. Test token refresh
      const refreshResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: {
          'content-type': 'application/json',
        },
        payload: { refreshToken }
      });

      expect(refreshResponse.statusCode).toBe(200);
      const refreshBody = JSON.parse(refreshResponse.payload);
      expect(refreshBody.success).toBe(true);
      expect(refreshBody.tokens).toBeDefined();

      const newAccessToken = refreshBody.tokens.accessToken;

      // 4. Use new access token
      const newTokenResponse = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${newAccessToken}`
        }
      });

      expect(newTokenResponse.statusCode).toBe(200);

      // 5. Logout
      const logoutResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          'Authorization': `Bearer ${newAccessToken}`,
          'content-type': 'application/json',
        },
        payload: { refreshToken: refreshBody.tokens.refreshToken }
      });

      expect(logoutResponse.statusCode).toBe(200);

      // 6. Verify token is invalidated (this would require token blacklisting implementation)
      // For now, we just verify the logout endpoint works
    });

    it('should handle role-based access control integration', async () => {
      // 1. Login as regular user
      const userLogin = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: { email: 'user@example.com', password: 'demo123' }
      });

      const userTokens = JSON.parse(userLogin.payload).tokens;

      // 2. Create board as user
      const boardResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${userTokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'User Board', goal: 'Testing user permissions' }
      });

      expect(boardResponse.statusCode).toBe(201);
      const boardId = JSON.parse(boardResponse.payload).boardId;

      // 3. Try to delete as user (should fail)
      const deleteAttempt = await serverInstance.inject({
        method: 'DELETE',
        url: `/api/v1/boards/${boardId}`,
        headers: {
          'Authorization': `Bearer ${userTokens.accessToken}`
        }
      });

      expect(deleteAttempt.statusCode).toBe(403);

      // 4. Login as admin
      const adminLogin = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: { email: 'admin@example.com', password: 'demo123' }
      });

      const adminTokens = JSON.parse(adminLogin.payload).tokens;

      // 5. Delete as admin (should succeed)
      const adminDelete = await serverInstance.inject({
        method: 'DELETE',
        url: `/api/v1/boards/${boardId}`,
        headers: {
          'Authorization': `Bearer ${adminTokens.accessToken}`
        }
      });

      expect(adminDelete.statusCode).toBe(200);

      // 6. Verify board is deleted
      const verifyDeleted = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${boardId}`
      });

      expect(verifyDeleted.statusCode).toBe(404);
    });
  });

  describe('Database Integration Tests', () => {
    it('should maintain data consistency across API operations', async () => {
      const { tokens } = await authService.authenticate('admin@example.com', 'demo123');

      // Create multiple boards
      const boardPromises = Array(5).fill(0).map((_, i) =>
        serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'content-type': 'application/json',
          },
          payload: { 
            name: `Consistency Test Board ${i}`, 
            goal: `Testing data consistency ${i}` 
          }
        })
      );

      const boardResponses = await Promise.all(boardPromises);
      
      // All should succeed
      boardResponses.forEach(response => {
        expect(response.statusCode).toBe(201);
      });

      const boardIds = boardResponses.map(r => JSON.parse(r.payload).boardId);

      // Verify all boards exist in database
      for (const boardId of boardIds) {
        const dbBoard = await kanbanDb.getBoardById(boardId);
        expect(dbBoard).toBeDefined();
      }

      // Create tasks for each board
      const taskPromises = boardIds.map(async (boardId, i) => {
        const boardDetailsResponse = await serverInstance.inject({
          method: 'GET',
          url: `/api/v1/boards/${boardId}`
        });
        const boardDetails = JSON.parse(boardDetailsResponse.payload);
        const columnId = boardDetails.columns[0].id;

        return serverInstance.inject({
          method: 'POST',
          url: '/api/v1/tasks',
          headers: {
            'content-type': 'application/json',
          },
          payload: {
            columnId: columnId,
            title: `Task for Board ${i}`,
            content: `Content for board ${i} task`
          }
        });
      });

      const taskResponses = await Promise.all(taskPromises);
      
      // All tasks should be created
      taskResponses.forEach(response => {
        expect(response.statusCode).toBe(201);
      });

      // Verify database state
      const allBoards = await kanbanDb.getAllBoards();
      expect(allBoards.length).toBeGreaterThanOrEqual(5);

      // Export and verify data integrity
      const exportResponse = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/export'
      });

      expect(exportResponse.statusCode).toBe(200);
      const exportData = JSON.parse(exportResponse.payload);

      expect(exportData.boards.length).toBeGreaterThanOrEqual(5);
      expect(exportData.columns.length).toBeGreaterThanOrEqual(20); // 4 columns per board
      expect(exportData.tasks.length).toBeGreaterThanOrEqual(5);

      // Verify referential integrity
      exportData.tasks.forEach((task: any) => {
        const column = exportData.columns.find((c: any) => c.id === task.column_id);
        expect(column).toBeDefined();
        
        const board = exportData.boards.find((b: any) => b.id === column.board_id);
        expect(board).toBeDefined();
      });
    });

    it('should handle import/export workflow correctly', async () => {
      const { tokens } = await authService.authenticate('admin@example.com', 'demo123');

      // Create some test data
      const boardResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'Export Test Board', goal: 'Testing export functionality' }
      });

      const boardId = JSON.parse(boardResponse.payload).boardId;

      // Add tasks
      const boardDetailsResponse = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${boardId}`
      });
      const boardDetails = JSON.parse(boardDetailsResponse.payload);
      const columnId = boardDetails.columns[0].id;

      await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          columnId: columnId,
          title: 'Export Test Task',
          content: 'This task will be exported and imported'
        }
      });

      // Export data
      const exportResponse = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/export'
      });

      expect(exportResponse.statusCode).toBe(200);
      const exportData = JSON.parse(exportResponse.payload);

      // Verify export contains our data
      const exportedBoard = exportData.boards.find((b: any) => b.name === 'Export Test Board');
      expect(exportedBoard).toBeDefined();

      const exportedTask = exportData.tasks.find((t: any) => t.title === 'Export Test Task');
      expect(exportedTask).toBeDefined();

      // Import the data (this will replace existing data)
      const importResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/import',
        headers: {
          'content-type': 'application/json',
        },
        payload: exportData
      });

      expect(importResponse.statusCode).toBe(200);
      const importBody = JSON.parse(importResponse.payload);
      expect(importBody.success).toBe(true);

      // Verify imported data
      const postImportBoards = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards'
      });

      const boards = JSON.parse(postImportBoards.payload);
      const importedBoard = boards.find((b: any) => b.name === 'Export Test Board');
      expect(importedBoard).toBeDefined();

      // Verify board details are preserved
      const importedBoardDetails = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${importedBoard.id}`
      });

      const boardData = JSON.parse(importedBoardDetails.payload);
      expect(boardData.name).toBe('Export Test Board');
      expect(boardData.goal).toBe('Testing export functionality');

      // Verify task is preserved
      const taskInColumn = boardData.columns[0].tasks.find((t: any) => t.title === 'Export Test Task');
      expect(taskInColumn).toBeDefined();
    });
  });

  describe('Error Handling Integration Tests', () => {
    it('should handle cascading failures gracefully', async () => {
      const { tokens } = await authService.authenticate('admin@example.com', 'demo123');

      // Create a board
      const boardResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'Error Test Board', goal: 'Testing error handling' }
      });

      const boardId = JSON.parse(boardResponse.payload).boardId;

      // Try to create task with invalid column ID
      const invalidTaskResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          columnId: 'invalid-column-id',
          title: 'Invalid Task',
          content: 'This should fail'
        }
      });

      expect(invalidTaskResponse.statusCode).toBe(404);

      // Verify board is still intact
      const boardCheck = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${boardId}`
      });

      expect(boardCheck.statusCode).toBe(200);
      const boardData = JSON.parse(boardCheck.payload);
      expect(boardData.name).toBe('Error Test Board');

      // Try to move non-existent task
      const invalidMoveResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/tasks/invalid-task-id/move',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          targetColumnId: boardData.columns[0].id,
          reason: 'This should fail'
        }
      });

      expect(invalidMoveResponse.statusCode).toBe(404);

      // Verify system is still responsive
      const healthResponse = await serverInstance.inject({
        method: 'GET',
        url: '/health'
      });

      expect(healthResponse.statusCode).toBe(200);
      const healthData = JSON.parse(healthResponse.payload);
      expect(healthData.status).toBe('healthy');
    });

    it('should maintain transaction integrity on failures', async () => {
      // This test would be more comprehensive with actual transaction support
      // For now, we test that partial failures don't corrupt data

      const { tokens } = await authService.authenticate('admin@example.com', 'demo123');

      // Get initial board count
      const initialBoardsResponse = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards'
      });
      const initialBoards = JSON.parse(initialBoardsResponse.payload);
      const initialCount = initialBoards.length;

      // Try to create boards with one invalid request
      const validBoard1 = serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'Valid Board 1', goal: 'Should succeed' }
      });

      const invalidBoard = serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: { name: '', goal: '' } // Invalid
      });

      const validBoard2 = serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'Valid Board 2', goal: 'Should also succeed' }
      });

      const results = await Promise.all([validBoard1, invalidBoard, validBoard2]);

      // Verify outcomes
      expect(results[0].statusCode).toBe(201); // Valid board 1
      expect(results[1].statusCode).toBe(400); // Invalid board
      expect(results[2].statusCode).toBe(201); // Valid board 2

      // Verify final state - should have 2 new boards
      const finalBoardsResponse = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards'
      });
      const finalBoards = JSON.parse(finalBoardsResponse.payload);
      expect(finalBoards.length).toBe(initialCount + 2);

      // Verify the valid boards were created correctly
      const createdBoards = finalBoards.filter((b: any) => 
        b.name === 'Valid Board 1' || b.name === 'Valid Board 2'
      );
      expect(createdBoards.length).toBe(2);
    });
  });
});