async function generateAIResponse({ prompt, webSearch, lang }) {
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_MODEL_NAME || 'gemini-2.5-flash';

  if (!apiKey) {
    return {
      reply: `Talivexa AI Server Response (Created by Mr. Irfan):\n\nYour backend received: "${prompt}" (lang: ${lang}, webSearch: ${Boolean(webSearch)}).\nConfigure AI_PROVIDER_API_KEY in .env to connect a live model provider.`,
      providerConfigured: false
    };
  }

  // Example Gemini REST call from server side
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Respond in language code "${lang}". ${webSearch ? 'Include structured research points for: ' : ''}${prompt}` }] }]
    })
  });
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text returned by provider.';
  return { reply: text, providerConfigured: true };
}

module.exports = { generateAIResponse };
