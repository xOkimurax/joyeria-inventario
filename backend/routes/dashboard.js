const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { jsPDF } = require('jspdf');

// Get dashboard metrics
router.get('/metrics', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalProducts,
      totalCategories,
      totalSuppliers,
      lowStockResult,
      todaySales,
      monthSales,
      recentSales
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM products'),
      db.query('SELECT COUNT(*) as count FROM categories'),
      db.query('SELECT COUNT(*) as count FROM suppliers'),
      db.query('SELECT COUNT(*) as count FROM products WHERE stock < "minStock"'),
      db.query('SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales WHERE "createdAt" >= $1', [today]),
      db.query('SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales WHERE "createdAt" >= $1', [monthStart]),
      db.query(`
        SELECT s.*, 
          (SELECT json_agg(json_build_object('product', p.name, 'quantity', si.quantity)) 
           FROM "saleItems" si LEFT JOIN products p ON p.id = si."productId" 
           WHERE si."saleId" = s.id) as items
        FROM sales s
        ORDER BY s."createdAt" DESC
        LIMIT 5
      `)
    ]);
    
    res.json({
      totalProducts: parseInt(totalProducts.rows[0].count),
      totalCategories: parseInt(totalCategories.rows[0].count),
      totalSuppliers: parseInt(totalSuppliers.rows[0].count),
      lowStockProducts: parseInt(lowStockResult.rows[0].count),
      todaySales: { 
        count: parseInt(todaySales.rows[0].count), 
        total: parseFloat(todaySales.rows[0].total) 
      },
      monthSales: { 
        count: parseInt(monthSales.rows[0].count), 
        total: parseFloat(monthSales.rows[0].total) 
      },
      recentSales: recentSales.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export PDF report
router.get('/report/pdf', auth, async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Joyeria Inventario', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Reporte de ${type === 'inventory' ? 'Inventario' : 'Ventas'}`, 105, 30, { align: 'center' });
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 105, 38, { align: 'center' });
    
    if (type === 'inventory') {
      const products = await db.query(`
        SELECT p.*, c.name as "categoryName"
        FROM products p
        LEFT JOIN categories c ON c.id = p."categoryId"
        ORDER BY p.name ASC
      `);
      
      let y = 55;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('SKU', 10, y);
      doc.text('Producto', 40, y);
      doc.text('Categoria', 100, y);
      doc.text('Stock', 145, y);
      doc.text('Precio', 170, y);
      
      y += 8;
      doc.setTextColor(0);
      for (const p of products.rows) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(p.sku.substring(0, 15), 10, y);
        doc.text(p.name.substring(0, 25), 40, y);
        doc.text((p.categoryName || '-').substring(0, 20), 100, y);
        doc.text(String(p.stock), 145, y);
        doc.text(`$${Number(p.price).toFixed(2)}`, 170, y);
        y += 7;
      }
    } else {
      let whereClause = '';
      const params = [];
      
      if (startDate || endDate) {
        whereClause = ' WHERE 1=1';
        if (startDate) {
          params.push(startDate);
          whereClause += ` AND s."createdAt" >= $${params.length}`;
        }
        if (endDate) {
          params.push(endDate + 'T23:59:59');
          whereClause += ` AND s."createdAt" <= $${params.length}`;
        }
      }
      
      const sales = await db.query(`
        SELECT s.*
        FROM sales s
        ${whereClause}
        ORDER BY s."createdAt" DESC
        LIMIT 100
      `, params);
      
      let y = 55;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Factura', 10, y);
      doc.text('Fecha', 45, y);
      doc.text('Cliente', 80, y);
      doc.text('Total', 150, y);
      
      y += 8;
      doc.setTextColor(0);
      for (const s of sales.rows) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(s.invoiceNumber || '-', 10, y);
        doc.text(new Date(s.createdAt).toLocaleDateString(), 45, y);
        doc.text((s.clientName || '-').substring(0, 25), 80, y);
        doc.text(`$${Number(s.total).toFixed(2)}`, 150, y);
        y += 7;
      }
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-${type}.pdf`);
    res.send(Buffer.from(doc.output('arraybuffer')));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
