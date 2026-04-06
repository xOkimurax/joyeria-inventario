import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/dashboard/metrics
router.get('/metrics', async (req, res) => {
  const uid = req.user.id;

  try {
    const [
      stockResult,
      salesTodayResult,
      salesMonthResult,
      lowStockResult,
      inventoryValueResult,
      topProductsResult,
      salesChartResult,
      categoriesResult,
    ] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(stock), 0) as total_stock FROM products WHERE user_id = $1', [uid]),

      pool.query(`
        SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
        FROM sales WHERE sold_at::date = CURRENT_DATE AND user_id = $1
      `, [uid]),

      pool.query(`
        SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
        FROM sales
        WHERE EXTRACT(MONTH FROM sold_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM sold_at) = EXTRACT(YEAR FROM NOW())
          AND user_id = $1
      `, [uid]),

      pool.query(`
        SELECT id, name, stock, min_stock, sale_price
        FROM products
        WHERE stock <= min_stock AND user_id = $1
        ORDER BY stock ASC
        LIMIT 10
      `, [uid]),

      pool.query(`
        SELECT COALESCE(SUM(purchase_price * stock), 0) as purchase_value,
               COALESCE(SUM(sale_price * stock), 0) as sale_value
        FROM products WHERE user_id = $1
      `, [uid]),

      pool.query(`
        SELECT s.description, SUM(s.quantity) as total_qty, SUM(s.total_amount) as total_revenue
        FROM sales s
        WHERE EXTRACT(MONTH FROM s.created) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM s.created) = EXTRACT(YEAR FROM NOW())
          AND s.user_id = $1
        GROUP BY s.description
        ORDER BY total_revenue DESC
        LIMIT 5
      `, [uid]),

      pool.query(`
        SELECT DATE(sold_at) as date, COALESCE(SUM(total), 0) as total
        FROM sales
        WHERE sold_at >= NOW() - INTERVAL '7 days' AND user_id = $1
        GROUP BY DATE(sold_at)
        ORDER BY date
      `, [uid]),

      pool.query(`
        SELECT c.name, COUNT(p.id) as count, COALESCE(SUM(p.quantity), 0) as total_stock
        FROM categories c
        LEFT JOIN products p ON p.type_id = c.id AND p.user_id = $1
        WHERE c.user_id = $1
        GROUP BY c.id, c.name
        ORDER BY count DESC
      `, [uid]),
    ]);

    res.json({
      total_stock: parseInt(stockResult.rows[0].total_stock),
      sales_today: {
        total: parseFloat(salesTodayResult.rows[0].total),
        count: parseInt(salesTodayResult.rows[0].count),
      },
      sales_month: {
        total: parseFloat(salesMonthResult.rows[0].total),
        count: parseInt(salesMonthResult.rows[0].count),
      },
      low_stock_products: lowStockResult.rows,
      inventory_value: {
        purchase: parseFloat(inventoryValueResult.rows[0].purchase_value),
        sale: parseFloat(inventoryValueResult.rows[0].sale_value),
      },
      top_products: topProductsResult.rows,
      sales_chart: salesChartResult.rows,
      categories_breakdown: categoriesResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
});

export default router;
