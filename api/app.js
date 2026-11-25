require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// یہاں راستے (paths) ٹھیک کیے گئے ہیں
const authRoutes = require('../routes/authRoutes');
const aiRoutes = require('../routes/aiRoutes');

const app = express();

// Vercel / reverse proxy support
app.set('trust proxy', 1);

// Security
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// CORS Configuration
const allowedOrigins = [
  'https://mirfan5310466-4327.vercel.app',
  'http://localhost:3000',
  'http://localhost:4000'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      // ڈیبگنگ کے لیے تمام origins کو allow کر رہے ہیں
      callback(null, true); 
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// JSON body parser
app.use(express.json({ limit: '2mb' }));

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    platform: 'Talivexa AI',
    creator: 'Mr. Irfan',
    message: 'Backend is running perfectly!'
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// AI routes
app.use('/api', aiRoutes);
app.use('/api/ai', aiRoutes);

// Vercel Serverless Function Export
module.exports = app;
