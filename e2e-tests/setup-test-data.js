const { KanbanDB } = require('../shared/db/dist/db.js');
const path = require('path');

async function setupTestData() {
  console.log('🏗️ Setting up test data...');
  
  const dbPath = '/tmp/visual-test-kanban';
  const db = new KanbanDB(dbPath);
  
  try {
    // Create a sample board
    const boardId = 'test-board-1';
    const board = db.createBoard(boardId, 'Sample Kanban Board', 'Demonstrate all kanban features');
    console.log('✅ Created board:', board.name);
    
    // Get the columns that were automatically created
    const columns = db.getColumnsForBoard(boardId);
    console.log(`✅ Found ${columns.length} columns:`, columns.map(c => c.name));
    
    if (columns.length >= 3) {
      // Add some sample tasks
      const todoColumn = columns.find(c => c.name.toLowerCase().includes('to do') || c.name.toLowerCase().includes('todo'));
      const inProgressColumn = columns.find(c => c.name.toLowerCase().includes('progress') || c.name.toLowerCase().includes('doing'));
      const doneColumn = columns.find(c => c.name.toLowerCase().includes('done') || c.name.toLowerCase().includes('complete'));
      
      if (todoColumn) {
        db.addTaskToColumn(todoColumn.id, 'Design user interface', 'Create wireframes and mockups for the new feature');
        db.addTaskToColumn(todoColumn.id, 'Set up development environment', 'Install dependencies and configure development tools');
        db.addTaskToColumn(todoColumn.id, 'Write documentation', 'Document the API endpoints and usage examples');
        console.log('✅ Added tasks to To Do column');
      }
      
      if (inProgressColumn) {
        db.addTaskToColumn(inProgressColumn.id, 'Implement backend API', 'Build the REST API endpoints for data management');
        db.addTaskToColumn(inProgressColumn.id, 'Create database schema', 'Design and implement the database structure');
        console.log('✅ Added tasks to In Progress column');
      }
      
      if (doneColumn) {
        db.addTaskToColumn(doneColumn.id, 'Project setup', 'Initialize project repository and basic structure');
        db.addTaskToColumn(doneColumn.id, 'Research requirements', 'Gather and analyze project requirements');
        console.log('✅ Added tasks to Done column');
      }
    }
    
    // Create a second board for variety
    const board2Id = 'test-board-2';
    const board2 = db.createBoard(board2Id, 'Personal Tasks', 'Track personal and household tasks');
    console.log('✅ Created second board:', board2.name);
    
    const columns2 = db.getColumnsForBoard(board2Id);
    if (columns2.length > 0) {
      const firstColumn = columns2[0];
      db.addTaskToColumn(firstColumn.id, 'Buy groceries', 'Milk, bread, eggs, vegetables');
      db.addTaskToColumn(firstColumn.id, 'Schedule dentist appointment', 'Call dentist office to book check-up');
      console.log('✅ Added tasks to second board');
    }
    
    // Verify data
    const allBoards = db.getAllBoards();
    console.log(`✅ Total boards created: ${allBoards.length}`);
    
    for (const board of allBoards) {
      const boardData = db.getBoardWithColumnsAndTasks(board.id);
      const taskCount = boardData.columns.reduce((total, col) => total + col.tasks.length, 0);
      console.log(`  📋 "${board.name}": ${boardData.columns.length} columns, ${taskCount} tasks`);
    }
    
    console.log('🎉 Test data setup complete!');
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
    throw error;
  }
}

if (require.main === module) {
  setupTestData().catch(console.error);
}

module.exports = { setupTestData };