
const express = require('express');

// Import the AI service
const aiService = require('../ai-service-server');

const router = express.Router();

// AI Chat API
router.post('/chat', async (req, res) => {
  try {
    const { prompt, webSearch, lang } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        error: 'Please provide a prompt'
      });
    }

    // Check AI service function
    if (
      !aiService ||
      typeof aiService.generateAIResponse !== 'function'
    ) {
      return res.status(500).json({
        error: 'generateAIResponse function not found in AI service'
      });
    }

    const result = await aiService.generateAIResponse({
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
