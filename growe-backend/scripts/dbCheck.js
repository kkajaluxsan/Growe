import pool from '../src/config/db.js';

async function run() {
  try {
    const { rows } = await pool.query(
      'SELECT NOW() AS now, current_database() AS database, current_user AS user_name'
    );
    console.log('[DB CHECK] OK', rows[0]);
  } catch (err) {
    console.error('[DB CHECK] FAILED', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
