import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const migrationsDir = join(__dirname, '../../migrations');

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const name = file.replace('.sql', '');
      const { rows } = await client.query(
        'SELECT 1 FROM _migrations WHERE name = $1',
        [name]
      );
      if (rows.length > 0) {
        console.log(`Skipping ${name} (already applied)`);
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
      console.log(`Applied migration: ${name}`);
    }
    console.log('Migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
