import { createDBInstance, KanbanDB } from '@kanban-mcp/db';
import { start } from './src/web-server';

// Initialize the database
const folderPath = process.env.MCP_KANBAN_DB_FOLDER_PATH ?? '../../db';
const db = createDBInstance(folderPath);
const kanbanDB = new KanbanDB(db);

// Start the web server
start(kanbanDB).catch(err => {
  console.error('Failed to start web server:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down web server...');
  kanbanDB.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down web server...');
  kanbanDB.close();
  process.exit(0);
});
