const { Client } = require('pg');

const client = new Client({
  host: '9bc8pwrr.us-east.database.insforge.app',
  port: 5432,
  database: 'insforge',
  user: 'postgres',
  password: '66aa0a20ccf71cbfb3f61bdee4ee5031',
  ssl: { rejectUnauthorized: false }
});

async function createTables() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Drop existing tables
    await client.query(`DROP TABLE IF EXISTS "saleItems" CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS sales CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS products CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS suppliers CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS categories CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS users CASCADE;`);
    console.log('Existing tables dropped');

    // Create users table
    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table created');

    // Create categories table
    await client.query(`
      CREATE TABLE categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Categories table created');

    // Create suppliers table
    await client.query(`
      CREATE TABLE suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Suppliers table created');

    // Create products table
    await client.query(`
      CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sku VARCHAR(100) UNIQUE NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        cost DECIMAL(10, 2),
        stock INTEGER DEFAULT 0,
        "minStock" INTEGER DEFAULT 0,
        "imageUrl" TEXT,
        "categoryId" UUID REFERENCES categories(id) ON DELETE SET NULL,
        "supplierId" UUID REFERENCES suppliers(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Products table created');

    // Create sales table
    await client.query(`
      CREATE TABLE sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "invoiceNumber" VARCHAR(50) UNIQUE,
        total DECIMAL(10, 2) NOT NULL,
        "clientName" VARCHAR(255),
        "clientPhone" VARCHAR(50),
        "paymentMethod" VARCHAR(50),
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Sales table created');

    // Create saleItems table
    await client.query(`
      CREATE TABLE "saleItems" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "saleId" UUID REFERENCES sales(id) ON DELETE CASCADE,
        "productId" UUID REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        "unitPrice" DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('SaleItems table created');

    console.log('All tables created successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

createTables();
