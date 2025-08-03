import { PrismaClient } from '@prisma/client';
import type {
  DatabaseConfig,
  DatabaseHealth,
  DatabaseMetrics
} from '../types.js';
import { DatabaseConfigSchema } from '../types.js';
import { DatabaseError } from '../common/errors.js';
import { logger } from '../common/utils.js';

/**
 * Base database service providing common database operations
 * and configuration management
 */
export class BaseDatabaseService {
  protected prisma: PrismaClient;
  protected config: DatabaseConfig;
  private startTime: Date;

  constructor(config: DatabaseConfig) {
    // Validate configuration
    const validatedConfig = DatabaseConfigSchema.parse(config);
    this.config = validatedConfig;
    this.startTime = new Date();

    // Initialize Prisma with configuration
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.url
        }
      },
      log: config.enableLogging ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Set up logging if enabled
    if (config.enableLogging) {
      this.setupLogging();
    }

    logger.info('Base database service initialized', {
      provider: config.provider,
      maxConnections: config.maxConnections
    });
  }

  private setupLogging(): void {
    // Simplified logging without event handlers for now
    logger.info('Database logging enabled');
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database', {}, error as Error);
      throw new DatabaseError('connect', undefined, error as Error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection', {}, error as Error);
      throw new DatabaseError('disconnect', undefined, error as Error);
    }
  }

  async healthCheck(): Promise<DatabaseHealth> {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Get database info
      const dbInfo = await this.prisma.databaseInfo.findUnique({
        where: { id: 'singleton' }
      });

      const uptime = Date.now() - this.startTime.getTime();

      return {
        isHealthy: true,
        connectionCount: 1, // Prisma manages this internally
        lastMigration: dbInfo?.lastMigration || undefined,
        schemaVersion: dbInfo?.schemaVersion || 'unknown',
        uptime,
        errors: []
      };
    } catch (error) {
      logger.error('Database health check failed', {}, error as Error);
      return {
        isHealthy: false,
        connectionCount: 0,
        schemaVersion: 'unknown',
        uptime: Date.now() - this.startTime.getTime(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async getMetrics(): Promise<DatabaseMetrics> {
    try {
      const [
        totalBoards,
        totalColumns,
        totalTasks,
        boardsWithCounts
      ] = await Promise.all([
        this.prisma.board.count(),
        this.prisma.column.count(),
        this.prisma.task.count(),
        this.prisma.board.findMany({
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                columns: true
              }
            },
            columns: {
              select: {
                _count: {
                  select: {
                    tasks: true
                  }
                }
              }
            }
          }
        })
      ]);

      const averageColumnsPerBoard = totalBoards > 0 ? totalColumns / totalBoards : 0;
      const averageTasksPerBoard = totalBoards > 0 ? totalTasks / totalBoards : 0;

      // Find most active board
      let mostActiveBoard: { id: string; name: string; taskCount: number } | null = null;
      let maxTasks = 0;

      for (const board of boardsWithCounts) {
        const taskCount = board.columns.reduce((sum: number, col: any) => sum + col._count.tasks, 0);
        if (taskCount > maxTasks) {
          maxTasks = taskCount;
          mostActiveBoard = {
            id: board.id,
            name: board.name,
            taskCount
          };
        }
      }

      return {
        totalBoards,
        totalColumns,
        totalTasks,
        averageTasksPerBoard,
        averageColumnsPerBoard,
        mostActiveBoard
      };
    } catch (error) {
      logger.error('Failed to get database metrics', {}, error as Error);
      throw new DatabaseError('metrics', undefined, error as Error);
    }
  }
}