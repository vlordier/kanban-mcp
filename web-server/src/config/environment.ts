import { z } from 'zod';

// Environment configuration schema
const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default(8221),
  HOST: z.string().default('localhost'),
  
  // Database configuration
  DATABASE_URL: z.string().optional(),
  DB_CONNECTION_POOL_MIN: z.string().transform(Number).default(5),
  DB_CONNECTION_POOL_MAX: z.string().transform(Number).default(20),
  DB_CONNECTION_TIMEOUT: z.string().transform(Number).default(30000),
  DB_IDLE_TIMEOUT: z.string().transform(Number).default(600000),
  
  // Security configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Rate limiting
  RATE_LIMIT_MAX: z.string().transform(Number).default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  
  // Security headers
  CSP_REPORT_URI: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8221').transform(str => str.split(',')),
  
  // Monitoring
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_REQUEST_LOGGING: z.string().transform(str => str === 'true').default(true),
  
  // External services
  REDIS_URL: z.string().optional(),
  
  // Production settings
  TRUST_PROXY: z.string().transform(str => str === 'true').default(false),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

class ConfigService {
  private config: Environment;

  constructor() {
    const result = EnvironmentSchema.safeParse(process.env);
    
    if (!result.success) {
      console.error('❌ Invalid environment configuration:');
      result.error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
      process.exit(1);
    }
    
    this.config = result.data;
    
    // Validate critical production requirements
    if (this.config.NODE_ENV === 'production') {
      this.validateProductionConfig();
    }
  }

  private validateProductionConfig(): void {
    const required = ['JWT_SECRET', 'DATABASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required production environment variables:');
      missing.forEach(key => console.error(`  - ${key}`));
      process.exit(1);
    }
  }

  get<K extends keyof Environment>(key: K): Environment[K] {
    return this.config[key];
  }

  getAll(): Environment {
    return { ...this.config };
  }

  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }
}

// Export singleton instance
export const config = new ConfigService();
export default config;