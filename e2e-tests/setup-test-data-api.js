async function setupTestDataViaAPI() {
  console.log('🏗️ Setting up test data via API...');
  
  const baseUrl = 'http://localhost:8221';
  
  try {
    // Create test data structure
    const testData = {
      boards: [
        {
          id: 'board-1',
          name: 'Sample Kanban Board',
          goal: 'Demonstrate all kanban features and workflows',
          landing_column_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'board-2',
          name: 'Personal Tasks',
          goal: 'Track personal and household tasks',
          landing_column_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      columns: [
        // Board 1 columns
        {
          id: 'col-1',
          board_id: 'board-1',
          name: 'To Do',
          position: 0,
          wip_limit: 0,
          is_done_column: 0
        },
        {
          id: 'col-2',
          board_id: 'board-1',
          name: 'In Progress',
          position: 1,
          wip_limit: 3,
          is_done_column: 0
        },
        {
          id: 'col-3',
          board_id: 'board-1',
          name: 'Review',
          position: 2,
          wip_limit: 2,
          is_done_column: 0
        },
        {
          id: 'col-4',
          board_id: 'board-1',
          name: 'Done',
          position: 3,
          wip_limit: 0,
          is_done_column: 1
        },
        // Board 2 columns
        {
          id: 'col-5',
          board_id: 'board-2',
          name: 'Backlog',
          position: 0,
          wip_limit: 0,
          is_done_column: 0
        },
        {
          id: 'col-6',
          board_id: 'board-2',
          name: 'This Week',
          position: 1,
          wip_limit: 5,
          is_done_column: 0
        },
        {
          id: 'col-7',
          board_id: 'board-2',
          name: 'Completed',
          position: 2,
          wip_limit: 0,
          is_done_column: 1
        }
      ],
      tasks: [
        // Board 1 tasks
        {
          id: 'task-1',
          column_id: 'col-1',
          title: 'Design user interface',
          content: 'Create wireframes and mockups for the new feature. Include responsive design considerations.',
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Initial task creation'
        },
        {
          id: 'task-2',
          column_id: 'col-1',
          title: 'Set up development environment',
          content: 'Install dependencies, configure development tools, and set up local testing environment.',
          position: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Initial task creation'
        },
        {
          id: 'task-3',
          column_id: 'col-1',
          title: 'Write documentation',
          content: 'Document the API endpoints, usage examples, and integration guidelines.',
          position: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Initial task creation'
        },
        {
          id: 'task-4',
          column_id: 'col-2',
          title: 'Implement backend API',
          content: 'Build the REST API endpoints for data management, including CRUD operations.',
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Moved to in progress'
        },
        {
          id: 'task-5',
          column_id: 'col-2',
          title: 'Create database schema',
          content: 'Design and implement the database structure with proper indexes and relationships.',
          position: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Moved to in progress'
        },
        {
          id: 'task-6',
          column_id: 'col-3',
          title: 'Implement import/export feature',
          content: 'Add functionality to import and export kanban data with proper validation.',
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Moved to review'
        },
        {
          id: 'task-7',
          column_id: 'col-4',
          title: 'Project setup',
          content: 'Initialize project repository, basic structure, and CI/CD pipeline.',
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Completed'
        },
        {
          id: 'task-8',
          column_id: 'col-4',
          title: 'Research requirements',
          content: 'Gather and analyze project requirements from stakeholders.',
          position: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Completed'
        },
        // Board 2 tasks
        {
          id: 'task-9',
          column_id: 'col-5',
          title: 'Buy groceries',
          content: 'Weekly shopping: milk, bread, eggs, vegetables, fruits',
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Added to backlog'
        },
        {
          id: 'task-10',
          column_id: 'col-5',
          title: 'Schedule dentist appointment',
          content: 'Call dentist office to book 6-month check-up appointment',
          position: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Added to backlog'
        },
        {
          id: 'task-11',
          column_id: 'col-6',
          title: 'Fix kitchen faucet',
          content: 'Replace the leaky faucet washer, check for additional damage',
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Prioritized for this week'
        },
        {
          id: 'task-12',
          column_id: 'col-7',
          title: 'File tax returns',
          content: 'Completed annual tax filing and received confirmation',
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          update_reason: 'Completed on time'
        }
      ]
    };

    console.log('📤 Importing test data...');
    
    const response = await fetch(`${baseUrl}/api/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test data imported successfully!');
      console.log(`📊 ${result.message}`);
      
      // Verify data by exporting it back
      const exportResponse = await fetch(`${baseUrl}/api/export`);
      if (exportResponse.ok) {
        const exportedData = await exportResponse.json();
        console.log('✅ Data verification:');
        console.log(`  📋 Boards: ${exportedData.boards.length}`);
        console.log(`  📂 Columns: ${exportedData.columns.length}`);
        console.log(`  📝 Tasks: ${exportedData.tasks.length}`);
        
        // Show board summaries
        exportedData.boards.forEach(board => {
          const boardColumns = exportedData.columns.filter(c => c.board_id === board.id);
          const boardTasks = exportedData.tasks.filter(t => 
            boardColumns.some(col => col.id === t.column_id)
          );
          console.log(`    "${board.name}": ${boardColumns.length} columns, ${boardTasks.length} tasks`);
        });
      }
      
      return testData;
      
    } else {
      const error = await response.json();
      throw new Error(`Import failed: ${error.error}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
    throw error;
  }
}

if (require.main === module) {
  setupTestDataViaAPI().catch(console.error);
}

module.exports = { setupTestDataViaAPI };