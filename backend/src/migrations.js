import pool from './db.js';

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS joyeria_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        email VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES joyeria_users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        user_id INTEGER REFERENCES joyeria_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact_name VARCHAR(200),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        notes TEXT,
        user_id INTEGER REFERENCES joyeria_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        type VARCHAR(100),
        purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER DEFAULT 5,
        image_url TEXT,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        sku VARCHAR(100),
        user_id INTEGER REFERENCES joyeria_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(200),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        total DECIMAL(12,2) NOT NULL,
        client_name VARCHAR(200),
        notes TEXT,
        user_id INTEGER REFERENCES joyeria_users(id) ON DELETE CASCADE,
        sold_at TIMESTAMP DEFAULT NOW()
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
