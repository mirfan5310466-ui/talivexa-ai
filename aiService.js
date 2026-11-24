async function generateAIResponse({ prompt, webSearch, lang }) {
  // نام بدل کر AI_API_KEY کر دیا گیا ہے تاکہ ویسل والی چابی مل سکے
  const apiKey = process.env.AI_API_KEY; 
  const model = process.env.AI_MODEL_NAME || 'gemini-2.5-flash';

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
