require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');

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
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
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
    creator: 'Mr. Irfan'
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// AI routes
app.use('/api', aiRoutes);
app.use('/api/ai', aiRoutes);

// Vercel serverless export
module.exports = app;

// Local development only
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    console.log(
      `Talivexa AI server running on http://localhost:${PORT}`
    );
  });
}
