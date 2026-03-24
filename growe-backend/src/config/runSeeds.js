import bcrypt from 'bcrypt';
import pool from './db.js';

async function runSeeds() {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO roles (name) VALUES
        ('admin'),
        ('tutor'),
        ('student')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Seeded roles: admin, tutor, student');

    const { rows: roleRows } = await client.query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
    const adminRoleId = roleRows[0]?.id;

    const { rows: existingAdmin } = await client.query(
      "SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin' LIMIT 1"
    );
    if (existingAdmin.length === 0 && adminRoleId) {
      const hash = await bcrypt.hash('admin123', 12);
      await client.query(
        `INSERT INTO users (email, password_hash, role_id, is_verified) VALUES ($1, $2, $3, true)`,
        ['admin@growe.edu', hash, adminRoleId]
      );
      console.log('Created default admin: admin@growe.edu / admin123');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeds().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
