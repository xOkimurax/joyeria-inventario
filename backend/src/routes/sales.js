import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/sales
router.get('/', async (req, res) => {
  const { from, to, product_id, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const conditions = [`s.user_id = $1`];
    const params = [req.user.id];
    let idx = 2;

    if (from) {
      conditions.push(`s.sold_at >= $${idx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`s.sold_at <= $${idx++}::date + interval '1 day'`);
      params.push(to);
    }
    if (product_id) {
      conditions.push(`s.product_id = $${idx++}`);
      params.push(product_id);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM sales s ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT s.*, p.name as product_name_ref, c.name as category_name
       FROM sales s
       LEFT JOIN products p ON p.id = s.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY s.sold_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    const totalsResult = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as grand_total,
              COALESCE(SUM(quantity), 0) as total_units
       FROM sales s ${where}`,
      params
    );

    res.json({
      sales: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      grand_total: parseFloat(totalsResult.rows[0].grand_total),
      total_units: parseInt(totalsResult.rows[0].total_units),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// POST /api/sales
router.post('/', async (req, res) => {
  const { product_id, quantity, unit_price, client_name, notes } = req.body;

  if (!product_id) return res.status(400).json({ error: 'Producto requerido' });
  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Cantidad inválida' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: productRows } = await client.query(
      'SELECT * FROM products WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [product_id, req.user.id]
    );
    if (productRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const product = productRows[0];
    if (product.stock < parseInt(quantity)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Stock insuficiente de "${product.name}". Disponible: ${product.stock}` });
    }

    const price = parseFloat(unit_price) || parseFloat(product.sale_price);
    const total = price * parseInt(quantity);

    const { rows } = await client.query(
      `INSERT INTO sales (product_id, product_name, quantity, unit_price, total, client_name, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [product_id, product.name, parseInt(quantity), price, total, client_name || null, notes || null, req.user.id]
    );

    await client.query(
      'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
      [parseInt(quantity), product_id]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al registrar venta' });
  } finally {
    client.release();
  }
});

// DELETE /api/sales/:id
router.delete('/:id', async (req, res) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const { rows: saleRows } = await dbClient.query(
      'SELECT * FROM sales WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (saleRows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const sale = saleRows[0];

    if (sale.product_id) {
      await dbClient.query(
        'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
        [sale.quantity, sale.product_id]
      );
    }

    await dbClient.query('DELETE FROM sales WHERE id = $1', [req.params.id]);
    await dbClient.query('COMMIT');
    res.json({ message: 'Venta eliminada y stock restaurado' });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar venta' });
  } finally {
    dbClient.release();
  }
});

export default router;
