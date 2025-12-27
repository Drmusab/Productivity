// @ts-nocheck
import express from 'express';
const router = express.Router();
import {  body, validationResult  } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {  getAsync, runAsync  } from '../utils/database';
import {  authenticateToken  } from '../middleware/jwtAuth';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const { password_hash, ...rest } = user;
  return rest;
};

router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const user = await getAsync(
      'SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE',
      [username, username]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordMatches = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/register', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role = 'user' } = req.body;

  try {
    const existing = await getAsync(
      'SELECT id FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE',
      [username, email]
    );

    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await runAsync(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role]
    );

    const user = await getAsync('SELECT * FROM users WHERE id = ?', [result.lastID]);

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getAsync(
      'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Fetch current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export = router;
