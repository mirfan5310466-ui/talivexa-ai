const express = require('express');
const { generateAIResponse } = require('../services/aiService');

const router = express.Router();

router.post('/ai/chat', async (req, res) => {
  try {
    const { prompt, webSearch, lang } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt text is required' });
    }
    const result = await generateAIResponse({
      prompt: prompt.trim(),
      webSearch: Boolean(webSearch),
      lang: typeof lang === 'string' ? lang : 'en'
    });
    return res.json({
      reply: result.reply,
      providerConfigured: result.providerConfigured,
      creator: 'Mr. Irfan',
      platform: 'Talivexa AI'
    });
  } catch (err) {
    return res.status(500).json({ error: 'AI processing error' });
  }
});

router.post('/billing/checkout', (req, res) => {
  const { plan } = req.body || {};
  if (!['free', 'pro', 'enterprise'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid subscription plan' });
  }
  if (!process.env.PAYMENT_SECRET_KEY) {
    return res.json({
      demoMode: true,
      plan,
      message: 'Payment gateway key not configured yet. Add PAYMENT_SECRET_KEY in .env to enable live checkout.'
    });
  }
  return res.json({ demoMode: false, plan, message: 'Ready for payment session creation.' });
});

module.exports = router;
