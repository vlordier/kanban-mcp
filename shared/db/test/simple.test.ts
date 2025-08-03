import { DatabaseFactory } from '../src/database.factory';

describe('Simple Database Test', () => {
  test('should create database service', async () => {
    const db = await DatabaseFactory.createTestDatabase('simple-test');
    
    expect(db).toBeDefined();
    
    await db.disconnect();
  });
});