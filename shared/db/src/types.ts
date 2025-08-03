import { z } from 'zod';

// Database configuration schemas
export const DatabaseConfigSchema = z.object({
  provider: z.enum(['sqlite', 'postgresql', 'mysql']),
  url: z.string(),
  maxConnections: z.number().min(1).max(100).default(10),
  connectionTimeout: z.number().min(1000).max(60000).default(10000),
  queryTimeout: z.number().min(1000).max(300000).default(30000),
  enableLogging: z.boolean().default(false),
  logLevel: z.enum(['query', 'info', 'warn', 'error']).default('error'),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type DatabaseConfigOptions = Partial<DatabaseConfig>;

// Entity schemas for validation
export const BoardCreateSchema = z.object({
  name: z.string().min(1).max(255),
  goal: z.string().min(1).max(5000),
  columns: z.array(z.object({
    name: z.string().min(1).max(255),
    position: z.number().min(0),
    wipLimit: z.number().min(0).max(100),
    isDoneColumn: z.boolean().default(false),
  })).min(1).max(20),
  landingColumnPosition: z.number().min(0),
});

export const BoardUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  goal: z.string().min(1).max(5000).optional(),
  landingColumnId: z.string().optional(),
});

export const TaskCreateSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(0).max(10000),
  metadata: z.record(z.unknown()).optional(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(0).max(10000).optional(),
  updateReason: z.string().min(1).max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const TaskMoveSchema = z.object({
  targetColumnId: z.string(),
  position: z.number().min(0).optional(),
  updateReason: z.string().min(1).max(500).optional(),
});

// Type exports for external consumption
export type BoardCreateInput = z.infer<typeof BoardCreateSchema>;
export type BoardUpdateInput = z.infer<typeof BoardUpdateSchema>;
export type TaskCreateInput = z.infer<typeof TaskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>;
export type TaskMoveInput = z.infer<typeof TaskMoveSchema>;

// Domain models (clean architecture)
export interface Board {
  id: string;
  name: string;
  goal: string;
  landingColumnId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  position: number;
  wipLimit: number;
  isDoneColumn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  content: string;
  position: number;
  updateReason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskSummary {
  id: string;
  title: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  updateReason?: string | null;
}

export interface ColumnWithTasks extends Column {
  tasks: TaskSummary[];
  isLanding: boolean;
  taskCount: number;
  isAtCapacity: boolean;
  isNearCapacity: boolean;
}

export interface BoardWithColumns extends Board {
  columns: ColumnWithTasks[];
  totalTasks: number;
  totalColumns: number;
}

// Query options and filters
export interface QueryOptions {
  take?: number;
  skip?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface BoardFilters extends QueryOptions {
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface TaskFilters extends QueryOptions {
  boardId?: string;
  columnId?: string;
  search?: string;
  hasUpdateReason?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

// Database health and metrics
export interface DatabaseHealth {
  isHealthy: boolean;
  connectionCount: number;
  lastMigration?: Date;
  schemaVersion: string;
  uptime: number;
  errors: string[];
}

export interface DatabaseMetrics {
  totalBoards: number;
  totalColumns: number;
  totalTasks: number;
  averageTasksPerBoard: number;
  averageColumnsPerBoard: number;
  mostActiveBoard: { id: string; name: string; taskCount: number } | null;
}