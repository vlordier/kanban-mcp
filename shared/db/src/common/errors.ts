/**
 * @deprecated These error classes have been moved to @kanban-mcp/errors package.
 * Please use: import { DatabaseError, ValidationError, ... } from '@kanban-mcp/errors';
 */

// Re-export from the proper error package for backward compatibility
export {
  DatabaseError,
  ValidationError,
  NotFoundError, 
  BusinessLogicError,
  ColumnCapacityFullError,
  BoardNotFoundError,
  TaskNotFoundError,
  ColumnNotFoundError
} from '@kanban-mcp/errors';