const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();
// In-memory store for immediate local testing; replace with PostgreSQL/DB queries in production
const users = [];

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password || String(password).length < 6) {
      return res.status(400).json({ error: 'Valid email and password (min 6 chars) are required' });
    }
    const existing = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Account already exists' });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = {
      id: users.length + 1,
      name: String(name || 'Mr. Irfan').trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash,
      plan: 'free',
      credits: 100
    };
    users.push(user);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan, credits: user.credits }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
    if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan, credits: user.credits }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
