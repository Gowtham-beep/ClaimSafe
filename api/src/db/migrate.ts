import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { config } from '../config';

async function runMigrations() {
  console.log('Starting database migrations...');
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    let migrationDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationDir)) {
      // Fallback for compiled dist structure where src directory is preserved in the container
      migrationDir = path.join(__dirname, '..', '..', 'src', 'db', 'migrations');
    }

    if (!fs.existsSync(migrationDir)) {
      console.error(`Migration directory not found at standard or fallback paths.`);
      process.exit(1);
    }

    console.log(`Loading migrations from: ${migrationDir}`);
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      await pool.end();
      return;
    }

    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const filePath = path.join(migrationDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the migration queries
      await pool.query(sql);
      console.log(`Migration ${file} completed successfully.`);
    }

    console.log('All database migrations completed successfully.');
    await pool.end();
  } catch (err) {
    console.error('Migration failed:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
