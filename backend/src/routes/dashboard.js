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
      joyeria_salesTodayResult,
      joyeria_salesMonthResult,
      lowStockResult,
      inventoryValueResult,
      topProductsResult,
      joyeria_salesChartResult,
      joyeria_categoriesResult,
    ] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(stock), 0) as total_stock FROM joyeria_products WHERE user_id = $1', [uid]),

      pool.query(`
        SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
        FROM joyeria_sales WHERE sold_at::date = CURRENT_DATE AND user_id = $1
      `, [uid]),

      pool.query(`
        SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
        FROM joyeria_sales
        WHERE EXTRACT(MONTH FROM sold_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM sold_at) = EXTRACT(YEAR FROM NOW())
          AND user_id = $1
      `, [uid]),

      pool.query(`
        SELECT id, name, stock, min_stock, sale_price
        FROM joyeria_products
        WHERE stock <= min_stock AND user_id = $1
        ORDER BY stock ASC
        LIMIT 10
      `, [uid]),

      pool.query(`
        SELECT COALESCE(SUM(purchase_price * stock), 0) as purchase_value,
               COALESCE(SUM(sale_price * stock), 0) as sale_value
        FROM joyeria_products WHERE user_id = $1
      `, [uid]),

      pool.query(`
        SELECT s.product_name, SUM(s.quantity) as total_qty, SUM(s.total) as total_revenue
        FROM joyeria_sales s
        WHERE EXTRACT(MONTH FROM s.sold_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM s.sold_at) = EXTRACT(YEAR FROM NOW())
          AND s.user_id = $1
        GROUP BY s.product_name
        ORDER BY total_revenue DESC
        LIMIT 5
      `, [uid]),

      pool.query(`
        SELECT DATE(sold_at) as date, COALESCE(SUM(total), 0) as total
        FROM joyeria_sales
        WHERE sold_at >= NOW() - INTERVAL '7 days' AND user_id = $1
        GROUP BY DATE(sold_at)
        ORDER BY date
      `, [uid]),

      pool.query(`
        SELECT c.name, COUNT(p.id) as count, COALESCE(SUM(p.stock), 0) as total_stock
        FROM joyeria_categories c
        LEFT JOIN joyeria_products p ON p.category_id = c.id AND p.user_id = $1
        WHERE c.user_id = $1
        GROUP BY c.id, c.name
        ORDER BY count DESC
      `, [uid]),
    ]);

    res.json({
      total_stock: parseInt(stockResult.rows[0].total_stock),
      joyeria_sales_today: {
        total: parseFloat(joyeria_salesTodayResult.rows[0].total),
        count: parseInt(joyeria_salesTodayResult.rows[0].count),
      },
      joyeria_sales_month: {
        total: parseFloat(joyeria_salesMonthResult.rows[0].total),
        count: parseInt(joyeria_salesMonthResult.rows[0].count),
      },
      low_stock_joyeria_products: lowStockResult.rows,
      inventory_value: {
        purchase: parseFloat(inventoryValueResult.rows[0].purchase_value),
        sale: parseFloat(inventoryValueResult.rows[0].sale_value),
      },
      top_joyeria_products: topProductsResult.rows,
      joyeria_sales_chart: joyeria_salesChartResult.rows,
      joyeria_categories_breakdown: joyeria_categoriesResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
});

export default router;
