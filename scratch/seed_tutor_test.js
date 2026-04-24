import bcrypt from 'bcrypt';
import pool from '../growe-backend/src/config/db.js';

async function seedTutor() {
  const client = await pool.connect();
  try {
    // 1. Get tutor role ID
    const { rows: roleRows } = await client.query("SELECT id FROM roles WHERE name = 'tutor' LIMIT 1");
    if (roleRows.length === 0) {
        console.error("Tutor role not found. Please run regular seeds first.");
        return;
    }
    const tutorRoleId = roleRows[0].id;

    // 2. Create Tutor User
    const email = 'tutor@growe.edu';
    const { rows: existing } = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    let tutorUserId;
    
    if (existing.length === 0) {
      const hash = await bcrypt.hash('tutor123', 12);
      const { rows: userRows } = await client.query(
        `INSERT INTO users (email, password_hash, role_id, is_verified, display_name) VALUES ($1, $2, $3, true, 'Test Tutor') RETURNING id`,
        [email, hash, tutorRoleId]
      );
      tutorUserId = userRows[0].id;
      console.log('Created tutor user: tutor@growe.edu / tutor123');
    } else {
      tutorUserId = existing[0].id;
      console.log('Tutor user already exists.');
    }

    // 3. Create Tutor Profile
    const { rows: existingProfile } = await client.query("SELECT id FROM tutor_profiles WHERE user_id = $1", [tutorUserId]);
    let tutorProfileId;
    if (existingProfile.length === 0) {
      const { rows: profileRows } = await client.query(
        `INSERT INTO tutor_profiles (user_id, bio, subjects) VALUES ($1, $2, $3) RETURNING id`,
        [tutorUserId, 'Professional Selenium Testing Tutor', ['Computer Science', 'Automation']]
      );
      tutorProfileId = profileRows[0].id;
      console.log('Created tutor profile.');
    } else {
      tutorProfileId = existingProfile[0].id;
    }

    // 4. Create Availability for Tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    
    const startTime = '10:00:00';
    const endTime = '11:00:00';
    
    await client.query(
        `DELETE FROM tutor_availability WHERE tutor_id = $1 AND available_date = $2`,
        [tutorProfileId, dateStr]
    );

    await client.query(
      `INSERT INTO tutor_availability (tutor_id, available_date, start_time, end_time, session_duration)
       VALUES ($1, $2, $3, $4, 60)`,
      [tutorProfileId, dateStr, startTime, endTime]
    );
    console.log(`Created availability for ${dateStr} at ${startTime}`);

  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seedTutor();
