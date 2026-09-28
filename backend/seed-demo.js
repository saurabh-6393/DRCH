const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://drch_user:drch_local_dev_password@localhost:5432/drch_dev',
});

async function main() {
  try {
    const hash = await bcrypt.hash('Password123!', 12);
    const citId = crypto.randomUUID();
    const authId = crypto.randomUUID();

    await pool.query("DELETE FROM users WHERE email IN ('citizen@example.com', 'authority@example.com')");

    await pool.query(
      "INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)",
      [citId, 'citizen@example.com', hash, 'Citizen Demo']
    );

    await pool.query(
      "INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)",
      [authId, 'authority@example.com', hash, 'Command Authority']
    );

    const citRole = (await pool.query("SELECT id FROM roles WHERE name = 'CITIZEN'")).rows[0]?.id;
    const authRole = (await pool.query("SELECT id FROM roles WHERE name = 'AUTHORITY'")).rows[0]?.id;

    if (citRole) {
      await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [citId, citRole]);
      await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [authId, citRole]);
    }
    if (authRole) {
      await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [authId, authRole]);
    }

    console.log("SUCCESS_SEEDED_DEMO_USERS");
  } catch (err) {
    console.error("SEED_ERROR:", err);
  } finally {
    await pool.end();
  }
}

main();
