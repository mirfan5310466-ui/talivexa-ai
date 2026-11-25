require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const serverless = require('serverless-http'); 

const authRoutes = require('../routes/authRoutes');
const aiRoutes = require('../routes/aiRoutes');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '2mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    platform: 'Talivexa AI',
    creator: 'Mr. Irfan',
    message: 'Backend is running perfectly!'
  });
});

app.use('/api/auth', authRoutes);

app.use('/api', aiRoutes);
app.use('/api/ai', aiRoutes);

module.exports = app;
module.exports.handler = serverless(app); 
