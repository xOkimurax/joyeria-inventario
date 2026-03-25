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

// GET /api/auth/google — redirect to Google OAuth consent screen
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth no está configurado' });
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  const { code, error: oauthError } = req.query;
  const frontendUrl = process.env.APP_URL || 'http://localhost:5173';

  if (oauthError || !code) {
    return res.redirect(`${frontendUrl}/login?error=oauth_cancelled`);
  }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('Google token exchange failed:', tokenData);
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    // Get user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await profileRes.json();

    if (!googleUser.id || !googleUser.email) {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    // Find existing user by google_id or email
    const existing = await pool.query(
      'SELECT id, username, email, google_id FROM users WHERE google_id = $1 OR (email = $2 AND email IS NOT NULL)',
      [googleUser.id, googleUser.email]
    );

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
      // Link google_id if account was previously email/password only
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleUser.id, user.id]);
      }
    } else {
      // Create new user — derive a unique username from email
      const base = googleUser.email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase().slice(0, 20);
      const suffix = Math.random().toString(36).slice(2, 6);
      const username = `${base}_${suffix}`;
      const { rows } = await pool.query(
        'INSERT INTO users (username, password_hash, email, google_id) VALUES ($1, NULL, $2, $3) RETURNING id, username, email',
        [username, googleUser.email, googleUser.id]
      );
      user = rows[0];
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userParam = encodeURIComponent(JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
    }));

    res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${userParam}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
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
