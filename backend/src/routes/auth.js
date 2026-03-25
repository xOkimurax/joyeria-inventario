import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username y contraseña son requeridos' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username debe tener al menos 3 caracteres' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ese username ya está en uso' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username.toLowerCase(), hash, email || null]
    );

    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { id: rows[0].id, username: rows[0].username, email: rows[0].email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username y contraseña son requeridos' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, username, password_hash, email FROM users WHERE username = $1',
      [username.toLowerCase()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: rows[0].id, username: rows[0].username, email: rows[0].email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username requerido' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email FROM users WHERE username = $1',
      [username.toLowerCase()]
    );

    // Always respond OK to prevent user enumeration
    if (rows.length === 0 || !rows[0].email) {
      return res.json({ message: 'Si el usuario existe y tiene email registrado, recibirás un código.' });
    }

    const token = crypto.randomBytes(6).toString('hex').toUpperCase();
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [rows[0].id, token, expires]
    );

    // Send email
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: rows[0].email,
        subject: 'Recuperación de contraseña - Sistema Joyería',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #C9A84C;">Recuperación de Contraseña</h2>
            <p>Tu código de recuperación es:</p>
            <div style="background: #1a1a1a; color: #C9A84C; font-size: 32px; font-weight: bold;
                        text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px;">
              ${token}
            </div>
            <p style="color: #666;">Este código expira en 30 minutos.</p>
          </div>
        `,
      });
    } else {
      console.log(`[DEV] Reset token for ${username}: ${token}`);
    }

    res.json({ message: 'Si el usuario existe y tiene email registrado, recibirás un código.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { username, token, newPassword } = req.body;
  if (!username || !token || !newPassword) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const { rows: userRows } = await pool.query(
      'SELECT id FROM users WHERE username = $1', [username.toLowerCase()]
    );
    if (userRows.length === 0) {
      return res.status(400).json({ error: 'Usuario o código incorrecto' });
    }

    const { rows } = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW() AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [userRows[0].id, token.toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Código incorrecto o expirado' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userRows[0].id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [rows[0].id]);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1', [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
