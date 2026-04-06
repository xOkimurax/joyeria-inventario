const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get all suppliers
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, COUNT(p.id) as product_count 
      FROM suppliers s 
      LEFT JOIN products p ON p."supplierId" = s.id 
      GROUP BY s.id 
      ORDER BY s.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single supplier
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create supplier
router.post('/', auth, async (req, res) => {
  try {
    const { name, contact, phone, email, address } = req.body;
    const result = await db.query(
      'INSERT INTO suppliers (name, contact, phone, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, contact || null, phone || null, email || null, address || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update supplier
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, contact, phone, email, address } = req.body;
    const result = await db.query(
      'UPDATE suppliers SET name = $1, contact = $2, phone = $3, email = $4, address = $5 WHERE id = $6 RETURNING *',
      [name, contact || null, phone || null, email || null, address || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete supplier
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM suppliers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
