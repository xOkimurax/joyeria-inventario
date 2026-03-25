import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Multer config for image uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  },
});

// POST /api/products/upload-image  (before authMiddleware so multer runs first)
router.post('/upload-image', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

router.use(authMiddleware);

// GET /api/products
router.get('/', async (req, res) => {
  const { category_id, supplier_id, type, min_price, max_price, low_stock, search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx} OR p.sku ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category_id) {
      conditions.push(`p.category_id = $${idx++}`);
      params.push(category_id);
    }
    if (supplier_id) {
      conditions.push(`p.supplier_id = $${idx++}`);
      params.push(supplier_id);
    }
    if (type) {
      conditions.push(`p.type ILIKE $${idx++}`);
      params.push(`%${type}%`);
    }
    if (min_price) {
      conditions.push(`p.sale_price >= $${idx++}`);
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      conditions.push(`p.sale_price <= $${idx++}`);
      params.push(parseFloat(max_price));
    }
    if (low_stock === 'true') {
      conditions.push(`p.stock <= p.min_stock`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p ${where}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT p.*,
              c.name as category_name,
              s.name as supplier_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       ${where}
       ORDER BY p.updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ products: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name as category_name, s.name as supplier_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  const { name, description, category_id, type, purchase_price, sale_price, stock, min_stock, image_url, supplier_id, sku } = req.body;

  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  if (sale_price === undefined || sale_price === null) return res.status(400).json({ error: 'Precio de venta requerido' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO products (name, description, category_id, type, purchase_price, sale_price, stock, min_stock, image_url, supplier_id, sku)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        name.trim(),
        description || null,
        category_id || null,
        type || null,
        parseFloat(purchase_price) || 0,
        parseFloat(sale_price) || 0,
        parseInt(stock) || 0,
        parseInt(min_stock) || 5,
        image_url || null,
        supplier_id || null,
        sku || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El SKU ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const { name, description, category_id, type, purchase_price, sale_price, stock, min_stock, image_url, supplier_id, sku } = req.body;

  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const { rows } = await pool.query(
      `UPDATE products SET
        name=$1, description=$2, category_id=$3, type=$4,
        purchase_price=$5, sale_price=$6, stock=$7, min_stock=$8,
        image_url=$9, supplier_id=$10, sku=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [
        name.trim(),
        description || null,
        category_id || null,
        type || null,
        parseFloat(purchase_price) || 0,
        parseFloat(sale_price) || 0,
        parseInt(stock) || 0,
        parseInt(min_stock) || 5,
        image_url || null,
        supplier_id || null,
        sku || null,
        req.params.id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El SKU ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

export default router;
