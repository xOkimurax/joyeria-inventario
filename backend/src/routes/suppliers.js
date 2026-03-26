import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/suppliers
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, COUNT(p.id) as product_count
       FROM suppliers s
       LEFT JOIN products p ON p.supplier_id = s.id AND p.user_id = $1
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// GET /api/suppliers/:id/products
router.get('/:id/products', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.supplier_id = $1 AND p.user_id = $2
       ORDER BY p.name`,
      [req.params.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos del proveedor' });
  }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  const { name, contact_name, email, phone, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO suppliers (name, contact_name, email, phone, address, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name.trim(), contact_name || null, email || null, phone || null, address || null, notes || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  const { name, contact_name, email, phone, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const { rows } = await pool.query(
      `UPDATE suppliers SET name=$1, contact_name=$2, email=$3, phone=$4,
       address=$5, notes=$6, updated_at=NOW() WHERE id=$7 AND user_id=$8 RETURNING *`,
      [name.trim(), contact_name || null, email || null, phone || null, address || null, notes || null, req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM suppliers WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

export default router;
