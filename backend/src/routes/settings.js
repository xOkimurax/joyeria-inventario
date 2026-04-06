import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// PUT /api/settings/password
router.put('/password', async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT password_hash FROM joyeria_joyeria_users WHERE id = $1', [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE joyeria_users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/settings/email
router.put('/email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE joyeria_users SET email = $1 WHERE id = $2 RETURNING id, username, email',
      [email.toLowerCase(), req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/settings/account
router.delete('/account', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete only this user's data (multi-tenant)
    await client.query('DELETE FROM joyeria_sales WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM joyeria_products WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM joyeria_categories WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM joyeria_suppliers WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM joyeria_password_resets WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM joyeria_joyeria_users WHERE id = $1', [req.user.id]);

    await client.query('COMMIT');
    res.json({ message: 'Cuenta eliminada correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Error al eliminar la cuenta' });
  } finally {
    client.release();
  }
});

export default router;
