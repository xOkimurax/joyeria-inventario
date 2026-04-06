import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/joyeria_categories
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM joyeria_categories c
       LEFT JOIN joyeria_products p ON p.category_id = c.id AND p.user_id = $1
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// POST /api/joyeria_categories
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO joyeria_categories (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// PUT /api/joyeria_categories/:id
router.put('/:id', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const { rows } = await pool.query(
      'UPDATE joyeria_categories SET name = $1, description = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [name.trim(), description || null, req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// DELETE /api/joyeria_categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM joyeria_categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

export default router;
