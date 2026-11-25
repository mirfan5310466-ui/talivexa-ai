async function generateAIResponse({ prompt, webSearch, lang }) {
  // Vercel میں آپ کی API Key کا نام AI_API_KEY ہے
  const apiKey = process.env.AI_API_KEY || process.env.AI_PROVIDER_API_KEY; 
  
  // ماڈل تبدیل کر دیا گیا ہے تاکہ "High Demand" کا ایرر نہ آئے
  const model = process.env.AI_MODEL_NAME || 'gemini-3.5-flash-lite';

  if (!apiKey) {
    return {
      reply: `Talivexa AI Server Response (Created by Mr. Irfan):\n\nYour backend received: "${prompt}" (lang: ${lang}, webSearch: ${Boolean(webSearch)}).\nConfigure AI_API_KEY in Vercel to connect a live model provider.`,
      providerConfigured: false
    };
  }

  // Gemini REST call
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Respond in language code "${lang}". ${webSearch ? 'Include structured research points for: ' : ''}${prompt}` }] }]
      })
    });
    
    const data = await response.json();
    
    // اگر گوگل کی طرف سے کوئی ایرر آئے تو اسے دکھائیں
    if (data.error) {
        return { reply: `API Error: ${data.error.message}`, providerConfigured: true };
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text returned by provider.';
    return { reply: text, providerConfigured: true };

  } catch (error) {
    return { reply: `Network Error: ${error.message}`, providerConfigured: true };
  }
}

module.exports = { generateAIResponse };
