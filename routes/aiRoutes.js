
const express = require('express');
const { generateAIResponse } = require('../aiService');

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { prompt, webSearch, lang } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        error: 'Please provide a prompt'
      });
    }

    const result = await generateAIResponse({
      prompt: String(prompt).trim(),
      webSearch: Boolean(webSearch),
      lang: lang || 'en'
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('AI route error:', error);

    return res.status(500).json({
      error: 'AI response failed',
      details: error.message
    });
  }
});

module.exports = router;
