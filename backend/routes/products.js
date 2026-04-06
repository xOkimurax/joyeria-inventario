const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const types = /jpeg|jpg|png|webp/;
    const extname = types.test(path.extname(file.originalname).toLowerCase());
    const mimetype = types.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// Get all products
router.get('/', auth, async (req, res) => {
  try {
    const { categoryId, supplierId, search, lowStock } = req.query;
    let query = `
      SELECT p.*, c.name as "categoryName", s.name as "supplierName"
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      LEFT JOIN suppliers s ON s.id = p."supplierId"
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (categoryId) {
      paramCount++;
      query += ` AND p."categoryId" = $${paramCount}`;
      params.push(categoryId);
    }
    if (supplierId) {
      paramCount++;
      query += ` AND p."supplierId" = $${paramCount}`;
      params.push(supplierId);
    }
    if (search) {
      paramCount++;
      query += ` AND (p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    if (lowStock === 'true') {
      query += ` AND p.stock < p."minStock"`;
    }
    
    query += ' ORDER BY p.name ASC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, c.name as "categoryName", s.name as "supplierName"
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      LEFT JOIN suppliers s ON s.id = p."supplierId"
      WHERE p.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, sku, price, cost, stock, minStock, categoryId, supplierId } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const result = await db.query(`
      INSERT INTO products (name, description, sku, price, cost, stock, "minStock", "imageUrl", "categoryId", "supplierId")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [name, description || null, sku, parseFloat(price), cost ? parseFloat(cost) : null, parseInt(stock) || 0, parseInt(minStock) || 0, imageUrl, categoryId || null, supplierId || null]);
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, sku, price, cost, stock, minStock, categoryId, supplierId } = req.body;
    
    let query = `
      UPDATE products 
      SET name = $1, description = $2, sku = $3, price = $4, cost = $5, stock = $6, "minStock" = $7, "categoryId" = $8, "supplierId" = $9
    `;
    const params = [name, description || null, sku, parseFloat(price), cost ? parseFloat(cost) : null, parseInt(stock) || 0, parseInt(minStock) || 0, categoryId || null, supplierId || null];
    
    if (req.file) {
      query += ', "imageUrl" = $10';
      params.push(`/uploads/${req.file.filename}`);
    }
    
    query += ` WHERE id = $${params.length + 1} RETURNING *`;
    
    const result = await db.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
