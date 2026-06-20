import { Pool, QueryResult } from 'pg';
import { config } from '../config';

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
});

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  return pool.query(text, params);
}

export { pool };
