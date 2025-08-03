import { DatabaseFactory } from './database.factory.js';
// import { createLogger } from '@kanban-mcp/logging';

const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any, error?: Error) => console.error(`[ERROR] ${message}`, meta || '', error || '')
};

/**
 * Seed the database with sample data for development and testing
 */
export async function seedDatabase(): Promise<void> {
  let db: any;
  
  try {
    logger.info('Starting database seeding...');

    // Create database service
    db = await DatabaseFactory.createFromEnvironment('seed');

    // Create sample boards
    const { boardId: board1Id } = await db.createBoard({
      name: 'Website Redesign',
      goal: 'Redesign the company website to improve user experience and conversion rates',
      columns: [
        { name: 'Backlog', position: 0, wipLimit: 0, isDoneColumn: false },
        { name: 'To Do', position: 1, wipLimit: 5, isDoneColumn: false },
        { name: 'In Progress', position: 2, wipLimit: 3, isDoneColumn: false },
        { name: 'Review', position: 3, wipLimit: 2, isDoneColumn: false },
        { name: 'Done', position: 4, wipLimit: 0, isDoneColumn: true }
      ],
      landingColumnPosition: 1
    });

    const { boardId: board2Id } = await db.createBoard({
      name: 'Mobile App Development',
      goal: 'Develop a cross-platform mobile application for our services',
      columns: [
        { name: 'Planning', position: 0, wipLimit: 0, isDoneColumn: false },
        { name: 'Development', position: 1, wipLimit: 4, isDoneColumn: false },
        { name: 'Testing', position: 2, wipLimit: 2, isDoneColumn: false },
        { name: 'Deployment', position: 3, wipLimit: 1, isDoneColumn: false },
        { name: 'Released', position: 4, wipLimit: 0, isDoneColumn: true }
      ],
      landingColumnPosition: 0
    });

    // Get board details to get column IDs
    const board1 = await db.getBoardWithColumnsAndTasks(board1Id);
    const board2 = await db.getBoardWithColumnsAndTasks(board2Id);

    if (!board1 || !board2) {
      throw new Error('Failed to create sample boards');
    }

    // Add sample tasks to board 1
    const board1Columns = board1.columns;
    
    // Backlog tasks
    await db.createTask(board1Columns[0].id, {
      title: 'Research competitor websites',
      content: 'Analyze top 5 competitor websites for design patterns and user flows'
    });

    await db.createTask(board1Columns[0].id, {
      title: 'Create user personas',
      content: 'Develop detailed user personas based on existing customer data'
    });

    // To Do tasks
    await db.createTask(board1Columns[1].id, {
      title: 'Design homepage mockup',
      content: 'Create wireframes and high-fidelity mockups for the new homepage'
    });

    await db.createTask(board1Columns[1].id, {
      title: 'Set up development environment',
      content: 'Configure local development environment with build tools and testing framework'
    });

    // In Progress tasks
    await db.createTask(board1Columns[2].id, {
      title: 'Implement responsive navigation',
      content: 'Code the responsive navigation component with mobile hamburger menu',
      metadata: { priority: 'high', estimatedHours: 8 }
    });

    // Review tasks
    await db.createTask(board1Columns[3].id, {
      title: 'Review color scheme and typography',
      content: 'Design review for brand consistency and accessibility compliance'
    });

    // Add sample tasks to board 2
    const board2Columns = board2.columns;

    // Planning tasks
    await db.createTask(board2Columns[0].id, {
      title: 'Define app architecture',
      content: 'Design the overall architecture and technology stack for the mobile app'
    });

    await db.createTask(board2Columns[0].id, {
      title: 'Create project timeline',
      content: 'Develop detailed project timeline with milestones and dependencies'
    });

    // Development tasks
    await db.createTask(board2Columns[1].id, {
      title: 'Set up React Native project',
      content: 'Initialize React Native project with navigation and state management'
    });

    await db.createTask(board2Columns[1].id, {
      title: 'Implement user authentication',
      content: 'Build login/signup screens with biometric authentication support',
      metadata: { priority: 'high', assignee: 'john.doe' }
    });

    // Testing tasks
    await db.createTask(board2Columns[2].id, {
      title: 'Unit test authentication flow',
      content: 'Write comprehensive unit tests for authentication components'
    });

    logger.info('Database seeding completed successfully', {
      boardsCreated: 2,
      tasksCreated: 11
    });

    // Get metrics to verify seeding
    const metrics = await db.getMetrics();
    logger.info('Database metrics after seeding', metrics);

  } catch (error) {
    logger.error('Database seeding failed', {}, error as Error);
    throw error;
  } finally {
    if (db) {
      await DatabaseFactory.closeInstance('seed');
    }
  }
}

/**
 * Clear all data from the database
 */
export async function clearDatabase(): Promise<void> {
  let db: any;
  
  try {
    logger.info('Clearing database...');

    db = await DatabaseFactory.createFromEnvironment('clear');
    
    // Get all boards and delete them (cascading will handle tasks and columns)
    const boards = await db.getAllBoards();
    
    for (const board of boards) {
      await db.deleteBoard(board.id);
    }

    logger.info('Database cleared successfully', {
      boardsDeleted: boards.length
    });

  } catch (error) {
    logger.error('Database clearing failed', {}, error as Error);
    throw error;
  } finally {
    if (db) {
      await DatabaseFactory.closeInstance('clear');
    }
  }
}

// Run seeding if this file is executed directly (Node.js module detection)
if (typeof process !== 'undefined' && process.argv && process.argv[1]) {
  const isMainModule = process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js');
  
  if (isMainModule) {
    const command = process.argv[2];
    
    if (command === 'clear') {
      clearDatabase().catch(console.error);
    } else {
      seedDatabase().catch(console.error);
    }
  }
}