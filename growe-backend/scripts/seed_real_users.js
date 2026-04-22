import bcrypt from 'bcrypt';
import pool from '../src/config/db.js';

async function seedRealUsers() {
  const client = await pool.connect();
  try {
    // Roles
    const { rows: roles } = await client.query("SELECT id, name FROM roles");
    const tutorRoleId = roles.find(r => r.name === 'tutor')?.id;
    const studentRoleId = roles.find(r => r.name === 'student')?.id;

    if (!tutorRoleId || !studentRoleId) {
        throw new Error("Roles not seeded properly.");
    }

    const pw = 'ranakutty';
    const hash = await bcrypt.hash(pw, 12);

    // 1. Tutor User
    const tutorEmail = 'gaaya1999@gmail.com';
    const { rows: existingTutor } = await client.query("SELECT id FROM users WHERE email = $1", [tutorEmail]);
    let tutorUserId;
    if (existingTutor.length === 0) {
      const { rows: userRows } = await client.query(
        `INSERT INTO users (email, password_hash, role_id, is_verified, display_name, specialization, provider, provider_id) 
         VALUES ($1, $2, $3, true, 'Gaayaththiri Mathivathanan', 'Computer Science', 'local', NULL) RETURNING id`,
        [tutorEmail, hash, tutorRoleId]
      );
      tutorUserId = userRows[0].id;
      console.log(`Created tutor user: ${tutorEmail}`);
    } else {
      tutorUserId = existingTutor[0].id;
      // Force local provider and update password
      await client.query(
        "UPDATE users SET role_id = $1, password_hash = $2, provider = 'local', provider_id = NULL WHERE id = $3", 
        [tutorRoleId, hash, tutorUserId]
      );
      console.log(`Updated/Verified tutor user (unlocked for password): ${tutorEmail}`);
    }

    // Tutor Profile
    const { rows: existingProfile } = await client.query("SELECT id FROM tutor_profiles WHERE user_id = $1", [tutorUserId]);
    if (existingProfile.length === 0) {
      await client.query(
        `INSERT INTO tutor_profiles (user_id, bio, subjects) VALUES ($1, $2, $3)`,
        [tutorUserId, 'Professional Academic Tutor', ['Computer Science', 'Mathematics']]
      );
      console.log('Created tutor profile.');
    }

    // 2. Student User
    const studentEmail = 'mathivathanagn@gmail.com';
    const { rows: existingStudent } = await client.query("SELECT id FROM users WHERE email = $1", [studentEmail]);
    if (existingStudent.length === 0) {
      await client.query(
        `INSERT INTO users (email, password_hash, role_id, is_verified, display_name, specialization, provider, provider_id) 
         VALUES ($1, $2, $3, true, 'Student Mathi', 'Computer Science', 'local', NULL)`,
        [studentEmail, hash, studentRoleId]
      );
      console.log(`Created student user: ${studentEmail}`);
    } else {
      // Force local provider and update password
      await client.query(
        "UPDATE users SET role_id = $1, password_hash = $2, provider = 'local', provider_id = NULL WHERE id = $3", 
        [studentRoleId, hash, existingStudent[0].id]
      );
      console.log(`Updated/Verified student user (unlocked for password): ${studentEmail}`);
    }

  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seedRealUsers();
