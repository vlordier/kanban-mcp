const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database connection
const dbPath = path.join(__dirname, 'shared/db/prisma/test.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('✅ Connected to SQLite database at:', dbPath);
  }
});

// Serve static files from web-ui/dist
app.use(express.static(path.join(__dirname, 'web-ui/dist')));

// API Routes
app.get('/api/boards', (req, res) => {
  db.all('SELECT * FROM boards ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
    } else {
      // Transform database row format to API format
      const boards = rows.map(row => ({
        id: row.id,
        name: row.name,
        goal: row.goal,
        landingColumnId: row.landing_column_id,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString()
      }));
      res.json(boards);
    }
  });
});

app.get('/api/boards/:id', (req, res) => {
  const boardId = req.params.id;
  
  // Get board info
  db.get('SELECT * FROM boards WHERE id = ?', [boardId], (err, board) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }
    
    // Get columns for this board
    db.all('SELECT * FROM columns WHERE board_id = ? ORDER BY position', [boardId], (err, columns) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
        return;
      }
      
      // Transform to API format
      const transformedBoard = {
        id: board.id,
        name: board.name,
        goal: board.goal,
        landingColumnId: board.landing_column_id,
        createdAt: new Date(board.created_at).toISOString(),
        updatedAt: new Date(board.updated_at).toISOString()
      };
      
      const transformedColumns = columns.map(col => ({
        id: col.id,
        name: col.name,
        position: col.position,
        boardId: col.board_id,
        wipLimit: col.wip_limit,
        isDoneColumn: col.is_done_column === 1,
        createdAt: new Date(col.created_at).toISOString(),
        updatedAt: new Date(col.updated_at).toISOString(),
        tasks: []  // TODO: Load tasks
      }));
      
      res.json({ board: transformedBoard, columns: transformedColumns });
    });
  });
});

app.post('/api/boards', (req, res) => {
  const { name, goal } = req.body;
  const boardId = `board-${Date.now()}`;
  const now = Date.now();
  
  db.run(
    'INSERT INTO boards (id, name, goal, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [boardId, name, goal, now, now],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to create board' });
        return;
      }
      
      // Create default columns
      const columns = [
        { id: `col-${Date.now()}-1`, name: 'To Do', position: 1 },
        { id: `col-${Date.now()}-2`, name: 'In Progress', position: 2 },
        { id: `col-${Date.now()}-3`, name: 'Done', position: 3 }
      ];
      
      let columnsCreated = 0;
      columns.forEach((col, index) => {
        db.run(
          'INSERT INTO columns (id, name, position, board_id, wip_limit, is_done_column, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [col.id, col.name, col.position, boardId, index === 1 ? 3 : 0, index === 2 ? 1 : 0, now, now],
          (err) => {
            if (err) {
              console.error('Error creating column:', err);
            }
            columnsCreated++;
            if (columnsCreated === columns.length) {
              res.status(201).json({ 
                success: true, 
                message: 'Board created successfully', 
                boardId: boardId 
              });
            }
          }
        );
      });
    }
  );
});

app.delete('/api/boards/:id', (req, res) => {
  const boardId = req.params.id;
  
  // Delete board (cascade will handle columns and tasks)
  db.run('DELETE FROM boards WHERE id = ?', [boardId], function(err) {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to delete board' });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }
    
    // Also delete columns
    db.run('DELETE FROM columns WHERE board_id = ?', [boardId], (err) => {
      if (err) {
        console.error('Error deleting columns:', err);
      }
      
      res.json({ 
        success: true, 
        message: 'Board deleted successfully',
        boardId: boardId
      });
    });
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

// Handle 404 - serve index.html for non-API routes (SPA routing)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API route not found' });
  } else {
    res.sendFile(path.join(__dirname, 'web-ui/dist/index.html'));
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});

app.listen(port, () => {
  console.log(`🚀 Kanban API server with database running on http://localhost:${port}`);
  console.log('API endpoints:');
  console.log(`  GET  http://localhost:${port}/api/boards`);
  console.log(`  GET  http://localhost:${port}/api/boards/:id`);
  console.log(`  POST http://localhost:${port}/api/boards`);
  console.log(`Web UI available at: http://localhost:${port}`);
  console.log(`Database: ${dbPath}`);
});