require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'Talivexa AI', creator: 'Mr. Irfan' });
});

app.use('/api/auth', authRoutes);
app.use('/api', aiRoutes);

// Vercel پر سرور کو چلانے کے لیے یہ لائن ضروری ہے
module.exports = app;

// صرف لوکل کمپیوٹر پر چلانے کے لیے یہ حصہ
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Talivexa AI server running on http://localhost:${PORT}`);
  });
}
