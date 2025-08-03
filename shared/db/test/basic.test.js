// Basic test to verify database service compiles and runs
import { DatabaseFactory, createSQLiteDatabase } from '../dist/database.factory.js';

async function testBasicConnection() {
  try {
    console.log('Testing basic database connection...');
    
    // Use the migrated test database
    const db = await createSQLiteDatabase('./test.db', 'test');
    
    // Test health check
    const health = await db.healthCheck(); 
    console.log('Health check:', health);
    
    // Close connection
    await db.disconnect();
    
    console.log('Basic test passed!');
  } catch (error) {
    console.error('Basic test failed:', error);
    process.exit(1);
  }
}

// Run the test
testBasicConnection();