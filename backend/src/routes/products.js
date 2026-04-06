import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  },
});

router.post('/upload-image', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

router.use(authMiddleware);

// GET /api/joyeria_products
router.get('/', async (req, res) => {
  const { category_id, supplier_id, type, min_price, max_price, low_stock, search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const conditions = [`p.user_id = $1`];
    const params = [req.user.id];
    let idx = 2;

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

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM joyeria_products p ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT p.*,
              c.name as category_name,
              s.name as supplier_name
       FROM joyeria_products p
       LEFT JOIN joyeria_categories c ON c.id = p.category_id
       LEFT JOIN joyeria_suppliers s ON s.id = p.supplier_id
       ${where}
       ORDER BY p.updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ joyeria_products: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/joyeria_products/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name as category_name, s.name as supplier_name
       FROM joyeria_products p
       LEFT JOIN joyeria_categories c ON c.id = p.category_id
       LEFT JOIN joyeria_suppliers s ON s.id = p.supplier_id
       WHERE p.id = $1 AND p.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/joyeria_products
router.post('/', async (req, res) => {
  const { name, description, category_id, type, purchase_price, sale_price, stock, min_stock, image_url, supplier_id, sku } = req.body;

  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  if (sale_price === undefined || sale_price === null) return res.status(400).json({ error: 'Precio de venta requerido' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO joyeria_products (name, description, category_id, type, purchase_price, sale_price, stock, min_stock, image_url, supplier_id, sku, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
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
        req.user.id,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El SKU ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/joyeria_products/:id
router.put('/:id', async (req, res) => {
  const { name, description, category_id, type, purchase_price, sale_price, stock, min_stock, image_url, supplier_id, sku } = req.body;

  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const { rows } = await pool.query(
      `UPDATE joyeria_products SET
        name=$1, description=$2, category_id=$3, type=$4,
        purchase_price=$5, sale_price=$6, stock=$7, min_stock=$8,
        image_url=$9, supplier_id=$10, sku=$11, updated_at=NOW()
       WHERE id=$12 AND user_id=$13 RETURNING *`,
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
        req.user.id,
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

// DELETE /api/joyeria_products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM joyeria_products WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

export default router;
