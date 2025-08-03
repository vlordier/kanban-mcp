/**
 * @deprecated This file is kept for backward compatibility.
 * Please use the new modular services from './services/' directory instead.
 * 
 * New usage:
 * import { DatabaseService } from './services/database.service.js';
 * import { BoardService, TaskService, ColumnService } from './services/index.js';
 */

// Re-export the new DatabaseService for backward compatibility
export { DatabaseService } from './services/database.service.js';