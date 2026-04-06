const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get all sales
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, search } = req.query;
    let query = `
      SELECT s.*, 
        (SELECT json_agg(json_build_object('id', si.id, 'productId', si."productId", 'quantity', si.quantity, 'unitPrice', si."unitPrice", 'subtotal', si.subtotal, 'product', p.name)) 
         FROM "saleItems" si LEFT JOIN products p ON p.id = si."productId" 
         WHERE si."saleId" = s.id) as items
      FROM sales s
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (startDate) {
      paramCount++;
      query += ` AND s."createdAt" >= $${paramCount}`;
      params.push(startDate);
    }
    if (endDate) {
      paramCount++;
      query += ` AND s."createdAt" <= $${paramCount}`;
      params.push(endDate + 'T23:59:59');
    }
    if (search) {
      paramCount++;
      query += ` AND (s."invoiceNumber" ILIKE $${paramCount} OR s."clientName" ILIKE $${paramCount} OR s."clientPhone" ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY s."createdAt" DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single sale
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, 
        (SELECT json_agg(json_build_object('id', si.id, 'productId', si."productId", 'quantity', si.quantity, 'unitPrice', si."unitPrice", 'subtotal', si.subtotal, 'product', p.name)) 
         FROM "saleItems" si LEFT JOIN products p ON p.id = si."productId" 
         WHERE si."saleId" = s.id) as items
      FROM sales s
      WHERE s.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create sale
router.post('/', auth, async (req, res) => {
  try {
    const { clientName, clientPhone, paymentMethod, notes, items } = req.body;
    
    // Calculate total
    let total = 0;
    for (const item of items) {
      total += item.quantity * item.unitPrice;
    }
    
    // Generate invoice number
    const countResult = await db.query('SELECT COUNT(*) as count FROM sales');
    const count = parseInt(countResult.rows[0].count);
    const invoiceNumber = `FAC-${String(count + 1).padStart(6, '0')}`;
    
    // Create sale
    const saleResult = await db.query(`
      INSERT INTO sales (total, "invoiceNumber", "clientName", "clientPhone", "paymentMethod", notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [total, invoiceNumber, clientName || null, clientPhone || null, paymentMethod || null, notes || null]);
    
    const sale = saleResult.rows[0];
    
    // Create sale items and update stock
    for (const item of items) {
      await db.query(`
        INSERT INTO "saleItems" ("saleId", "productId", quantity, "unitPrice", subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `, [sale.id, item.productId, item.quantity, item.unitPrice, item.quantity * item.unitPrice]);
      
      // Update stock
      await db.query(`
        UPDATE products SET stock = stock - $1 WHERE id = $2
      `, [item.quantity, item.productId]);
    }
    
    // Get full sale with items
    const fullSale = await db.query(`
      SELECT s.*, 
        (SELECT json_agg(json_build_object('id', si.id, 'productId', si."productId", 'quantity', si.quantity, 'unitPrice', si."unitPrice", 'subtotal', si.subtotal, 'product', p.name)) 
         FROM "saleItems" si LEFT JOIN products p ON p.id = si."productId" 
         WHERE si."saleId" = s.id) as items
      FROM sales s
      WHERE s.id = $1
    `, [sale.id]);
    
    res.json(fullSale.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete sale (reverse stock)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Get sale items first
    const itemsResult = await db.query('SELECT * FROM "saleItems" WHERE "saleId" = $1', [req.params.id]);
    
    // Restore stock
    for (const item of itemsResult.rows) {
      await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.productId]);
    }
    
    // Delete sale (saleItems will be cascade deleted)
    await db.query('DELETE FROM sales WHERE id = $1', [req.params.id]);
    res.json({ message: 'Venta eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
