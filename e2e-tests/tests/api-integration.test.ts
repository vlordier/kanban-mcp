import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { waitForServer } from './helpers/server-health';

describe('API Integration Tests', () => {
  let serverProcess: ChildProcess;
  const tempDir = path.join(__dirname, '../temp');
  const testPort = 8221;

  beforeAll(async () => {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Start web server
    const serverPath = path.join(__dirname, '../../web-server/dist/index.js');
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        MCP_KANBAN_DB_FOLDER_PATH: tempDir,
        PORT: testPort.toString()
      },
      stdio: 'pipe'
    });

    // Wait for server to be ready with health check
    await waitForServer({ port: testPort, timeout: 15000 });
  }, 30000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should export database via API endpoint', async () => {
    const response = await fetch(`http://localhost:${testPort}/api/export`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('content-disposition')).toContain('attachment');
    expect(response.headers.get('content-disposition')).toContain('kanban-export-');
    
    const data = await response.json();
    expect(data).toHaveProperty('boards');
    expect(data).toHaveProperty('columns');
    expect(data).toHaveProperty('tasks');
    expect(Array.isArray(data.boards)).toBe(true);
    expect(Array.isArray(data.columns)).toBe(true);
    expect(Array.isArray(data.tasks)).toBe(true);
  });

  it('should accept valid import data via API endpoint', async () => {
    const validImportData = {
      boards: [
        {
          id: '1',
          name: 'Test Board',
          goal: 'A test board for import',
          landing_column_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      columns: [
        {
          id: '1',
          board_id: '1',
          name: 'To Do',
          position: 0,
          wip_limit: 0,
          is_done_column: 0
        }
      ],
      tasks: [
        {
          id: '1',
          column_id: '1',
          title: 'Test Task',
          content: 'This is a test task',
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Created during import test'
        }
      ]
    };

    const response = await fetch(`http://localhost:${testPort}/api/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validImportData)
    });

    if (response.status !== 200) {
      const error = await response.json();
      console.error('Import failed:', error);
    }
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toHaveProperty('message');
    expect(result.message).toContain('Database imported successfully');
  });

  it('should reject invalid import data via API endpoint', async () => {
    const invalidImportData = {
      invalid: 'data'
    };

    const response = await fetch(`http://localhost:${testPort}/api/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidImportData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error).toHaveProperty('error');
  });

  it('should handle empty import data gracefully', async () => {
    const emptyImportData = {
      boards: [],
      columns: [],
      tasks: []
    };

    const response = await fetch(`http://localhost:${testPort}/api/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emptyImportData)
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toHaveProperty('message');
    expect(result.message).toContain('Database imported successfully');
  });

  it('should serve static web interface', async () => {
    const response = await fetch(`http://localhost:${testPort}/`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    
    const html = await response.text();
    expect(html).toContain('Kanban Board');
  });

  it('should have proper CORS headers for API endpoints', async () => {
    // Test CORS preflight for export endpoint
    const exportOptionsResponse = await fetch(`http://localhost:${testPort}/api/export`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8221',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    expect(exportOptionsResponse.status).toBe(204);
    expect(exportOptionsResponse.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8221');
    expect(exportOptionsResponse.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    
    // Test actual CORS headers on a real request
    const exportResponse = await fetch(`http://localhost:${testPort}/api/export`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:8221'
      }
    });
    
    expect(exportResponse.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8221');
    
    // Test CORS for import endpoint
    const importOptionsResponse = await fetch(`http://localhost:${testPort}/api/import`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8221',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    expect(importOptionsResponse.status).toBe(204);
    expect(importOptionsResponse.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8221');
    expect(importOptionsResponse.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('should perform complete import-export round trip', async () => {
    // First, add some test data
    const testData = {
      boards: [
        {
          id: '1',
          name: 'Round Trip Board',
          goal: 'Testing round trip functionality',
          landing_column_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      columns: [
        {
          id: '1',
          board_id: '1',
          name: 'Test Column',
          position: 0,
          wip_limit: 5,
          is_done_column: 0
        }
      ],
      tasks: [
        {
          id: '1',
          column_id: '1',
          title: 'Round Trip Task',
          content: 'Testing round trip',
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Created for round trip test'
        }
      ]
    };

    // Import the test data
    const importResponse = await fetch(`http://localhost:${testPort}/api/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    expect(importResponse.status).toBe(200);

    // Export the data back
    const exportResponse = await fetch(`http://localhost:${testPort}/api/export`);
    expect(exportResponse.status).toBe(200);
    
    const exportedData = await exportResponse.json();
    
    // Verify the data integrity
    expect(exportedData.boards).toHaveLength(1);
    expect(exportedData.boards[0].name).toBe('Round Trip Board');
    
    expect(exportedData.columns).toHaveLength(1);
    expect(exportedData.columns[0].name).toBe('Test Column');
    expect(exportedData.columns[0].wip_limit).toBe(5);
    
    expect(exportedData.tasks).toHaveLength(1);
    expect(exportedData.tasks[0].title).toBe('Round Trip Task');
    expect(exportedData.tasks[0].content).toBe('Testing round trip');
  });
});