import pool from './db.js';

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255),
        password_hash VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('✓ Migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function seedUserCategories(userId) {
  const { rows } = await pool.query('SELECT COUNT(*) FROM categories WHERE user_id = $1', [userId]);
  if (parseInt(rows[0].count) > 0) return;

  await pool.query(`
    INSERT INTO categories (name, description, user_id) VALUES
    ('Anillos', 'Anillos de todo tipo', $1),
    ('Collares', 'Collares y cadenas', $1),
    ('Pulseras', 'Pulseras y brazaletes', $1),
    ('Aretes', 'Aretes y pendientes', $1),
    ('Relojes', 'Relojes de lujo', $1),
    ('Broches', 'Broches y prendedores', $1),
    ('Otros', 'Otros artículos de joyería', $1)
  `, [userId]);
}
