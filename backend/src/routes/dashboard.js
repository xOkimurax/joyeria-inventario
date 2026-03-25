import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/dashboard/metrics
router.get('/metrics', async (req, res) => {
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
      // Total stock units
      pool.query('SELECT COALESCE(SUM(stock), 0) as total_stock FROM products'),

      // Sales today
      pool.query(`
        SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
        FROM sales WHERE sold_at::date = CURRENT_DATE
      `),

      // Sales this month
      pool.query(`
        SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
        FROM sales
        WHERE EXTRACT(MONTH FROM sold_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM sold_at) = EXTRACT(YEAR FROM NOW())
      `),

      // Low stock products
      pool.query(`
        SELECT id, name, stock, min_stock, sale_price
        FROM products
        WHERE stock <= min_stock
        ORDER BY stock ASC
        LIMIT 10
      `),

      // Inventory value (purchase price * stock)
      pool.query(`
        SELECT COALESCE(SUM(purchase_price * stock), 0) as purchase_value,
               COALESCE(SUM(sale_price * stock), 0) as sale_value
        FROM products
      `),

      // Top selling products this month
      pool.query(`
        SELECT s.product_name, SUM(s.quantity) as total_qty, SUM(s.total) as total_revenue
        FROM sales s
        WHERE EXTRACT(MONTH FROM s.sold_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM s.sold_at) = EXTRACT(YEAR FROM NOW())
        GROUP BY s.product_name
        ORDER BY total_revenue DESC
        LIMIT 5
      `),

      // Sales last 7 days (chart data)
      pool.query(`
        SELECT DATE(sold_at) as date, COALESCE(SUM(total), 0) as total
        FROM sales
        WHERE sold_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(sold_at)
        ORDER BY date
      `),

      // Products by category
      pool.query(`
        SELECT c.name, COUNT(p.id) as count, COALESCE(SUM(p.stock), 0) as total_stock
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id, c.name
        ORDER BY count DESC
      `),
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
