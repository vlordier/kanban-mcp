const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from web-ui/dist
app.use(express.static(path.join(__dirname, 'web-ui/dist')));

// Mock data
let boards = [
  {
    id: 'board-1',
    name: 'Sample Board',
    goal: 'Test board for development',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let columns = [
  {
    id: 'col-1',
    name: 'To Do',
    position: 1,
    boardId: 'board-1',
    tasks: []
  },
  {
    id: 'col-2', 
    name: 'In Progress',
    position: 2,
    boardId: 'board-1',
    tasks: []
  },
  {
    id: 'col-3',
    name: 'Done', 
    position: 3,
    boardId: 'board-1',
    tasks: []
  }
];

// API Routes
app.get('/api/boards', (req, res) => {
  res.json(boards);
});

app.get('/api/boards/:id', (req, res) => {
  const board = boards.find(b => b.id === req.params.id);
  if (board) {
    res.json({ board, columns: columns.filter(c => c.boardId === req.params.id) });
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

app.post('/api/boards', (req, res) => {
  const newBoard = {
    id: `board-${Date.now()}`,
    name: req.body.name,
    goal: req.body.goal,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  boards.push(newBoard);
  res.status(201).json({ success: true, message: 'Board created', boardId: newBoard.id });
});

app.delete('/api/boards/:id', (req, res) => {
  const index = boards.findIndex(b => b.id === req.params.id);
  if (index !== -1) {
    boards.splice(index, 1);
    // Also remove associated columns
    columns = columns.filter(c => c.boardId !== req.params.id);
    res.json({ success: true, message: 'Board deleted' });
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Handle 404 - serve index.html for non-API routes (SPA routing)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API route not found' });
  } else {
    res.sendFile(path.join(__dirname, 'web-ui/dist/index.html'));
  }
});

app.listen(port, () => {
  console.log(`🚀 Simple Kanban API server running on http://localhost:${port}`);
  console.log('API endpoints:');
  console.log(`  GET  http://localhost:${port}/api/boards`);
  console.log(`  GET  http://localhost:${port}/api/boards/:id`);
  console.log(`  POST http://localhost:${port}/api/boards`);
  console.log(`Web UI available at: http://localhost:${port}`);
});